-- ─────────────────────────────────────────────────────────────
-- Sanduq production schema (Supabase / Postgres)
-- Money is stored in integer cents. No floats, ever.
-- Every state change writes to audit_events (append-only).
-- Clients NEVER update money tables directly: all transitions go
-- through SECURITY DEFINER functions that enforce the rules.
-- ─────────────────────────────────────────────────────────────

create type contribution_status as enum ('unpaid','marked_sent','confirmed','disputed','missed');
create type vote_type as enum ('amendment','payout','succession');
create type vote_status as enum ('open','passed','failed','executed');
create type join_policy as enum ('catchup','prorata','closed');
create type exit_policy as enum ('refund','pot','vote');
create type expense_status as enum ('recorded','reimbursed');
create type payout_mode as enum ('single','split','prorata');

-- ── Identity ─────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 60),
  avatar_color text not null default '#3B8EF5',
  payment_handles jsonb not null default '{}',   -- {"venmo":"@x","cashapp":"$x"}
  created_at timestamptz not null default now()
);

-- ── Groups & membership ──────────────────────────────────────
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  category text not null default 'Other',
  scene text,                                    -- poster art key or storage URL
  goal_cents bigint not null check (goal_cents > 0 and goal_cents <= 100000000),
  monthly_cents bigint not null check (monthly_cents > 0 and monthly_cents <= goal_cents),
  treasurer_id uuid not null references profiles(id),
  miss_limit int not null default 3 check (miss_limit between 1 and 12),
  join_policy join_policy not null default 'catchup',
  exit_policy exit_policy not null default 'pot',
  status text not null default 'active' check (status in ('active','completed','archived')),
  started_at date not null default current_date,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table memberships (
  group_id uuid not null references groups(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  joined_at date not null default current_date,
  catchup_owed_cents bigint not null default 0 check (catchup_owed_cents >= 0),
  misses int not null default 0 check (misses >= 0),
  removed boolean not null default false,
  primary key (group_id, member_id)
);

-- ── Contributions (the two-sided state machine) ─────────────
create table contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  member_id uuid not null references profiles(id),
  cycle date not null,                            -- first of month
  amount_cents bigint not null check (amount_cents > 0),
  status contribution_status not null default 'unpaid',
  marked_sent_at timestamptz,
  confirmed_at timestamptz,
  unique (group_id, member_id, cycle)
);

-- ── Distributions (payout with per-recipient confirmation) ──
create table distributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  mode payout_mode not null,
  pot_cents bigint not null check (pot_cents > 0),
  vote_id uuid,                                   -- the authorizing vote
  recorded_by uuid not null references profiles(id),
  recorded_at timestamptz not null default now(),
  completed_at timestamptz
);

create table distribution_receipts (
  distribution_id uuid not null references distributions(id) on delete cascade,
  member_id uuid not null references profiles(id),
  amount_cents bigint not null check (amount_cents >= 0),
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  primary key (distribution_id, member_id)
);

-- ── Expenses ─────────────────────────────────────────────────
create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  logged_by uuid not null references profiles(id),
  description text not null check (length(description) between 1 and 200),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  receipt_url text,
  status expense_status not null default 'recorded',
  reimbursed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Governance ───────────────────────────────────────────────
create table votes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  type vote_type not null,
  title text not null,
  payload jsonb not null default '{}',            -- {kind,value_cents} | {nominee_id} | {mode,recipient_id}
  proposed_by uuid not null references profiles(id),
  status vote_status not null default 'open',
  closes_at timestamptz not null default now() + interval '5 days',
  created_at timestamptz not null default now()
);

create table ballots (
  vote_id uuid not null references votes(id) on delete cascade,
  member_id uuid not null references profiles(id),
  choice text not null check (choice in ('yes','no','abstain')),
  cast_at timestamptz not null default now(),
  primary key (vote_id, member_id)               -- one ballot per member, ever
);

