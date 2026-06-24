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
  return (data ?? [])
    .map((r: any) => r.groups)
    .filter(Boolean)
    .filter((g: any) => g.status !== "archived");
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

export async function editGroupMeta(groupId: string, name: string, category: string): Promise<void> {
  const { error } = await sb().rpc("rpc_edit_group_meta", { p_group: groupId, p_name: name, p_category: category });
  if (error) throw new Error(error.message);
}
export async function editGroupTerms(groupId: string, goalCents: number, monthlyCents: number): Promise<void> {
  const { error } = await sb().rpc("rpc_edit_group_terms", { p_group: groupId, p_goal_cents: goalCents, p_monthly_cents: monthlyCents });
  if (error) throw new Error(error.message);
}
export async function closeGroup(groupId: string): Promise<void> {
  const { error } = await sb().rpc("rpc_close_group", { p_group: groupId });
  if (error) throw new Error(error.message);
}

// ── Friends ──────────────────────────────────────────────────
export interface Friend { friendship_id: string; other_id: string; display_name: string; avatar_color: string; status: string; direction: string; }
export async function fetchMyFriends(): Promise<Friend[]> {
  const { data, error } = await sb().rpc("rpc_my_friends");
  if (error) throw new Error(error.message);
  return (data ?? []) as Friend[];
}
export async function fetchMyFriendCode(): Promise<string | null> {
  const s = await currentSession();
  if (!s) return null;
  const { data } = await sb().from("profiles").select("friend_code").eq("id", s.user.id).single();
  return (data as any)?.friend_code ?? null;
}
export async function findByCode(code: string): Promise<{ id: string; display_name: string; avatar_color: string } | null> {
  const { data, error } = await sb().rpc("rpc_find_by_code", { p_code: code });
  if (error || !data || data.length === 0) return null;
  return data[0];
}
export async function sendFriendRequest(code: string): Promise<void> {
  const { error } = await sb().rpc("rpc_send_friend_request", { p_code: code });
  if (error) throw new Error(error.message);
}
export async function respondFriend(friendshipId: string, accept: boolean): Promise<void> {
  const { error } = await sb().rpc("rpc_respond_friend", { p_friendship: friendshipId, p_accept: accept });
  if (error) throw new Error(error.message);
}
export async function inviteFriendToGroup(groupId: string, friendId: string): Promise<void> {
  const { error } = await sb().rpc("rpc_invite_friend_to_group", { p_group: groupId, p_friend: friendId });
  if (error) throw new Error(error.message);
}
export async function sharedGroups(friendId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await sb().rpc("rpc_shared_groups", { p_friend: friendId });
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}

export async function logExpense(groupId: string, description: string, amountCents: number): Promise<void> {
  const s = await currentSession();
  if (!s) throw new Error("Not signed in");
  const { error } = await sb().from("expenses").insert({
    group_id: groupId, logged_by: s.user.id, description, amount_cents: amountCents,
  });
  if (error) throw new Error(error.message);
}

export async function proposeAmendment(groupId: string, kind: "monthly" | "goal", valueCents: number): Promise<void> {
  const { error } = await sb().rpc("rpc_propose_amendment", { p_group: groupId, p_kind: kind, p_value_cents: valueCents });
  if (error) throw new Error(error.message);
}

