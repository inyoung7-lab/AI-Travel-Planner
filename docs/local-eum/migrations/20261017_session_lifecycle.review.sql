-- Review-only: adds owner-scoped draft creation and soft cancellation for lc_sessions.
-- Target project: local-eum-dev / rhkaxmqdkztpbljkunxb
-- Do not run until the project ID and the checked constraint/policy names are confirmed.
begin;

do $guard$
declare
  v_status_check text;
begin
  if to_regclass('public.lc_sessions') is null then
    raise exception 'Expected public.lc_sessions table was not found';
  end if;

  select pg_get_constraintdef(oid)
    into v_status_check
  from pg_constraint
  where conrelid = 'public.lc_sessions'::regclass
    and conname = 'lc_sessions_status_check'
    and contype = 'c';

  if v_status_check is distinct from 'CHECK ((status = ANY (ARRAY[''DRAFT''::text, ''RECRUITING''::text])))' then
    raise exception 'Unexpected lc_sessions status constraint: %', coalesce(v_status_check, '<missing>');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lc_sessions'
      and policyname = 'lc_sessions_update_owner_or_admin'
      and cmd = 'UPDATE'
  ) then
    raise exception 'Expected owner-scoped session update policy was not found';
  end if;
end
$guard$;

alter table public.lc_sessions
  drop constraint lc_sessions_status_check;

alter table public.lc_sessions
  add constraint lc_sessions_status_check
  check (status in ('DRAFT', 'RECRUITING', 'CANCELLED'));

drop policy if exists lc_sessions_insert_owner_draft on public.lc_sessions;
create policy lc_sessions_insert_owner_draft
  on public.lc_sessions
  for insert
  to authenticated
  with check (
    lc_private.lc_owns_experience(experience_id)
    and status = 'DRAFT'
  );

drop policy lc_sessions_update_owner_or_admin on public.lc_sessions;
create policy lc_sessions_update_owner_or_admin
  on public.lc_sessions
  for update
  to authenticated
  using (
    lc_private.lc_owns_experience(experience_id)
    or (select lc_private.lc_has_role('ADMIN'))
  )
  with check (
    (
      lc_private.lc_owns_experience(experience_id)
      or (select lc_private.lc_has_role('ADMIN'))
    )
    and (
      status in ('DRAFT', 'CANCELLED')
      or lc_private.lc_is_public_experience(experience_id)
    )
  );

grant insert (
  experience_id,
  starts_at,
  ends_at,
  meeting_place,
  recruit_deadline,
  min_people,
  capacity,
  fee_amount,
  status
) on public.lc_sessions to authenticated;

commit;
