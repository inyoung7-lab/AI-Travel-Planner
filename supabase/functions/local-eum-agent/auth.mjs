import { AgentError, validateRequest } from './agent-core.mjs';

// The caller supplies DB methods bound to a verified user JWT, never a service-role key.
export async function authorizeHostRequest(rawRequest, userId, lookup) {
  const request = validateRequest(rawRequest);
  if (!userId) throw new AgentError('UNAUTHORIZED', 'HOST 계정으로 로그인해 주세요.');
  const [hasRole, hostId] = await Promise.all([lookup.hasHostRole(userId), lookup.ownHostId()]);
  if (!hasRole || !Number.isSafeInteger(hostId) || hostId <= 0) throw new AgentError('FORBIDDEN', '이 계정의 HOST 권한과 프로필을 확인할 수 없습니다.');
  const host = await lookup.getHost(hostId);
  if (!host || host.approval_status !== 'APPROVED') throw new AgentError('FORBIDDEN', '승인된 HOST만 AI 기획 도구를 사용할 수 있습니다.');
  let experience = null;
  if (request.mode === 'existing') {
    experience = await lookup.getOwnedExperience(request.experienceId, hostId);
    if (!experience || experience.host_id !== hostId) throw new AgentError('FORBIDDEN', '본인 체험만 분석할 수 있습니다.');
  }
  return { request, hostId, host, experience };
}

export function selectOwnedSession(sessions, selectedSessionId) {
  const selected = selectedSessionId ? sessions.find((item) => Number(item.session_id) === selectedSessionId) : sessions[0];
  if (selectedSessionId && !selected) throw new AgentError('FORBIDDEN', '선택한 운영 회차가 이 체험에 속하지 않습니다.');
  return selected || null;
}
