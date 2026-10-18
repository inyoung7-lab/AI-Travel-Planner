import { translate } from './localEumI18n.js';

const SUPPORTED_LANGUAGES = new Set(['ko', 'en', 'ja']);
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateApplicationInput(input, session, privacyNoticeVersion, locale = 'ko') {
  const errors = {};
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();
  const note = String(input.note || '').trim();
  const count = Number(input.attendeeCount);
  const capacity = Number(session?.capacity);

  if (!name || name.length > 80) errors.name = translate(locale, 'applicationNameError');
  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = translate(locale, 'applicationEmailError');
  if (phone.length > 40) errors.phone = translate(locale, 'applicationPhoneError');
  if (!SUPPORTED_LANGUAGES.has(input.contactLanguage)) errors.contactLanguage = translate(locale, 'applicationContactLanguageError');
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(capacity) || count > capacity) {
    errors.attendeeCount = translate(locale, 'applicationAttendeeCountError');
  }
  if (note.length > 1000) errors.note = translate(locale, 'applicationNoteError');
  if (input.privacyConsent !== true || !String(privacyNoticeVersion || '').trim()) {
    errors.privacyConsent = translate(locale, 'applicationConsentError');
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

const SERVER_MESSAGE_KEYS = {
  APPLICATION_CLOSED: 'applicationClosedError',
  SESSION_FULL: 'sessionFullError',
  INVALID_APPLICATION: 'invalidApplicationError',
  CONSENT_REQUIRED: 'consentRequiredError',
  INVALID_SESSION: 'invalidSessionError',
};

export function applicationErrorMessage(error, locale = 'ko') {
  const message = String(error?.message || '');
  const known = Object.keys(SERVER_MESSAGE_KEYS).find(code => message.includes(code));
  return translate(locale, known ? SERVER_MESSAGE_KEYS[known] : 'submitApplicationError');
}
