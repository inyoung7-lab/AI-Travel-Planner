-- REVIEW ONLY. Do not run before the user confirms the visible Supabase project ID:
-- local-eum-dev / rhkaxmqdkztpbljkunxb.
-- SQL Editor does not expose a trustworthy project-ref setting to this script.
-- This migration creates no experiences, sessions, applications, users, or hosts.
-- It preserves application/payment history and performs no refunds or notifications.

-- Read-only preflight (run first and confirm the Dashboard project ref manually):
-- select current_database();
-- select to_regclass('public.lc_experiences'), to_regclass('public.lc_sessions'),
--        to_regclass('public.lc_applications'), to_regclass('public.lc_application_payments');
-- select conrelid::regclass, conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid in ('public.lc_experiences'::regclass, 'public.lc_sessions'::regclass)
--   and conname in ('lc_experiences_status_check', 'lc_sessions_status_check');
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_policies where schemaname = 'public' and tablename in ('lc_experiences', 'lc_sessions');
-- select count(*) as application_count from public.lc_applications;

begin;

do $guard$
declare
  v_experience_status_check text;
  v_session_status_check text;
begin
  if to_regclass('public.lc_experiences') is null
    or to_regclass('public.lc_sessions') is null
    or to_regclass('public.lc_applications') is null
    or to_regclass('public.lc_application_payments') is null then
    raise exception 'Expected local-eum tables are missing; no changes were applied';
  end if;

  if to_regprocedure('lc_private.lc_owns_experience(bigint)') is null
    or to_regprocedure('lc_private.lc_is_public_experience(bigint)') is null
    or to_regprocedure('lc_private.lc_has_role(text)') is null then
    raise exception 'Expected local-eum ownership helpers are missing; no changes were applied';
  end if;

  select pg_get_constraintdef(oid) into v_experience_status_check
  from pg_constraint
  where conrelid = 'public.lc_experiences'::regclass
    and conname = 'lc_experiences_status_check'
    and contype = 'c';
  if v_experience_status_check is distinct from
    'CHECK ((status = ANY (ARRAY[''DRAFT''::text, ''PUBLISHED''::text])))' then
    raise exception 'Unexpected lc_experiences status constraint: %', coalesce(v_experience_status_check, '<missing>');
  end if;

  select pg_get_constraintdef(oid) into v_session_status_check
  from pg_constraint
  where conrelid = 'public.lc_sessions'::regclass
    and conname = 'lc_sessions_status_check'
    and contype = 'c';
  if v_session_status_check is distinct from
    'CHECK ((status = ANY (ARRAY[''DRAFT''::text, ''RECRUITING''::text])))' then
    raise exception 'Unexpected lc_sessions status constraint: %', coalesce(v_session_status_check, '<missing>');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lc_sessions'
      and policyname = 'lc_sessions_update_owner_or_admin' and cmd = 'UPDATE'
  ) then
    raise exception 'Expected owner-scoped session UPDATE policy is missing';
  end if;

  if to_regprocedure('public.lc_submit_experience_application(bigint,text,text,text,text,integer,text,text,boolean)') is null then
    raise exception 'Expected existing application RPC is missing';
  end if;
  if to_regprocedure('public.lc_cancel_experience(bigint)') is not null then
    raise exception 'lc_cancel_experience already exists; review its definition before applying this migration';
  end if;
end
$guard$;

alter table public.lc_experiences drop constraint lc_experiences_status_check;
alter table public.lc_experiences add constraint lc_experiences_status_check
  check (status in ('DRAFT', 'PUBLISHED', 'CANCELLED'));

alter table public.lc_sessions drop constraint lc_sessions_status_check;
alter table public.lc_sessions add constraint lc_sessions_status_check
  check (status in ('DRAFT', 'RECRUITING', 'CANCELLED'));

drop policy if exists lc_sessions_insert_owner_draft on public.lc_sessions;
create policy lc_sessions_insert_owner_draft
  on public.lc_sessions for insert to authenticated
  with check (
    status = 'DRAFT'
    and (
      lc_private.lc_owns_experience(experience_id)
      or (select lc_private.lc_has_role('ADMIN'))
    )
  );

drop policy lc_sessions_update_owner_or_admin on public.lc_sessions;
create policy lc_sessions_update_owner_or_admin
  on public.lc_sessions for update to authenticated
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
  experience_id, starts_at, ends_at, meeting_place, recruit_deadline,
  min_people, capacity, fee_amount, status
) on public.lc_sessions to authenticated;

create or replace function public.lc_cancel_experience(_experience_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_experience public.lc_experiences%rowtype;
  v_cancelled_session_ids bigint[];
begin
  if _experience_id is null or _experience_id <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_EXPERIENCE_ID';
  end if;

  select e.* into v_experience
  from public.lc_experiences e
  where e.experience_id = _experience_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'EXPERIENCE_NOT_FOUND';
  end if;
  if not lc_private.lc_owns_experience(_experience_id)
    and not lc_private.lc_has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'EXPERIENCE_CANCEL_FORBIDDEN';
  end if;

  update public.lc_experiences
  set status = 'CANCELLED'
  where experience_id = _experience_id;

  with cancelled as (
    update public.lc_sessions s
    set status = 'CANCELLED'
    where s.experience_id = _experience_id
      and s.starts_at > now()
      and s.status <> 'CANCELLED'
    returning s.session_id
  )
  select coalesce(array_agg(cancelled.session_id order by cancelled.session_id), array[]::bigint[])
    into v_cancelled_session_ids
  from cancelled;

  return jsonb_build_object(
    'experience_id', _experience_id,
    'status', 'CANCELLED',
    'cancelled_session_ids', to_jsonb(v_cancelled_session_ids)
  );
end;
$$;

revoke all on function public.lc_cancel_experience(bigint) from public, anon;
grant execute on function public.lc_cancel_experience(bigint) to authenticated;
comment on function public.lc_cancel_experience(bigint) is
  '소유 HOST 또는 ADMIN이 체험과 시작 전 회차를 원자적으로 취소한다. 신청/결제 기록은 보존한다.';

-- Postflight: execute only after separately approved application; inspect schema and history counts.
-- select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid in ('public.lc_experiences'::regclass, 'public.lc_sessions'::regclass)
--   and conname in ('lc_experiences_status_check', 'lc_sessions_status_check');
-- select policyname, cmd, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename = 'lc_sessions';
-- select count(*) as application_count from public.lc_applications;

commit;
