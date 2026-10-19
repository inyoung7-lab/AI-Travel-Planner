-- Guarded review script prepared from inspection on 2026-10-17.
-- Source intentionally ends in ROLLBACK; execute only after reviewing all guards.
-- Target: rhkaxmqdkztpbljkunxb / local-eum-dev.
-- No Auth, role, host, experience, session, or place rows are inserted.
-- Host #500's ten experiences are expected to remain untouched.

begin;
set local lock_timeout = '5s';

do $preflight$
declare
  v_count integer;
begin
  if (select count(*) from public.lc_hosts) <> 2
     or (select count(*) from public.lc_experiences) <> 12 then
    raise exception 'Expected 2 hosts and 12 experiences; stop and inspect';
  end if;
  if (select count(*) from public.lc_experiences where host_id = 500) <> 10
     or (select count(*) from public.lc_experiences where host_id = 501) <> 2 then
    raise exception 'Expected 10 experiences for host 500 and 2 for host 501';
  end if;
  if not exists (
    select 1 from public.lc_hosts
    where host_id = 501 and display_name = '마산 골목 이야기'
      and approval_status = 'APPROVED' and is_public
  ) then
    raise exception 'Host #501 identity or approval state changed';
  end if;
  if (select count(*) from public.lc_experiences
      where (experience_id = 111 and host_id = 501
             and title = '마산어시장 바다밥상 탐방'
             and template_id = 101 and status = 'PUBLISHED'
             and is_demo and demo_code = 'DEMO-MASAN-MARKET-WALK'
             and venue_place_id = 12)
         or (experience_id = 112 and host_id = 501
             and title = '문신미술관 예술 산책'
             and template_id = 103 and status = 'PUBLISHED'
             and is_demo and demo_code = 'DEMO-MASAN-ART-WALK'
             and venue_place_id = 13)) <> 2 then
    raise exception 'Experience #111/#112 ownership or contents changed';
  end if;
  if (select count(*) from public.lc_sessions
      where (session_id = 15 and experience_id = 111
             and starts_at = timestamptz '2026-12-12 01:00:00+00'
             and ends_at = timestamptz '2026-12-12 03:00:00+00'
             and recruit_deadline = timestamptz '2026-10-24 04:00:00+00'
             and status = 'RECRUITING'
             and seed_code = 'LE-DEMO-MASAN-MARKET-SESSION')
         or (session_id = 16 and experience_id = 112
             and starts_at = timestamptz '2026-12-13 05:00:00+00'
             and ends_at = timestamptz '2026-12-13 06:30:00+00'
             and recruit_deadline is null
             and status = 'RECRUITING'
             and seed_code = 'LE-DEMO-MASAN-ART-SESSION')) <> 2 then
    raise exception 'Session IDs, dates, deadline, or status changed';
  end if;
  if (select count(*) from public.lc_experience_steps
      where experience_id in (111, 112)) <> 8
     or (select count(*) from public.lc_experience_steps
         where experience_id = 111) <> 4
     or (select count(*) from public.lc_experience_steps
         where experience_id = 112) <> 4 then
    raise exception 'Expected four existing steps for each target experience';
  end if;
  if not exists (select 1 from public.lc_places
                 where place_id = 8 and owner_host_id = 500
                   and place_name = '창동예술촌아트센터'
                   and road_address = '경상남도 창원시 마산합포구 오동서6길 24'
                   and is_confirmed)
     or not exists (select 1 from public.lc_places
                    where place_id = 12 and owner_host_id = 501
                      and place_name = '마산어시장'
                      and road_address = '경상남도 창원시 마산합포구 복요리로 7'
                      and is_confirmed) then
    raise exception 'Expected confirmed places #8/#12 or their ownership changed';
  end if;
  if not exists (select 1 from public.lc_program_templates
                 where template_id = 101 and is_active)
     or not exists (select 1 from public.lc_program_templates
                    where template_id = 103 and is_active) then
    raise exception 'Expected active templates #101/#103 are unavailable';
  end if;
  if exists (select 1 from public.lc_experiences
             where demo_code in ('DEMO-MASAN-SEAFOOD-LAB', 'DEMO-MASAN-MYSTERY-MAP')
               and experience_id not in (111, 112))
     or exists (select 1 from public.lc_sessions
                where seed_code in ('LE-DEMO-MASAN-SEAFOOD-SESSION', 'LE-DEMO-MASAN-MYSTERY-SESSION')
                  and session_id not in (15, 16)) then
    raise exception 'A target demo/seed code is already used by another row';
  end if;
  if (select count(*) from storage.objects
      where bucket_id = 'local-eum-media'
        and name in ('experiences/111/cover-v2.webp', 'experiences/112/cover-v2.webp')
        and metadata ->> 'mimetype' = 'image/webp'
        and (metadata ->> 'size')::bigint <= 400000) <> 2 then
    raise exception 'Both new WebP objects must exist and be <= 400KB before DB changes';
  end if;

  select count(*) into v_count from public.lc_experiences where host_id = 500;
  if v_count <> 10 then raise exception 'Host #500 preservation assertion failed'; end if;
