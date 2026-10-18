const host = Object.freeze({ host_id: 500, display_name: '로컬이음 체험 호스트' });
const STORAGE_COVER_BASE = 'https://rhkaxmqdkztpbljkunxb.supabase.co/storage/v1/object/public/local-eum-media';

const programs = [
  {
    experience_id: 'demo-lf-seoul-01',
    host_id: 500,
    host,
    template_id: 103,
    demo_code: 'DEMO-LF-SEOUL-01',
    region_code: 'SEOUL',
    title: '서울숲에서 언어 친구 만들기',
    description: '서울숲을 함께 걸으며 서로의 일상 표현과 여행 이야기를 나누는 90분 시연 프로그램입니다.',
    detail_description: '처음 만나는 참가자들이 안전 안내와 짝 활동을 통해 자연스럽게 대화를 시작합니다. 숲길을 관찰하고, 서로의 언어로 여행 질문을 나누며, 마지막에는 각자 다시 써볼 산책 표현 세 가지를 정리합니다. 언어 교환의 목표를 보여주는 시연 기획이며 실제 모집 프로그램은 아닙니다.',
    status: 'DRAFT',
    is_demo: true,
    available_languages: [],
    planned_languages: ['ko', 'en'],
    verified_host_languages: [],
    demo_simulated_languages: ['ko', 'en'],
    hero_image_url: `${STORAGE_COVER_BASE}/experiences/113/cover.webp`,
    hero_image_alt: '서울숲 산책길에서 대화를 나누는 참가자들의 AI 생성 시연 이미지',
    translations: {
      en: {
        title: 'Make Language Friends on a Seoul Forest Walk',
        description: 'A 90-minute demo walk for sharing everyday expressions and travel stories in Seoul Forest.',
        detail_description: 'Participants start with a safety briefing and paired introductions, observe the park together, exchange travel questions, and finish by writing down three useful walking phrases. This is a draft demo plan, not an open booking.',
        review_status: 'DRAFT',
      },
      ja: {
        title: 'ソウルの森を歩いて言語の友だちを作ろう',
        description: 'ソウルの森を一緒に歩き、日常表現や旅の話を交わす90分のデモプログラムです。',
        detail_description: '安全案内とペアでの自己紹介から始め、公園を観察しながら旅について質問し合います。最後に、散歩で使いたい表現を三つ書き留めます。募集前のデモ企画で、実際の予約はできません。',
        review_status: 'DRAFT',
      },
    },
    venue: {
      place_key: 'DEMO-PLACE-SEOUL',
      place_name: '서울숲 방문자센터',
      road_address: '서울특별시 성동구 뚝섬로 273',
      source_reference: 'https://korean.visitseoul.net/etc-area/%EC%84%9C%EC%9A%B8%EC%88%B2/KOP001838',
      latitude: null,
      longitude: null,
      is_confirmed: true,
      meeting_point: '방문자센터 바깥에서 모입니다. 정확한 출입구와 현장 동선은 운영 전 확인합니다.',
      usage_notice: '공식 주소와 장소를 확인한 시연 기획입니다. 방문자센터 내부 이용이나 시설의 모임 허가를 뜻하지 않습니다.',
    },
    session: {
      session_id: 'demo-lf-seoul-20261107',
      starts_at: '2026-11-07T14:00:00+09:00',
      ends_at: '2026-11-07T15:30:00+09:00',
      recruit_deadline: '2026-11-05T18:00:00+09:00',
      min_people: 2,
      capacity: 6,
      fee_amount: 0,
      status: 'DRAFT',
      timezone: 'Asia/Seoul',
      meeting_place: '서울숲 방문자센터 바깥 · 정확한 집결 지점은 운영 전 확인',
    },
    steps: [
      { step_order: 1, elapsed_min: 0, duration_min: 10, title: '첫 인사와 안전 안내', description: '진행자가 동선, 보행 안전, 사진 촬영 및 개인정보 공유 원칙을 안내합니다.' },
      { step_order: 2, elapsed_min: 10, duration_min: 15, title: '이름과 취향 카드', description: '이름 대신 별칭을 써도 되는 취향 카드를 고르고, 서로 편한 대화 언어를 확인합니다.' },
      { step_order: 3, elapsed_min: 25, duration_min: 25, title: '서울숲 관찰 산책', description: '공공 보행로를 함께 걸으며 나무, 쉼터, 소리 중 한 가지를 골라 자기 언어로 설명합니다.' },
      { step_order: 4, elapsed_min: 50, duration_min: 20, title: '짝 바꾸기와 여행 질문', description: '짝을 한 번 바꾸고 “여행지에서 꼭 해보고 싶은 일”을 묻고 답하며 표현을 바꾸어 말해 봅니다.' },
      { step_order: 5, elapsed_min: 70, duration_min: 15, title: '오늘 배운 말 정리', description: '참가자가 기억하고 싶은 표현 세 가지를 개인 카드에 적습니다. 카드에는 연락처나 개인정보를 쓰지 않습니다.' },
      { step_order: 6, elapsed_min: 85, duration_min: 5, title: '단체 마무리', description: '각자 한 문장으로 소감을 나누고 지정된 보행로에서 해산합니다.' },
    ],
    inclusions: ['진행 안내와 대화 카드 시연', '개인 산책 표현 카드 1장'],
    preparation_items: ['편한 보행화', '우천 시 일정 변경 안내 확인'],
    precautions: ['DRAFT 시연 일정이며 신청·예약·결제가 불가능합니다.', '야외 보행만 포함하며 시설 내부 이용 허가는 확인되지 않았습니다.', '참가자 사진·음성 기록과 연락처 교환은 진행하지 않습니다.', '악천후에는 일정 변경 또는 취소가 필요합니다.'],
  },
  {
    experience_id: 'demo-lf-busan-01',
    host_id: 500,
    host,
    template_id: 103,
    demo_code: 'DEMO-LF-BUSAN-01',
    region_code: 'BUSAN',
    title: '부산말로 시작하는 로컬 친구 산책',
    description: '부산의 공원을 걸으며 표준어와 지역 표현을 비교하고 여행 이야기를 나누는 90분 시연 프로그램입니다.',
    detail_description: '진행자는 확인된 표현 자료를 바탕으로 표준어, 부산 지역 표현, 영어 표현을 비교하는 대화를 돕습니다. 호스트가 지역어 전문성을 확인하기 전에는 사투리 해설이나 정확한 사용법을 보장하지 않습니다. 결과물은 참가자가 표현 차이를 적는 개인 비교 카드입니다.',
    status: 'DRAFT',
    is_demo: true,
    available_languages: [],
    planned_languages: ['ko', 'en'],
    verified_host_languages: [],
    demo_simulated_languages: ['ko', 'en'],
    hero_image_url: `${STORAGE_COVER_BASE}/experiences/114/cover.webp`,
    hero_image_alt: '부산시민공원 산책로에서 이야기를 나누는 참가자들의 AI 생성 시연 이미지',
    translations: {
      en: {
        title: 'A Local-Friend Walk Starting with Busan Expressions',
        description: 'A 90-minute demo walk comparing standard Korean, verified Busan expressions, and English.',
        detail_description: 'The host facilitates a conversation using checked reference material. No dialect expertise or language ability is promised until the host confirms it. Participants make a personal comparison card; this draft is not open for booking.',
        review_status: 'DRAFT',
      },
      ja: {
        title: '釜山ことばから始めるローカル友だち散歩',
        description: '公園を歩きながら標準語と地域表現を比べ、旅の話をする90分のデモプログラムです。',
        detail_description: '確認済みの資料を使って標準語、釜山の表現、英語表現を比べます。ホストの確認前に方言解説の専門性や語学力を保証しません。参加者は個人用の比較カードを作ります。募集前の企画です。',
        review_status: 'DRAFT',
      },
    },
    venue: {
      place_key: 'DEMO-PLACE-BUSAN',
      place_name: '부산시민공원 방문자센터',
      road_address: '부산광역시 부산진구 시민공원로 73',
      source_reference: 'https://citizenparkmap.bisco.or.kr/vistor-center/',
      latitude: null,
      longitude: null,
      is_confirmed: true,
      meeting_point: '방문자센터 외부에서 모입니다. 정확한 출입구와 현장 동선은 운영 전 확인합니다.',
      usage_notice: '공식 장소를 기준으로 한 시연 기획입니다. 방문자센터 내부 이용이나 시설의 모임 허가를 뜻하지 않습니다.',
    },
    session: {
      session_id: 'demo-lf-busan-20261114',
      starts_at: '2026-11-14T10:30:00+09:00',
      ends_at: '2026-11-14T12:00:00+09:00',
      recruit_deadline: '2026-11-12T18:00:00+09:00',
      min_people: 2,
      capacity: 6,
      fee_amount: 0,
      status: 'DRAFT',
      timezone: 'Asia/Seoul',
      meeting_place: '부산시민공원 방문자센터 외부 · 정확한 집결 지점은 운영 전 확인',
    },
    steps: [
      { step_order: 1, elapsed_min: 0, duration_min: 10, title: '첫 인사와 안전 안내', description: '진행자가 공원 보행 동선과 안전 수칙, 지역 표현의 다양성을 존중하는 대화 원칙을 안내합니다.' },
      { step_order: 2, elapsed_min: 10, duration_min: 15, title: '이름과 오늘의 표현', description: '참가자는 별칭과 오늘 배우고 싶은 인사 표현을 고릅니다. 진행 언어는 HOST 확인 전입니다.' },
      { step_order: 3, elapsed_min: 25, duration_min: 25, title: '시민공원 관찰 산책', description: '공공 보행로에서 안내 표지, 쉼터, 나무를 관찰하고 보이는 것을 각자 익숙한 표현으로 설명합니다.' },
      { step_order: 4, elapsed_min: 50, duration_min: 20, title: '표현 세 가지 비교', description: '검수된 자료가 있을 때만 표준어·부산 표현·영어 표현을 비교합니다. 근거가 없는 사투리 표현은 가르치지 않습니다.' },
      { step_order: 5, elapsed_min: 70, duration_min: 15, title: '나만의 비교 카드', description: '참가자는 표현, 뜻, 사용 상황을 개인 카드에 적고 확인이 필요한 내용은 별도 표시합니다.' },
      { step_order: 6, elapsed_min: 85, duration_min: 5, title: '단체 마무리', description: '한 가지 새로 알게 된 표현을 나누고 공공 보행로에서 해산합니다.' },
    ],
    inclusions: ['진행 안내와 표현 비교 카드 시연', '개인 언어 비교 카드 1장'],
    preparation_items: ['편한 보행화', '우천 시 일정 변경 안내 확인'],
    precautions: ['DRAFT 시연 일정이며 신청·예약·결제가 불가능합니다.', '지역어 설명은 HOST와 자료 검수 전까지 확정하지 않습니다.', '방문자센터 내부 이용 허가는 확인되지 않았습니다.', '참가자 사진·음성 기록과 연락처 교환은 진행하지 않습니다.'],
  },
  {
    experience_id: 'demo-lf-changwon-01',
    host_id: 500,
    host,
    template_id: 103,
    demo_code: 'DEMO-LF-CHANGWON-01',
    region_code: 'CHANGWON',
    title: '창동예술촌에서 한·일 문화 친구 만들기',
    description: '마산 도심 한복판의 좁은 창동 골목을 걸으며 예술촌 거리 풍경을 관찰하고 한국어·일본어 표현을 나누는 90분 시연 프로그램입니다.',
    detail_description: '상가와 작업실이 이어지는 좁은 도심 골목의 공공 보행 구역을 따라 걸으며 거리 풍경을 관찰합니다. 참가자는 익숙한 언어로 색과 장면의 인상을 표현합니다. 작품 내부 촬영, 시설 입장, 작가·상점 방문은 포함하지 않습니다. 결과물은 한국어와 일본어로 문화 감상을 적는 개인 표현 카드입니다.',
    status: 'DRAFT',
    is_demo: true,
    available_languages: [],
    planned_languages: ['ko', 'ja'],
    verified_host_languages: [],
    demo_simulated_languages: ['ko', 'ja'],
    hero_image_url: `${STORAGE_COVER_BASE}/experiences/115/cover-v2.webp`,
    hero_image_alt: '창동 도심의 좁은 예술 골목을 걷는 참가자들의 AI 생성 시연 이미지',
    translations: {
      en: {
        title: 'Make Korean-Japanese Culture Friends in Changdong Art Village',
        description: 'A 90-minute demo walk through Changdong’s narrow downtown alleys, sharing art impressions in Korean and Japanese.',
        detail_description: 'Participants walk through narrow downtown alleys lined with shops and studios and describe the street scenes in a language they know. Entry, gallery visits, artist or shop visits, and photography of artwork or people are excluded. The take-away is a personal Korean-Japanese expression card. This is a draft, not an open booking.',
        review_status: 'DRAFT',
      },
      ja: {
        title: '昌洞芸術村で韓日文化の友だちを作ろう',
        description: '昌洞の街なかにある細い路地を歩き、韓国語と日本語で文化や街並みの印象を交わす90分のデモプログラムです。',
        detail_description: '商店や作業室が並ぶ細い都心の路地を公共の歩道から歩き、知っている言語で色や街並みの印象を表現します。施設内への入場、ギャラリー訪問、作家や店舗への訪問、作品や人物の撮影は含みません。韓日表現カードを個人で作ります。募集前の企画です。',
        review_status: 'DRAFT',
      },
    },
    venue: {
      place_key: 'EXISTING-PLACE-8',
      place_id: 8,
      place_name: '창동예술촌아트센터',
      road_address: '경상남도 창원시 마산합포구 오동서6길 24',
      source_reference: 'https://www.changwon.go.kr/tour/index.do?menuCode=001_003000000000&page.pageNo=1&search.searchKeyword=%EC%95%84%ED%8A%B8&tourProgramNo=207',
      latitude: null,
      longitude: null,
      is_confirmed: true,
      meeting_point: '아트센터 정면 외부 공공 보행 구역 · 정확한 집결 지점은 운영 전 확인',
      usage_notice: '기존 HOST #500 소유 장소 #8을 참조합니다. 내부 관람·전시·공방 이용 또는 모임 허가를 뜻하지 않습니다.',
    },
    session: {
      session_id: 'demo-lf-changwon-20261121',
      starts_at: '2026-11-21T14:00:00+09:00',
      ends_at: '2026-11-21T15:30:00+09:00',
      recruit_deadline: '2026-11-19T18:00:00+09:00',
      min_people: 2,
      capacity: 6,
      fee_amount: 10000,
      status: 'DRAFT',
      timezone: 'Asia/Seoul',
      meeting_place: '창동예술촌 아트센터 정면 외부 공공 보행 구역 · 정확한 집결 지점은 운영 전 확인',
    },
    steps: [
      { step_order: 1, elapsed_min: 0, duration_min: 10, title: '첫 인사와 안전 안내', description: '진행자가 골목 보행 동선과 안전 안내, 작품 및 인물 촬영 전 허가 원칙을 설명합니다.' },
      { step_order: 2, elapsed_min: 10, duration_min: 15, title: '이름과 문화 취향 카드', description: '참가자는 별칭과 좋아하는 색·소리·공간을 고르고, 편한 대화 언어를 서로 확인합니다.' },
      { step_order: 3, elapsed_min: 25, duration_min: 25, title: '창동 골목 관찰 산책', description: '공공 보행 구역에서 거리의 색, 표지, 외벽을 관찰합니다. 갤러리와 공방 내부에는 들어가지 않습니다.' },
      { step_order: 4, elapsed_min: 50, duration_min: 20, title: '한·일 감상 표현 나누기', description: '참가자가 알고 있는 표현으로 한 장면의 인상을 말하고, 상대 언어로 바꾸어 볼 수 있는 표현을 함께 찾습니다.' },
      { step_order: 5, elapsed_min: 70, duration_min: 15, title: '문화 표현 카드', description: '참가자는 한국어와 일본어로 감상 표현 한 쌍을 개인 카드에 기록합니다. 번역은 HOST 검수 전 초안입니다.' },
      { step_order: 6, elapsed_min: 85, duration_min: 5, title: '단체 마무리', description: '각자 기억하고 싶은 표현을 나누고 지정된 공공 보행 구역에서 해산합니다.' },
    ],
    inclusions: ['진행 안내와 표현 카드 시연', '개인 한·일 문화 표현 카드 1장'],
    preparation_items: ['편한 보행화', '우천 시 일정 변경 안내 확인'],
    precautions: ['DRAFT 시연 일정이며 신청·예약·결제가 불가능합니다.', '센터 내부와 전시·공방 방문은 허가 전까지 포함하지 않습니다.', '작품·상점·사람 촬영은 별도 허가 없이 하지 않습니다.', '참가자 사진·음성 기록과 연락처 교환은 진행하지 않습니다.'],
  },
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export const LANGUAGE_FRIENDS_DEMO = deepFreeze(programs.map(program => ({
  ...program,
  interest_code: 'LANGUAGE_FRIENDS',
  sessions: [{ ...program.session, experience_id: program.experience_id }],
  steps: program.steps.map(step => ({ ...step, experience_id: program.experience_id })),
} )));

const DEMO_BY_SLUG = new Map(LANGUAGE_FRIENDS_DEMO.map(program => [program.experience_id, program]));

export function getLanguageFriendsDemoExperience(slug) {
  return DEMO_BY_SLUG.get(String(slug)) || null;
}

export function filterLanguageFriendsDemo({ region = '', interest = 'LANGUAGE_FRIENDS', programLanguages = [], recruitingOnly = false } = {}) {
  const selectedLanguages = Array.isArray(programLanguages) ? programLanguages : [];
  return LANGUAGE_FRIENDS_DEMO.filter(program => (!region || program.region_code === region)
    && (!interest || interest === 'LANGUAGE_FRIENDS')
    && (!selectedLanguages.length || selectedLanguages.some(language => program.available_languages.includes(language)))
    && (!recruitingOnly || program.sessions.some(session => session.status === 'RECRUITING')));
}
