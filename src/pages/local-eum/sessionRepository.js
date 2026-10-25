import { getSupabaseConfigurationIssue, supabase, requireSupabase } from '../../lib/supabaseClient.js';
import { sessionOperationErrorMessage } from './sessionLifecycle.js';
import { createAuthSessionRecovery } from './authSessionRecovery.js';
export { fromKstFields, toKstFields } from './sessionTime.js';

const withSessionRecovery = supabase ? createAuthSessionRecovery(supabase.auth) : null;

function unwrap(result, message) {
  if (result.error) {
    const error = new Error(result.error.message || message);
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

function isMissingLocalizationColumn(error) {
  return Boolean(error && /translations|available_languages/.test(error.message || ''));
}

export async function getAuthSession() {
  requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || '로그인 상태를 확인하지 못했습니다.');
  return data.session;
}

export function watchAuthSession(onChange) {
  requireSupabase();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => onChange(session));
  return data.subscription;
}

export async function signIn(email, password) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message || '로그인에 실패했습니다.');
  return data.session;
}

export async function signOut() {
  requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message || '로그아웃에 실패했습니다.');
}

export function isSupabaseConfigured() {
  return !getSupabaseConfigurationIssue();
}

export function getSupabaseSetupMessage() {
  const issue = getSupabaseConfigurationIssue();
  if (issue === 'unsafe-key') return 'secret/service-role 키는 브라우저에서 차단했습니다. Supabase의 publishable key를 사용해 주세요.';
  if (issue === 'wrong-project') return 'Supabase URL의 프로젝트 ID가 승인된 개발 프로젝트와 다릅니다.';
  if (issue === 'invalid-url') return 'Supabase URL 형식이 올바르지 않습니다.';
  return '프로젝트 URL과 publishable key를 로컬 .env.local에 설정해 주세요.';
}