end;
$preflight$;

update public.lc_hosts
set bio = '마산의 오래된 골목과 시장을 새로운 방식으로 경험하도록 돕는 로컬 호스트입니다. 익숙한 동네에서 특별한 이야기를 발견하고, 여행자가 직접 참여하는 미션과 활동을 운영합니다. 활동 지역: 경남 창원시 마산합포구.',
    host_studio_title = '마산 골목 이야기',
    host_studio_description = '마산의 시장과 골목, 예술 공간을 여행자의 시선으로 소개합니다. 익숙한 동네에서 새로운 이야기를 발견하는 산책형 로컬 체험을 운영합니다.'
where host_id = 501 and display_name = '마산 골목 이야기';

update public.lc_experiences
set title = case experience_id
      when 111 then '오늘의 바다밥상 연구소'
      when 112 then '사라진 마산의 비밀지도'
    end,
    template_id = case experience_id when 111 then 101 when 112 then 103 end,
    description = case experience_id
      when 111 then '마산어시장의 제철 식재료와 음식문화를 탐구하고, 비교 시식과 취향별 밥상 카드를 기획한 시연용 미식 체험입니다.'
      when 112 then '창동 원도심의 골목에서 단서를 풀고 팀만의 지도를 완성하는 호스트 진행형 야외 추리게임입니다.'
    end,
    detail_description = case experience_id
      when 111 then '오늘의 바다밥상 연구소는 마산어시장에서 제철 재료를 관찰하고 음식문화를 배우며, 협력처가 확정될 경우 비교 시식과 취향별 바다밥상 카드를 진행하는 기획입니다. 시식 협력처·시식 장소·원가·위생·알레르기 안내가 미확정되어 실제 음식 제공, 예약, 결제는 하지 않습니다. 모든 일정과 금액은 개발 시연 가안입니다.'
      when 112 then '사건 「세 골목의 마지막 색」은 가상의 지도 제작자 윤서가 남긴 빈 지도를 참가자가 완성한다는 창작 이야기입니다. 실제 지역 정보와 허구의 사건은 카드에서 구분합니다. 호스트가 탐정 키트와 단서를 제공하고, 참가자는 창동예술촌의 공개 골목과 부림시장 주변을 걸으며 관찰·추리·팀 협업을 합니다. 상점 출입·구매·시설물 접촉·표식 설치·사람 촬영은 하지 않습니다. 실제 예약은 받지 않는 시연용입니다.'
    end,
    inclusions = case experience_id
      when 111 then array['식재료 탐구 카드(시연 기획)', '개인별 미식 카드(시연 기획)']::text[]
      when 112 then array['탐정 키트와 단서 카드(시연 기획)', '팀별 완성 지도 카드', '완주 카드']::text[]
    end,
    preparation_items = case experience_id
      when 111 then array['편한 신발', '개인 메모 도구']::text[]
      when 112 then array['편한 신발', '필기구']::text[]
    end,
    precautions = case experience_id
      when 111 then array['시연용 · 실제 예약 및 결제 불가', '시식 협력처·장소·원가·위생·알레르기 정보 미확정', '실제 운영 전 상인 협의와 식품 제공 방식 확인 필요']::text[]
      when 112 then array['시연용 · 실제 예약 및 결제 불가', '허구의 사건과 확인된 지역 사실을 구분', '상점 출입·구매 요구·시설물 접촉·무단 표식·사람 촬영 금지', '현장 답사 후 보행 동선과 우천 대체안 확정']::text[]
    end,
    hero_image_url = 'https://rhkaxmqdkztpbljkunxb.supabase.co/storage/v1/object/public/local-eum-media/experiences/'
      || experience_id::text || '/cover-v2.webp',
    hero_image_alt = case experience_id
      when 111 then 'AI 생성 시연 이미지: 마산어시장 식재료 탐구와 미식 체험 연출, 실제 현장 사진 아님'
      when 112 then 'AI 생성 시연 이미지: 창동 원도심 골목 탐정게임 연출, 실제 현장 사진 아님'
    end,
    venue_place_id = case experience_id when 111 then 12 when 112 then null end,
    demo_code = case experience_id
      when 111 then 'DEMO-MASAN-SEAFOOD-LAB'
      when 112 then 'DEMO-MASAN-MYSTERY-MAP'
    end,
    updated_at = now()
where host_id = 501 and experience_id in (111, 112);

update public.lc_sessions
set ends_at = starts_at + interval '100 minutes',
    meeting_place = '마산어시장 공용 보행 구역 (세부 집결 지점 현장 확인 전)',
    meeting_place_id = 12,
    min_people = 3,
    capacity = 6,
    fee_amount = 39000,
    seed_code = 'LE-DEMO-MASAN-SEAFOOD-SESSION',
    updated_at = now()
where session_id = 15 and experience_id = 111;

