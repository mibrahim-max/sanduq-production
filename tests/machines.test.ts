import { describe, it, expect } from "vitest";
import {
  parseAmountCents, transitionContribution, majorityNeeded, votePasses,
  executeVote, standing, prorataAllocation, equalAllocation, buildDistribution,
  confirmReceipt, catchupOwedCents,
  type Contribution, type GroupRules, type Member, type Vote,
} from "../src/lib/machines";

const payer = { memberId: "m1", isTreasurer: false };
const treasurer = { memberId: "t1", isTreasurer: true };
const c = (status: Contribution["status"]): Contribution =>
  ({ id: "c1", memberId: "m1", amountCents: 25000, status });

describe("amount validation", () => {
  it("accepts normal amounts and rounds to cents", () => {
    expect(parseAmountCents("250")).toEqual({ valid: true, cents: 25000, error: null });
    expect(parseAmountCents("19.999").cents).toBe(2000);
  });
  it("rejects zero, negatives, non-numbers, absurd values", () => {
    expect(parseAmountCents("0").valid).toBe(false);
    expect(parseAmountCents("-50").valid).toBe(false);
    expect(parseAmountCents("abc").error).toBe("Enter a valid number");
    expect(parseAmountCents("2000000").error).toBe("That amount looks too high");
  });
});

describe("contribution state machine (two-sided confirmation)", () => {
  it("payer marks sent, treasurer confirms", () => {
    const sent = transitionContribution(c("unpaid"), "mark_sent", payer);
    expect(sent.status).toBe("marked_sent");
    expect(transitionContribution(sent, "confirm_receipt", treasurer).status).toBe("confirmed");
  });
  it("blocks the wrong actor on every guarded transition", () => {
    expect(() => transitionContribution(c("unpaid"), "mark_sent", treasurer)).toThrow();
    expect(() => transitionContribution(c("marked_sent"), "confirm_receipt", payer)).toThrow();
    expect(() => transitionContribution(c("marked_sent"), "dispute", payer)).toThrow();
  });
  it("treasurer cannot self-confirm their own contribution", () => {
    const own: Contribution = { id: "c2", memberId: "t1", amountCents: 25000, status: "marked_sent" };
    expect(() => transitionContribution(own, "confirm_receipt", treasurer)).toThrow(/self-confirm/);
  });
  it("dispute resolves in both directions", () => {
    const d = c("disputed");
    expect(transitionContribution(d, "confirm_receipt", treasurer).status).toBe("confirmed");
    expect(transitionContribution(d, "payer_resend", payer).status).toBe("unpaid");
    expect(transitionContribution(d, "reset_unpaid", treasurer).status).toBe("unpaid");
    expect(transitionContribution(d, "mark_sent", payer).status).toBe("marked_sent");
  });
  it("rejects illegal transitions (no confirming the unpaid, no double flows)", () => {
    expect(() => transitionContribution(c("unpaid"), "confirm_receipt", treasurer)).toThrow();
    expect(() => transitionContribution(c("confirmed"), "mark_sent", payer)).toThrow();
    expect(() => transitionContribution(c("confirmed"), "dispute", treasurer)).toThrow();
  });
});

describe("governance", () => {
  it("majority math is correct for odd and even groups", () => {
    expect(majorityNeeded(3)).toBe(2);
    expect(majorityNeeded(4)).toBe(3);
    expect(majorityNeeded(5)).toBe(3);
    expect(majorityNeeded(2)).toBe(2);
  });
  const rules: GroupRules = {
    monthlyCents: 25000, goalCents: 1200000, treasurerId: "t1",
    missLimit: 3, joinPolicy: "catchup", exitPolicy: "vote",
  };
  it("amendment executes exactly once and changes the rule", () => {
    const v: Vote = { id: "v1", type: "amendment", yes: 3, no: 1, total: 5, executed: false, amend: { kind: "monthly", valueCents: 30000 } };
    const r1 = executeVote(rules, v);
    expect(r1.rules.monthlyCents).toBe(30000);
    expect(r1.vote.executed).toBe(true);
    const r2 = executeVote(r1.rules, r1.vote); // idempotent
    expect(r2.rules.monthlyCents).toBe(30000);
  });
  it("succession reassigns the treasurer on majority", () => {
    const v: Vote = { id: "v2", type: "succession", yes: 3, no: 0, total: 5, executed: false, nomineeId: "m2" };
    expect(executeVote(rules, v).rules.treasurerId).toBe("m2");
  });
  it("failing votes change nothing", () => {
    const v: Vote = { id: "v3", type: "amendment", yes: 2, no: 2, total: 5, executed: false, amend: { kind: "goal", valueCents: 1 } };
    expect(votePasses(v)).toBe(false);
    expect(executeVote(rules, v).rules.goalCents).toBe(1200000);
  });
});