async function assertHost(userId) {
  const result = await withSessionRecovery(() => supabase
    .from('lc_user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'HOST')
    .maybeSingle(), userId);
  const role = unwrap(result, 'HOST 권한을 확인하지 못했습니다.');
  if (!role) {
    const error = new Error('이 Supabase 계정에는 HOST 권한이 없습니다. 테스트 HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
}

async function selectOne(table, columns, field, value, missingMessage) {
  const result = await supabase.from(table).select(columns).eq(field, value).single();
  const row = unwrap(result, missingMessage);
  if (!row) throw new Error(missingMessage);
  return row;
}

const HOST_STUDIO_COPY_DEFAULTS = {
  host_studio_title: '운영 회차를 다듬어 볼까요?',
  host_studio_description: '운영 날짜와 시간, 모집 인원, 참가비, 장소를 한곳에서 확인하고 변경할 수 있습니다.',
};

async function selectHost(hostId) {
  const fields = 'host_id,display_name,bio,approval_status,is_public,host_studio_title,host_studio_description,translations';
  const withCopy = await supabase
    .from('lc_hosts')
    .select(fields)
    .eq('host_id', hostId)
    .single();

  if (!withCopy.error) {
    return { ...withCopy.data, host_studio_copy_columns_available: true, translation_columns_available: true };
  }

  if (isMissingLocalizationColumn(withCopy.error)) {
    const legacyCopy = await supabase.from('lc_hosts')
      .select('host_id,display_name,bio,approval_status,is_public,host_studio_title,host_studio_description')
      .eq('host_id', hostId).single();
    if (!legacyCopy.error) return { ...legacyCopy.data, translations: {}, host_studio_copy_columns_available: true, translation_columns_available: false };
  }

  // The copy migration is intentionally separate and may not have been applied yet.
  const missingCopyColumn = ['host_studio_title', 'host_studio_description']
    .some((column) => withCopy.error.message?.includes(column));
  if (!missingCopyColumn) {
    return unwrap(withCopy, '호스트 정보를 불러오지 못했습니다.');
  }

  const legacy = await supabase
    .from('lc_hosts')
    .select('host_id,display_name,bio,approval_status,is_public')
    .eq('host_id', hostId)
    .single();
  return {
    ...unwrap(legacy, '호스트 정보를 불러오지 못했습니다.'),
    ...HOST_STUDIO_COPY_DEFAULTS,
    host_studio_copy_columns_available: false,
    translations: {},
    translation_columns_available: false,
  };
}

export async function saveHostStudioCopy(userId, hostId, copy) {
  requireSupabase();
  if (!userId || !hostId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  const title = copy.title.trim();
  const description = copy.description.trim();
  if (!title || title.length > 80 || !description || description.length > 240) {
    throw new Error('제목은 1~80자, 설명은 1~240자로 입력해 주세요.');
  }

  const result = await supabase
    .from('lc_hosts')
    .update({ host_studio_title: title, host_studio_description: description })
    .eq('host_id', Number(hostId))
    .select('host_id,display_name,approval_status,is_public,host_studio_title,host_studio_description')
    .maybeSingle();

  if (result.error) {
    const error = new Error(result.error.message || '안내 문구를 저장하지 못했습니다.');
    error.code = result.error.code;
    throw error;
  }
  if (!result.data) {
    const error = new Error('저장 권한이 없습니다. HOST 소유권과 Supabase RLS 정책을 확인해 주세요.');
    error.code = 'HOST_COPY_FORBIDDEN';
    throw error;
  }
  return { ...result.data, host_studio_copy_columns_available: true };
}

export async function saveHostProfile(userId, host, profile) {
  requireSupabase();
  if (!userId || !host?.host_id) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  const displayName = profile.displayName.trim();
  const bio = profile.bio.trim();
  if (!displayName || displayName.length > 80 || bio.length > 2000) {
    throw new Error('호스트 이름은 1~80자, 소개는 2,000자 이내로 입력해 주세요.');
  }

  const includeTranslations = host.translation_columns_available !== false;
  const updates = { display_name: displayName, bio: bio || null };
  if (includeTranslations) updates.translations = profile.translations || {};
  let query = supabase
    .from('lc_hosts')
    .update(updates)
    .eq('host_id', Number(host.host_id))
    .eq('display_name', host.display_name);
  query = host.bio == null ? query.is('bio', null) : query.eq('bio', host.bio);
  if (includeTranslations) query = query.eq('translations', host.translations || {});
  const result = await query
    .select(`host_id,display_name,bio,approval_status,is_public${includeTranslations ? ',translations' : ''}`)
    .maybeSingle();

  if (result.error) {
    const error = new Error(result.error.message || '호스트 프로필을 저장하지 못했습니다.');
    error.code = result.error.code;
    throw error;
  }
  if (!result.data) {
    const error = new Error('호스트 프로필이 다른 화면에서 바뀌었습니다. 최신 정보를 불러온 뒤 다시 수정해 주세요.');
    error.code = 'HOST_PROFILE_CONFLICT';
    throw error;
  }
  return { ...host, ...result.data, translation_columns_available: includeTranslations };
}

export async function registerMyHostProfile(userId, profile) {
  requireSupabase();
  if (!userId) throw new Error('로그인해 주세요.');
  const displayName = profile.displayName.trim();
  const bio = profile.bio.trim();
  if (!displayName || Array.from(displayName).length > 80 || bio.length > 2000) throw new Error('호스트 이름은 1~80자, 소개는 2,000자 이내로 입력해 주세요.');
  const result = await withSessionRecovery(() => supabase.rpc('lc_register_my_host_profile', { p_display_name: displayName, p_bio: bio }), userId);
  return unwrap(result, '호스트 프로필을 만들지 못했습니다. 다시 시도해 주세요.');
}

export async function loadHostProfile(userId) {
  requireSupabase();
  if (!userId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);
  const ownHostResult = await withSessionRecovery(() => supabase.rpc('lc_my_host_id'), userId);
  if (ownHostResult.error?.code === 'PGRST202') {
    throw new Error('호스트 프로필 조회 함수가 아직 배포되지 않았습니다. 운영팀에 문의해 주세요.');
  }
  const hostId = unwrap(ownHostResult, '내 호스트 ID를 확인하지 못했습니다.');
  if (!hostId) {
    const error = new Error('이 HOST 계정에 연결된 호스트 프로필이 없습니다. 운영팀에 문의해 주세요.');
    error.code = 'HOST_PROFILE_NOT_FOUND';
    throw error;
  }
  let result = await withSessionRecovery(() => supabase
    .from('lc_hosts')
    .select('host_id,display_name,bio,approval_status,is_public,translations')
    .eq('host_id', hostId)
    .maybeSingle(), userId);
  if (isMissingLocalizationColumn(result.error)) {
    result = await withSessionRecovery(() => supabase.from('lc_hosts')
      .select('host_id,display_name,bio,approval_status,is_public')
      .eq('host_id', hostId).maybeSingle(), userId);
  }
  const host = unwrap(result, '호스트 프로필을 불러오지 못했습니다.');
  if (!host) {
    const error = new Error('이 HOST 계정에 연결된 호스트 프로필이 없습니다. 운영팀에 문의해 주세요.');
    error.code = 'HOST_PROFILE_NOT_FOUND';
    throw error;
  }
  return { ...host, translations: host.translations || {}, translation_columns_available: Object.hasOwn(host, 'translations') };
}

export async function loadSession(sessionId, userId) {
  requireSupabase();
  if (!userId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }

  await assertHost(userId);
  const session = await selectOne(
    'lc_sessions', '*', 'session_id', Number(sessionId),
    '회차를 찾을 수 없거나 이 계정에서 조회할 수 없습니다.',
  );
  const experience = await selectOne(
    'lc_experiences', '*',
    'experience_id', session.experience_id,
    '연결된 체험을 찾을 수 없거나 조회 권한이 없습니다.',
  );
  experience.translation_columns_available = Object.hasOwn(experience, 'translations') && Object.hasOwn(experience, 'available_languages');
  const [host, program] = await Promise.all([
    selectHost(experience.host_id),
    selectOne(
      'lc_program_templates', 'template_id,title,duration_min,default_fee_amount,is_active',
      'template_id', experience.template_id,
      '연결된 프로그램을 찾을 수 없거나 조회 권한이 없습니다.',
    ),
  ]);

  if (host.approval_status !== 'APPROVED') {
    const error = new Error('호스트 승인이 완료된 계정만 운영 회차를 수정할 수 있습니다.');
    error.code = 'HOST_NOT_APPROVED';
    throw error;
  }

  return { program, experience, host, session };
}

export async function loadHostExperiences(userId, hostId) {
  requireSupabase();
  if (!userId || !hostId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }

  await assertHost(userId);
  const host = await selectHost(hostId);
  if (host.approval_status !== 'APPROVED') {
    const error = new Error('호스트 승인이 완료된 계정만 체험과 운영 회차를 관리할 수 있습니다.');
    error.code = 'HOST_NOT_APPROVED';
    throw error;
  }

  const experienceResult = await supabase
    .from('lc_experiences')
    .select('experience_id,host_id,template_id,title,status')
    .eq('host_id', host.host_id)
    .order('title');
  const experiences = unwrap(experienceResult, '호스트 체험 목록을 불러오지 못했습니다.');
  if (experiences.length === 0) return [];

  const sessionResult = await supabase
    .from('lc_sessions')
    .select('session_id,experience_id,starts_at,ends_at,meeting_place,min_people,capacity,fee_amount,status')
    .in('experience_id', experiences.map((experience) => experience.experience_id))
    .order('starts_at');
  const sessions = unwrap(sessionResult, '운영 회차 목록을 불러오지 못했습니다.');

  return experiences.map((experience) => ({
    ...experience,
    sessions: sessions.filter((session) => session.experience_id === experience.experience_id),
  }));
}

export async function loadHostOperations(userId, hostId) {
  const experiences = await loadHostExperiences(userId, hostId);
  const sessionIds = experiences.flatMap((experience) => experience.sessions.map((session) => session.session_id));
  if (sessionIds.length === 0) return { experiences, applications: [] };

  const result = await supabase
    .from('lc_applications')
    .select('application_id,receipt_code,session_id,applicant_name,attendee_count,status,created_at,expires_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false });
  return { experiences, applications: unwrap(result, '호스트 신청함을 불러오지 못했습니다.') };
}

export async function loadHostSessionApplications(userId, hostId, sessionId, page = 0) {
  requireSupabase();
  if (!Number.isSafeInteger(Number(sessionId)) || Number(sessionId) <= 0 || !Number.isSafeInteger(page) || page < 0) {
    throw new Error('조회할 운영 회차를 확인해 주세요.');
  }
  const ownHostId = unwrap(await withSessionRecovery(() => supabase.rpc('lc_my_host_id'), userId), 'HOST 소유 관계를 확인하지 못했습니다.');
  if (!ownHostId || Number(ownHostId) !== Number(hostId)) throw new Error('본인 HOST의 신청자만 조회할 수 있습니다.');
  const experiences = await loadHostExperiences(userId, hostId);
  if (!experiences.some((experience) => experience.sessions.some((session) => Number(session.session_id) === Number(sessionId)))) {
    throw new Error('본인 체험의 운영 회차만 조회할 수 있습니다.');
  }
  const pageSize = 20;
  const result = await withSessionRecovery(() => supabase.from('lc_applications')
    .select('application_id,receipt_code,session_id,applicant_name,applicant_email,applicant_phone,contact_language,attendee_count,note,status,created_at,expires_at', { count: 'exact' })
    .eq('session_id', Number(sessionId))
    .order('created_at', { ascending: false })
    .order('application_id', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1), userId);
  return { applications: unwrap(result, '회차별 신청자를 불러오지 못했습니다.'), total: result.count || 0, pageSize };
}

export async function saveSession(sessionId, userId, expectedUpdatedAt, patch) {
  requireSupabase();
  if (!userId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  const result = await supabase
    .from('lc_sessions')
    .update({
      starts_at: patch.starts_at,
      ends_at: patch.ends_at,
      meeting_place: patch.meeting_place.trim(),
      recruit_deadline: patch.recruit_deadline,
      min_people: patch.min_people,
      capacity: patch.capacity,
      fee_amount: patch.fee_amount,
      status: patch.status,
    })
    .eq('session_id', Number(sessionId))
    .eq('updated_at', expectedUpdatedAt)
    .select('*')
    .maybeSingle();

  const saved = unwrap(result, '저장할 권한이 없거나 데이터베이스 요청이 실패했습니다.');
  if (!saved) {
    const error = new Error('다른 곳에서 먼저 수정했거나 HOST 권한이 없습니다. 다시 불러와 확인해 주세요.');
    error.code = 'STALE_SESSION';
    throw error;
  }
  return saved;
}

export async function cancelSession(sessionId, userId, expectedUpdatedAt) {
  requireSupabase();
  if (!userId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  const result = await supabase
    .from('lc_sessions')
    .update({ status: 'CANCELLED' })
    .eq('session_id', Number(sessionId))
    .eq('updated_at', expectedUpdatedAt)
    .neq('status', 'CANCELLED')
    .select('*')
    .maybeSingle();
  if (result.error?.code === '23514') {
    const error = new Error(sessionOperationErrorMessage(result.error.code, 'cancel'));
    error.code = 'SESSION_LIFECYCLE_SCHEMA_REQUIRED';
    throw error;
  }
  if (result.error?.code === '42501') {
    const error = new Error(sessionOperationErrorMessage(result.error.code, 'cancel'));
    error.code = 'SESSION_CANCEL_FORBIDDEN';
    throw error;
  }
  const cancelled = unwrap(result, '운영 회차를 취소하지 못했습니다.');
  if (!cancelled) {
    const error = new Error('회차가 이미 바뀌었거나 취소되었습니다. 최신 내용을 다시 불러와 주세요.');
    error.code = 'STALE_SESSION';
    throw error;
  }
  return cancelled;
}

export async function cancelExperience(experienceId, userId) {
  requireSupabase();
  if (!userId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);
  const result = await supabase.rpc('lc_cancel_experience', { _experience_id: Number(experienceId) });
  if (result.error?.code === 'PGRST202') {
    const error = new Error(sessionOperationErrorMessage(result.error.code, 'cancelExperience'));
    error.code = 'EXPERIENCE_LIFECYCLE_SCHEMA_REQUIRED';
    throw error;
  }
  if (result.error?.code === '42501') {
    const error = new Error(sessionOperationErrorMessage(result.error.code, 'cancelExperience'));
    error.code = 'EXPERIENCE_CANCEL_FORBIDDEN';
    throw error;
  }
  if (result.error) {
    const error = new Error(sessionOperationErrorMessage(result.error.code, 'cancelExperience'));
    error.code = result.error.code || 'EXPERIENCE_CANCEL_FAILED';
    throw error;
  }
  if (!result.data || typeof result.data !== 'object') {
    const error = new Error('체험 취소 결과를 확인하지 못했습니다. 페이지를 새로고침해 주세요.');
    error.code = 'EXPERIENCE_CANCEL_RESULT_INVALID';
    throw error;
  }
  return result.data;
}

export async function createSession(userId, experienceId, payload) {
  requireSupabase();
  if (!userId || !Number.isSafeInteger(Number(experienceId)) || Number(experienceId) <= 0) {
    const error = new Error('HOST 계정과 체험을 확인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  const result = await supabase
    .from('lc_sessions')
    .insert({ experience_id: Number(experienceId), ...payload, status: 'DRAFT' })
    .select('*')
    .single();
  if (result.error) {
    const error = new Error(sessionOperationErrorMessage(result.error.code, 'create'));
    error.code = result.error.code || 'SESSION_CREATE_FAILED';
    throw error;
  }
  return result.data;
}

export async function loadExperienceSteps(userId, experienceId) {
  requireSupabase();
  if (!userId) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  let result = await supabase
    .from('lc_experience_steps')
    .select('step_id,experience_id,step_order,elapsed_min,duration_min,title,description,translations')
    .eq('experience_id', Number(experienceId))
    .order('step_order');

  if (isMissingLocalizationColumn(result.error)) {
    result = await supabase.from('lc_experience_steps')
      .select('step_id,experience_id,step_order,elapsed_min,duration_min,title,description')
      .eq('experience_id', Number(experienceId)).order('step_order');
  }

  if (result.error?.code === 'PGRST205') {
    const error = new Error('상세 일정표 테이블이 아직 준비되지 않았습니다. 승인된 로컬이음 DB SQL을 먼저 적용해 주세요.');
    error.code = 'EXPERIENCE_STEPS_NOT_READY';
    throw error;
  }
  return unwrap(result, '체험 상세 일정을 불러오지 못했습니다.')
    .map((step) => ({ ...step, translations: step.translations || {}, translation_columns_available: Object.hasOwn(step, 'translations') }));
}

export async function saveExperienceSteps(userId, experience, steps) {
  requireSupabase();
  if (!userId || !experience?.experience_id) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  await assertHost(userId);

  const result = await supabase.rpc('lc_save_experience_details', {
    _experience_id: experience.experience_id,
    _expected_updated_at: experience.updated_at,
    _details: {
      title: experience.title,
      description: experience.description,
      region_code: experience.region_code,
      detail_description: experience.detail_description,
      inclusions: experience.inclusions || [],
      preparation_items: experience.preparation_items || [],
      precautions: experience.precautions || [],
      hero_image_url: experience.hero_image_url,
      hero_image_alt: experience.hero_image_alt,
      venue_place_id: experience.venue_place_id,
      ...(Object.hasOwn(experience, 'translations') ? { translations: experience.translations || {} } : {}),
      ...(Object.hasOwn(experience, 'available_languages') ? { available_languages: experience.available_languages || [] } : {}),
    },
    _steps: steps.map((step, index) => ({
      step_order: index + 1,
      elapsed_min: Number(step.elapsed_min),
      duration_min: Number(step.duration_min),
      title: step.title.trim(),
      description: step.description.trim() || null,
      ...(Object.hasOwn(step, 'translations') ? { translations: step.translations || {} } : {}),
    })),
  });

  if (result.error) {
    const error = new Error(result.error.message || '상세 일정을 저장하지 못했습니다.');
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

export async function saveExperienceDescription(userId, experience, description, localization = {}) {
  requireSupabase();
  if (!userId || !experience?.experience_id) {
    const error = new Error('HOST 계정으로 로그인해 주세요.');
    error.code = 'HOST_REQUIRED';
    throw error;
  }
  if (typeof description !== 'string' || description.length > 20000) {
    const error = new Error('상세 소개는 20,000자 이내로 입력해 주세요.');
    error.code = 'INVALID_EXPERIENCE_DESCRIPTION';
    throw error;
  }
  await assertHost(userId);

  const patch = { detail_description: description.trim() || null };
  if (Object.hasOwn(experience, 'translations')) patch.translations = localization.translations || experience.translations || {};
  if (Object.hasOwn(experience, 'available_languages')) patch.available_languages = localization.availableLanguages || experience.available_languages || [];

  const result = await supabase
    .from('lc_experiences')
    .update(patch)
    .eq('experience_id', experience.experience_id)
    .eq('updated_at', experience.updated_at)
    .select('*')
    .maybeSingle();

  if (result.error) {
    const error = new Error(result.error.message || '체험 소개를 저장하지 못했습니다.');
    error.code = result.error.code;
    throw error;
  }
  if (!result.data) {
    const error = new Error('이 체험 정보가 다른 화면에서 바뀌었습니다. 최신 내용을 다시 불러온 뒤 수정해 주세요.');
    error.code = 'EXPERIENCE_DESCRIPTION_CONFLICT';
    throw error;
  }
  return result.data;
}
