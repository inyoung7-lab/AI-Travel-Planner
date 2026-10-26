export function loginErrorMessage(error) {
  const code = error?.code;
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || '')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.';
  }
  if (code === 'email_not_confirmed') return '이메일 인증이 완료되지 않았습니다. 인증 메일을 확인해 주세요.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || error?.status === 429) {
    return '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  }
  return '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
