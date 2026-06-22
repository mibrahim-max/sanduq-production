-- ─────────────────────────────────────────────────────────────
-- 0002: app functions — run this in the Supabase SQL editor
-- after 0001. Adds the signup→profile trigger and the only
-- permitted paths for creating and joining groups.
-- ─────────────────────────────────────────────────────────────

-- 1) Auto-create a profile row on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'New member'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2) Create a group: creator becomes treasurer, gets a membership
--    and an open contribution row for the current cycle.
create or replace function rpc_create_group(
  p_name text, p_category text,
  p_goal_cents bigint, p_monthly_cents bigint,
  p_join_policy join_policy, p_exit_policy exit_policy
) returns uuid language plpgsql security definer as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into groups (name, category, goal_cents, monthly_cents, treasurer_id, join_policy, exit_policy, created_by)
  values (p_name, coalesce(p_category,'Other'), p_goal_cents, p_monthly_cents, auth.uid(), p_join_policy, p_exit_policy, auth.uid())
  returning id into gid;
  insert into memberships (group_id, member_id) values (gid, auth.uid());
  insert into contributions (group_id, member_id, cycle, amount_cents)
  values (gid, auth.uid(), date_trunc('month', now())::date, p_monthly_cents);
  return gid;
end $$;

-- 3) Join a group: enforces the creator-set join policy and
--    computes catch-up owed for catchup groups.
create or replace function rpc_join_group(p_group uuid)
returns void language plpgsql security definer as $$
declare g groups; months_elapsed int; owed bigint;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into g from groups where id = p_group;
  if g.id is null then raise exception 'Group not found'; end if;
  if g.status <> 'active' then raise exception 'This group is %', g.status; end if;
  if g.join_policy = 'closed' then raise exception 'This group is locked to new members'; end if;
  if exists (select 1 from memberships where group_id = p_group and member_id = auth.uid())
    then raise exception 'Already a member'; end if;
  months_elapsed := greatest(0,
    (extract(year from age(current_date, g.started_at)) * 12
     + extract(month from age(current_date, g.started_at)))::int);
  owed := case when g.join_policy = 'catchup' then g.monthly_cents * months_elapsed else 0 end;
  insert into memberships (group_id, member_id, catchup_owed_cents) values (p_group, auth.uid(), owed);
  insert into contributions (group_id, member_id, cycle, amount_cents)
  values (p_group, auth.uid(), date_trunc('month', now())::date, g.monthly_cents)
  on conflict do nothing;
end $$;

-- 4) Open a new monthly cycle (treasurer action): creates the
--    unpaid contribution rows for every active member.
create or replace function rpc_open_cycle(p_group uuid)
returns int language plpgsql security definer as $$
declare g groups; n int;
begin
  if not is_treasurer(p_group) then raise exception 'Only the treasurer opens a cycle'; end if;
  select * into g from groups where id = p_group;
  insert into contributions (group_id, member_id, cycle, amount_cents)
  select p_group, m.member_id, date_trunc('month', now())::date, g.monthly_cents
  from memberships m
  where m.group_id = p_group and not m.removed
  on conflict (group_id, member_id, cycle) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
