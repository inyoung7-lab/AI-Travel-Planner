// ─────────────────────────────────────────────────────────────
// 커뮤니티 예시 데이터 (임시)
// 나중에 DB가 연결되면 이 파일의 값을 서버(API)에서 가져오는 걸로 바꿔요.
// 화면은 이 데이터만 보고 그려지기 때문에, 화면 코드는 거의 안 바꿔도 돼요.
// ─────────────────────────────────────────────────────────────

// 글 종류: review(여행 리뷰) / place(장소 리뷰) / question(질문) / talk(소통)

export const GRADIENTS = [
  "linear-gradient(135deg,#8FA4BA,#5B7491)",
  "linear-gradient(135deg,#F2DFC9,#D9B48F)",
  "linear-gradient(135deg,#EFCFC4,#D9A595)",
  "linear-gradient(135deg,#BFCEDD,#8CA3BA)",
];

// 여행지 (place_id 는 나중에 DB의 번호로 교체)
export const places = {
  1: { name: "제주 애월", addr: "제주특별자치도 제주시", reviews: 128, bg: GRADIENTS[0] },
  2: { name: "제주 협재해변", addr: "제주특별자치도 제주시 한림읍", reviews: 86, bg: GRADIENTS[3] },
  3: { name: "여수 해양케이블카", addr: "전남 여수시", reviews: 84, bg: "linear-gradient(135deg,#FBC9BD,#F29E8E)" },
  4: { name: "여수 오동도", addr: "전남 여수시 수정동", reviews: 47, bg: GRADIENTS[3] },
  5: { name: "순천만 국가정원", addr: "전남 순천시", reviews: 76, bg: "linear-gradient(135deg,#A9BACB,#7389A3)" },
  6: { name: "순천 낙안읍성", addr: "전남 순천시 낙안면", reviews: 33, bg: GRADIENTS[1] },
  8: { name: "서울 성수동", addr: "서울 성동구", reviews: 92, bg: "linear-gradient(135deg,#D9E0E9,#AEBBCC)" },
  7: { name: "부산 흰여울문화마을", addr: "부산 영도구", reviews: 71, bg: "linear-gradient(135deg,#3E566F,#1E3042)" },
};

