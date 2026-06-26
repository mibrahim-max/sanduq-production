-- ============================================================
-- 0015: Sanduq themes (immersive per-group visual worlds)
--  * groups.theme (text) — theme id from the app's theme library.
--    Default 'minimal_light'. Any member can change it (cosmetic).
--  * rpc_set_theme — any member of the group may set it; not vote-gated.
-- Safe to run multiple times.
-- ============================================================

alter table groups add column if not exists theme text not null default 'minimal_light';

create or replace function rpc_set_theme(p_group uuid, p_theme text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not is_member(p_group) then raise exception 'Only members can change the theme'; end if;
  if p_theme is null or length(p_theme) < 1 or length(p_theme) > 40 then
    raise exception 'Invalid theme';
  end if;
  update groups set theme = p_theme where id = p_group;

  insert into audit_events (group_id, actor_id, table_name, action, row_id, before, after)
  values (p_group, auth.uid(), 'groups', 'set_theme', p_group::text,
          null, jsonb_build_object('theme', p_theme));
end $$;

grant execute on function rpc_set_theme(uuid, text) to authenticated;
