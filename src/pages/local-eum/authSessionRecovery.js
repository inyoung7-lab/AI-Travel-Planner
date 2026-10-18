function expiredToken(error) {
  return Boolean(error && /(?:jwt|access.?token|token)\s+(?:has\s+)?expired/i.test(error.message || ''));
}

function authError(code, message) {
  return Object.assign(new Error(message), { code });
}

// Only wrap the read-only HOST permission check, never replay a write.
// A server can reject a token before the browser's clock considers it expired.
export function createAuthSessionRecovery(auth) {
  let refreshInFlight = null;

  async function expiredSession() {
    await auth.signOut({ scope: 'local' });
    throw authError('AUTH_SESSION_EXPIRED', '로그인 시간이 만료되었습니다. HOST 계정으로 다시 로그인해 주세요.');
  }

  async function refresh(failedToken) {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const current = await auth.getSession();
      if (!current.error && current.data?.session?.access_token !== failedToken && current.data?.session) {
        return current.data.session;
      }
      let result;
      try { result = await auth.refreshSession(); }
      catch {
        throw authError('AUTH_REFRESH_FAILED', '로그인 인증을 갱신하지 못했습니다. 연결 상태를 확인한 뒤 다시 불러와 주세요.');
      }
      if (result.error) {
        if ([400, 401, 403].includes(result.error.status) || /refresh_token_(?:not_found|already_used)|session_not_found/.test(result.error.code || '')) {
          return expiredSession();
        }
        throw authError('AUTH_REFRESH_FAILED', '로그인 인증을 갱신하지 못했습니다. 연결 상태를 확인한 뒤 다시 불러와 주세요.');
      }
      if (!result.data?.session) return expiredSession();
      return result.data.session;
    })();
    try { return await refreshInFlight; }
    finally { refreshInFlight = null; }
  }

  return async function withSessionRecovery(read, expectedUserId) {
    const initial = await auth.getSession();
    const initialSession = initial.data?.session;
    if (initial.error || !initialSession) {
      throw authError('AUTH_SESSION_EXPIRED', 'HOST 계정으로 다시 로그인해 주세요.');
    }
    if (initialSession.user.id !== expectedUserId) {
      throw authError('AUTH_ACCOUNT_CHANGED', '로그인 계정이 바뀌었습니다. 화면을 다시 불러와 주세요.');
    }
    const result = await read();
    if (!expiredToken(result.error)) return result;
    const freshSession = await refresh(initialSession.access_token);
    if (freshSession.user.id !== expectedUserId) {
      throw authError('AUTH_ACCOUNT_CHANGED', '로그인 계정이 바뀌었습니다. 화면을 다시 불러와 주세요.');
    }
    const retried = await read();
    if (expiredToken(retried.error)) return expiredSession();
    return retried;
  };
}
