-- Local Eum English/Japanese localization schema draft.
-- Target project: local-eum-dev / rhkaxmqdkztpbljkunxb.
-- Review only: do not execute until the user approves this exact SQL.
-- Adds columns to existing rows only; does not insert/update/delete host, experience, step, session, or place rows.

begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public.lc_hosts') is null
    or to_regclass('public.lc_experiences') is null
    or to_regclass('public.lc_experience_steps') is null then
    raise exception 'Expected Local Eum tables are missing; stop and inspect the target project';
  end if;

  if to_regprocedure('public.lc_save_experience_details(bigint,timestamptz,jsonb,jsonb)') is null then
    raise exception 'Expected owner-checked experience details RPC is missing; stop and inspect';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lc_hosts'
    and policyname='lc_hosts_update_public_profile_owner_or_admin' and cmd='UPDATE')
    or not exists (select 1 from pg_policies where schemaname='public' and tablename='lc_experiences'
      and policyname='lc_experience_details_update_owner_or_admin' and cmd='UPDATE')
    or not exists (select 1 from pg_policies where schemaname='public' and tablename='lc_experience_steps'
      and policyname='lc_steps_manage_owner_or_admin' and cmd='ALL') then
    raise exception 'Expected owner/admin RLS policies differ; stop and inspect';
  end if;

  if not (select relrowsecurity from pg_class where oid='public.lc_hosts'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.lc_experiences'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.lc_experience_steps'::regclass) then
    raise exception 'RLS is not enabled on every expected Local Eum table; stop and inspect';
  end if;

  if (select prosecdef from pg_proc where oid = to_regprocedure('public.lc_save_experience_details(bigint,timestamptz,jsonb,jsonb)')) then
    raise exception 'Experience detail RPC is SECURITY DEFINER; stop and review its privilege model';
  end if;
end $$;

alter table public.lc_hosts
  add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.lc_experiences
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists available_languages text[] not null default array[]::text[];
alter table public.lc_experience_steps
  add column if not exists translations jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.lc_hosts'::regclass and conname='lc_hosts_translations_locales_check') then
    alter table public.lc_hosts add constraint lc_hosts_translations_locales_check
      check (jsonb_typeof(translations)='object' and translations - 'en' - 'ja' = '{}'::jsonb
        and (not (translations ? 'en') or (jsonb_typeof(translations->'en')='object'
          and coalesce(translations->'en'->>'review_status','DRAFT') in ('DRAFT','REVIEWED')))
        and (not (translations ? 'ja') or (jsonb_typeof(translations->'ja')='object'
          and coalesce(translations->'ja'->>'review_status','DRAFT') in ('DRAFT','REVIEWED'))));
  end if;

  if not exists (select 1 from pg_constraint where conrelid='public.lc_experiences'::regclass and conname='lc_experiences_translations_locales_check') then
    alter table public.lc_experiences add constraint lc_experiences_translations_locales_check
      check (jsonb_typeof(translations)='object' and translations - 'en' - 'ja' = '{}'::jsonb
        and (not (translations ? 'en') or (jsonb_typeof(translations->'en')='object'
          and coalesce(translations->'en'->>'review_status','DRAFT') in ('DRAFT','REVIEWED')))
        and (not (translations ? 'ja') or (jsonb_typeof(translations->'ja')='object'
          and coalesce(translations->'ja'->>'review_status','DRAFT') in ('DRAFT','REVIEWED'))));
  end if;

  if not exists (select 1 from pg_constraint where conrelid='public.lc_experience_steps'::regclass and conname='lc_experience_steps_translations_locales_check') then
    alter table public.lc_experience_steps add constraint lc_experience_steps_translations_locales_check
      check (jsonb_typeof(translations)='object' and translations - 'en' - 'ja' = '{}'::jsonb
        and (not (translations ? 'en') or (jsonb_typeof(translations->'en')='object'
          and coalesce(translations->'en'->>'review_status','DRAFT') in ('DRAFT','REVIEWED')))
        and (not (translations ? 'ja') or (jsonb_typeof(translations->'ja')='object'
          and coalesce(translations->'ja'->>'review_status','DRAFT') in ('DRAFT','REVIEWED'))));
  end if;

  if not exists (select 1 from pg_constraint where conrelid='public.lc_experiences'::regclass and conname='lc_experiences_available_languages_check') then
    alter table public.lc_experiences add constraint lc_experiences_available_languages_check
      check (available_languages <@ array['ko','en','ja']::text[] and array_position(available_languages, null) is null);
  end if;
