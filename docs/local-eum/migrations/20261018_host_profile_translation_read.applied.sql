-- local-eum-dev (rhkaxmqdkztpbljkunxb): restore the HOST profile read path.
-- The profile query explicitly selects translations, but authenticated lacks
-- SELECT on that column. RLS and the existing owner policy remain in force.
begin;
set local lock_timeout = '5s';

do $check$
begin
  if to_regclass('public.lc_hosts') is null
    or not exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'lc_hosts' and column_name = 'translations')
    or not (select relrowsecurity from pg_class where oid = 'public.lc_hosts'::regclass)
    or not exists (select 1 from pg_policies
      where schemaname = 'public' and tablename = 'lc_hosts'
        and policyname = 'lc_hosts_read_self_or_admin' and cmd = 'SELECT'
        and 'authenticated' = any(roles))
    or not has_column_privilege('authenticated', 'public.lc_hosts', 'host_id', 'SELECT')
    or not has_column_privilege('authenticated', 'public.lc_hosts', 'display_name', 'SELECT')
    or not has_column_privilege('authenticated', 'public.lc_hosts', 'bio', 'SELECT')
    or has_column_privilege('anon', 'public.lc_hosts', 'translations', 'SELECT')
    or has_column_privilege('authenticated', 'public.lc_hosts', 'auth_user_id', 'SELECT') then
    raise exception 'Unexpected lc_hosts schema, grants, or RLS; no permission changed';
  end if;
end;
$check$;

grant select (translations) on public.lc_hosts to authenticated;

do $verify$
begin
  if not has_column_privilege('authenticated', 'public.lc_hosts', 'translations', 'SELECT')
    or has_column_privilege('anon', 'public.lc_hosts', 'translations', 'SELECT')
    or has_column_privilege('authenticated', 'public.lc_hosts', 'auth_user_id', 'SELECT')
    or not (select relrowsecurity from pg_class where oid = 'public.lc_hosts'::regclass) then
    raise exception 'HOST profile read grant verification failed; rolling back';
  end if;
end;
$verify$;
commit;
