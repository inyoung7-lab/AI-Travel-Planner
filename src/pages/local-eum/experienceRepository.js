import { publicSupabase, requireSupabase } from '../../lib/supabaseClient.js';

function unwrap({ data, error }) {
  if (error) {
    const issue = new Error(/is_demo|demo_code|detail_description|lc_places|lc_experience_steps|schema cache/.test(error.message)
      ? '체험 정보가 아직 준비 중입니다. 잠시 후 다시 확인해 주세요.'
      : '체험 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    issue.code = error.code;
    throw issue;
  }
  return data;
}

function client() {
  requireSupabase();
  return publicSupabase;
}

const sessionColumns = 'session_id,experience_id,starts_at,ends_at,min_people,capacity,fee_amount,status,recruit_deadline,meeting_place,meeting_place_id,seed_code';

export async function listExperiences() {
  const db = client();
  const experiences = unwrap(await db.from('lc_experiences').select('*')
    .eq('status', 'PUBLISHED').order('demo_code'));
  if (!experiences.length) return [];
  const sessions = unwrap(await db.from('lc_sessions').select(sessionColumns)
    .in('experience_id', experiences.map(item => item.experience_id)).eq('status', 'RECRUITING').order('starts_at'));
  return experiences.map(experience => ({ ...experience,
    sessions: sessions.filter(session => session.experience_id === experience.experience_id),
  }));
}

export async function loadExperience(id) {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) throw new Error('올바른 체험 주소가 아닙니다.');
  const db = client();
  const experience = unwrap(await db.from('lc_experiences').select('*')
    .eq('experience_id', Number(id)).eq('status', 'PUBLISHED').maybeSingle());
  if (!experience) throw new Error('공개된 체험을 찾을 수 없습니다.');
  const [sessionsResult, stepsResult, hostResult] = await Promise.all([
    db.from('lc_sessions').select(sessionColumns).eq('experience_id', experience.experience_id)
      .eq('status', 'RECRUITING').order('starts_at'),
    db.from('lc_experience_steps').select('*').eq('experience_id', experience.experience_id).order('step_order'),
    db.from('lc_hosts').select('host_id,display_name,bio,page_slug').eq('host_id', experience.host_id).single(),
  ]);
  const sessions = unwrap(sessionsResult);
  const ids = [...new Set([experience.venue_place_id, ...sessions.map(item => item.meeting_place_id)].filter(Boolean))];
  const places = ids.length ? unwrap(await db.from('lc_places').select('*').in('place_id', ids)) : [];
  return { experience, sessions, steps: unwrap(stepsResult), host: unwrap(hostResult), places };
}
