-- Publish only the three existing HOST #500 language-friends experiences.
-- No application/payment rows or schema, RLS, Auth, Storage, or RPC objects are changed.
begin;

do $preflight$
declare
  v_targets integer;
begin
  select count(*) into v_targets
  from public.lc_experiences e
  join public.lc_sessions s on s.experience_id = e.experience_id
  where (e.experience_id, s.session_id, e.host_id, e.status, e.is_demo, e.demo_code, s.status) in (
    (113, 17, 500, 'DRAFT', true, 'DEMO-LF-SEOUL-01', 'DRAFT'),
    (114, 18, 500, 'DRAFT', true, 'DEMO-LF-BUSAN-01', 'DRAFT'),
    (115, 19, 500, 'DRAFT', true, 'DEMO-LF-CHANGWON-01', 'DRAFT')
  );
  if v_targets <> 3 then
    raise exception 'Expected the exact three DRAFT experience/session pairs; found %; no changes made', v_targets;
  end if;
  if exists (select 1 from public.lc_applications where session_id in (17, 18, 19)) then
    raise exception 'Target sessions already have applications; no changes made';
  end if;
  if not exists (select 1 from public.lc_hosts where host_id = 500 and approval_status = 'APPROVED' and is_public) then
    raise exception 'HOST #500 is not publicly approved; no changes made';
  end if;
  if (select count(*) from public.lc_experiences e
      join public.lc_program_templates t on t.template_id = e.template_id
      where e.experience_id in (113, 114, 115) and e.host_id = 500 and t.is_active) <> 3 then
    raise exception 'One or more target templates are inactive; no changes made';
  end if;
  if (select count(*) from public.lc_places where (place_id, road_address) in (
      (17, '서울특별시 성동구 뚝섬로 273'),
      (18, '부산광역시 부산진구 시민공원로 73'),
      (8, '경상남도 창원시 마산합포구 오동서6길 24')
    )) <> 3 then
    raise exception 'One or more target addresses changed; no changes made';
  end if;
  if exists (
    select 1
    from public.lc_experiences e
    join public.lc_sessions s on s.experience_id = e.experience_id
    where (e.experience_id, s.session_id, e.venue_place_id, s.meeting_place_id) not in (
      (113, 17, 17, 17), (114, 18, 18, 18), (115, 19, 8, 8)
    )
      and e.experience_id in (113, 114, 115)
  ) then
    raise exception 'Venue-to-session mapping changed; no changes made';
  end if;
  if exists (select 1 from public.lc_sessions where session_id in (17, 18, 19)
      and (starts_at <= now() or recruit_deadline <= now())) then
    raise exception 'A target session or recruitment deadline is no longer in the future; no changes made';
  end if;
end;
$preflight$;

