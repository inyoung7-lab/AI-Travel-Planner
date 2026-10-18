import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { loadExperience } from './experienceRepository.js';
import { orderedSessions } from './experiencePresentation.js';
import ExperienceDetailContent from './components/ExperienceDetailContent.jsx';
import ExperienceApplicationFlow from './components/ExperienceApplicationFlow.jsx';
import './Traveler.css';

export default function ExperienceDetail() {
  const { experienceId } = useParams();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loadExperience(experienceId).then(record => { if (active) setState({ id: experienceId, record, error: '' }); })
      .catch(error => { if (active) setState({ id: experienceId, record: null, error: error.message }); });
    return () => { active = false; };
  }, [experienceId, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(value => value + 1); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const current = state?.id === experienceId ? state : null;
  const record = current?.record;
  const available = record ? orderedSessions(record.sessions) : [];
  const requestedSession = record?.sessions.find(item => String(item.session_id) === params.get('session'));
  const applying = params.get('apply') === '1';
  const session = applying ? requestedSession : requestedSession || available[0] || record?.sessions[0];
  function chooseSession(id) { const next = new URLSearchParams(params); next.set('session', id); setParams(next, { replace: true }); }
  function leaveApplication() { const next = new URLSearchParams(params); next.delete('apply'); setParams(next, { replace: true }); }
  return <main className="le-traveler"><div className="let-shell">
    <div className="let-detail-nav"><Link to="/local-eum">← 체험 목록으로</Link><button className="let-text-button" type="button" onClick={() => setRevision(value => value + 1)}>최신 정보 불러오기 ↻</button></div>
    {!current ? <div className="let-empty" role="status">체험 정보를 불러오고 있습니다…</div> : null}
    {current?.error ? <div className="let-empty" role="alert"><h1>체험을 확인할 수 없습니다</h1><p>{current.error}</p><Link className="let-button" to="/local-eum">목록으로 돌아가기</Link></div> : null}
    {record && applying && session ? <ExperienceApplicationFlow record={record} session={session} onBack={leaveApplication} /> : null}
    {record && applying && !session ? <div className="let-empty" role="alert"><h1>신청할 회차를 확인할 수 없습니다</h1><p>모집 중인 회차를 다시 선택해 주세요.</p><button className="let-button" type="button" onClick={leaveApplication}>체험 상세로 돌아가기</button></div> : null}
    {record && !applying ? <ExperienceDetailContent record={record} session={session} onSessionChange={chooseSession} /> : null}
  </div></main>;
}
