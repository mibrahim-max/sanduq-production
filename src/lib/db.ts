// ─────────────────────────────────────────────────────────────
// Live data layer. Auth + reads here; every money mutation goes
// through the RPCs in adapter.ts. Requires .env:
//   VITE_USE_SUPABASE=1
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
// ─────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

let _sb: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (_sb) return _sb;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  _sb = createClient(url, key);
  return _sb;
}

// ── Auth (email OTP for dev; swap to phone+Twilio for launch) ─
export async function sendLoginCode(email: string): Promise<void> {
  const { error } = await sb().auth.signInWithOtp({ email });
  if (error) throw new Error(error.message);
}
export async function verifyLoginCode(email: string, token: string): Promise<Session> {
  const { data, error } = await sb().auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) throw new Error(error?.message ?? "Invalid code");
  return data.session;
}
export async function currentSession(): Promise<Session | null> {
  const { data } = await sb().auth.getSession();
  return data.session;
}
export async function updateDisplayName(name: string): Promise<void> {
  const session = await currentSession();
  if (!session) throw new Error("Not signed in");
  // upsert (not update) so it works whether or not the trigger has
  // created the profile row yet — avoids the signup timing race.
  const { error } = await sb().from("profiles")
    .upsert({ id: session.user.id, display_name: name }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

// ── Groups ───────────────────────────────────────────────────
export interface GroupRow {
  id: string; name: string; category: string; scene: string | null;
  goal_cents: number; monthly_cents: number; treasurer_id: string;
  join_policy: string; exit_policy: string; status: string; started_at: string;
}

export async function fetchMyGroups(): Promise<GroupRow[]> {
  const { data, error } = await sb()
    .from("memberships")
    .select("groups(*)")
    .eq("removed", false);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.groups).filter(Boolean);
}

export async function createGroup(input: {
  name: string; category: string; goalCents: number; monthlyCents: number;
  joinPolicy: "catchup" | "prorata" | "closed"; exitPolicy: "refund" | "pot" | "vote";
}): Promise<string> {
  const { data, error } = await sb().rpc("rpc_create_group", {
    p_name: input.name, p_category: input.category,
    p_goal_cents: input.goalCents, p_monthly_cents: input.monthlyCents,
    p_join_policy: input.joinPolicy, p_exit_policy: input.exitPolicy,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function joinGroup(groupId: string): Promise<void> {
  const { error } = await sb().rpc("rpc_join_group", { p_group: groupId });
  if (error) throw new Error(error.message);
}

// Preview a group for an invite landing page. Uses a SECURITY DEFINER RPC so
// a not-yet-member (or not-yet-signed-in) person can see just the name/terms.
export interface InviteInfo { id: string; name: string; category: string; join_policy: string; monthly_cents: number; goal_cents: number; months_in: number; }
export async function fetchInviteInfo(groupId: string): Promise<InviteInfo | null> {
  const { data, error } = await sb().rpc("rpc_invite_info", { p_group: groupId });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  return (Array.isArray(data) ? data[0] : data) as InviteInfo;
}

// ── Group detail (everything one screen needs) ───────────────
export async function fetchGroupDetail(groupId: string) {
  const s = sb();
  const [group, members, contributions, votes, expenses, audit] = await Promise.all([
    s.from("groups").select("*").eq("id", groupId).single(),
    s.from("memberships").select("*, profiles(display_name, avatar_color, payment_handles)").eq("group_id", groupId),
    s.from("contributions").select("*").eq("group_id", groupId).order("cycle", { ascending: false }),
    s.from("votes").select("*, ballots(member_id, choice)").eq("group_id", groupId).order("created_at", { ascending: false }),
    s.from("expenses").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
    s.from("audit_events").select("*").eq("group_id", groupId).order("at", { ascending: false }).limit(50),
  ]);
  const firstError = [group, members, contributions, votes, expenses, audit].find(r => r.error)?.error;
  if (firstError) throw new Error(firstError.message);
  return {
    group: group.data, members: members.data ?? [], contributions: contributions.data ?? [],
    votes: votes.data ?? [], expenses: expenses.data ?? [], audit: audit.data ?? [],
  };
}

// ── Realtime: live confirmations and chat-ready subscription ─
export function subscribeToGroup(groupId: string, onChange: () => void): () => void {
  const channel = sb().channel(`group-${groupId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "contributions", filter: `group_id=eq.${groupId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `group_id=eq.${groupId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${groupId}` }, onChange)
    .subscribe();
  return () => { sb().removeChannel(channel); };
}

// ── Authed RPCs (share the same client/session as auth above) ─
async function call(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await sb().rpc(fn, args);
  if (error) throw new Error(error.message);
}
export const rpc = {
  markSent: (id: string) => call("rpc_mark_sent", { p_contribution: id }),
  confirmReceipt: (id: string) => call("rpc_confirm_receipt", { p_contribution: id }),
  dispute: (id: string) => call("rpc_dispute", { p_contribution: id }),
  resetUnpaid: (id: string) => call("rpc_reset_unpaid", { p_contribution: id }),
  castBallot: (voteId: string, choice: "yes" | "no" | "abstain") => call("rpc_cast_ballot", { p_vote: voteId, p_choice: choice }),
  recordMiss: (groupId: string, memberId: string) => call("rpc_record_miss", { p_group: groupId, p_member: memberId }),
  forgiveMiss: (groupId: string, memberId: string) => call("rpc_forgive_miss", { p_group: groupId, p_member: memberId }),
  confirmDistributionReceipt: (id: string) => call("rpc_confirm_distribution_receipt", { p_distribution: id }),
};

export async function openCycle(groupId: string): Promise<number> {
  const { data, error } = await sb().rpc("rpc_open_cycle", { p_group: groupId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function currentUserId(): Promise<string | null> {
  const s = await currentSession();
  return s?.user.id ?? null;
}

export interface MyProfile { id: string; display_name: string; avatar_color: string; }
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const s = await currentSession();
  if (!s) return null;
  const { data, error } = await sb().from("profiles")
    .select("id, display_name, avatar_color").eq("id", s.user.id).single();
  if (error) return { id: s.user.id, display_name: "Member", avatar_color: "#3B8EF5" };
  return data as MyProfile;
}

/** All contribution rows visible to me (mine + my groups'), for home-card pots and statuses. */
export interface ContribRow { id: string; group_id: string; member_id: string; amount_cents: number; status: string; cycle: string; }
export async function fetchContribRows(): Promise<ContribRow[]> {
  const { data, error } = await sb().from("contributions")
    .select("id, group_id, member_id, amount_cents, status, cycle");
  if (error) throw new Error(error.message);
  return (data ?? []) as ContribRow[];
}
