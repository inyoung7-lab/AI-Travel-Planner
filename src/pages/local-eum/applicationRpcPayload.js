export function toApplicationRpcPayload(input) {
  const optionalText = value => String(value || '').trim() || null;
  return {
    p_session_id: Number(input.sessionId),
    p_name: String(input.name || '').trim(),
    p_email: String(input.email || '').trim().toLowerCase(),
    p_phone: optionalText(input.phone),
    p_contact_language: input.contactLanguage,
    p_attendee_count: Number(input.attendeeCount),
    p_note: optionalText(input.note),
    p_privacy_notice_version: String(input.privacyNoticeVersion || '').trim(),
    p_privacy_consent: input.privacyConsent === true,
  };
}
