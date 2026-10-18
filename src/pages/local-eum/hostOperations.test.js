import test from 'node:test';
import assert from 'node:assert/strict';
import { applicantContactHref, buildHostOperationsModel, selectHostOperationsContext } from './hostOperations.js';

const now = new Date('2026-10-17T00:00:00Z');

test('selection cannot pair a session with a different program or retain an unknown host session', () => {
  const model = buildHostOperationsModel([
    { experience_id: 111, title: 'A', sessions: [{ session_id: 15, starts_at: '2026-12-12T01:00:00Z', status: 'RECRUITING' }] },
    { experience_id: 112, title: 'B', sessions: [{ session_id: 16, starts_at: '2026-12-13T01:00:00Z', status: 'RECRUITING' }] },
  ], [{ application_id: 1, session_id: 16, created_at: '2026-10-16T00:00:00Z' }], now);
  assert.equal(selectHostOperationsContext(model, 111, 16).session.session_id, 15);
  assert.equal(selectHostOperationsContext(model, 999, 999).session.session_id, 16);
  assert.equal(selectHostOperationsContext(model, null, null).experience.experience_id, 112);
  assert.equal(selectHostOperationsContext(buildHostOperationsModel(), null, null).session, null);
});

test('contact actions accept ordinary numbers and emails and reject injected URL parameters', () => {
  assert.equal(applicantContactHref('phone', '+82 (10) 1234-5678'), 'tel:+821012345678');
  assert.equal(applicantContactHref('email', 'guest+trip@example.com'), 'mailto:guest%2Btrip%40example.com');
  assert.equal(applicantContactHref('phone', null), null);
  assert.equal(applicantContactHref('phone', 'javascript:alert(1)'), null);
  assert.equal(applicantContactHref('email', 'guest@example.com?bcc=other@example.com'), null);
  assert.equal(applicantContactHref('email', 'guest@example.com\r\nBcc:other@example.com'), null);
});

test('buildHostOperationsModel summarizes only sessions and applications belonging to supplied experiences', () => {
  const model = buildHostOperationsModel([
    { experience_id: 111, title: '오늘의 바다밥상 연구소', sessions: [
      { session_id: 21, starts_at: '2026-12-12T01:00:00Z', status: 'RECRUITING' },
      { session_id: 22, starts_at: '2026-12-13T01:00:00Z', status: 'CANCELLED' },
    ] },
    { experience_id: 112, title: '사라진 마산의 비밀지도', sessions: [
      { session_id: 23, starts_at: '2026-12-14T01:00:00Z', status: 'DRAFT' },
    ] },
  ], [
    { application_id: 1, session_id: 21, created_at: '2026-10-16T00:00:00Z', expires_at: '2026-10-18T00:00:00Z', status: 'PENDING' },
    { application_id: 2, session_id: 22, created_at: '2026-10-16T01:00:00Z', expires_at: '2026-10-18T00:00:00Z', status: 'PENDING' },
    { application_id: 3, session_id: 999, created_at: '2026-10-16T02:00:00Z', expires_at: '2026-10-18T00:00:00Z', status: 'PENDING' },
  ], now);

  assert.equal(model.experienceCount, 2);
  assert.equal(model.activeSessionCount, 2);
  assert.equal(model.pendingApplicationCount, 2);
  assert.deepEqual(model.upcomingSessions.map((session) => session.session_id), [21]);
  assert.equal(model.applications.length, 2);
  assert.equal(model.applications[0].experienceTitle, '오늘의 바다밥상 연구소');
});

test('buildHostOperationsModel handles empty data and marks expired requests without inventing statuses', () => {
  const empty = buildHostOperationsModel([], [], now);
  assert.equal(empty.experienceCount, 0);
  assert.equal(empty.activeSessionCount, 0);
  assert.equal(empty.pendingApplicationCount, 0);

  const model = buildHostOperationsModel([
    { experience_id: 1, title: '체험', sessions: [{ session_id: 1, starts_at: '2026-12-01T00:00:00Z', status: 'RECRUITING' }] },
  ], [
    { application_id: 1, session_id: 1, created_at: '2026-10-15T00:00:00Z', expires_at: '2026-10-16T00:00:00Z', status: 'PENDING' },
  ], now);

  assert.equal(model.pendingApplicationCount, 0);
  assert.equal(model.applications[0].status, 'PENDING');
  assert.equal(model.applications[0].expired, true);
});
