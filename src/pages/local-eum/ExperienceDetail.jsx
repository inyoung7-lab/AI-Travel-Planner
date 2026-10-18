import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { loadExperience } from './experienceRepository.js';
import { getLanguageFriendsDemoExperience } from './languageFriendsDemo.js';
import { orderedSessions } from './experiencePresentation.js';
import { translate } from './localEumI18n.js';
import { setLocalEumLocale, useLocalEumLocale } from './localEumLocaleStore.js';
import LocalEumLanguageSelector from './components/LocalEumLanguageSelector.jsx';
import ExperienceDetailContent from './components/ExperienceDetailContent.jsx';
import ExperienceApplicationFlow from './components/ExperienceApplicationFlow.jsx';
import LanguageFriendsDemoDetail from './components/LanguageFriendsDemoDetail.jsx';
import './Traveler.css';

export default function ExperienceDetail() {
  const { experienceId } = useParams();
  const demoExperience = getLanguageFriendsDemoExperience(experienceId);
  const [params, setParams] = useSearchParams();
  const locale = useLocalEumLocale();
  const t = (key) => translate(locale, key);
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (demoExperience) return undefined;
    let active = true;
    loadExperience(experienceId).then(record => { if (active) setState({ id: experienceId, record, error: '' }); })
      .catch(error => { if (active) setState({ id: experienceId, record: null, error: error.message }); });
    return () => { active = false; };
  }, [demoExperience, experienceId, revision]);
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
    <div className="let-detail-nav"><Link to="/local-eum">{t('backToExperienceList')}</Link><LocalEumLanguageSelector locale={locale} onChange={setLocalEumLocale} className="le-locale-selector-compact" /><button className="let-text-button" type="button" onClick={() => setRevision(value => value + 1)}>{t('refreshLatest')}</button></div>
    {demoExperience ? <LanguageFriendsDemoDetail experience={demoExperience} locale={locale} /> : null}
    {!demoExperience && !current ? <div className="let-empty" role="status">{t('loadingExperience')}</div> : null}
    {!demoExperience && current?.error ? <div className="let-empty" role="alert"><h1>{t('experienceUnavailable')}</h1><p>{t('experienceLoadError')}</p><Link className="let-button" to="/local-eum">{t('returnToList')}</Link></div> : null}
    {!demoExperience && record && applying && session ? <ExperienceApplicationFlow record={record} session={session} onBack={leaveApplication} /> : null}
    {!demoExperience && record && applying && !session ? <div className="let-empty" role="alert"><h1>{t('sessionMissingTitle')}</h1><p>{t('sessionMissingBody')}</p><button className="let-button" type="button" onClick={leaveApplication}>{t('returnToDetail')}</button></div> : null}
    {!demoExperience && record && !applying ? <ExperienceDetailContent record={record} session={session} onSessionChange={chooseSession} /> : null}
  </div></main>;
}
