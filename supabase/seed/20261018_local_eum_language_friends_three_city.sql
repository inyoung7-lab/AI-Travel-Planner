-- Additive demo seed for the three city Language & Friends previews.
-- Run only against local-eum-dev (rhkaxmqdkztpbljkunxb).
-- Existing experiences, host ownership, RLS, Auth, and venue #8 are never updated.
DO $language_friends_seed$
DECLARE
  v_host_id bigint := 500;
  v_template_id bigint := 103;
  v_seoul_place_id bigint;
  v_busan_place_id bigint;
  v_changwon_place_id bigint;
  v_auth_user_id uuid;
  v_program record;
  v_step record;
  v_experience_id bigint;
  v_session_id bigint;
  v_before_count integer;
  v_added integer := 0;
BEGIN
  SELECT h.auth_user_id INTO v_auth_user_id
  FROM public.lc_hosts h
  JOIN auth.users u ON u.id = h.auth_user_id
  WHERE h.host_id = v_host_id
    AND lower(u.email) = 'beautimind01@gmail.com'
    AND h.approval_status = 'APPROVED'
    AND h.is_public;
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Expected approved public HOST #500 for the supplied existing account; abort without changes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lc_user_roles r WHERE r.user_id = v_auth_user_id AND r.role = 'HOST')
     OR EXISTS (SELECT 1 FROM public.lc_user_roles r WHERE r.user_id = v_auth_user_id AND r.role = 'ADMIN') THEN
    RAISE EXCEPTION 'HOST #500 role differs from expected HOST-only account; abort without changes';
  END IF;

  IF (SELECT count(*) FROM public.lc_hosts) <> 2
     OR (SELECT count(*) FROM public.lc_experiences) <> 12
     OR (SELECT count(*) FROM public.lc_experiences WHERE host_id = v_host_id) <> 10
     OR (SELECT count(*) FROM public.lc_experiences WHERE host_id = 501) <> 2 THEN
    RAISE EXCEPTION 'Expected the existing two hosts and 10/2 experience ownership split; abort without changes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lc_program_templates
    WHERE template_id = v_template_id AND is_active
      AND title = '로컬이음 지역문화 탐방'
      AND seed_code = 'LE-DEMO-CULTURE'
  ) THEN
    RAISE EXCEPTION 'Expected active generic culture demo template #103; abort without changes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lc_places
    WHERE place_id = 8 AND owner_host_id = v_host_id
      AND place_name = '창동예술촌아트센터'
      AND road_address = '경상남도 창원시 마산합포구 오동서6길 24'
      AND is_confirmed
  ) THEN
    RAISE EXCEPTION 'Expected confirmed Changdong place #8 owned by HOST #500; do not change place ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lc_experiences
    WHERE demo_code IN ('DEMO-LF-SEOUL-01', 'DEMO-LF-BUSAN-01', 'DEMO-LF-CHANGWON-01')
       OR title IN ('서울숲에서 언어 친구 만들기', '부산말로 시작하는 로컬 친구 산책', '창동예술촌에서 한·일 문화 친구 만들기')
  ) OR EXISTS (
    SELECT 1 FROM public.lc_places
    WHERE seed_code IN ('LE-DEMO-LF-SEOUL-01', 'LE-DEMO-LF-BUSAN-01')
  ) OR EXISTS (
    SELECT 1 FROM public.lc_sessions
    WHERE seed_code IN ('LE-DEMO-LF-SEOUL-20261107', 'LE-DEMO-LF-BUSAN-20261114', 'LE-DEMO-LF-CHANGWON-20261121')
  ) THEN
    RAISE EXCEPTION 'A language-friends seed code, title, or session already exists; inspect current data and stop';
  END IF;

  INSERT INTO public.lc_places (
    owner_host_id, place_name, road_address, latitude, longitude, directions,
    map_provider, source_reference, is_confirmed, confirmed_at, seed_code
  ) VALUES (
    v_host_id, '서울숲 방문자센터', '서울특별시 성동구 뚝섬로 273', NULL, NULL,
    '방문자센터 바깥 집결. 정확한 출입구와 현장 동선은 운영 전 확인합니다.',
    'KAKAO', 'https://korean.visitseoul.net/etc-area/%EC%84%9C%EC%9A%B8%EC%88%B2/KOP001838',
    true, now(), 'LE-DEMO-LF-SEOUL-01'
  ) RETURNING place_id INTO v_seoul_place_id;

  INSERT INTO public.lc_places (
    owner_host_id, place_name, road_address, latitude, longitude, directions,
    map_provider, source_reference, is_confirmed, confirmed_at, seed_code
  ) VALUES (
    v_host_id, '부산시민공원 방문자센터', '부산광역시 부산진구 시민공원로 73', NULL, NULL,
    '방문자센터 외부 집결. 정확한 출입구와 현장 동선은 운영 전 확인합니다.',
    'KAKAO', 'https://citizenparkmap.bisco.or.kr/vistor-center/',
    true, now(), 'LE-DEMO-LF-BUSAN-01'
  ) RETURNING place_id INTO v_busan_place_id;

  v_changwon_place_id := 8;
  v_before_count := (SELECT count(*) FROM public.lc_experiences);

  FOR v_program IN
    SELECT * FROM jsonb_to_recordset(jsonb_build_array(
      jsonb_build_object(
        'demo_code', 'DEMO-LF-SEOUL-01', 'title', '서울숲에서 언어 친구 만들기',
        'description', '서울숲을 함께 걸으며 서로의 일상 표현과 여행 이야기를 나누는 90분 시연 프로그램입니다.',
        'detail_description', '첫 인사와 안전 안내, 취향 카드, 공원 관찰 산책, 짝 대화, 개인 표현 기록으로 이어지는 6단계 시연 기획입니다. HOST의 실제 진행 언어 확인과 운영 승인은 완료되지 않았습니다.',
        'region_code', 'SEOUL', 'place_id', v_seoul_place_id,
        'starts_at', '2026-11-07T14:00:00+09:00', 'ends_at', '2026-11-07T15:30:00+09:00',
        'deadline', '2026-11-05T18:00:00+09:00', 'session_code', 'LE-DEMO-LF-SEOUL-20261107',
        'meeting_place', '서울숲 방문자센터 바깥 · 정확한 집결 지점은 운영 전 확인',
        'translations', jsonb_build_object(
          'en', jsonb_build_object('title', 'Make Language Friends on a Seoul Forest Walk', 'description', 'A 90-minute demo walk for sharing everyday expressions and travel stories in Seoul Forest.', 'detail_description', 'A six-step draft demo plan with introductions, a park walk, paired conversation, and a personal phrase card. Host language ability and operating approval are not confirmed.', 'review_status', 'DRAFT'),
          'ja', jsonb_build_object('title', 'ソウルの森を歩いて言語の友だちを作ろう', 'description', 'ソウルの森を一緒に歩き、日常表現や旅の話を交わす90分のデモプログラムです。', 'detail_description', '自己紹介、公園散歩、ペアでの会話、個人用フレーズカードを含む6段階のデモ案です。ホストの語学力と運営承認は未確認です。', 'review_status', 'DRAFT')
        ),
        'steps', jsonb_build_array(
          jsonb_build_object('step_order',1,'elapsed_min',0,'duration_min',10,'title','첫 인사와 안전 안내','description','보행 동선, 안전, 사진 촬영 및 개인정보 공유 원칙을 안내합니다.'),
          jsonb_build_object('step_order',2,'elapsed_min',10,'duration_min',15,'title','이름과 취향 카드','description','별칭과 취향 카드를 고르고 서로 편한 대화 언어를 확인합니다.'),
          jsonb_build_object('step_order',3,'elapsed_min',25,'duration_min',25,'title','서울숲 관찰 산책','description','공공 보행로를 걸으며 나무, 쉼터, 소리 중 하나를 골라 자기 언어로 설명합니다.'),
          jsonb_build_object('step_order',4,'elapsed_min',50,'duration_min',20,'title','짝 바꾸기와 여행 질문','description','짝을 바꾸어 여행에서 하고 싶은 일을 묻고 답하며 표현을 바꾸어 말합니다.'),
          jsonb_build_object('step_order',5,'elapsed_min',70,'duration_min',15,'title','오늘 배운 말 정리','description','기억하고 싶은 산책 표현 세 가지를 개인 카드에 적습니다. 연락처는 쓰지 않습니다.'),
          jsonb_build_object('step_order',6,'elapsed_min',85,'duration_min',5,'title','단체 마무리','description','한 문장 소감을 나누고 지정된 공공 보행로에서 해산합니다.')
        )
      ),
      jsonb_build_object(
        'demo_code', 'DEMO-LF-BUSAN-01', 'title', '부산말로 시작하는 로컬 친구 산책',
        'description', '부산의 공원을 걸으며 표준어와 지역 표현을 비교하고 여행 이야기를 나누는 90분 시연 프로그램입니다.',
        'detail_description', '검수된 자료가 있을 때 표준어·부산 표현·영어 표현을 비교하고 개인 비교 카드를 만듭니다. HOST가 지역어 전문성을 확인하기 전에는 사투리 해설을 보장하지 않습니다.',
        'region_code', 'BUSAN', 'place_id', v_busan_place_id,
        'starts_at', '2026-11-14T10:30:00+09:00', 'ends_at', '2026-11-14T12:00:00+09:00',
        'deadline', '2026-11-12T18:00:00+09:00', 'session_code', 'LE-DEMO-LF-BUSAN-20261114',
        'meeting_place', '부산시민공원 방문자센터 외부 · 정확한 집결 지점은 운영 전 확인',
        'translations', jsonb_build_object(
          'en', jsonb_build_object('title', 'A Local-Friend Walk Starting with Busan Expressions', 'description', 'A 90-minute demo walk comparing standard Korean, verified Busan expressions, and English.', 'detail_description', 'The host uses checked reference material. No dialect expertise or language ability is promised until confirmed. Participants make a personal comparison card.', 'review_status', 'DRAFT'),
          'ja', jsonb_build_object('title', '釜山ことばから始めるローカル友だち散歩', 'description', '公園を歩きながら標準語と地域表現を比べ、旅の話をする90分のデモプログラムです。', 'detail_description', '確認済み資料を使って表現を比べます。確認前に方言解説や語学力を保証しません。参加者は個人用の比較カードを作ります。', 'review_status', 'DRAFT')
        ),
        'steps', jsonb_build_array(
          jsonb_build_object('step_order',1,'elapsed_min',0,'duration_min',10,'title','첫 인사와 안전 안내','description','공원 보행 동선과 안전, 지역 표현을 존중하는 대화 원칙을 안내합니다.'),
          jsonb_build_object('step_order',2,'elapsed_min',10,'duration_min',15,'title','이름과 오늘의 표현','description','별칭과 배우고 싶은 인사 표현을 고릅니다. 진행 언어는 HOST 확인 전입니다.'),
          jsonb_build_object('step_order',3,'elapsed_min',25,'duration_min',25,'title','시민공원 관찰 산책','description','공공 보행로에서 안내 표지와 쉼터를 관찰하고 각자 익숙한 말로 설명합니다.'),
          jsonb_build_object('step_order',4,'elapsed_min',50,'duration_min',20,'title','표현 세 가지 비교','description','검수된 자료가 있을 때만 표준어·부산 표현·영어를 비교합니다. 근거 없는 표현은 가르치지 않습니다.'),
          jsonb_build_object('step_order',5,'elapsed_min',70,'duration_min',15,'title','나만의 비교 카드','description','표현, 뜻, 사용 상황을 개인 카드에 적고 확인이 필요한 내용은 표시합니다.'),
          jsonb_build_object('step_order',6,'elapsed_min',85,'duration_min',5,'title','단체 마무리','description','새로 알게 된 표현을 나누고 공공 보행로에서 해산합니다.')
        )
      ),
      jsonb_build_object(
        'demo_code', 'DEMO-LF-CHANGWON-01', 'title', '창동예술촌에서 한·일 문화 친구 만들기',
        'description', '창동예술촌 골목을 걸으며 거리 풍경을 관찰하고 한국어·일본어 표현을 나누는 90분 시연 프로그램입니다.',
        'detail_description', '공공 보행 구역에서 예술촌 거리 풍경을 관찰하고 한국어·일본어 문화 감상 카드를 만듭니다. 시설 입장, 전시·공방 이용, 작품과 사람 촬영은 포함하지 않습니다.',
        'region_code', 'CHANGWON', 'place_id', v_changwon_place_id,
        'starts_at', '2026-11-21T14:00:00+09:00', 'ends_at', '2026-11-21T15:30:00+09:00',
        'deadline', '2026-11-19T18:00:00+09:00', 'session_code', 'LE-DEMO-LF-CHANGWON-20261121',
        'meeting_place', '창동예술촌 아트센터 정면 외부 공공 보행 구역 · 정확한 집결 지점은 운영 전 확인',
        'translations', jsonb_build_object(
          'en', jsonb_build_object('title', 'Make Korean-Japanese Culture Friends in Changdong Art Village', 'description', 'A 90-minute demo walk observing the neighborhood and sharing art impressions in Korean and Japanese.', 'detail_description', 'Participants observe the public streetscape and make a personal expression card. Entry, gallery and workshop visits, and photography of artwork or people are excluded.', 'review_status', 'DRAFT'),
          'ja', jsonb_build_object('title', '昌洞芸術村で韓日文化の友だちを作ろう', 'description', '昌洞芸術村の路地を歩き、韓国語と日本語で文化や作品の印象を交わす90分のデモプログラムです。', 'detail_description', '公共の歩道から街の風景を観察し、個人用の韓日表現カードを作ります。施設内への入場、展示・工房訪問、作品や人物の撮影は含みません。', 'review_status', 'DRAFT')
        ),
        'steps', jsonb_build_array(
          jsonb_build_object('step_order',1,'elapsed_min',0,'duration_min',10,'title','첫 인사와 안전 안내','description','골목 보행과 작품·인물 촬영 전 허가 원칙을 설명합니다.'),
          jsonb_build_object('step_order',2,'elapsed_min',10,'duration_min',15,'title','이름과 문화 취향 카드','description','별칭과 좋아하는 색·소리·공간을 고르고 편한 대화 언어를 확인합니다.'),
          jsonb_build_object('step_order',3,'elapsed_min',25,'duration_min',25,'title','창동 골목 관찰 산책','description','공공 보행 구역에서 거리의 색과 표지를 관찰합니다. 갤러리와 공방에는 들어가지 않습니다.'),
          jsonb_build_object('step_order',4,'elapsed_min',50,'duration_min',20,'title','한·일 감상 표현 나누기','description','알고 있는 표현으로 장면의 인상을 말하고 상대 언어로 바꾸어 볼 표현을 찾습니다.'),
          jsonb_build_object('step_order',5,'elapsed_min',70,'duration_min',15,'title','문화 표현 카드','description','한국어와 일본어 감상 표현을 개인 카드에 기록합니다. 번역은 HOST 검수 전 초안입니다.'),
          jsonb_build_object('step_order',6,'elapsed_min',85,'duration_min',5,'title','단체 마무리','description','기억하고 싶은 표현을 나누고 지정된 공공 보행 구역에서 해산합니다.')
        )
      )
    )) AS p(
      demo_code text, title text, description text, detail_description text,
      region_code text, place_id bigint, starts_at timestamptz, ends_at timestamptz,
      deadline timestamptz, session_code text, meeting_place text,
      translations jsonb, steps jsonb
    )
  LOOP
    INSERT INTO public.lc_experiences (
      host_id, template_id, title, description, region_code, status,
      detail_description, inclusions, preparation_items, precautions,
      hero_image_url, hero_image_alt, venue_place_id, is_demo, demo_code,
      translations, available_languages
    ) VALUES (
      v_host_id, v_template_id, v_program.title, v_program.description, v_program.region_code, 'DRAFT',
      v_program.detail_description, ARRAY['진행 안내와 개인 표현 카드 시연'],
      ARRAY['편한 보행화', '우천 시 일정 변경 안내 확인'],
      ARRAY['DRAFT 시연이며 신청·예약·결제 불가', '장소 내부 이용 및 운영 허가 미확인', '사진·음성 기록과 참가자 연락처 교환을 진행하지 않음'],
      NULL, NULL, v_program.place_id, true, v_program.demo_code,
      v_program.translations, ARRAY[]::text[]
    ) RETURNING experience_id INTO v_experience_id;

    INSERT INTO public.lc_sessions (
      experience_id, starts_at, ends_at, meeting_place, recruit_deadline,
      min_people, capacity, fee_amount, status, meeting_place_id, seed_code
    ) VALUES (
      v_experience_id, v_program.starts_at, v_program.ends_at, v_program.meeting_place,
      v_program.deadline, 2, 6, 0, 'DRAFT', v_program.place_id, v_program.session_code
    ) RETURNING session_id INTO v_session_id;

    FOR v_step IN
      SELECT * FROM jsonb_to_recordset(v_program.steps)
        AS s(step_order smallint, elapsed_min integer, duration_min integer, title text, description text)
    LOOP
      INSERT INTO public.lc_experience_steps (
        experience_id, step_order, elapsed_min, duration_min, title, description
      ) VALUES (
        v_experience_id, v_step.step_order, v_step.elapsed_min, v_step.duration_min,
        v_step.title, v_step.description
      );
    END LOOP;
    v_added := v_added + 1;
  END LOOP;

  IF v_added <> 3 OR (SELECT count(*) FROM public.lc_experiences) <> v_before_count + 3 THEN
    RAISE EXCEPTION 'Inserted experience count did not match expected 3; abort transaction';
  END IF;
END;
$language_friends_seed$;