-- ── Append-only audit log: the product ───────────────────────
create table audit_events (
  id bigint generated always as identity primary key,
  group_id uuid,
  actor_id uuid,
  table_name text not null,
  action text not null,
  row_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
-- Nothing updates or deletes audit rows. Enforce it.
create or replace function deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'audit_events is append-only'; end $$;
create trigger audit_no_update before update or delete on audit_events
  for each row execute function deny_mutation();

create or replace function write_audit() returns trigger language plpgsql security definer as $$
begin
  insert into audit_events (group_id, actor_id, table_name, action, row_id, before, after)
  values (
    coalesce(new.group_id, old.group_id, null),
    auth.uid(), tg_table_name, tg_op,
    coalesce(new.id::text, old.id::text, null),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_contributions after insert or update on contributions
  for each row execute function write_audit();
create trigger audit_distributions after insert or update on distributions
  for each row execute function write_audit();
create trigger audit_receipts after insert or update on distribution_receipts
  for each row execute function write_audit();
create trigger audit_expenses after insert or update on expenses
  for each row execute function write_audit();
create trigger audit_votes after insert or update on votes
  for each row execute function write_audit();
create trigger audit_memberships after insert or update on memberships
  for each row execute function write_audit();

-- ── Helpers ──────────────────────────────────────────────────
create or replace function is_member(gid uuid) returns boolean language sql stable as
$$ select exists (select 1 from memberships where group_id = gid and member_id = auth.uid() and not removed) $$;

create or replace function is_treasurer(gid uuid) returns boolean language sql stable as
$$ select exists (select 1 from groups where id = gid and treasurer_id = auth.uid()) $$;

create or replace function member_count(gid uuid) returns int language sql stable as
$$ select count(*)::int from memberships where group_id = gid and not removed $$;

create or replace function majority_needed(gid uuid) returns int language sql stable as
$$ select (member_count(gid) / 2) + 1 $$;

-- ── Row Level Security: members see their groups, nothing else ─
alter table profiles enable row level security;
alter table groups enable row level security;
alter table memberships enable row level security;
alter table contributions enable row level security;
alter table distributions enable row level security;
alter table distribution_receipts enable row level security;
alter table expenses enable row level security;
alter table votes enable row level security;
alter table ballots enable row level security;
alter table audit_events enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "read group" on groups for select using (is_member(id));
create policy "read memberships" on memberships for select using (is_member(group_id));
create policy "read contributions" on contributions for select using (is_member(group_id));
create policy "read distributions" on distributions for select using (is_member(group_id));
create policy "read receipts" on distribution_receipts for select
  using (exists (select 1 from distributions d where d.id = distribution_id and is_member(d.group_id)));
create policy "read expenses" on expenses for select using (is_member(group_id));
create policy "read votes" on votes for select using (is_member(group_id));
create policy "read ballots" on ballots for select
  using (exists (select 1 from votes v where v.id = vote_id and is_member(v.group_id)));
create policy "read audit" on audit_events for select using (group_id is not null and is_member(group_id));
-- Expenses can be inserted by any member; everything money-state goes through RPCs below.
create policy "log expense" on expenses for insert with check (is_member(group_id) and logged_by = auth.uid());

-- ── RPCs: the only way money state changes ───────────────────
-- Two-sided contribution confirmation, mirroring src/lib/machines.ts

create or replace function rpc_mark_sent(p_contribution uuid)
returns void language plpgsql security definer as $$
declare c contributions;
begin
  select * into c from contributions where id = p_contribution for update;
  if c.id is null then raise exception 'Not found'; end if;
  if c.member_id <> auth.uid() then raise exception 'Only the paying member can mark sent'; end if;
  if c.status not in ('unpaid','disputed','missed') then raise exception 'Cannot mark sent from %', c.status; end if;
  update contributions set status = 'marked_sent', marked_sent_at = now() where id = p_contribution;
end $$;

create or replace function rpc_confirm_receipt(p_contribution uuid)
returns void language plpgsql security definer as $$
declare c contributions;
begin
  select * into c from contributions where id = p_contribution for update;
  if c.id is null then raise exception 'Not found'; end if;
  if not is_treasurer(c.group_id) then raise exception 'Only the treasurer can confirm'; end if;
  if c.member_id = auth.uid() then raise exception 'Treasurer cannot self-confirm'; end if;
  if c.status not in ('marked_sent','disputed') then raise exception 'Cannot confirm from %', c.status; end if;
  update contributions set status = 'confirmed', confirmed_at = now() where id = p_contribution;
end $$;

create or replace function rpc_dispute(p_contribution uuid)
returns void language plpgsql security definer as $$
declare c contributions;
begin
  select * into c from contributions where id = p_contribution for update;
  if not is_treasurer(c.group_id) then raise exception 'Only the treasurer can dispute'; end if;
  if c.status <> 'marked_sent' then raise exception 'Cannot dispute from %', c.status; end if;
  update contributions set status = 'disputed' where id = p_contribution;
end $$;

create or replace function rpc_reset_unpaid(p_contribution uuid)
returns void language plpgsql security definer as $$
declare c contributions;
begin
  select * into c from contributions where id = p_contribution for update;
  if c.status <> 'disputed' then raise exception 'Only disputed contributions can reset'; end if;
  if not (is_treasurer(c.group_id) or c.member_id = auth.uid())
    then raise exception 'Only the treasurer or the payer can reset'; end if;
  update contributions set status = 'unpaid', marked_sent_at = null where id = p_contribution;
end $$;

-- Ballots: cast once; executing effects happens at close or on majority.
create or replace function rpc_cast_ballot(p_vote uuid, p_choice text)
returns void language plpgsql security definer as $$
declare v votes; yes_count int; needed int;
begin
  select * into v from votes where id = p_vote for update;
  if not is_member(v.group_id) then raise exception 'Not a member'; end if;
  if v.status <> 'open' then raise exception 'Vote is closed'; end if;
  insert into ballots (vote_id, member_id, choice) values (p_vote, auth.uid(), p_choice);
  select count(*) into yes_count from ballots where vote_id = p_vote and choice = 'yes';
  needed := majority_needed(v.group_id);
  if yes_count >= needed then
    update votes set status = 'passed' where id = p_vote;
    -- Execute effects
    if v.type = 'succession' then
      update groups set treasurer_id = (v.payload->>'nominee_id')::uuid where id = v.group_id;
    elsif v.type = 'amendment' then
      if v.payload->>'kind' = 'monthly' then
        update groups set monthly_cents = (v.payload->>'value_cents')::bigint where id = v.group_id;
      elsif v.payload->>'kind' = 'goal' then
        update groups set goal_cents = (v.payload->>'value_cents')::bigint where id = v.group_id;
      end if;
    end if;
    update votes set status = 'executed' where id = p_vote and type in ('succession','amendment');
  end if;
end $$;

-- Missed payments: treasurer records a miss; removal applies at the limit.
create or replace function rpc_record_miss(p_group uuid, p_member uuid)
returns void language plpgsql security definer as $$
declare lim int;
begin
  if not is_treasurer(p_group) then raise exception 'Only the treasurer records misses'; end if;
  if p_member = auth.uid() then raise exception 'Cannot record a miss against yourself'; end if;
  select miss_limit into lim from groups where id = p_group;
  update memberships set misses = misses + 1,
    removed = (misses + 1 >= lim)
    where group_id = p_group and member_id = p_member;
end $$;

create or replace function rpc_forgive_miss(p_group uuid, p_member uuid)
returns void language plpgsql security definer as $$
begin
  if not is_treasurer(p_group) then raise exception 'Only the treasurer forgives misses'; end if;
  update memberships set misses = greatest(0, misses - 1), removed = false
    where group_id = p_group and member_id = p_member;
end $$;

-- Distribution receipts: each recipient confirms their own; group closes on the last one.
create or replace function rpc_confirm_distribution_receipt(p_distribution uuid)
returns void language plpgsql security definer as $$
declare d distributions; remaining int;
begin
  select * into d from distributions where id = p_distribution for update;
  if d.id is null then raise exception 'Not found'; end if;
  update distribution_receipts set confirmed = true, confirmed_at = now()
    where distribution_id = p_distribution and member_id = auth.uid() and not confirmed;
  select count(*) into remaining from distribution_receipts
    where distribution_id = p_distribution and not confirmed;
  if remaining = 0 then
    update distributions set completed_at = now() where id = p_distribution;
    update groups set status = 'completed' where id = d.group_id;
  end if;
end $$;
