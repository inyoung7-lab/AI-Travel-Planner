import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentError, estimateCost, retrieveKnowledge, runAgent, validateRequest } from './agent-core.mjs';
import { authorizeHostRequest, selectOwnedSession } from './auth.mjs';

const keys = ['participation_reason', 'host_unique_value', 'active_participation', 'memorable_outcome', 'operational_safety'];
const fixtures = [
  { label: 'tourism visit', title: '진해해양공원 바다 이야기', region: 'CHANGWON', query: '진해해양공원 관광 방문', expectedRisk: '입장료와 별도의 HOST 가치 확인', missing: ['host_unique_value', 'active_participation'] },
  { label: 'language exchange', title: '지역 주민과 언어교류', region: 'BUSAN', query: '부산 주민 언어교류', expectedRisk: '무료 모임과 유료 진행의 차이 확인', missing: ['host_unique_value'] },
  { label: 'sea food lab', title: '오늘의 바다밥상 연구소', region: 'CHANGWON', query: '마산어시장 바다밥상 시식', expectedRisk: '협력처·원가·위생·알레르기 확인', missing: ['operational_safety'] },
  { label: 'secret map', title: '사라진 마산의 비밀지도', region: 'CHANGWON', query: '창동예술촌 마산 비밀지도 추리', expectedRisk: '퍼즐·결과물·골목 안전 확인', missing: ['memorable_outcome', 'operational_safety'] },
];

function reportFor(fixture, citationId, action = 'analyze') {
  return {
    headline: `${fixture.title} 진단`, customer: '지역 여행자', motivation: '참여와 교류', positioning: 'HOST 진행 체험',
    strengths: ['지역 소재'], weaknesses: ['검증 자료 부족'], risks: [fixture.expectedRisk], evidenceIds: citationId ? [citationId] : [],
    alternatives: [
      { title: '교류형', concept: '현지 주민과 대화', distinctValue: '실제 만남', paymentModel: 'cost_share', hostService: '진행과 대화 촉진', prerequisites: ['참가자 모집'] },
      { title: '기록형', concept: '관찰과 기록', distinctValue: '참가자 기록물', paymentModel: 'paid', hostService: '자료 준비와 피드백', prerequisites: ['동선 확인'] },
    ],
    plan: action === 'plan' ? { title: '지역 대화 모임', tagline: '함께 이야기하기', customerValue: '만남', audience: '여행자', durationMinutes: 90, timeline: [{ minute: 0, activity: '집결', hostRole: '안내', participantOutput: '질문 작성' }, { minute: 45, activity: '대화', hostRole: '촉진', participantOutput: '기록' }], materials: ['메모지'], included: ['진행'], excluded: ['식비'], meetingConsiderations: '현장 확인', priceValidation: '실비 확인', safetyLegalChecks: ['안전 동선'], preparationTasks: ['장소 확인'], detailDescription: 'HOST 검토 전 AI 상세 소개 초안입니다.' } : null,
  };
}

function modelFixture(fixture, action, badCitation = false) {
  const calls = [];
  let citationId = null;
  return { calls, async call(payload) {
    calls.push(payload);
    const name = payload.tool_choice?.name;
    if (!name) {
      const retrieved = payload.input.find((item) => item.type === 'function_call_output' && item.output.includes('"matches"'));
      const matches = retrieved ? JSON.parse(retrieved.output).matches : [];
      citationId = matches[0]?.id || null;
      return { output_text: JSON.stringify(reportFor(fixture, badCitation ? 'invented-source' : citationId, action)) };
    }
    let args;
    if (name === 'search_existing_experiences' || name === 'retrieve_local_knowledge') args = { query: fixture.query, region: fixture.region };
    else if (name === 'evaluate_experience_value') args = { criteria: keys.map((key) => ({ key, evidenceType: fixture.missing.includes(key) ? 'missing' : 'observed', evidence: fixture.expectedRisk, strength: 1 })) };
    else args = { attendees: 4, assumedMaterialCostPerPerson: null, assumedFixedCost: null };
    return { output: [{ type: 'function_call', name, call_id: `call-${calls.length}`, arguments: JSON.stringify(args) }] };
  } };
}

