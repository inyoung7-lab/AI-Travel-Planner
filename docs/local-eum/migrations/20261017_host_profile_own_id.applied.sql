-- Applied to local-eum-dev after user approval on 2026-10-17.
-- Target: local-eum-dev (rhkaxmqdkztpbljkunxb).
-- Purpose: let an authenticated HOST discover only their own host_id.
-- The returned ID is then used for a normal lc_hosts SELECT protected by RLS.
-- No existing data, table privileges, or policies are changed.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
begin
  if to_regclass('public.lc_hosts') is null
    or to_regclass('public.lc_user_roles') is null then
    raise exception 'Expected local-eum tables are missing; stop deployment';
  end if;

  if to_regprocedure('public.lc_my_host_id()') is not null then
    raise exception 'lc_my_host_id already exists; review before replacing';
  end if;

  if not exists (
    select 1 from public.lc_hosts
    where host_id = 500
  ) or not exists (
    select 1 from public.lc_hosts
    where host_id = 501
      and auth_user_id = 'c5e491a6-55cf-4059-b83e-5a36946de07f'::uuid
  ) then
    raise exception 'Expected HOST #500/#501 ownership was not found; stop deployment';
  end if;
end;
$preflight$;

create function public.lc_my_host_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $function$
  select h.host_id
  from public.lc_hosts h
  where h.auth_user_id = (select auth.uid())
    and exists (
      select 1 from public.lc_user_roles r
      where r.user_id = (select auth.uid())
        and r.role = 'HOST'
    )
  limit 1;
$function$;

revoke all on function public.lc_my_host_id() from public, anon, authenticated;
grant execute on function public.lc_my_host_id() to authenticated;

comment on function public.lc_my_host_id() is
  'Returns the caller''s own host_id only when the caller has the HOST role. Read-only.';

commit;
