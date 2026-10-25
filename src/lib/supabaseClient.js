import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const expectedProjectRef = 'rhkaxmqdkztpbljkunxb';

function hasUnsafeKey(value = '') {
  if (value.startsWith('sb_secret_')) return true;
  const tokenParts = value.split('.');
  if (tokenParts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

function configurationIssue() {
  if (!supabaseUrl || !supabasePublishableKey || supabasePublishableKey.includes('REPLACE_WITH')) return 'missing';
  if (hasUnsafeKey(supabasePublishableKey)) return 'unsafe-key';
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    if (projectRef !== expectedProjectRef) return 'wrong-project';
  } catch {
    return 'invalid-url';
  }
  return '';
}

const configIssue = configurationIssue();

export const supabase = !configIssue
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

// Public traveler pages always use anon RLS, even while this browser is logged in as HOST.
export const publicSupabase = !configIssue
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'local-eum-public-readonly' },
  })
  : null;

export function requireSupabase() {
  if (configIssue === 'unsafe-key') throw new Error('secret 또는 service-role 키는 브라우저에서 사용할 수 없습니다. publishable key로 바꿔 주세요.');
  if (configIssue === 'wrong-project') throw new Error(`Supabase URL의 프로젝트 ID가 승인된 개발 프로젝트(${expectedProjectRef})와 다릅니다.`);
  if (configIssue === 'invalid-url') throw new Error('Supabase URL 형식이 올바르지 않습니다.');
  if (configIssue === 'missing') throw new Error('Supabase 설정이 없습니다. 저장소의 .env.example을 참고해 .env.local을 만든 뒤 개발 서버를 다시 시작해 주세요.');
  return supabase;
}

export function getSupabaseConfigurationIssue() {
  return configIssue;
}

// Pin data requests to the selected account, even if another tab signs in/out mid-request.
export function sessionSupabase(session) {
  requireSupabase();
  if (!session?.access_token || !session.user?.id) throw new Error('로그인이 필요합니다.');
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `travel-data-${crypto.randomUUID()}` },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}
