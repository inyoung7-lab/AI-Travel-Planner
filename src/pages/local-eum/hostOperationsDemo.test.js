import test from 'node:test';
import assert from 'node:assert/strict';
import { demoHosts, getDemoAiExample, getHostOperationsDemo } from './hostOperationsDemo.js';
import { buildHostOperationsModel } from './hostOperations.js';

test('each public demo persona has its own independent program and synthetic applicant records', () => {
  for (const host of demoHosts) {
    const data = getHostOperationsDemo(host.host_id);
    assert.equal(data.host.host_id, host.host_id);
    assert.equal(data.experiences.length, 2);
    const sessionIds = new Set(data.experiences.flatMap((experience) => {
      assert.equal(experience.host_id, host.host_id);
      return experience.sessions.map((session) => session.session_id);
    }));
    for (const application of data.applications) {
      assert.ok(sessionIds.has(application.session_id));
      assert.match(application.receipt_code, /^DEMO-/);
      assert.match(application.applicant_email, /@example\.com$/);
      assert.ok(application.applicant_phone === null || application.applicant_phone === '010-0000-0000');
      assert.equal(Object.hasOwn(application, 'auth_user_id'), false);
    }
    assert.equal(buildHostOperationsModel(data.experiences, data.applications).experienceCount, 2);
  }
  const first = getHostOperationsDemo();
  first.applications[0].applicant_name = 'local change';
  assert.notEqual(getHostOperationsDemo().applications[0].applicant_name, 'local change');
});

test('public AI fixture explicitly identifies sample output and does not claim executed tools or live citations', () => {
  const experience = getHostOperationsDemo().experiences[0];
  const sample = getDemoAiExample(experience);
  assert.match(sample.report.headline, /예시/);
  assert.match(sample.report.positioning, /지금 AI를 실행한 결과가 아닙니다/);
  assert.deepEqual(sample.trace, []);
  assert.deepEqual(sample.citations, []);
  assert.equal(sample.cost.revenue, experience.fee * 2);
});