for (const fixture of fixtures) {
  test(`mocked agent tool cycle: ${fixture.label}`, async () => {
    const model = modelFixture(fixture, 'analyze');
    const traces = [];
    const result = await runAgent({
      request: { action: 'analyze', mode: 'existing', locale: 'ko', experienceId: 111 },
      context: { experience: { experience_id: 111, title: fixture.title, region_code: fixture.region }, session: { fee_amount: 18000, capacity: 8 }, steps: [] },
      searchExperiences: async () => [{ experience_id: 111, title: fixture.title }],
      modelCall: model.call, logger: (trace) => traces.push(trace),
    });
    assert.deepEqual(traces.map((item) => item.tool), ['search_existing_experiences', 'retrieve_local_knowledge', 'evaluate_experience_value', 'estimate_program_cost']);
    assert.equal(result.cost.revenue, 72000);
    assert.equal(result.cost.directCost, null);
    for (const key of fixture.missing) assert.equal(result.evaluation.criteria.find((item) => item.key === key).score, 0);
    assert.equal(result.report.alternatives.length, 2);
    assert.equal(model.calls.length, 5);
    if (fixture.label === 'sea food lab' || fixture.label === 'secret map') assert.ok(result.citations.length > 0);
  });
}

test('plan action produces an editable plan through the same tool cycle', async () => {
  const fixture = fixtures[2];
  const model = modelFixture(fixture, 'plan');
  const result = await runAgent({ request: { action: 'plan', mode: 'idea', locale: 'en', idea: 'Create a local food culture exchange in Masan', selectedAlternative: 'Community conversation over regional food stories' }, context: { region: 'CHANGWON', session: null }, searchExperiences: async () => [], modelCall: model.call });
  assert.equal(result.report.plan.timeline.length, 2);
  assert.equal(result.cost.revenue, null);
  assert.equal(model.calls.at(-1).tool_choice, 'none');
});

test('retrieval ranks matching Masan source and does not invent evidence', () => {
  const rows = retrieveKnowledge('마산어시장 바다밥상 시식', 'CHANGWON');
  assert.equal(rows[0].id, 'masan-fish-market');
  assert.ok(rows[0].url.startsWith('https://'));
  assert.equal(retrieveKnowledge('Masan seafood market', 'CHANGWON')[0].id, 'masan-fish-market');
  assert.equal(retrieveKnowledge('マサン 魚市場', 'CHANGWON')[0].id, 'masan-fish-market');
  assert.deepEqual(retrieveKnowledge('unrelatedtermzzzz', null), []);
});

test('invalid model citation is rejected', async () => {
  const model = modelFixture(fixtures[2], 'analyze', true);
  await assert.rejects(runAgent({ request: { action: 'analyze', mode: 'existing', locale: 'ja', experienceId: 111 }, context: { experience: { experience_id: 111, title: fixtures[2].title, region_code: 'CHANGWON' }, session: { fee_amount: 18000, capacity: 8 } }, searchExperiences: async () => [], modelCall: model.call }), (error) => error.code === 'MODEL_OUTPUT');
});

test('cost tool enforces capacity and keeps unknown costs unknown', () => {
  assert.equal(estimateCost({ attendees: 3, assumedMaterialCostPerPerson: null, assumedFixedCost: null }, { fee_amount: 15000, capacity: 6 }).revenue, 45000);
  assert.throws(() => estimateCost({ attendees: 7, assumedMaterialCostPerPerson: 1000, assumedFixedCost: 0 }, { fee_amount: 15000, capacity: 6 }), AgentError);
});

test('HOST authorization denies cross-host experience and non-HOST role', async () => {
  const lookup = { hasHostRole: async () => true, ownHostId: async () => 501, getHost: async () => ({ host_id: 501, approval_status: 'APPROVED' }), getOwnedExperience: async () => ({ experience_id: 101, host_id: 500 }) };
  await assert.rejects(authorizeHostRequest({ action: 'analyze', mode: 'existing', locale: 'ko', experienceId: 101 }, 'user-501', lookup), (error) => error.code === 'FORBIDDEN');
  await assert.rejects(authorizeHostRequest({ action: 'analyze', mode: 'idea', locale: 'ko', idea: '마산 지역의 문화 교류 체험을 만들고 싶습니다' }, 'user-501', { ...lookup, hasHostRole: async () => false }), (error) => error.code === 'FORBIDDEN');
});

test('selected session must belong to the already authorized experience', () => {
  assert.equal(selectOwnedSession([{ session_id: 16, experience_id: 112 }], 16).session_id, 16);
  assert.throws(() => selectOwnedSession([{ session_id: 16, experience_id: 112 }], 2), (error) => error.code === 'FORBIDDEN');
});

test('request validation bounds ideas and supports ko/en/ja', () => {
  for (const locale of ['ko', 'en', 'ja']) assert.equal(validateRequest({ action: 'analyze', mode: 'idea', locale, idea: 'Masan neighborhood conversation program' }).locale, locale);
  assert.throws(() => validateRequest({ action: 'analyze', mode: 'idea', locale: 'fr', idea: 'Masan neighborhood conversation program' }), AgentError);
});