update public.lc_sessions
set ends_at = starts_at + interval '105 minutes',
    meeting_place = '창동예술촌 아트센터 앞 공공 보행 구역 · 주소: 경상남도 창원시 마산합포구 오동서6길 24 (현장 확인 전)',
    meeting_place_id = null,
    min_people = 2,
    capacity = 6,
    fee_amount = 29000,
    seed_code = 'LE-DEMO-MASAN-MYSTERY-SESSION',
    updated_at = now()
where session_id = 16 and experience_id = 112;

insert into public.lc_experience_steps
  (experience_id, step_order, elapsed_min, duration_min, title, description, updated_at)
values
  (111, 1, 0, 15, '미식 미션 안내', '공용 보행 구역에서 진행 규칙과 식재료 탐구 카드, 알레르기 확인 절차를 안내합니다. 시식은 협력처 확정 전까지 제공하지 않습니다.', now()),
  (111, 2, 15, 20, '제철 식재료 관찰', '판매를 방해하지 않고 재료의 계절성·색·산지 정보를 관찰해 카드에 분류합니다.', now()),
  (111, 3, 35, 30, '음식 비교 시식 기획', '상인 협력과 위생·알레르기 조건이 승인된 경우에만 2~3개 소량 시식을 비교합니다. 현재는 시연 설명으로 대체합니다.', now()),
  (111, 4, 65, 20, '나만의 바다밥상 구성', '메뉴 카드를 이용해 참가자의 취향에 맞는 밥상을 구성합니다.', now()),
  (111, 5, 85, 15, '미식 카드와 마무리', '좋아하는 재료와 이유를 개인별 미식 카드에 기록하고 마무리합니다.', now()),
  (112, 1, 0, 15, '사건 접수와 키트 배부', '참가자 과제: 가상 지도 제작자 윤서가 남긴 빈 지도를 확인하고 오늘의 관찰 규칙을 익힙니다. 호스트: 허구 사건임을 밝히고 안전·촬영·상점 출입 규칙을 안내한 뒤 기록지와 연필을 배부합니다. 결과물: 팀 기록지와 역할 분담.', now()),
  (112, 2, 15, 20, '세 테마 골목 첫 단서', '문제: 창동예술촌의 골목은 몇 가지 테마로 나뉘는지 공식 안내 지도와 골목 카드에서 찾아 숫자로 적습니다. 호스트는 공식 안내 지도 또는 동일 내용을 담은 대체 카드를 제공합니다. 결과물: 첫 숫자 단서와 확인 근거.', now()),
  (112, 3, 35, 35, '골목 이름과 관찰 암호', '문제: 지도 제작자가 남긴 이름 단서와 공식 명칭 카드로 대상 골목을 찾고, 공공 보행 구역에서 색·선·반복 중 한 특징을 관찰해 근거를 적습니다. 호스트는 답을 바로 말하지 않고 요청 시 단계별 힌트를 주며 보행 안전과 사유 공간 경계를 살핍니다. 결과물: 골목 명칭 단서와 팀이 선택한 관찰 기호·이유. 뒤의 이동 시간도 이 구간에 포함됩니다.', now()),
  (112, 4, 70, 20, '부림시장 마지막 좌표', '문제: 인쇄 지도 또는 확인 가능한 공개 표지에서 마지막 장소 이름을 찾아 단서 카드에 기록합니다. 호스트는 표지 확인이 어렵거나 혼잡하면 인쇄 지도로 전환하고 차량·인파 동선을 관리합니다. 결과물: 마지막 장소 단서와 팀 최종 코드.', now()),
  (112, 5, 90, 15, '지도 완성과 사건 해결', '참가자 과제: 팀이 찾은 장소와 직접 관찰한 특징을 빈 지도에 연결하고 발견 이유를 발표합니다. 호스트는 사실 카드와 창작 설정을 다시 구분하고 완주 카드를 전달합니다. 결과물: 팀별 완성 지도 카드와 완주 카드.', now())
on conflict (experience_id, step_order) do update
set elapsed_min = excluded.elapsed_min,
    duration_min = excluded.duration_min,
    title = excluded.title,
    description = excluded.description,
    updated_at = now();

-- Preview only. Counts and IDs must still be 2 hosts / 12 experiences / #111/#112.
select h.host_id, h.display_name, h.approval_status,
       e.experience_id, e.title, e.template_id, e.status, e.is_demo, e.demo_code,
       e.venue_place_id, s.session_id,
       s.starts_at at time zone 'Asia/Seoul' as starts_at_kst,
       s.ends_at at time zone 'Asia/Seoul' as ends_at_kst,
       s.recruit_deadline at time zone 'Asia/Seoul' as recruit_deadline_kst,
       s.meeting_place, s.meeting_place_id, s.min_people, s.capacity, s.fee_amount,
       s.status as session_status,
       (select count(*) from public.lc_experience_steps x where x.experience_id=e.experience_id) as step_count,
       (select count(*) from public.lc_hosts) as host_count,
       (select count(*) from public.lc_experiences) as experience_count
from public.lc_hosts h
join public.lc_experiences e on e.host_id=h.host_id
join public.lc_sessions s on s.experience_id=e.experience_id
where e.experience_id in (111,112)
order by e.experience_id;

-- This review script intentionally does not persist changes.
rollback;
