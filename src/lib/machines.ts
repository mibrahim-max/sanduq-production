// ─────────────────────────────────────────────────────────────
// Sanduq core business logic.
// Pure functions only: no IO, no framework. The UI and the
// Supabase RPCs both call these rules so behavior never forks.
// ─────────────────────────────────────────────────────────────

export type ContributionStatus = "unpaid" | "marked_sent" | "confirmed" | "disputed" | "missed";
export type VoteType = "amendment" | "payout" | "succession";
export type JoinPolicy = "catchup" | "prorata" | "closed";
export type ExitPolicy = "refund" | "pot" | "vote";
export type PayoutMode = "single" | "split" | "prorata";

export interface Member {
  id: string;
  isTreasurer?: boolean;
  contributedCents: number;
  misses: number;
}

export interface Contribution {
  id: string;
  memberId: string;
  amountCents: number;
  status: ContributionStatus;
}

export interface Vote {
  id: string;
  type: VoteType;
  yes: number;
  no: number;
  total: number;
  executed: boolean;
  // payloads
  nomineeId?: string;
  amend?: { kind: "monthly" | "goal"; valueCents: number };
}

export interface GroupRules {
  monthlyCents: number;
  goalCents: number;
  treasurerId: string;
  missLimit: number;
  joinPolicy: JoinPolicy;
  exitPolicy: ExitPolicy;
}

export interface Receipt {
  memberId: string;
  amountCents: number;
  confirmed: boolean;
}

// ── Money input validation ───────────────────────────────────
export const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000

export function parseAmountCents(raw: string | number | null | undefined):
  { valid: boolean; cents: number; error: string | null } {
  if (raw === "" || raw === null || raw === undefined)
    return { valid: false, cents: 0, error: null };
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return { valid: false, cents: 0, error: "Enter a valid number" };
  if (n <= 0) return { valid: false, cents: 0, error: "Amount must be more than $0" };
  const cents = Math.round(n * 100);
  if (cents > MAX_AMOUNT_CENTS) return { valid: false, cents: 0, error: "That amount looks too high" };
  return { valid: true, cents, error: null };
}

// ── Contribution state machine (two-sided confirmation) ─────
// Transitions carry the acting role so authority is enforced in
// one place. Every transition is also enforced server-side in
// the Supabase RPCs; this mirror keeps the client honest.

export type Actor = { memberId: string; isTreasurer: boolean };

const TRANSITIONS: Record<string, { from: ContributionStatus[]; to: ContributionStatus; by: "payer" | "treasurer" }> = {
  mark_sent:       { from: ["unpaid", "disputed", "missed"], to: "marked_sent", by: "payer" },
  confirm_receipt: { from: ["marked_sent", "disputed"],      to: "confirmed",   by: "treasurer" },
  dispute:         { from: ["marked_sent"],                  to: "disputed",    by: "treasurer" },
  reset_unpaid:    { from: ["disputed"],                     to: "unpaid",      by: "treasurer" },
  payer_resend:    { from: ["disputed"],                     to: "unpaid",      by: "payer" },
};

export function transitionContribution(
  c: Contribution,
  action: keyof typeof TRANSITIONS,
  actor: Actor
): Contribution {
  const rule = TRANSITIONS[action];
  if (!rule) throw new Error(`Unknown action: ${action}`);
  if (!rule.from.includes(c.status))
    throw new Error(`Cannot ${action} a contribution in state "${c.status}"`);
  if (rule.by === "payer" && actor.memberId !== c.memberId)
    throw new Error("Only the paying member can do this");
  if (rule.by === "treasurer" && !actor.isTreasurer)
    throw new Error("Only the treasurer can do this");
  if (rule.by === "treasurer" && actor.memberId === c.memberId)
    throw new Error("Treasurers cannot self-confirm their own contribution");
  return { ...c, status: rule.to };
}

// ── Governance: majority + vote execution ────────────────────
export function majorityNeeded(memberCount: number): number {
  if (memberCount < 1) throw new Error("Group has no members");
  return Math.floor(memberCount / 2) + 1;
}

export function votePasses(v: Vote): boolean {
  return v.yes >= majorityNeeded(v.total);
}