end $$;

comment on column public.lc_hosts.translations is 'Local Eum host bio translations keyed by locale; review_status is DRAFT or REVIEWED.';
comment on column public.lc_experiences.translations is 'Local Eum experience copy translations keyed by locale; Korean source columns stay canonical.';
comment on column public.lc_experiences.available_languages is 'Host-confirmed languages for conducting this experience; never inferred from translated copy.';
comment on column public.lc_experience_steps.translations is 'Local Eum itinerary step translations keyed by locale.';

grant update (translations) on public.lc_hosts to authenticated;
grant update (translations, available_languages) on public.lc_experiences to authenticated;
grant insert (translations), update (translations) on public.lc_experience_steps to authenticated;

-- Preserve the current SECURITY INVOKER owner/RLS checks and optimistic concurrency behavior.
create or replace function public.lc_save_experience_details(
  _experience_id bigint, _expected_updated_at timestamptz, _details jsonb, _steps jsonb
)
returns timestamptz language plpgsql security invoker set search_path = ''
as $$
declare
  detail public.lc_experiences;
  saved_updated_at timestamptz;
begin
  if jsonb_typeof(_details) is distinct from 'object'
    or jsonb_typeof(_steps) is distinct from 'array' then
    raise exception 'Details must be an object and steps must be an array' using errcode = '22023';
  end if;
  if not (_details ?& array['title', 'description', 'region_code', 'detail_description',
    'inclusions', 'preparation_items', 'precautions', 'hero_image_url', 'hero_image_alt', 'venue_place_id',
    'translations', 'available_languages']) then
    raise exception 'Send all editable detail fields; missing fields will not be cleared' using errcode = '22023';
  end if;
  if jsonb_typeof(_details->'translations') is distinct from 'object'
    or jsonb_typeof(_details->'available_languages') is distinct from 'array' then
    raise exception 'Translations must be an object and available_languages must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(_steps) > 100 then
    raise exception 'At most 100 steps may be saved' using errcode = '22023';
  end if;

  select * into detail from jsonb_populate_record(null::public.lc_experiences, _details);
  update public.lc_experiences e set
    title = detail.title, description = detail.description, region_code = detail.region_code,
    detail_description = detail.detail_description, inclusions = detail.inclusions,
    preparation_items = detail.preparation_items, precautions = detail.precautions,
    hero_image_url = detail.hero_image_url, hero_image_alt = detail.hero_image_alt,
    venue_place_id = detail.venue_place_id, translations = detail.translations,
    available_languages = detail.available_languages
  where e.experience_id = _experience_id and e.updated_at = _expected_updated_at
  returning e.updated_at into saved_updated_at;
  if saved_updated_at is null then
    raise exception 'Experience is stale or update is forbidden; reload before saving' using errcode = '40001';
  end if;

  delete from public.lc_experience_steps s where s.experience_id = _experience_id;
  insert into public.lc_experience_steps (experience_id, step_order, elapsed_min, duration_min, title, description, translations)
  select _experience_id, s.step_order, s.elapsed_min, s.duration_min, s.title, s.description,
    coalesce(s.translations, '{}'::jsonb)
  from jsonb_to_recordset(_steps) as s(
    step_order smallint, elapsed_min integer, duration_min integer, title text, description text, translations jsonb
  );
  return saved_updated_at;
end;
$$;

revoke all on function public.lc_save_experience_details(bigint, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.lc_save_experience_details(bigint, timestamptz, jsonb, jsonb) to authenticated;

commit;

