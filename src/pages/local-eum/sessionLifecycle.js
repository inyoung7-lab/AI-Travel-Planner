import { fromKstFields } from './sessionTime.js';

export function createDraftSessionPayload(form, durationMinutes, now = Date.now()) {
  let startsAt;
  try {
    startsAt = fromKstFields(form.date, form.time);
  } catch {
    throw new Error('새 회차의 운영 날짜와 시작 시간을 입력해 주세요.');
  }

  if (Date.parse(startsAt) <= now) throw new Error('새 회차는 현재 시각 이후로 설정해 주세요.');
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    throw new Error('회차 진행 시간을 확인해 주세요.');
  }

  const minPeople = Number(form.min_people);
  const capacity = Number(form.capacity);
  const feeAmount = Number(form.fee_amount);
  const meetingPlace = String(form.meeting_place || '').trim();
  if (!meetingPlace || meetingPlace.length > 200) throw new Error('공개 가능한 만남 장소를 1~200자로 입력해 주세요.');
  if (!Number.isSafeInteger(minPeople) || minPeople < 1) throw new Error('최소 인원은 1명 이상이어야 합니다.');
  if (!Number.isSafeInteger(capacity) || capacity < minPeople) throw new Error('최대 인원은 최소 인원 이상이어야 합니다.');
  if (!Number.isSafeInteger(feeAmount) || feeAmount < 0) throw new Error('회비는 0원 이상의 정수로 입력해 주세요.');

  return {
    starts_at: startsAt,
    ends_at: new Date(Date.parse(startsAt) + durationMinutes * 60_000).toISOString(),
    meeting_place: meetingPlace,
    recruit_deadline: null,
    min_people: minPeople,
    capacity,
    fee_amount: feeAmount,
    status: 'DRAFT',
  };
}

export function sessionOperationErrorMessage(code, operation = 'save') {
  const copy = {
    create: {
      '42501': '회차 추가 권한이 없습니다. 소유 HOST의 회차 추가 정책을 확인해 주세요.',
      '23514': '새 회차 상태를 데이터베이스가 허용하지 않습니다. 승인된 회차 운영 SQL을 적용해야 합니다.',
      default: '새 운영 회차를 만들지 못했습니다. 입력값과 데이터베이스 상태를 확인해 주세요.',
    },
    cancel: {
      '23514': 'Supabase에 운영 취소 상태를 허용하는 승인된 SQL을 먼저 적용해야 합니다.',
      '42501': '회차 취소 권한이 없습니다. 소유 HOST 정책을 확인해 주세요.',
      default: '운영 회차를 취소하지 못했습니다.',
    },
    cancelExperience: {
      PGRST202: '체험 취소 기능을 위한 검토 SQL이 아직 데이터베이스에 적용되지 않았습니다.',
      '42501': '체험 취소 권한이 없습니다. 로그인한 HOST가 소유한 체험인지 확인해 주세요.',
      default: '체험을 취소하지 못했습니다. 최신 상태와 데이터베이스 권한을 확인해 주세요.',
    },
  };
  const messages = copy[operation] || copy.save;
  return messages[code] || messages.default;
}