update public.lc_experiences
set status = 'PUBLISHED',
    is_demo = false,
    demo_code = null,
    available_languages = array[]::text[],
    description = case experience_id
      when 113 then '서울숲을 함께 걸으며 일상 표현과 여행 이야기를 나누는 90분 산책 체험입니다.'
      when 114 then '부산의 공원을 걸으며 지역 표현과 여행 이야기를 나누는 90분 산책 체험입니다.'
      when 115 then '창동예술촌 주변의 좁은 도심 골목을 걸으며 거리 풍경을 살피고 한·일 문화 감상을 나누는 90분 체험입니다.'
    end,
    detail_description = case experience_id
      when 113 then '첫 인사와 안전 안내, 취향 카드, 공원 관찰 산책, 짝 대화, 개인 표현 기록으로 이어지는 6단계 프로그램입니다.'
      when 114 then '참가자들이 일상에서 접한 표현을 나누고, 근거 자료가 확인된 표현은 함께 비교해 개인 카드로 정리합니다. 공원 산책과 여행 이야기를 곁들인 90분 프로그램입니다.'
      when 115 then '상가와 작업실이 이어지는 좁은 도심 골목의 공공 보행 구역을 따라 걸으며 거리 풍경을 관찰합니다. 각자 편한 표현으로 색과 장면의 인상을 나누고 개인 표현 카드를 만듭니다.'
    end,
    precautions = case experience_id
      when 113 then array['공공 산책로를 이용하며 시설 내부 이용은 포함하지 않습니다.', '참가자 사진·음성 기록 및 연락처 교환을 하지 않습니다.', '기상 상황에 따라 일정 변경이 있을 수 있습니다.']
      when 114 then array['공원 내 공공 보행로를 이용하며 시설 내부 이용은 포함하지 않습니다.', '지역 표현은 근거가 확인된 자료를 중심으로 나눕니다.', '참가자 사진·음성 기록 및 연락처 교환을 하지 않습니다.']
      when 115 then array['좁은 골목에서는 보행자와 지역 상점 이용객의 통행을 방해하지 않습니다.', '센터·상점·공방 내부 방문은 포함하지 않으며 작품·사람 촬영은 하지 않습니다.', '참가자 사진·음성 기록 및 연락처 교환을 하지 않습니다.']
    end,
    translations = case experience_id
      when 113 then translations || jsonb_build_object(
        'en', translations->'en' || jsonb_build_object('description', 'A 90-minute walk in Seoul Forest to share everyday expressions and travel stories.', 'detail_description', 'The six-step program includes introductions, an interest-card activity, a park walk, paired conversation, and a personal phrase card.'),
        'ja', translations->'ja' || jsonb_build_object('description', 'ソウルの森を歩きながら、日常表現や旅の話を分かち合う90分の散歩体験です。', 'detail_description', '自己紹介、好みのカード、公園散歩、ペアでの会話、個人用フレーズカードを含む6段階のプログラムです。'))
      when 114 then translations || jsonb_build_object(
        'en', translations->'en' || jsonb_build_object('description', 'A 90-minute park walk in Busan to share local expressions and travel stories.', 'detail_description', 'Participants share expressions they know and compare those supported by checked references. The walk ends with a personal comparison card.'),
        'ja', translations->'ja' || jsonb_build_object('description', '釜山の公園を歩きながら、地域の表現や旅の話を分かち合う90分の体験です。', 'detail_description', '参加者は知っている表現を共有し、確認済みの資料がある表現を比べます。最後に個人用の比較カードを作ります。'))
      when 115 then translations || jsonb_build_object(
        'en', translations->'en' || jsonb_build_object('description', 'A 90-minute walk through Changdong’s narrow downtown alleys to share cultural impressions.', 'detail_description', 'Participants walk through public pedestrian areas lined with shops and studios, describe the street scenes, and make a personal expression card. Entry and photography are not included.'),
        'ja', translations->'ja' || jsonb_build_object('description', '昌洞の街なかにある細い路地を歩き、街並みや文化について感想を交わす90分の体験です。', 'detail_description', '商店や作業室が並ぶ細い都心の路地を公共の歩行エリアから散策します。施設内への入場、作品や人物の撮影は含まれません。'))
    end,
    updated_at = now()
where experience_id in (113, 114, 115)
  and host_id = 500 and status = 'DRAFT' and is_demo = true;

update public.lc_sessions
set status = 'RECRUITING',
    meeting_place = case session_id
      when 17 then '서울숲 방문자센터 건물 외부'
      when 18 then '부산시민공원 방문자센터 건물 외부'
      when 19 then '창동예술촌 아트센터 외부 공공 보행 구역'
    end
where (session_id, experience_id, status) in (
  (17, 113, 'DRAFT'), (18, 114, 'DRAFT'), (19, 115, 'DRAFT')
);

do $verify$
begin
  if (select count(*) from public.lc_experiences
      where experience_id in (113, 114, 115) and host_id = 500
        and status = 'PUBLISHED' and not is_demo and demo_code is null
        and cardinality(available_languages) = 0) <> 3 then
    raise exception 'Published experience verification failed';
  end if;
  if (select count(*) from public.lc_sessions
      where (session_id, experience_id, status) in (
        (17, 113, 'RECRUITING'), (18, 114, 'RECRUITING'), (19, 115, 'RECRUITING')
      )) <> 3 then
    raise exception 'Recruiting session verification failed';
  end if;
end;
$verify$;

commit;