// 홈 화면 첫 페이지의 글 (보이는 순서대로)
export const posts = [
  { id: 1, type: "review", title: "일몰 시간에 맞춰 가면 해안도로가 정말 예뻐요",
    excerpt: "평일 오후라 한적했어요. 곽지해변에 일몰 시간에 도착하면 사진이 제일 잘 나오고, 주차는 오전에 가면 걱정 없었어요. 점심 이후에는 해변 근처가 조금 붐벼요.",
    placeIds: [1, 2], likes: 24, comments: 12, author: "달토끼", time: "2시간 전", thumb: { bg: GRADIENTS[0], more: 3 } },
  { id: 2, type: "question", title: "제주 3박 4일, 렌터카 없이 다닐 수 있을까요?",
    excerpt: "운전을 못 해서 대중교통으로만 애월, 성산, 서귀포를 다 가보고 싶은데 현실적으로 가능할까요? 버스로 어려운 구간 알려주세요.",
    region: "제주", answers: 3, topAnswer: { label: "인기 답변", text: "애월 쪽은 배차 간격이 길어서 시간을 넉넉히 잡아야 해요. 공항에서는 702번이 편했어요." },
    likes: 21, comments: 3, author: "뚜벅초보", time: "5시간 전" },
  { id: 3, type: "review", title: "밤에 타는 걸 추천해요, 주말은 대기가 길어요",
    excerpt: "야경이 정말 예뻐서 해 질 무렵 타는 걸 추천해요. 주말은 대기가 길어서 평일 저녁이 좋았어요. 탑승 시간은 왕복 20분 정도예요.",
    placeIds: [3, 4], likes: 18, comments: 7, author: "바다러버", time: "어제", thumb: { bg: "linear-gradient(135deg,#FBC9BD,#F29E8E)", more: 5 } },
  { id: 4, type: "question", title: "부산 1박 2일, KTX랑 고속버스 중 뭐가 나을까요?",
    excerpt: "서울에서 출발하고 부산역 근처 숙소예요. 시간이랑 비용 둘 다 고려하면 어떤 게 낫나요?",
    region: "부산", answers: 2, topAnswer: { label: "답변", text: "시간이 중요하면 KTX, 비용이 중요하면 고속버스예요. 부산역 숙소면 KTX가 편해요." },
    likes: 9, comments: 2, author: "혼행러", time: "어제" },
  { id: 5, type: "review", title: "가을 산책 코스로 딱, 전체 도는 데 3시간 걸려요",
    excerpt: "가을에 걷기 좋아요. 전체를 돌면 3시간 정도 걸리고 편한 신발은 필수예요. 억새가 가장 예쁜 시간대는 오후 4시쯤이에요.",
    placeIds: [5, 6], likes: 14, comments: 5, author: "정원러버", time: "2일 전", thumb: { bg: "linear-gradient(135deg,#A9BACB,#7389A3)", more: 2 } },
  { id: 6, type: "question", title: "국내 여행 보험, 따로 들어야 할까요?",
    excerpt: "렌터카 여행인데 여행자 보험을 따로 드는 게 좋을지 궁금해요.",
    answers: 0, likes: 6, comments: 0, author: "보험궁금", time: "2일 전" },
  { id: 7, type: "talk", title: "이번 주말 부산 가는 분 계세요? 코스 같이 나눠요",
    excerpt: "10월 셋째 주 토요일에 부산 가는데, 비슷한 시기에 가시는 분들 계시면 가보려는 곳이랑 맛집 이야기 나눠봐요. 불꽃축제 날짜에 맞춰서 갈 예정이에요.",
    likes: 15, comments: 22, author: "부산러", time: "3일 전" },
  { id: 8, type: "place", title: "오전에 가면 한적하고 사진이 잘 나와요",
    excerpt: "계단이 많아서 신발은 편하게 신으세요. 오전 9시쯤 가면 사람이 거의 없어요.",
    placeIds: [7], rating: 5.0, likes: 33, comments: 5, author: "골목산책", time: "3일 전",
    thumb: { bg: "linear-gradient(135deg,#3E566F,#1E3042)", more: 4 } },
  { id: 9, type: "question", title: "혼자 여행 처음인데 숙소 고르는 팁 있나요?",
    excerpt: "혼자 가도 불편하지 않은 숙소 기준이 있을까요? 위치를 우선할지 가격을 우선할지 고민이에요.",
    answers: 5, topAnswer: { label: "인기 답변", text: "역과 가까운지, 리뷰에 혼자 여행이라는 말이 있는지 확인하세요." },
    likes: 15, comments: 5, author: "혼행초보", time: "4일 전" },
];

// 홈의 "답변을 기다리는 질문" 띠는 4번째 글 다음에 보여줘요
export const waitingQuestions = [
  { title: "울릉도 배편 예약은 언제부터 가능한가요?", region: "울릉도" },
  { title: "남해 독일마을 주차 팁 있나요?", region: "남해" },
  { title: "경주 한옥 스테이 추천해주세요", region: "경주" },
];

// 작성자 프로필 카드 (모든 글에서 같은 모양)
export const profiles = {
  달토끼: { joined: "2026년 3월", reviews: 18, trips: 12, likes: 342, recent: ["제주 애월", "강릉 안목해변", "부산 흰여울문화마을"] },
  뚜벅초보: { joined: "2026년 8월", reviews: 6, trips: 4, likes: 58, recent: ["서울 성수동", "경주 황리단길"] },
  바다러버: { joined: "2026년 1월", reviews: 24, trips: 15, likes: 410, recent: ["여수 오동도", "남해 독일마을", "통영 동피랑"] },
  정원러버: { joined: "2025년 11월", reviews: 31, trips: 22, likes: 523, recent: ["순천만 국가정원", "담양 메타세쿼이아길"] },
  혼행러: { joined: "2026년 5월", reviews: 9, trips: 7, likes: 96, recent: ["부산 해운대", "경주 대릉원"] },
  보험궁금: { joined: "2026년 9월", reviews: 1, trips: 2, likes: 12, recent: ["강릉 안목해변"] },
  혼행초보: { joined: "2026년 7월", reviews: 3, trips: 2, likes: 27, recent: ["서울 성수동"] },
};

