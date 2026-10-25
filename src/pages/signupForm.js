export const SIGNUP_NAME_MAX_LENGTH = 100;
export const SIGNUP_PASSWORD_MIN_LENGTH = 8;

export function signupRequest(values) {
  const name = String(values.user_name || '').trim();
  const email = String(values.email || '').trim();
  const password = String(values.password || '');
  if (!name || Array.from(name).length > SIGNUP_NAME_MAX_LENGTH) throw new Error('이름은 앞뒤 공백을 제외하고 1~100자로 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('사용할 수 있는 이메일 주소를 입력해 주세요.');
  if (password.length < SIGNUP_PASSWORD_MIN_LENGTH) throw new Error('비밀번호는 8자 이상 입력해 주세요.');
  if (password !== values.passwordConfirm) throw new Error('비밀번호 확인이 일치하지 않습니다.');
  if (!values.agreement) throw new Error('이용약관 및 개인정보 처리방침에 동의해 주세요.');
  // The auth.users trigger maps metadata.name to travel_profiles.user_name.
  // UUID is assigned by Auth; confirmation and agreement controls are not profile columns.
  return { email, password, options: { data: { name } } };
}

export function signupErrorMessage(error) {
  const messages = {
    user_already_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
    email_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
    email_address_invalid: '이메일 주소를 확인해 주세요.',
    email_address_not_authorized: '현재 이 이메일로 인증 메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.',
    weak_password: '더 안전한 비밀번호를 사용해 주세요. 서버의 비밀번호 조건을 확인해 주세요.',
    over_email_send_rate_limit: '인증 메일 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    over_request_rate_limit: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    signup_disabled: '현재 회원가입을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.',
    unexpected_failure: '가입 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  };
  if (messages[error?.code]) return messages[error.code];
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) return '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.';
  return '회원가입하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.';
}