// ── Calendar: aggregate events across all my groups ──────────
export interface CalEvent {
  id: string; kind: "due" | "vote" | "milestone" | "paid";
  date: string; // ISO
  groupId: string; groupName: string;
  title: string; subtitle?: string;
}
export async function fetchCalendar(): Promise<CalEvent[]> {
  const s = sb();
  const groups = await fetchMyGroups();
  if (groups.length === 0) return [];
  const ids = groups.map(g => g.id);
  const byId: Record<string, GroupRow> = {};
  groups.forEach(g => { byId[g.id] = g; });

  const [contribs, votes] = await Promise.all([
    s.from("contributions").select("group_id, cycle, status, amount_cents, confirmed_at").in("group_id", ids),
    s.from("votes").select("id, group_id, title, status, closes_at").in("group_id", ids),
  ]);
  if (contribs.error) throw new Error(contribs.error.message);
  if (votes.error) throw new Error(votes.error.message);

  const events: CalEvent[] = [];
  const now = new Date();

  // Due dates: the next unpaid cycle per group (1st of the month).
  for (const g of groups) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    events.push({
      id: `due-${g.id}`, kind: "due", date: next.toISOString(),
      groupId: g.id, groupName: g.name,
      title: `${g.name} contribution due`, subtitle: `$${(g.monthly_cents/100).toLocaleString()}`,
    });
  }

  // Confirmed payments (history).
  for (const c of (contribs.data ?? [])) {
    if (c.status === "confirmed" && c.confirmed_at) {
      const g = byId[c.group_id];
      events.push({
        id: `paid-${c.group_id}-${c.cycle}`, kind: "paid", date: c.confirmed_at,
        groupId: c.group_id, groupName: g?.name ?? "",
        title: `Payment confirmed`, subtitle: `${g?.name ?? ""} · $${(c.amount_cents/100).toLocaleString()}`,
      });
    }
  }

  // Open votes (closing dates).
  for (const v of (votes.data ?? [])) {
    if (v.status === "open" && v.closes_at) {
      const g = byId[v.group_id];
      events.push({
        id: `vote-${v.id}`, kind: "vote", date: v.closes_at,
        groupId: v.group_id, groupName: g?.name ?? "",
        title: v.title, subtitle: `${g?.name ?? ""} · vote closes`,
      });
    }
  }

  // Goal milestones: estimate when each group hits its goal at current pace.
  for (const g of groups) {
    const confirmed = (contribs.data ?? []).filter(c => c.group_id === g.id && c.status === "confirmed");
    const saved = confirmed.reduce((a, c) => a + c.amount_cents, 0);
    if (saved < g.goal_cents && g.monthly_cents > 0) {
      const monthsLeft = Math.ceil((g.goal_cents - saved) / g.monthly_cents);
      const eta = new Date(now.getFullYear(), now.getMonth() + monthsLeft, 1);
      events.push({
        id: `milestone-${g.id}`, kind: "milestone", date: eta.toISOString(),
        groupId: g.id, groupName: g.name,
        title: `${g.name} goal reached`, subtitle: `Est. at $${(g.goal_cents/100).toLocaleString()}`,
      });
    }
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ── Notifications (derived feed) ─────────────────────────────
export interface Notif { id: string; kind: string; title: string; subtitle: string | null; at: string; unread: boolean; group_id: string | null; }
export async function fetchNotifications(): Promise<Notif[]> {
  const { data, error } = await sb().rpc("rpc_notifications");
  if (error) throw new Error(error.message);
  return (data ?? []) as Notif[];
}
export async function markNotificationsSeen(): Promise<void> {
  const { error } = await sb().rpc("rpc_mark_notifications_seen");
  if (error) throw new Error(error.message);
}

export interface NotifPrefs { friend_requests: boolean; payments: boolean; votes: boolean; }
const DEFAULT_PREFS: NotifPrefs = { friend_requests: true, payments: true, votes: true };
export async function fetchNotifPrefs(): Promise<NotifPrefs> {
  const s = await currentSession();
  if (!s) return DEFAULT_PREFS;
  const { data } = await sb().from("profiles").select("notification_prefs").eq("id", s.user.id).single();
  const raw = (data as any)?.notification_prefs;
  return { ...DEFAULT_PREFS, ...(raw && typeof raw === "object" ? raw : {}) };
}
export async function updateNotifPrefs(prefs: NotifPrefs): Promise<void> {
  const s = await currentSession();
  if (!s) throw new Error("Not signed in");
  const { error } = await sb().from("profiles").update({ notification_prefs: prefs }).eq("id", s.user.id);
  if (error) throw new Error(error.message);
}
export async function signOut(): Promise<void> {
  await sb().auth.signOut();
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

export interface PaymentHandle { app: string; handle: string; }
export interface MyProfile { id: string; display_name: string; avatar_color: string; payment_handles: PaymentHandle[]; }
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const s = await currentSession();
  if (!s) return null;
  const { data, error } = await sb().from("profiles")
    .select("id, display_name, avatar_color, payment_handles").eq("id", s.user.id).single();
  if (error) return { id: s.user.id, display_name: "Member", avatar_color: "#3B8EF5", payment_handles: [] };
  return { ...data, payment_handles: normalizeHandles((data as any).payment_handles) } as MyProfile;
}

// payment_handles is stored as jsonb; accept either an array or a {app:handle} object.
function normalizeHandles(raw: any): PaymentHandle[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(h => h && h.app && h.handle);
  if (typeof raw === "object") return Object.entries(raw).map(([app, handle]) => ({ app, handle: String(handle) }));
  return [];
}

export async function updatePaymentHandles(handles: PaymentHandle[]): Promise<void> {
  const s = await currentSession();
  if (!s) throw new Error("Not signed in");
  const clean = handles.filter(h => h.app && h.handle.trim());
  // Profile row already exists (created at signup), so update — avoids the
  // not-null insert path that upsert can trip on.
  const { error } = await sb().from("profiles")
    .update({ payment_handles: clean }).eq("id", s.user.id);
  if (error) throw new Error(error.message);
}

/** All contribution rows visible to me (mine + my groups'), for home-card pots and statuses. */
export interface ContribRow { id: string; group_id: string; member_id: string; amount_cents: number; status: string; cycle: string; }
export async function fetchContribRows(): Promise<ContribRow[]> {
  const { data, error } = await sb().from("contributions")
    .select("id, group_id, member_id, amount_cents, status, cycle");
  if (error) throw new Error(error.message);
  return (data ?? []) as ContribRow[];
}