// ── 여행 리뷰 상세 (글 번호별) ──
export const reviewDetails = {
  1: { visited: "10월 방문", views: 842,
    body: ["평일에 다녀와서 사람이 거의 없었어요. 애월 해안도로를 따라 카페와 산책로가 이어져 있어서 차로 천천히 움직이기 좋았어요.",
           "일몰 시간에 맞춰 곽지해변에 도착하면 사진이 제일 잘 나와요. 주차는 오전에 가면 걱정 없었고, 점심 이후에는 해변 근처가 조금 붐벼요."],
    photoMore: 8,
    comments: [
      { name: "지수", time: "어제", text: "저도 지난달에 다녀왔는데 곽지해변 카페 추천 감사해요! 일몰 시간대도 좋았어요.", likes: 5, replies: 0 },
      { name: "제주러버", time: "어제", text: "렌터카 없이도 코스 따라가기 가능할까요?", likes: 2, replies: 1,
        reply: { name: "달토끼", text: "버스로도 다닐 수 있는데 애월 구간은 택시가 훨씬 편했어요." } },
    ],
    related: [{ title: "협재해변, 물때 확인하고 가면 훨씬 예뻐요", likes: 87 }, { title: "애월 카페 5곳 솔직 후기", likes: 97 }, { title: "제주 동쪽 2박 3일 코스 공유해요", likes: 54 }] },
  3: { visited: "10월 방문", views: 615,
    body: ["야경이 정말 예뻐서 해 질 무렵 타는 걸 추천해요. 주말은 대기가 길어서 평일 저녁에 갔더니 20분 정도만 기다렸어요.",
           "케이블카를 타고 내려서는 오동도까지 걸어서 이동했어요. 동백나무 길이 짧아서 부담 없이 산책하기 좋았어요."],
    photoMore: 5,
    comments: [
      { name: "여수사랑", time: "어제", text: "크리스탈 캐빈이 더 좋을까요, 일반 캐빈이 나을까요?", likes: 3, replies: 1,
        reply: { name: "바다러버", text: "바닥이 투명한 캐빈이 재밌었어요. 대기 줄이 따로 있으니 미리 확인하세요." } },
      { name: "지수", time: "어제", text: "야경 시간대 정보 감사해요. 이번 주말에 가보려고요!", likes: 4, replies: 0 },
    ],
    related: [{ title: "여수 밤바다 산책 코스 정리", likes: 65 }, { title: "오동도 동백열차 탈 만한가요", likes: 41 }, { title: "여수 1박 2일 맛집 위주 후기", likes: 58 }] },
  5: { visited: "10월 방문", views: 480,
    body: ["가을에 걷기 좋아요. 전체를 돌면 3시간 정도 걸리고 편한 신발은 필수예요. 억새가 가장 예쁜 시간대는 오후 4시쯤이에요.",
           "낙안읍성은 같은 날 이어서 가기 좋았어요. 차로 20분 정도 거리라 오전에는 정원, 오후에는 읍성으로 잡았어요."],
    photoMore: 2,
    comments: [
      { name: "산책좋아", time: "2일 전", text: "정원 안에서 자전거나 전동차 타고 돌아다닐 수 있나요?", likes: 2, replies: 1,
        reply: { name: "정원러버", text: "전동차 있어요! 다리 아프면 한 구간만 타도 좋아요." } },
      { name: "혼행러", time: "어제", text: "억새 시간대 팁 덕분에 사진 잘 찍었어요.", likes: 3, replies: 0 },
    ],
    related: [{ title: "순천만 습지랑 같이 가면 좋아요", likes: 52 }, { title: "낙안읍성 한복 체험 후기", likes: 29 }, { title: "순천 1박 2일 코스 공유", likes: 44 }] },
};

