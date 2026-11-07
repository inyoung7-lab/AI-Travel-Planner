export const SERVICE_POLICY_VERSION = '2026-11-07-draft';
export const SERVICE_CONTACT_EMAIL = 'beautimind01@gmail.com';
export const SERVICE_POLICY_PATHS = Object.freeze({ terms: '/terms', privacy: '/privacy' });

export function signupConsentMetadata(values) {
  const accepted = value => value === 'accepted' || value === true;
  if (!accepted(values.termsAgreement)) throw new Error('이용약관에 동의해 주세요.');
  if (!accepted(values.privacyAgreement)) throw new Error('개인정보 수집·이용 안내에 동의해 주세요.');
  return {
    terms_accepted: true, privacy_accepted: true,
    terms_version: SERVICE_POLICY_VERSION, privacy_version: SERVICE_POLICY_VERSION,
  };
}
