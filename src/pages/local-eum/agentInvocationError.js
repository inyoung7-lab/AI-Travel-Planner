const serverErrorKinds = {
  UNAUTHORIZED: 'AUTH_REQUIRED', FORBIDDEN: 'HOST_PERMISSION', ORIGIN_DENIED: 'ORIGIN_OR_NETWORK',
  CONFIG: 'SERVER_CONFIG', DATABASE: 'DATABASE', RATE_LIMIT: 'RATE_LIMIT', AGENT_LIMIT: 'ANALYSIS_LIMIT',
  BAD_REQUEST: 'BAD_REQUEST', TOOL_ARGUMENT: 'MODEL_OUTPUT', MODEL_TOOL: 'MODEL_OUTPUT',
  MODEL_OUTPUT: 'MODEL_OUTPUT', MODEL_UNAVAILABLE: 'UPSTREAM_FAILURE',
};

export function classifyAgentInvocationError(error, serverCode) {
  if (Object.hasOwn(serverErrorKinds, serverCode)) return serverErrorKinds[serverCode];
  const status = Number(error?.context?.status || error?.status || 0);
  if (status === 404) return 'FUNCTION_NOT_DEPLOYED';
  if (status === 401 || status === 403) return 'AUTH_REQUIRED';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'SERVER_FAILURE';
  if (error?.name === 'FunctionsFetchError'
    || /failed to send a request to the edge function|failed to fetch|networkerror|load failed/i.test(error?.message || '')) {
    return 'ORIGIN_OR_NETWORK';
  }
  return 'UNKNOWN';
}

const messages = {
  ko: {
    ANALYSIS_LIMIT: 'AI 분석의 실행 횟수 또는 시간 한도에 도달했습니다. 아이디어 범위를 좁혀 다시 시도해 주세요.',
    HOST_PERMISSION: '승인된 HOST 권한 또는 선택한 체험·회차의 소유권을 확인해 주세요.',
    SERVER_CONFIG: 'AI 서버 설정이 완료되지 않았습니다. 함수의 프로젝트 설정과 AI 키 등록 여부를 확인해 주세요.',
    DATABASE: 'AI 분석에 필요한 체험 데이터를 조회하지 못했습니다. DB 권한과 함수 로그를 확인해 주세요.',
    RATE_LIMIT: 'AI 분석 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
    BAD_REQUEST: '선택한 체험·회차와 아이디어 입력 내용을 확인해 주세요.',
    MODEL_OUTPUT: 'AI 응답 형식 또는 도구 입력 검증에 실패했습니다. 다시 시도해 주세요. 반복되면 함수 로그를 확인해 주세요.',
    SERVER_FAILURE: 'AI 서버가 요청 처리에 실패했습니다. 함수 로그에서 오류 코드를 확인해 주세요.',
    FUNCTION_NOT_DEPLOYED: 'Supabase 프로젝트에서 local-eum-agent 함수를 찾지 못했습니다. 함수 배포 상태를 확인해 주세요.',
    AUTH_REQUIRED: 'AI 함수 인증이 거부되었습니다. Supabase 함수 설정과 로그인 상태를 확인해 주세요.',
    UPSTREAM_FAILURE: 'AI 함수는 응답했지만 요청 처리에 실패했습니다. Codyssey API 설정과 사용량 제한을 확인해 주세요.',
    ORIGIN_OR_NETWORK: 'AI 함수에 연결하지 못했습니다. 함수 배포, 허용 Origin(CORS), 브라우저 네트워크 연결을 확인해 주세요.',
    UNKNOWN: 'AI 분석에 실패했습니다. 함수 배포 상태와 서버 로그를 확인해 주세요.',
  },
  en: {
    ANALYSIS_LIMIT: 'The analysis reached its execution or time limit. Narrow the idea and try again.',
    HOST_PERMISSION: 'Check your approved HOST role and ownership of the selected experience and session.',
    SERVER_CONFIG: 'AI server configuration is incomplete. Check the function project settings and AI key registration.',
    DATABASE: 'Could not read experience data for analysis. Check database permissions and function logs.',
    RATE_LIMIT: 'The AI request limit was reached. Try again later.',
    BAD_REQUEST: 'Check the selected experience, session and idea input.',
    MODEL_OUTPUT: 'The AI response or tool arguments failed validation. Try again; check function logs if it repeats.',
    SERVER_FAILURE: 'The AI server could not complete the request. Check the error code in function logs.',
    FUNCTION_NOT_DEPLOYED: 'Supabase could not find local-eum-agent. Check whether the function is deployed.',
    AUTH_REQUIRED: 'The AI function rejected authorization. Check its Supabase settings and your sign-in state.',
    UPSTREAM_FAILURE: 'The AI function responded but could not complete the request. Check the Codyssey API configuration and usage limits.',
    ORIGIN_OR_NETWORK: 'Could not reach the AI function. Check deployment, allowed origins (CORS), and the browser network connection.',
    UNKNOWN: 'AI analysis failed. Check the function deployment and server logs.',
  },
  ja: {
    ANALYSIS_LIMIT: '分析の実行回数または時間の上限に達しました。内容を絞って再試行してください。',
    HOST_PERMISSION: '承認済みHOST権限と選択した体験・開催回の所有権を確認してください。',
    SERVER_CONFIG: 'AIサーバー設定が未完了です。関数のプロジェクト設定とAIキー登録を確認してください。',
    DATABASE: '分析用の体験データを取得できません。DB権限と関数ログを確認してください。',
    RATE_LIMIT: 'AIリクエストの上限に達しました。しばらくしてから再試行してください。',
    BAD_REQUEST: '選択した体験・開催回とアイデア入力を確認してください。',
    MODEL_OUTPUT: 'AI応答またはツール引数の検証に失敗しました。再試行し、繰り返す場合は関数ログを確認してください。',
    SERVER_FAILURE: 'AIサーバーが処理に失敗しました。関数ログのエラーコードを確認してください。',
    FUNCTION_NOT_DEPLOYED: 'Supabaseでlocal-eum-agentが見つかりません。関数のデプロイ状態を確認してください。',
    AUTH_REQUIRED: 'AI関数の認証が拒否されました。Supabase設定とログイン状態を確認してください。',
    UPSTREAM_FAILURE: 'AI関数は応答しましたが処理に失敗しました。Codyssey API設定と利用制限を確認してください。',
    ORIGIN_OR_NETWORK: 'AI関数に接続できません。デプロイ、許可Origin（CORS）、ブラウザのネットワークを確認してください。',
    UNKNOWN: 'AI分析に失敗しました。関数のデプロイ状態とサーバーログを確認してください。',
  },
};

export function agentInvocationErrorMessage(error, locale = 'ko', serverCode) {
  const language = messages[locale] ? locale : 'ko';
  const kind = classifyAgentInvocationError(error, serverCode);
  return messages[language][kind];
}

export async function readAgentInvocationErrorMessage(error, locale = 'ko') {
  let serverCode;
  try {
    // Only consume the allowlisted machine code; never render raw response text.
    const body = await error?.context?.clone().json();
    if (typeof body?.code === 'string' && Object.hasOwn(serverErrorKinds, body.code)) serverCode = body.code;
  } catch { /* Gateways can return non-JSON errors. Use the status fallback. */ }
  return agentInvocationErrorMessage(error, locale, serverCode);
}
