-- local-eum-dev / rhkaxmqdkztpbljkunxb
-- Connect only the three verified, newly uploaded demo WebP covers.
-- Correct Changdong's description to reflect its narrow downtown alleys.
begin;
set local lock_timeout = '5s';

do $apply$
declare
  expected record;
  current_experience public.lc_experiences%rowtype;
  changed_count integer;
begin
  if (select count(*) from public.lc_hosts) <> 2
    or (select count(*) from public.lc_experiences) <> 15
    or not exists (select 1 from storage.buckets
      where id = 'local-eum-media' and public
        and file_size_limit = 400000
        and allowed_mime_types = array['image/webp']::text[]) then
    raise exception 'Unexpected host/experience counts or Storage bucket; nothing changed';
  end if;

  for expected in select * from (values
    (113::bigint, 'DEMO-LF-SEOUL-01', '서울숲에서 언어 친구 만들기', 'experiences/113/cover.webp', 120258::bigint, '서울숲 산책길에서 대화를 나누는 참가자들의 AI 생성 시연 이미지', 17::bigint),
    (114::bigint, 'DEMO-LF-BUSAN-01', '부산말로 시작하는 로컬 친구 산책', 'experiences/114/cover.webp', 98066::bigint, '부산시민공원 산책로에서 이야기를 나누는 참가자들의 AI 생성 시연 이미지', 18::bigint),
    (115::bigint, 'DEMO-LF-CHANGWON-01', '창동예술촌에서 한·일 문화 친구 만들기', 'experiences/115/cover-v2.webp', 205608::bigint, '창동 도심의 좁은 예술 골목을 걷는 참가자들의 AI 생성 시연 이미지', 19::bigint)
  ) as v(id, code, title, object_name, bytes, alt_text, session_id)
  loop
    select * into current_experience from public.lc_experiences
      where experience_id = expected.id for update;
    if not found or current_experience.host_id <> 500
      or current_experience.demo_code is distinct from expected.code
      or current_experience.title is distinct from expected.title
      or current_experience.status <> 'DRAFT'
      or current_experience.is_demo is distinct from true
      or current_experience.available_languages is distinct from array[]::text[]
      or current_experience.hero_image_url is not null
      or current_experience.hero_image_alt is not null
      or not exists (select 1 from public.lc_sessions
        where session_id = expected.session_id and experience_id = expected.id and status = 'DRAFT')
      or not exists (select 1 from storage.objects
        where bucket_id = 'local-eum-media' and name = expected.object_name
          and metadata->>'mimetype' = 'image/webp'
          and (metadata->>'size')::bigint = expected.bytes) then
      raise exception 'Experience %, session, or Storage image differs from verified state; rolling back', expected.id;
    end if;

    update public.lc_experiences
      set hero_image_url = 'https://rhkaxmqdkztpbljkunxb.supabase.co/storage/v1/object/public/local-eum-media/' || expected.object_name,
          hero_image_alt = expected.alt_text
      where experience_id = expected.id;
    get diagnostics changed_count = row_count;
    if changed_count <> 1 then
      raise exception 'Expected one image update for experience %; rolling back', expected.id;
    end if;
  end loop;

  update public.lc_experiences e
    set description = '마산 도심 한복판의 좁은 창동 골목을 걸으며 예술촌 거리 풍경을 관찰하고 한국어·일본어 표현을 나누는 90분 시연 프로그램입니다.',
        detail_description = '상가와 작업실이 이어지는 좁은 도심 골목의 공공 보행 구역을 따라 걸으며 거리 풍경을 관찰합니다. 참가자는 익숙한 언어로 색과 장면의 인상을 표현합니다. 작품 내부 촬영, 시설 입장, 작가·상점 방문은 포함하지 않습니다. 결과물은 한국어와 일본어로 문화 감상을 적는 개인 표현 카드입니다.',
        translations = e.translations || jsonb_build_object(
          'en', e.translations->'en' || jsonb_build_object(
            'description', 'A 90-minute demo walk through Changdong’s narrow downtown alleys, sharing art impressions in Korean and Japanese.',
            'detail_description', 'Participants walk through narrow downtown alleys lined with shops and studios and describe the street scenes in a language they know. Entry, gallery visits, artist or shop visits, and photography of artwork or people are excluded. The take-away is a personal Korean-Japanese expression card. This is a draft, not an open booking.'),
          'ja', e.translations->'ja' || jsonb_build_object(
            'description', '昌洞の街なかにある細い路地を歩き、韓国語と日本語で文化や街並みの印象を交わす90分のデモプログラムです。',
            'detail_description', '商店や作業室が並ぶ細い都心の路地を公共の歩道から歩き、知っている言語で色や街並みの印象を表現します。施設内への入場、ギャラリー訪問、作家や店舗への訪問、作品や人物の撮影は含みません。韓日表現カードを個人で作ります。募集前の企画です。'))
    where e.experience_id = 115 and e.host_id = 500
      and e.description = '창동예술촌 골목을 걸으며 거리 풍경을 관찰하고 한국어·일본어 표현을 나누는 90분 시연 프로그램입니다.'
      and e.detail_description = '공공 보행 구역에서 예술촌 거리 풍경을 관찰하고 한국어·일본어 문화 감상 카드를 만듭니다. 시설 입장, 전시·공방 이용, 작품과 사람 촬영은 포함하지 않습니다.'
      and e.translations->'en'->>'review_status' = 'DRAFT'
      and e.translations->'ja'->>'review_status' = 'DRAFT';
  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'Changdong copy differs from verified draft; rolling back all changes';
  end if;
end;
$apply$;
commit;
