// ─────────────────────────────────────────────────────────────
// Data adapter: the seam between UI and backend.
// The shipped demo runs on in-memory data (the prototype's seed).
// Production flips VITE_USE_SUPABASE=1 and every money mutation
// becomes an RPC call enforced server-side. The UI never writes
// money state directly in either mode.
// ─────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface DataAdapter {
  // contributions — two-sided confirmation
  markSent(contributionId: string): Promise<void>;
  confirmReceipt(contributionId: string): Promise<void>;
  dispute(contributionId: string): Promise<void>;
  resetUnpaid(contributionId: string): Promise<void>;
  // governance
  castBallot(voteId: string, choice: "yes" | "no" | "abstain"): Promise<void>;
  // misses
  recordMiss(groupId: string, memberId: string): Promise<void>;
  forgiveMiss(groupId: string, memberId: string): Promise<void>;
  // payout
  confirmDistributionReceipt(distributionId: string): Promise<void>;
}

export function makeSupabaseAdapter(url: string, anonKey: string): DataAdapter {
  const sb: SupabaseClient = createClient(url, anonKey);
  const call = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
  };
  return {
    markSent: (id) => call("rpc_mark_sent", { p_contribution: id }),
    confirmReceipt: (id) => call("rpc_confirm_receipt", { p_contribution: id }),
    dispute: (id) => call("rpc_dispute", { p_contribution: id }),
    resetUnpaid: (id) => call("rpc_reset_unpaid", { p_contribution: id }),
    castBallot: (voteId, choice) => call("rpc_cast_ballot", { p_vote: voteId, p_choice: choice }),
    recordMiss: (groupId, memberId) => call("rpc_record_miss", { p_group: groupId, p_member: memberId }),
    forgiveMiss: (groupId, memberId) => call("rpc_forgive_miss", { p_group: groupId, p_member: memberId }),
    confirmDistributionReceipt: (id) => call("rpc_confirm_distribution_receipt", { p_distribution: id }),
  };
}

/** Demo adapter: resolves immediately; the prototype UI manages local state itself. */
export function makeDemoAdapter(): DataAdapter {
  const ok = () => Promise.resolve();
  return {
    markSent: ok, confirmReceipt: ok, dispute: ok, resetUnpaid: ok,
    castBallot: ok, recordMiss: ok, forgiveMiss: ok, confirmDistributionReceipt: ok,
  };
}

export function makeAdapter(): DataAdapter {
  const useSupabase = import.meta.env?.VITE_USE_SUPABASE === "1";
  if (useSupabase) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
    return makeSupabaseAdapter(url, key);
  }
  return makeDemoAdapter();
}