// ── 질문 상세 (글 번호별) ──
export const questionDetails = {
  2: { views: 312,
    body: "운전을 못 해서 대중교통으로만 제주를 여행하려고 해요. 애월, 성산, 서귀포를 다 가보고 싶은데 현실적으로 가능할까요? 이동이 너무 오래 걸리는 구간이나 버스로는 어려운 곳이 있으면 알려주세요.",
    answersList: [
      { name: "제주토박이", time: "2시간 전", text: "렌터카 없이도 가능은 해요. 다만 애월 쪽은 버스 배차 간격이 길어서 이동 시간을 넉넉히 잡아야 해요. 공항에서 애월까지는 702번 버스가 가장 편했어요. 하루는 택시나 투어 버스를 섞는 걸 추천해요.", likes: 32, replies: 1,
        reply: { name: "뚜벅초보", text: "답변 감사해요! 702번 시간표 확인해볼게요." } },
      { name: "달토끼", time: "어제", text: "저는 2박 3일 동안 버스만 탔는데 서쪽 해안은 힘들었어요. 동쪽은 환승이 적어서 괜찮았습니다.", likes: 11, replies: 0 },
      { name: "뚜벅러", time: "어제", text: "렌터카 대신 전기 자전거를 하루 빌려서 다녔어요. 애월 해안도로는 자전거로도 좋아요.", likes: 4, replies: 0 },
    ],
    similar: [{ title: "제주 뚜벅이 코스 추천해주세요", answers: 4 }, { title: "제주 공항에서 애월 가는 방법", answers: 6 }, { title: "제주 버스 패스 살 만한가요?", answers: 2 }] },
  4: { views: 205,
    body: "서울에서 출발하고 부산역 근처 숙소예요. 시간이랑 비용 둘 다 고려하면 KTX랑 고속버스 중 어떤 게 나을까요? 짐은 캐리어 하나예요.",
    answersList: [
      { name: "부산토박이", time: "어제", text: "시간이 중요하면 KTX, 비용이 중요하면 고속버스예요. 부산역 숙소면 KTX가 편해요. 고속버스는 도착하는 터미널이 달라서 이동이 한 번 더 필요할 수 있어요.", likes: 14, replies: 0 },
      { name: "기차여행", time: "어제", text: "주말이면 KTX 표가 빨리 매진돼요. 미리 예매하고, 시간이 애매하면 SRT도 같이 보세요.", likes: 6, replies: 1,
        reply: { name: "혼행러", text: "SRT는 생각 못 했네요, 확인해볼게요!" } },
    ],
    similar: [{ title: "서울에서 부산 가는 가장 싼 방법", answers: 7 }, { title: "부산역 근처 숙소 추천해요", answers: 5 }, { title: "KTX 특실 살 만한가요?", answers: 3 }] },
  6: { views: 98,
    body: "렌터카 여행인데 여행자 보험을 따로 드는 게 좋을지 궁금해요. 렌터카 업체에서 가입하는 자차 보험과는 어떻게 다른가요?",
    answersList: [],
    similar: [{ title: "렌터카 자차 보험 꼭 들어야 하나요?", answers: 8 }, { title: "국내 여행자 보험 후기", answers: 3 }, { title: "제주 렌터카 처음 빌려요", answers: 5 }] },
  9: { views: 276,
    body: "혼자 가도 불편하지 않은 숙소 기준이 있을까요? 위치를 우선할지 가격을 우선할지 고민이에요. 처음이라 안전한 곳이면 좋겠어요.",
    answersList: [
      { name: "여행고수", time: "3일 전", text: "역과 가까운지, 리뷰에 혼자 여행이라는 말이 있는지 확인하세요. 처음에는 위치를 우선하는 걸 추천해요.", likes: 28, replies: 0 },
      { name: "혼행러", time: "3일 전", text: "게스트하우스 도미토리도 혼행에 좋아요. 방은 여자 전용으로 고를 수도 있어요.", likes: 17, replies: 0 },
      { name: "달토끼", time: "3일 전", text: "체크인 시간이 늦어도 되는지, 짐 보관이 되는지 꼭 보세요.", likes: 9, replies: 0 },
      { name: "바다러버", time: "4일 전", text: "후기 사진에 복도나 현관이 나오는 곳이 안전한 곳이 많았어요.", likes: 6, replies: 0 },
      { name: "뚜벅초보", time: "4일 전", text: "저는 24시간 프런트가 있는 곳만 골랐어요.", likes: 5, replies: 0 },
    ],
    similar: [{ title: "혼자 여행 숙소 안전하게 고르는 법", answers: 6 }, { title: "혼행 가능한 게스트하우스 추천", answers: 4 }, { title: "혼자 가기 좋은 국내 여행지", answers: 12 }] },
};

// 이번 달 가장 많이 리뷰된 여행지 (1~5위) — 나중에 DB에서 "이번 달 리뷰 수 많은 순"으로 가져와요
export const hotPlaces = [
  { rank: 1, placeId: 1, region: "제주", count: 128 },
  { rank: 2, placeId: 8, region: "서울", count: 92 },
  { rank: 3, placeId: 3, region: "전남", count: 84 },
  { rank: 4, placeId: 5, region: "전남", count: 76 },
  { rank: 5, placeId: 7, region: "부산", count: 71 },
];