describe("missed-payment rule", () => {
  it("derives standing from miss count", () => {
    expect(standing(0, 3)).toBe("active");
    expect(standing(1, 3)).toBe("behind");
    expect(standing(2, 3)).toBe("at_risk");
    expect(standing(3, 3)).toBe("removed");
    expect(standing(7, 3)).toBe("removed");
  });
});

describe("payout fairness math", () => {
  const members: Member[] = [
    { id: "a", contributedCents: 120000, misses: 0 },
    { id: "b", contributedCents: 80000, misses: 0 },
    { id: "c", contributedCents: 80000, misses: 0 },
    { id: "d", contributedCents: 80000, misses: 0 },
  ];
  it("pro-rata sums penny-exact to the pot, proportional to stakes", () => {
    const r = prorataAllocation(360000, members);
    expect(r.reduce((a, x) => a + x.amountCents, 0)).toBe(360000);
    expect(r.find(x => x.memberId === "a")!.amountCents).toBe(120000);
    expect(r.find(x => x.memberId === "b")!.amountCents).toBe(80000);
  });
  it("pro-rata stays penny-exact on awkward divisions", () => {
    const odd: Member[] = [
      { id: "a", contributedCents: 1, misses: 0 },
      { id: "b", contributedCents: 1, misses: 0 },
      { id: "c", contributedCents: 1, misses: 0 },
    ];
    const r = prorataAllocation(100, odd); // 100 / 3
    expect(r.reduce((a, x) => a + x.amountCents, 0)).toBe(100);
    expect(Math.max(...r.map(x => x.amountCents)) - Math.min(...r.map(x => x.amountCents))).toBeLessThanOrEqual(1);
  });
  it("equal split is penny-exact too", () => {
    const r = equalAllocation(100, members); // 100 across 4
    expect(r.reduce((a, x) => a + x.amountCents, 0)).toBe(100);
  });
  it("single mode requires a valid recipient", () => {
    expect(() => buildDistribution("single", 360000, members)).toThrow();
    expect(() => buildDistribution("single", 360000, members, "zz")).toThrow();
    expect(buildDistribution("single", 360000, members, "b")[0]).toMatchObject({ memberId: "b", amountCents: 360000 });
  });
  it("distribution completes only when every recipient confirms", () => {
    let receipts = buildDistribution("split", 360000, members);
    let all = false;
    for (const m of members) ({ receipts, allConfirmed: all } = confirmReceipt(receipts, m.id));
    expect(all).toBe(true);
    // double-confirm is a no-op, not an error
    const again = confirmReceipt(receipts, "a");
    expect(again.allConfirmed).toBe(true);
  });
});

describe("late joiners", () => {
  const rules: GroupRules = {
    monthlyCents: 25000, goalCents: 1200000, treasurerId: "t1",
    missLimit: 3, joinPolicy: "catchup", exitPolicy: "vote",
  };
  it("catch-up owes the missed months", () => {
    expect(catchupOwedCents(rules, 5, "catchup")).toBe(125000);
    expect(catchupOwedCents(rules, 0, "catchup")).toBe(0);
  });
  it("pro-rata policy owes nothing up front", () => {
    expect(catchupOwedCents(rules, 5, "prorata")).toBe(0);
  });
  it("closed groups reject joins", () => {
    expect(() => catchupOwedCents(rules, 2, "closed")).toThrow(/closed/);
  });
});
