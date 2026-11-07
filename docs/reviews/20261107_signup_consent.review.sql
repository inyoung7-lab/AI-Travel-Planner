-- REVIEW ONLY. Target: local-eum-dev / rhkaxmqdkztpbljkunxb.
-- Do not execute before policy text/version and remote DB change approval.
-- New signups must supply both consent flags and exactly the approved versions.
-- This also affects administrative Auth user creation. Never invent consent for a test account.
-- Existing accounts are preserved, with NO consent backfill and NO new consent claim.
begin;

create table public.travel_signup_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default clock_timestamp(),
  source text not null default 'SIGNUP_FORM' check (source = 'SIGNUP_FORM')
);
revoke all on public.travel_signup_consents from public, anon, authenticated;
grant select on public.travel_signup_consents to authenticated;
grant select, delete on public.travel_signup_consents to service_role;
alter table public.travel_signup_consents enable row level security;
create policy travel_signup_consents_self_read on public.travel_signup_consents
  for select to authenticated using (user_id = (select auth.uid()));

create function public.travel_record_signup_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  consent jsonb := new.raw_user_meta_data -> 'travel_consent';
begin
  -- Draft version must be reviewed together with shared/servicePolicies.js.
  if consent -> 'terms_accepted' is distinct from 'true'::jsonb
    or consent -> 'privacy_accepted' is distinct from 'true'::jsonb
    or consent ->> 'terms_version' is distinct from '2026-11-07-draft'
    or consent ->> 'privacy_version' is distinct from '2026-11-07-draft' then
    raise exception 'Current terms and privacy consent required' using errcode = '23514';
  end if;
  insert into public.travel_signup_consents (user_id, terms_version, privacy_version)
    values (new.id, consent ->> 'terms_version', consent ->> 'privacy_version');
  return new;
end;
$$;
revoke all on function public.travel_record_signup_consent() from public, anon, authenticated;
create trigger travel_auth_signup_consent after insert on auth.users
  for each row execute function public.travel_record_signup_consent();

commit;
