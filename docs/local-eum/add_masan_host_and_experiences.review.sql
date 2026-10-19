-- Historical review SQL — applied to local-eum-dev on 2026-10-17.
-- Do not rerun: the host, experiences, sessions, steps, places, and image URLs
-- are already present. This file is retained as the reviewed change record.
-- Target: local-eum-dev / rhkaxmqdkztpbljkunxb
-- Auth UID redacted from this repository copy; this applied record is not executable.
-- Originally added one HOST profile and two demo experiences without changing existing rows.
-- STEP 1 was applied first; after image upload and Kakao address verification, STEP 2
-- published both demos. Final state: host 501, experiences 111/112, sessions 15/16.
-- No schema changes, coordinate writes, deletes, booking activation, or ADMIN role.

-- STEP 1 — atomic insertion of the HOST profile and two DRAFT experiences.
begin;
set local lock_timeout = '5s';

do $step1$
declare
  v_user_id constant uuid := '00000000-0000-0000-0000-000000000000'; -- redacted sentinel
  v_host_id bigint;
  v_market_place_id bigint;
  v_museum_place_id bigint;
  v_market_experience_id bigint;
  v_museum_experience_id bigint;
begin
  if (select count(*) from public.lc_hosts) <> 1
    or (select count(*) from public.lc_experiences) <> 10 then
    raise exception 'Baseline is not exactly one host and ten experiences; stop and re-review';
  end if;
  if not exists (select 1 from auth.users where id = v_user_id) then
    raise exception 'Auth user UID does not exist; stop without inserting data';
  end if;
  if exists (select 1 from public.lc_user_roles where user_id = v_user_id and role = 'ADMIN') then
    raise exception 'UID already has ADMIN role; do not modify role assignments';
  end if;
  if exists (select 1 from public.lc_user_roles where user_id = v_user_id and role = 'HOST')
    or exists (select 1 from public.lc_hosts where auth_user_id = v_user_id) then
    raise exception 'UID is already linked to a HOST role/profile; inspect before retrying';
  end if;
  if exists (select 1 from public.lc_hosts where page_slug = 'masan-alley-stories')
    or exists (select 1 from public.lc_experiences where demo_code in
      ('DEMO-MASAN-MARKET-WALK', 'DEMO-MASAN-ART-WALK'))
    or exists (select 1 from public.lc_sessions where seed_code in
      ('LE-DEMO-MASAN-MARKET-SESSION', 'LE-DEMO-MASAN-ART-SESSION'))
    or exists (select 1 from public.lc_places where seed_code in
      ('LE-DEMO-MASAN-MARKET-PLACE', 'LE-DEMO-MASAN-ART-PLACE')) then
    raise exception 'A host slug or demo seed code already exists; inspect before retrying';
  end if;
  if exists (select 1 from public.lc_places where road_address in
      ('경상남도 창원시 마산합포구 복요리로 7', '경상남도 창원시 마산합포구 문신길 147')
      or place_name in ('마산어시장', '창원시립마산문신미술관')) then
    raise exception 'A target venue already exists; inspect ownership and reuse policy before inserting';
  end if;
  if not exists (select 1 from public.lc_program_templates where template_id = 101 and is_active)
    or not exists (select 1 from public.lc_program_templates where template_id = 103 and is_active) then
    raise exception 'Expected active program templates 101 and 103 are unavailable';
  end if;
  if not exists (select 1 from storage.buckets where id = 'local-eum-media' and public
      and file_size_limit = 400000 and allowed_mime_types = array['image/webp']::text[]) then
    raise exception 'Expected public WebP bucket configuration differs; inspect before proceeding';
  end if;

  insert into public.lc_user_roles (user_id, role)
  values (v_user_id, 'HOST');

  insert into public.lc_hosts (
    auth_user_id, display_name, bio, page_slug, approval_status, is_public,
    host_studio_title, host_studio_description
  ) values (
    v_user_id,
    '마산 골목 이야기',
    '마산의 시장과 골목, 예술 공간을 여행자의 시선으로 소개하는 로컬 문화 안내 호스트입니다. 익숙한 동네에서 새로운 이야기를 발견하는 산책형 체험을 운영합니다. 활동 지역: 경남 창원시 마산합포구.',
    'masan-alley-stories',
    'APPROVED',
    true,
    '마산 골목 이야기와 함께 걷기',
    '마산의 시장과 골목, 예술 공간에서 지역 이야기를 발견하는 시연 체험입니다.'
  ) returning host_id into v_host_id;

  insert into public.lc_places (
    owner_host_id, place_name, road_address, map_provider, is_confirmed, seed_code
  ) values (
    v_host_id, '마산어시장', '경상남도 창원시 마산합포구 복요리로 7', 'KAKAO', false,
    'LE-DEMO-MASAN-MARKET-PLACE'
  ) returning place_id into v_market_place_id;

  insert into public.lc_places (
    owner_host_id, place_name, road_address, map_provider, is_confirmed, seed_code
  ) values (
    v_host_id, '창원시립마산문신미술관', '경상남도 창원시 마산합포구 문신길 147', 'KAKAO', false,
    'LE-DEMO-MASAN-ART-PLACE'
  ) returning place_id into v_museum_place_id;

  insert into public.lc_experiences (
    host_id, template_id, title, description, region_code, status, detail_description,
    inclusions, preparation_items, precautions, hero_image_alt, venue_place_id, is_demo, demo_code
  ) values (
    v_host_id, 101, '마산어시장 바다밥상 탐방',
    '마산항과 어시장의 역사, 수산물·건어물 골목을 걸으며 마산의 음식 문화를 알아보는 시장 탐방입니다.',
    'CHANGWON', 'DRAFT',
    '마산항과 마산어시장의 역사와 생활 문화를 살피며 수산물·건어물 골목을 함께 걷습니다. 시식과 음식 구매는 포함되지 않으며, 이 일정은 시연용으로 실제 예약을 받지 않습니다.',
    array['탐방 안내 자료']::text[],
    array['편한 신발', '개인 물']::text[],
    array['음식 구매비·시식비 불포함']::text[],
    'AI 생성 시연 이미지: 마산어시장 수산물 골목 풍경 (실제 장소 사진 아님)',
    v_market_place_id, true, 'DEMO-MASAN-MARKET-WALK'
  ) returning experience_id into v_market_experience_id;

  insert into public.lc_experiences (
    host_id, template_id, title, description, region_code, status, detail_description,
    inclusions, preparation_items, precautions, hero_image_alt, venue_place_id, is_demo, demo_code
  ) values (
    v_host_id, 103, '문신미술관 예술 산책',
    '문신미술관에서 작가와 전시 작품을 살펴보고 조각과 공간을 천천히 관찰하는 예술 산책입니다.',
    'CHANGWON', 'DRAFT',
    '창원시립마산문신미술관을 찾아 작가와 작품을 살펴보고, 조각과 전시 공간을 관찰하며 감상을 나눕니다. 공식 도슨트 프로그램이 아닌 시연용 코스이며 실제 예약을 받지 않습니다.',
    array['작품 감상 안내 자료']::text[],
    array['편한 신발', '개인 메모 도구']::text[],
    array['공식 도슨트 프로그램이 아닌 시연용 코스이며, 시설 운영·관람료·촬영 정책 확인 필요']::text[],
    'AI 생성 시연 이미지: 미술관 조각 정원 풍경 (실제 시설이나 작품 사진 아님)',
    v_museum_place_id, true, 'DEMO-MASAN-ART-WALK'
  ) returning experience_id into v_museum_experience_id;

  insert into public.lc_sessions (
    experience_id, starts_at, ends_at, meeting_place, meeting_place_id,
    min_people, capacity, fee_amount, status, seed_code
  ) values
    (v_market_experience_id, '2026-12-12 10:00:00+09', '2026-12-12 12:00:00+09',
     '어시장유료주차장 인근, 현장 확인 전 임시 기준점', null, 3, 8, 18000, 'DRAFT',
     'LE-DEMO-MASAN-MARKET-SESSION'),
    (v_museum_experience_id, '2026-12-13 14:00:00+09', '2026-12-13 15:30:00+09',
     '미술관 입구, 세부 위치 현장 확인', null, 2, 6, 15000, 'DRAFT',
     'LE-DEMO-MASAN-ART-SESSION');

  insert into public.lc_experience_steps (experience_id, step_order, elapsed_min, duration_min, title)
  values
    (v_market_experience_id, 1, 0, 15, '집결 및 안내'),
    (v_market_experience_id, 2, 15, 30, '마산항과 어시장 역사 소개'),
    (v_market_experience_id, 3, 45, 45, '수산물·건어물 골목 탐방'),
    (v_market_experience_id, 4, 90, 30, '음식 이야기 및 마무리'),
    (v_museum_experience_id, 1, 0, 15, '집결 및 작가 소개'),
    (v_museum_experience_id, 2, 15, 35, '전시 작품 감상'),
    (v_museum_experience_id, 3, 50, 25, '조각과 공간 관찰'),
    (v_museum_experience_id, 4, 75, 15, '감상 나누기와 마무리');
