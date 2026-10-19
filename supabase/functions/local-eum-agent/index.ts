import { createClient } from '@supabase/supabase-js';
import { AgentError, runAgent } from './agent-core.mjs';
import { authorizeHostRequest, selectOwnedSession } from './auth.mjs';
import { createCodysseyModelCall } from './codyssey-client.mjs';

const expectedProject = 'rhkaxmqdkztpbljkunxb';
const usage = new Map<string, { count: number; resetsAt: number }>();

function allowedOrigin(origin: string | null) {
  if (!origin) return null;
  const configured = (Deno.env.get('LOCAL_EUM_ALLOWED_ORIGINS') || '').split(',').map((item) => item.trim()).filter(Boolean);
  const allowed = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', ...configured]);
  return allowed.has(origin) ? origin : null;
}

function respond(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}) } });
}

function checkQuota(userId: string) {
  const now = Date.now();
  const bucket = usage.get(userId);
  if (!bucket || bucket.resetsAt <= now) { usage.set(userId, { count: 1, resetsAt: now + 60 * 60 * 1000 }); return; }
  if (bucket.count >= 12) throw new AgentError('RATE_LIMIT', 'AI 분석 이용 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.');
  bucket.count += 1;
}

function check(result: { data: unknown; error: { message: string } | null }, label: string) {
  if (result.error) throw new AgentError('DATABASE', `${label} 조회에 실패했습니다.`);
  return result.data;
}

function safeExperience(row: Record<string, unknown>) {
  const clean = (value: unknown, limit: number) => String(value || '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]').replace(/01[016789][- ]?\d{3,4}[- ]?\d{4}/g, '[phone removed]').slice(0, limit);
  return {
    experience_id: row.experience_id, host_id: row.host_id, template_id: row.template_id,
    title: clean(row.title, 200), description: clean(row.description, 2000), detail_description: clean(row.detail_description, 4000),
    region_code: row.region_code, inclusions: row.inclusions ?? null, exclusions: row.exclusions ?? null,
    preparation: row.preparation ?? null, precautions: row.precautions ?? null, status: row.status, is_demo: row.is_demo,
  };
}

