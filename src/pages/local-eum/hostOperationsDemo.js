// Public, synthetic examples only. Never import real applications or Auth sessions here.
export const demoHosts = [
  { host_id: 'demo-masan', display_name: '마산 골목 이야기', bio: '“오래된 골목에서 오늘의 새로운 이야기를 만납니다.”\n\n안녕하세요. 마산의 골목과 시장, 그리고 그곳에 담긴 이야기를 좋아하는 로컬 호스트입니다.\n\n마산에는 그냥 지나치기에는 아까운 풍경과 이야기가 많습니다. 오랜 시간 자리를 지켜온 시장, 세월의 흔적이 남은 골목, 그 안에서 살아가는 사람들의 일상이 그렇습니다.\n\n저는 여행자가 단순히 설명을 듣고 지나가는 대신, 직접 관찰하고 질문하며 새로운 이야기를 발견할 수 있는 경험을 만들고 싶습니다.\n\n마산어시장에서 지역의 음식문화를 탐구하거나, 창동의 골목을 탐정처럼 누비며 숨겨진 단서를 찾아보는 시간.\n\n때로는 함께 웃고, 때로는 뜻밖의 발견을 하면서 나만의 마산을 기억하게 되는 여행을 준비합니다.\n\n평범한 동네가 특별한 추억이 되는 순간, 그 시간을 함께하겠습니다.' },
  { host_id: 'demo-local', display_name: '로컬이음 체험 호스트', bio: '“낯선 여행지에서 발견하는 익숙한 사람의 온기”\n\n안녕하세요. 여행지의 새로운 모습과 특별한 만남을 소개하는 로컬이음 호스트입니다.\n\n여행은 유명한 장소를 방문하는 것만으로 완성되지 않는다고 생각합니다. 동네 골목에서 우연히 발견한 이야기, 시장에서 나눈 짧은 대화, 서로 다른 문화를 알아가는 시간이 오래 기억에 남기도 합니다.\n\n저는 서울과 부산, 창원 등 다양한 지역을 배경으로 여행자가 직접 참여하고 경험할 수 있는 프로그램을 소개합니다.\n\n시장과 골목을 탐색하고, 지역 문화를 배우고, 사람들과 취향과 이야기를 나누는 시간까지.\n\n여행이 단순한 방문을 넘어 특별한 경험으로 남을 수 있도록 연결하겠습니다.' },
];

const templates = [
  { title: '오늘의 바다밥상 연구소', description: '시장 식재료를 관찰하고 바다밥상 카드를 만드는 시연용 체험입니다. 시식 협력처는 미확정입니다.', starts_at: '2026-12-12T01:00:00+00:00', duration: 120, fee: 18000, meeting: '마산어시장 · 세부 집결 위치 확인 전', steps: ['집결과 시장 탐구 안내', '어시장 이야기와 식재료 관찰', '바다밥상 카드 구성', '발견한 이야기 공유'] },
  { title: '사라진 마산의 비밀지도', description: '창동의 골목을 관찰하고 단서를 연결해 나만의 지도를 완성하는 시연용 체험입니다.', starts_at: '2026-12-13T05:00:00+00:00', duration: 105, fee: 29000, meeting: '창동예술촌 · 세부 집결 위치 확인 전', steps: ['집결과 비밀지도 미션 안내', '골목 표식과 단서 관찰', '기억을 연결하는 지도 만들기', '추리 결과와 기록 공유'] },
  { title: '광장시장 음식문화 산책', description: '시장의 음식과 사람들의 이야기를 관찰하는 공개 데모 프로그램입니다.', starts_at: '2026-12-19T02:00:00+00:00', duration: 90, fee: 15000, meeting: '광장시장 · 시연 집결지', steps: ['집결과 안내', '시장 골목 관찰', '음식문화 이야기', '관찰 기록 공유'] },
  { title: '감천문화마을 골목 여행', description: '마을 풍경과 예술을 기록하는 공개 데모 프로그램입니다. 공식 해설이나 시설 예약과 연결되지 않습니다.', starts_at: '2026-12-20T01:00:00+00:00', duration: 90, fee: 18000, meeting: '감천문화마을 · 시연 집결지', steps: ['집결과 방문 예절 안내', '골목 풍경 관찰', '마을 이야기 기록', '발견한 풍경 공유'] },
];