end;
$step1$;

commit;

-- Read-only check after STEP 1. Save the returned DB-issued IDs for Storage paths.
select h.host_id, h.auth_user_id, h.display_name, h.approval_status, h.is_public,
       e.experience_id, e.demo_code, e.title, e.status, e.venue_place_id,
       s.session_id, s.starts_at, s.ends_at, s.status as session_status,
       p.place_name, p.road_address, p.latitude, p.longitude, p.is_confirmed
from public.lc_hosts h
join public.lc_experiences e on e.host_id = h.host_id
join public.lc_sessions s on s.experience_id = e.experience_id
join public.lc_places p on p.place_id = e.venue_place_id
where h.auth_user_id = '00000000-0000-0000-0000-000000000000'::uuid -- redacted sentinel
order by e.demo_code;

-- STEP 2 — run only after both objects exist in Storage and both Kakao address markers
-- have been checked. It publishes the two experiences and opens their demo sessions.
begin;
set local lock_timeout = '5s';

do $step2$
declare
  v_user_id constant uuid := '00000000-0000-0000-0000-000000000000'; -- redacted sentinel
  v_host_id bigint;
  v_expected_count integer;
begin
  if (select count(*) from public.lc_hosts) <> 2
    or (select count(*) from public.lc_experiences) <> 12 then
    raise exception 'Expected exactly two hosts and twelve experiences before publishing';
  end if;
  select host_id into v_host_id from public.lc_hosts where auth_user_id = v_user_id;
  if v_host_id is null then
    raise exception 'Expected HOST profile is missing; do not publish';
  end if;
  if not exists (select 1 from public.lc_user_roles where user_id = v_user_id and role = 'HOST')
    or exists (select 1 from public.lc_user_roles where user_id = v_user_id and role = 'ADMIN') then
    raise exception 'HOST-only role check failed; do not publish';
  end if;

  select count(*) into v_expected_count
  from public.lc_experiences e
  join public.lc_places p on p.place_id = e.venue_place_id and p.owner_host_id = e.host_id
  join public.lc_sessions s on s.experience_id = e.experience_id
  where e.host_id = v_host_id
    and e.demo_code in ('DEMO-MASAN-MARKET-WALK', 'DEMO-MASAN-ART-WALK')
    and e.status = 'DRAFT' and e.is_demo and p.latitude is null and p.longitude is null
    and p.is_confirmed = false and s.status = 'DRAFT'
    and s.seed_code in ('LE-DEMO-MASAN-MARKET-SESSION', 'LE-DEMO-MASAN-ART-SESSION');
  if v_expected_count <> 2 then
    raise exception 'Expected exactly two complete DRAFT experiences and venues; found %', v_expected_count;
  end if;

  if exists (
    select 1
    from public.lc_experiences e
    cross join lateral (values ('experiences/' || e.experience_id::text || '/cover.webp')) as expected(path)
    where e.host_id = v_host_id
      and e.demo_code in ('DEMO-MASAN-MARKET-WALK', 'DEMO-MASAN-ART-WALK')
      and not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'local-eum-media'
          and o.name = expected.path
          and o.metadata ->> 'mimetype' = 'image/webp'
          and (o.metadata ->> 'size')::bigint <= 400000
      )
  ) then
    raise exception 'A WebP object is missing, oversized, or has an unexpected MIME type; do not publish';
  end if;

  update public.lc_places p set is_confirmed = true, confirmed_at = now(), updated_at = now()
  where p.owner_host_id = v_host_id
    and p.seed_code in ('LE-DEMO-MASAN-MARKET-PLACE', 'LE-DEMO-MASAN-ART-PLACE')
    and p.is_confirmed = false and p.latitude is null and p.longitude is null;

  update public.lc_experiences e set
    hero_image_url = 'https://rhkaxmqdkztpbljkunxb.supabase.co/storage/v1/object/public/local-eum-media/experiences/'
      || e.experience_id::text || '/cover.webp',
    status = 'PUBLISHED', updated_at = now()
  where e.host_id = v_host_id and e.status = 'DRAFT'
    and e.demo_code in ('DEMO-MASAN-MARKET-WALK', 'DEMO-MASAN-ART-WALK');

  update public.lc_sessions s set status = 'RECRUITING', updated_at = now()
  from public.lc_experiences e
  where s.experience_id = e.experience_id and e.host_id = v_host_id
    and e.demo_code in ('DEMO-MASAN-MARKET-WALK', 'DEMO-MASAN-ART-WALK')
    and s.status = 'DRAFT'
    and s.seed_code in ('LE-DEMO-MASAN-MARKET-SESSION', 'LE-DEMO-MASAN-ART-SESSION');
end;
$step2$;

commit;

-- Read-only final verification: expected counts are 2 hosts / 12 demo experiences.
select h.host_id, h.auth_user_id, h.display_name, h.approval_status,
       e.experience_id, e.demo_code, e.title, e.status, e.hero_image_url,
       s.session_id, s.starts_at, s.ends_at, s.min_people, s.capacity,
       s.fee_amount, s.status as session_status,
       p.place_name, p.road_address, p.latitude, p.longitude, p.is_confirmed,
       (select count(*) from public.lc_experience_steps x where x.experience_id=e.experience_id) as step_count
from public.lc_hosts h
join public.lc_experiences e on e.host_id = h.host_id
join public.lc_sessions s on s.experience_id = e.experience_id
join public.lc_places p on p.place_id = e.venue_place_id
where h.auth_user_id = '00000000-0000-0000-0000-000000000000'::uuid -- redacted sentinel
order by e.demo_code;
