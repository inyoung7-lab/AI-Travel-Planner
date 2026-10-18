const SUPPORTED_LANGUAGES = new Set(['ko', 'en', 'ja']);
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateApplicationInput(input, session, privacyNoticeVersion) {
  const errors = {};
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();
  const note = String(input.note || '').trim();
  const count = Number(input.attendeeCount);
  const capacity = Number(session?.capacity);

  if (!name || name.length > 80) errors.name = '이름을 1~80자로 입력해 주세요.';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = '올바른 이메일 주소를 입력해 주세요.';
  if (phone.length > 40) errors.phone = '연락처는 40자 이내로 입력해 주세요.';
  if (!SUPPORTED_LANGUAGES.has(input.contactLanguage)) errors.contactLanguage = '연락 언어를 선택해 주세요.';
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(capacity) || count > capacity) {
    errors.attendeeCount = '참가 인원은 1명 이상이며 회차 정원 이하여야 합니다.';
  }
  if (note.length > 1000) errors.note = '메모는 1,000자 이내로 입력해 주세요.';
  if (input.privacyConsent !== true || !String(privacyNoticeVersion || '').trim()) {
    errors.privacyConsent = '개인정보 안내를 확인하고 동의해 주세요.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

const SERVER_MESSAGES = {
  APPLICATION_CLOSED: '모집이 마감되었거나 신청할 수 없는 회차입니다. 최신 일정을 확인해 주세요.',
  SESSION_FULL: '선택한 회차의 잔여 정원이 부족합니다. 인원을 줄이거나 다른 회차를 선택해 주세요.',
  INVALID_APPLICATION: '입력한 신청 정보를 확인해 주세요.',
  CONSENT_REQUIRED: '개인정보 안내에 동의해야 신청할 수 있습니다.',
  INVALID_SESSION: '회차 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
};

export function applicationErrorMessage(error) {
  const message = String(error?.message || '');
  const known = Object.keys(SERVER_MESSAGES).find(code => message.includes(code));
  return known ? SERVER_MESSAGES[known] : '신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
