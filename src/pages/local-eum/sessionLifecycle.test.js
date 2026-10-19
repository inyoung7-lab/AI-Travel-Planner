import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraftSessionPayload, sessionOperationErrorMessage } from './sessionLifecycle.js';

const now = Date.parse('2026-10-17T00:00:00.000Z');

test('new session draft preserves the selected session settings and calculates end from duration', () => {
  const result = createDraftSessionPayload({
    date: '2026-12-20', time: '14:00', meeting_place: '  창동예술촌 아트센터 앞  ',
    min_people: '4', capacity: '8', fee_amount: '29000',
  }, 105, now);
  assert.deepEqual(result, {
    starts_at: '2026-12-20T05:00:00.000Z',
    ends_at: '2026-12-20T06:45:00.000Z',
    meeting_place: '창동예술촌 아트센터 앞',
    recruit_deadline: null,
    min_people: 4,
    capacity: 8,
    fee_amount: 29000,
    status: 'DRAFT',
  });
});

test('new session draft requires a future valid KST date and time', () => {
  assert.throws(() => createDraftSessionPayload({ date: '', time: '14:00' }, 60, now), /운영 날짜와 시작 시간/);
  assert.throws(() => createDraftSessionPayload({ date: '2026-10-16', time: '14:00' }, 60, now), /현재 시각 이후/);
  assert.throws(() => createDraftSessionPayload({ date: '2026-12-20', time: '14:00' }, 0, now), /진행 시간/);
});

test('new session draft validates attendee limits, fee and public meeting place', () => {
  const base = { date: '2026-12-20', time: '14:00', meeting_place: '창동예술촌', min_people: '4', capacity: '8', fee_amount: '29000' };
  assert.throws(() => createDraftSessionPayload({ ...base, capacity: '3' }, 60, now), /최대 인원/);
  assert.throws(() => createDraftSessionPayload({ ...base, fee_amount: '-1' }, 60, now), /회비/);
  assert.throws(() => createDraftSessionPayload({ ...base, meeting_place: '  ' }, 60, now), /만남 장소/);
});

test('session operations explain missing owner policies and lifecycle schema separately', () => {
  assert.match(sessionOperationErrorMessage('42501', 'create'), /추가 권한/);
  assert.match(sessionOperationErrorMessage('23514', 'cancel'), /운영 취소 상태/);
  assert.match(sessionOperationErrorMessage('PGRST202', 'cancelExperience'), /검토 SQL/);
  assert.match(sessionOperationErrorMessage('unexpected', 'create'), /데이터베이스 상태/);
});
