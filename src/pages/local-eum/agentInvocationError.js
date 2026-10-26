export function classifyAgentInvocationError(error) {
  const status = Number(error?.context?.status || error?.status || 0);
  if (status === 404) return 'FUNCTION_NOT_DEPLOYED';
  if (status === 401 || status === 403) return 'AUTH_REQUIRED';
  if (status === 429 || status >= 500) return 'UPSTREAM_FAILURE';
  if (error?.name === 'FunctionsFetchError'
    || /failed to send a request to the edge function|failed to fetch|networkerror|load failed/i.test(error?.message || '')) {
    return 'ORIGIN_OR_NETWORK';
  }
  return 'UNKNOWN';
}

export async function readPromptInjectionMessage(error, locale = 'ko') {
  const response = error?.context;
  if (Number(response?.status) !== 400 || typeof response?.clone !== 'function') return null;
  try {
    const payload = await response.clone().json();
    if (payload?.code !== 'PROMPT_INJECTION') return null;
  } catch { return null; }
  const messages = {
    ko: '입력에서 AI 지시 변경 또는 비밀정보 요구가 감지되어 분석을 중단했습니다. 체험 아이디어와 개선안만 입력해 주세요.',
    en: 'Analysis stopped because the input appears to override AI instructions or request confidential information. Enter only the experience idea or selected improvement.',
    ja: 'AIへの指示変更や機密情報の要求と思われる入力を検出したため、分析を中止しました。体験アイデアまたは選択した改善案のみ入力してください。',
  };
  return messages[locale] || messages.ko;
}

const messages = {
  ko: {
    FUNCTION_NOT_DEPLOYED: 'Supabase 프로젝트에서 local-eum-agent 함수를 찾지 못했습니다. 함수 배포 상태를 확인해 주세요.',
    AUTH_REQUIRED: 'AI 함수 인증이 거부되었습니다. Supabase 함수 설정과 로그인 상태를 확인해 주세요.',
    UPSTREAM_FAILURE: 'AI 함수는 응답했지만 요청 처리에 실패했습니다. Codyssey API 설정과 사용량 제한을 확인해 주세요.',
    ORIGIN_OR_NETWORK: 'AI 함수에 연결하지 못했습니다. 함수 배포, 허용 Origin(CORS), 브라우저 네트워크 연결을 확인해 주세요.',
    UNKNOWN: 'AI 분석에 실패했습니다. 함수 배포 상태와 서버 로그를 확인해 주세요.',
  },
  en: {
    FUNCTION_NOT_DEPLOYED: 'Supabase could not find local-eum-agent. Check whether the function is deployed.',
    AUTH_REQUIRED: 'The AI function rejected authorization. Check its Supabase settings and your sign-in state.',
    UPSTREAM_FAILURE: 'The AI function responded but could not complete the request. Check the Codyssey API configuration and usage limits.',
    ORIGIN_OR_NETWORK: 'Could not reach the AI function. Check deployment, allowed origins (CORS), and the browser network connection.',
    UNKNOWN: 'AI analysis failed. Check the function deployment and server logs.',
  },
  ja: {
    FUNCTION_NOT_DEPLOYED: 'Supabaseでlocal-eum-agentが見つかりません。関数のデプロイ状態を確認してください。',
    AUTH_REQUIRED: 'AI関数の認証が拒否されました。Supabase設定とログイン状態を確認してください。',
    UPSTREAM_FAILURE: 'AI関数は応答しましたが処理に失敗しました。Codyssey API設定と利用制限を確認してください。',
    ORIGIN_OR_NETWORK: 'AI関数に接続できません。デプロイ、許可Origin（CORS）、ブラウザのネットワークを確認してください。',
    UNKNOWN: 'AI分析に失敗しました。関数のデプロイ状態とサーバーログを確認してください。',
  },
};

export function agentInvocationErrorMessage(error, locale = 'ko') {
  const language = messages[locale] ? locale : 'ko';
  const kind = classifyAgentInvocationError(error);
  return messages[language][kind];
}