async function handle(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin');
  const corsOrigin = allowedOrigin(origin);
  if (origin && !corsOrigin) return respond({ code: 'ORIGIN_DENIED', error: '허용되지 않은 웹 주소입니다.' }, 403, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin, 'Vary': 'Origin' } : {}), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Max-Age': '600' } });
  if (request.method !== 'POST') return respond({ code: 'METHOD', error: 'POST 요청만 지원합니다.' }, 405, corsOrigin);
  if (Number(request.headers.get('content-length') || 0) > 10000) return respond({ code: 'BAD_REQUEST', error: '입력 크기가 제한을 넘었습니다.' }, 413, corsOrigin);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const codysseyKey = Deno.env.get('CODYSSEY_API_KEY') || '';
  const model = Deno.env.get('CODYSSEY_MODEL') || 'gpt-5.4-mini';
  if (!supabaseUrl || new URL(supabaseUrl).hostname.split('.')[0] !== expectedProject) return respond({ code: 'CONFIG', error: '승인된 Supabase 프로젝트 설정을 확인해 주세요.' }, 503, corsOrigin);
  if (!publishableKey || !codysseyKey) return respond({ code: 'CONFIG', error: '서버 측 코디세이 AI 설정이 아직 완료되지 않았습니다.' }, 503, corsOrigin);
  const bearer = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return respond({ code: 'UNAUTHORIZED', error: 'HOST 계정으로 로그인해 주세요.' }, 401, corsOrigin);
  try {
    const raw = await request.text();
    if (raw.length > 10000) throw new AgentError('BAD_REQUEST', '입력 크기가 제한을 넘었습니다.');
    let body;
    try { body = JSON.parse(raw); } catch { throw new AgentError('BAD_REQUEST', '요청 JSON이 올바르지 않습니다.'); }
    const db = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await db.auth.getUser(bearer);
    if (userError || !userData.user) throw new AgentError('UNAUTHORIZED', '로그인이 만료되었습니다. 다시 로그인해 주세요.');
    const lookup = {
      hasHostRole: async (userId: string) => Boolean(check(await db.from('lc_user_roles').select('role').eq('user_id', userId).eq('role', 'HOST').maybeSingle(), 'HOST 권한')),
      ownHostId: async () => Number(check(await db.rpc('lc_my_host_id'), 'HOST 프로필')),
      getHost: async (hostId: number) => check(await db.from('lc_hosts').select('host_id,approval_status,is_public,display_name').eq('host_id', hostId).maybeSingle(), 'HOST 프로필'),
      getOwnedExperience: async (experienceId: number, hostId: number) => check(await db.from('lc_experiences').select('*').eq('experience_id', experienceId).eq('host_id', hostId).maybeSingle(), '내 체험'),
    };
    const auth = await authorizeHostRequest(body, userData.user.id, lookup);
    checkQuota(userData.user.id);
    let sessions: Record<string, unknown>[] = [];
    let steps: Record<string, unknown>[] = [];
    let template = null;
    if (auth.experience) {
      sessions = (check(await db.from('lc_sessions').select('session_id,experience_id,starts_at,ends_at,meeting_place,min_people,capacity,fee_amount,status').eq('experience_id', auth.request.experienceId).order('starts_at').limit(50), '운영 회차') || []) as Record<string, unknown>[];
      steps = (check(await db.from('lc_experience_steps').select('step_order,elapsed_min,duration_min,title,description').eq('experience_id', auth.request.experienceId).order('step_order').limit(30), '상세 일정') || []) as Record<string, unknown>[];
      template = check(await db.from('lc_program_templates').select('template_id,title,description,duration_min,default_fee_amount').eq('template_id', auth.experience.template_id).maybeSingle(), '프로그램 원형');
    }
    const selectedSession = selectOwnedSession(sessions, auth.request.sessionId);
    const context = { experience: auth.experience ? safeExperience(auth.experience) : null, host: { host_id: auth.hostId, display_name: auth.host.display_name }, session: selectedSession || null, sessions, steps, template, region: auth.experience?.region_code || null };
    const searchExperiences = async ({ query, region }: { query: string; region: string | null }) => {
      const publicHosts = (check(await db.from('lc_hosts').select('host_id').eq('approval_status', 'APPROVED').eq('is_public', true).limit(100), '공개 호스트') || []) as { host_id: number }[];
      if (!publicHosts.length) return [];
      let search = db.from('lc_experiences').select('experience_id,host_id,title,description,region_code,template_id,status').in('host_id', publicHosts.map((host) => host.host_id)).eq('status', 'PUBLISHED').limit(100);
      if (region && ['SEOUL', 'BUSAN', 'CHANGWON'].includes(region.toUpperCase())) search = search.eq('region_code', region.toUpperCase());
      const rows = (check(await search, '관련 공개 체험') || []) as Record<string, unknown>[];
      const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 1).slice(0, 10);
      return rows.map((row) => ({ ...row, score: words.reduce((sum, word) => sum + (`${row.title || ''} ${row.description || ''}`.toLowerCase().includes(word) ? 1 : 0), 0) })).sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 8).map(({ score: _score, ...row }) => row);
    };
    const modelCall = createCodysseyModelCall({ apiKey: codysseyKey, model });
    const result = await runAgent({ request: auth.request, context, searchExperiences, modelCall, logger: (trace: Record<string, unknown>) => console.info('local-eum-agent tool', trace) });
    return respond(result, 200, corsOrigin);
  } catch (error) {
    const code = error instanceof AgentError ? error.code : 'INTERNAL';
    const status = code === 'BAD_REQUEST' || code === 'TOOL_ARGUMENT' ? 400 : code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : code === 'RATE_LIMIT' ? 429 : code === 'CONFIG' ? 503 : 502;
    // Never log prompts, JWTs, personal details, model output, or keys.
    console.warn('local-eum-agent request', { code, status, ...(error instanceof AgentError && error.diagnostic ? { stage: error.diagnostic } : {}) });
    return respond({ code, error: error instanceof AgentError ? error.message : 'AI 분석을 완료하지 못했습니다. 다시 시도해 주세요.' }, status, corsOrigin);
  }
}

Deno.serve(handle);