export function getHostOperationsDemo(hostId = demoHosts[0].host_id) {
  const host = demoHosts.find((item) => item.host_id === hostId) || demoHosts[0];
  const examples = host.host_id === 'demo-masan' ? templates.slice(0, 2) : templates.slice(2);
  const experiences = examples.map((item, index) => ({
    ...item, host_id: host.host_id, experience_id: index + 1, status: 'PUBLISHED',
    sessions: [0, 1].map((offset) => {
      const start = Date.parse(item.starts_at) + offset * 7 * 86400000;
      return { session_id: (index + 1) * 10 + offset, experience_id: index + 1, starts_at: new Date(start).toISOString(), ends_at: new Date(start + item.duration * 60000).toISOString(), meeting_place: item.meeting, fee_amount: item.fee, min_people: 2, capacity: 8, status: offset ? 'DRAFT' : 'RECRUITING' };
    }),
  }));
  const applications = experiences.flatMap((experience, index) => [0, 1].map((item) => ({
    application_id: index * 10 + item + 1, receipt_code: `DEMO-${index + 1}-${item + 1}`,
    session_id: experience.sessions[0].session_id, applicant_name: `시연 참가자 ${index ? 'B' : 'A'}${item + 1}`,
    applicant_email: `demo-guest-${index + 1}-${item + 1}@example.com`, applicant_phone: item ? null : '010-0000-0000',
    attendee_count: item + 1, contact_language: item ? 'en' : 'ko', status: 'PENDING',
    note: item ? null : '실제 신청이 아닌 가상 문의 예시입니다. 준비물을 확인하고 싶어요.',
    created_at: '2026-10-18T00:00:00Z', expires_at: '2026-12-01T00:00:00Z',
  })));
  return { host, experiences, applications, error: '', loading: false };
}

export function getDemoAiExample(experience) {
  const keys = ['participation_reason', 'host_unique_value', 'active_participation', 'memorable_outcome', 'operational_safety'];
  return {
    report: {
      headline: `${experience.title} · 화면 구성을 보여주는 분석 예시`,
      motivation: '참가자가 지역을 직접 관찰하고 자신의 기록을 남기는 방향을 설명하는 예시 결과입니다.',
      positioning: '지금 AI를 실행한 결과가 아닙니다. 실제 진단은 HOST 로그인 후 사용할 수 있습니다.',
      risks: ['집결지와 보행 동선을 현장에서 확인해야 합니다.', '시설 이용·제휴·식음 제공은 확정되지 않았습니다.'],
      alternatives: [
        { title: '관찰과 기록 중심', concept: '지역의 풍경을 관찰하고 메모를 남깁니다.', distinctValue: '참가자가 자신의 기록물을 완성하는 시연 구성입니다.', paymentModel: 'undetermined', hostService: '관찰 과제와 기록 진행을 안내하는 역할을 가정합니다.', prerequisites: ['동선과 안내 자료 검수'] },
        { title: '이야기 공유 중심', concept: '발견한 지역의 이야기를 참가자끼리 나눕니다.', distinctValue: '만남과 대화를 중심으로 하는 시연 구성입니다.', paymentModel: 'cost_share', hostService: '대화 진행을 돕는 역할을 가정합니다.', prerequisites: ['참가자 언어와 운영 조건 확인'] },
      ],
    },
    evaluation: { total: 10, maximum: 20, rubric: 'UI 시연용 예시 점수입니다. 실제 상품 평가가 아닙니다.', criteria: keys.map((key) => ({ key, score: 2, evidence: '화면 설명을 위한 가상 평가 근거입니다.' })) },
    cost: { attendees: 2, revenue: experience.fee * 2, directCost: null, note: '시연용 계산 예시이며 실제 가격·이익·결제를 뜻하지 않습니다.' },
    citations: [], trace: [],
  };
}