/** Apply a passed vote's effect to the group rules. Pure; returns new rules. Idempotent via `executed`. */
export function executeVote(rules: GroupRules, v: Vote): { rules: GroupRules; vote: Vote } {
  if (v.executed) return { rules, vote: v };
  if (!votePasses(v)) return { rules, vote: v };
  let next = { ...rules };
  if (v.type === "succession" && v.nomineeId) next.treasurerId = v.nomineeId;
  if (v.type === "amendment" && v.amend) {
    if (v.amend.kind === "monthly") next.monthlyCents = v.amend.valueCents;
    if (v.amend.kind === "goal") next.goalCents = v.amend.valueCents;
  }
  return { rules: next, vote: { ...v, executed: true } };
}

// ── Missed payments: the auto-removal rule ───────────────────
export type MemberStanding = "active" | "behind" | "at_risk" | "removed";

export function standing(misses: number, missLimit: number): MemberStanding {
  if (misses >= missLimit) return "removed";
  if (misses === missLimit - 1) return "at_risk";
  if (misses > 0) return "behind";
  return "active";
}

// ── Fairness math: pro-rata with penny-exact remainder ──────
/**
 * Allocate potCents across members proportional to contributions.
 * Guarantees the allocations sum EXACTLY to potCents: floor each
 * share, then hand remaining pennies to the largest fractional
 * remainders (ties broken by larger contribution, then id order).
 */
export function prorataAllocation(potCents: number, members: Member[]): Receipt[] {
  const total = members.reduce((a, m) => a + m.contributedCents, 0);
  if (total <= 0) throw new Error("No contributions to allocate against");
  const raw = members.map(m => ({
    memberId: m.id,
    exact: (potCents * m.contributedCents) / total,
    contributed: m.contributedCents,
  }));
  const floored = raw.map(r => ({ ...r, cents: Math.floor(r.exact) }));
  let remainder = potCents - floored.reduce((a, r) => a + r.cents, 0);
  const order = [...floored].sort((a, b) => {
    const fa = a.exact - Math.floor(a.exact), fb = b.exact - Math.floor(b.exact);
    if (fb !== fa) return fb - fa;
    if (b.contributed !== a.contributed) return b.contributed - a.contributed;
    return a.memberId.localeCompare(b.memberId);
  });
  for (let i = 0; remainder > 0; i = (i + 1) % order.length, remainder--) order[i].cents += 1;
  const byId = new Map(order.map(r => [r.memberId, r.cents]));
  return members.map(m => ({ memberId: m.id, amountCents: byId.get(m.id)!, confirmed: false }));
}

export function equalAllocation(potCents: number, members: Member[]): Receipt[] {
  // Equal split with the same penny-exact guarantee.
  const uniform = members.map(m => ({ ...m, contributedCents: 1 }));
  return prorataAllocation(potCents, uniform);
}

export function buildDistribution(
  mode: PayoutMode, potCents: number, members: Member[], recipientId?: string
): Receipt[] {
  if (mode === "single") {
    if (!recipientId) throw new Error("Recipient required for single payout");
    if (!members.some(m => m.id === recipientId)) throw new Error("Recipient is not a member");
    return [{ memberId: recipientId, amountCents: potCents, confirmed: false }];
  }
  if (mode === "prorata") return prorataAllocation(potCents, members);
  return equalAllocation(potCents, members);
}

/** Confirm one receipt; reports whether the whole distribution is now complete. */
export function confirmReceipt(receipts: Receipt[], memberId: string):
  { receipts: Receipt[]; allConfirmed: boolean } {
  const target = receipts.find(r => r.memberId === memberId);
  if (!target) throw new Error("No receipt for this member");
  if (target.confirmed) return { receipts, allConfirmed: receipts.every(r => r.confirmed) };
  const next = receipts.map(r => r.memberId === memberId ? { ...r, confirmed: true } : r);
  return { receipts: next, allConfirmed: next.every(r => r.confirmed) };
}

// ── Late joiners ─────────────────────────────────────────────
export function catchupOwedCents(rules: GroupRules, monthsElapsed: number, policy: JoinPolicy): number {
  if (policy === "closed") throw new Error("Group is closed to new members");
  if (policy === "prorata") return 0;
  if (monthsElapsed < 0) throw new Error("monthsElapsed cannot be negative");
  return rules.monthlyCents * monthsElapsed;
}
