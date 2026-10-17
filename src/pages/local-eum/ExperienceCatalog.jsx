import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listExperiences } from './experienceRepository.js';
import { filterExperiences, formatKst, formatWon, orderedSessions, REGION_LABELS, sessionDuration } from './experiencePresentation.js';
import ExperienceImage from './components/ExperienceImage.jsx';
import './Traveler.css';

export default function ExperienceCatalog() {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ items: [], loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const region = REGION_LABELS[params.get('region')] ? params.get('region') : '';
  const keyword = params.get('q') || '';
  useEffect(() => {
    let active = true;
    listExperiences().then(items => { if (active) setState({ items, loading: false, error: '' }); })
      .catch(error => { if (active) setState({ items: [], loading: false, error: error.message }); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(value => value + 1); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }
  const visible = filterExperiences(state.items, region, keyword);
  return <main className="le-traveler"><div className="let-shell">
    <div className="let-topline"><Link to="/local-eum" className="let-wordmark">LOCAL EUM <span>로컬이음</span></Link><Link to="/local-eum/host/profile" className="let-host-link">호스트 프로필 관리 ↗</Link></div>
    <section className="let-catalog-hero"><div><span className="let-overline">여행, 한걸음 · LOCAL EUM</span><h1>가까운 동네에서,<br />새로운 한 걸음.</h1><p>시장 골목부터 공방과 바다까지.<br className="let-mobile-break" /> 동네의 이야기를 만나는 체험을 살펴보세요.</p><span className="let-hero-demo">시연용 · 실제 예약 불가</span></div><div className="let-hero-visual" aria-hidden="true"><span className="let-visual-circle" /><div className="let-visual-ticket"><small>LOCAL STORIES</small><strong>서울 · 부산 · 창원</strong><span>동네를 알아가는 시간</span><i>한 걸음, 다른 풍경</i></div></div></section>
    <section className="let-explore" aria-labelledby="let-explore-heading"><div className="let-section-heading"><div><span className="let-overline">EXPLORE LOCAL</span><h2 id="let-explore-heading">어떤 동네를 만나볼까요?</h2></div><button className="let-text-button" onClick={() => setRevision(value => value + 1)} type="button">최신 정보 불러오기 ↻</button></div>
      <div className="let-filter-bar"><div className="let-region-tabs" role="group" aria-label="지역 필터">{[['','전체'], ...Object.entries(REGION_LABELS)].map(([value,label]) => <button key={value} type="button" aria-pressed={region === value} className={region === value ? 'is-active' : ''} onClick={() => setFilter('region', value)}>{label}</button>)}</div><label className="let-search"><span>체험명 검색</span><input type="search" value={keyword} maxLength={120} placeholder="어떤 체험을 찾으세요?" onChange={event => setFilter('q', event.target.value)} /></label></div>
      <p className="let-results-count" role="status">{state.loading ? '체험을 불러오고 있습니다…' : state.error ? '체험 정보를 확인해 주세요.' : `${visible.length}개의 체험`}</p>
      {state.error ? <div className="let-empty" role="alert"><h3>체험 목록을 확인할 수 없습니다</h3><p>{state.error}</p><button type="button" className="let-button" onClick={() => setRevision(value => value + 1)}>다시 불러오기</button></div> : null}
      {!state.loading && !state.error && !visible.length ? <div className="let-empty"><h3>조건에 맞는 체험이 없습니다</h3><p>지역이나 검색어를 바꾸어 확인해 주세요.</p><button type="button" className="let-button" onClick={() => setParams({})}>전체 체험 보기</button></div> : null}
      <div className="let-card-grid">{visible.map(experience => {
        const nextSession = orderedSessions(experience.sessions)[0];
        return <Link className="let-experience-card" key={experience.experience_id} to={`/local-eum/experiences/${experience.experience_id}`}>
          <div className="let-card-image"><ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt || ''} /><span className="let-image-badge">{REGION_LABELS[experience.region_code] || experience.region_code}</span></div>
          <div className="let-card-body"><span className="let-card-code">{experience.demo_code} · 시연용</span><h3>{experience.title}</h3><p>{experience.description || '호스트가 소개를 준비하고 있습니다.'}</p><div className="let-card-meta"><span>{nextSession ? formatKst(nextSession.starts_at) : '다음 일정 미등록'}</span>{nextSession ? <span>{sessionDuration(nextSession)}분 · 최대 {nextSession.capacity}명</span> : null}</div><div className="let-card-footer"><strong>{nextSession ? formatWon(nextSession.fee_amount) : '일정 확인 중'}<small>{nextSession ? ' / 1인 시연 금액' : ''}</small></strong><span aria-hidden="true">↗</span></div></div>
        </Link>;
      })}</div>
    </section><p className="let-catalog-footnote">모든 일정·참가비·정원은 개발 시연 설정입니다. 실제 시설과의 제휴·운영 협약 또는 예약 서비스를 의미하지 않습니다.</p>
  </div></main>;
}
