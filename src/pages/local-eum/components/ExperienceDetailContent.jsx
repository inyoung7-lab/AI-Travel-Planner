import ExperienceImage from './ExperienceImage.jsx';
import { Link } from 'react-router-dom';
import PlaceMap from '../maps/PlaceMap.jsx';
import { REGION_LABELS, formatKst, formatWon, sessionDuration, timelineRows } from '../experiencePresentation.js';

function DetailList({ title, items = [] }) {
  return <section className="let-section let-small-section"><h2>{title}</h2>
    {items.length ? <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="let-muted">아직 등록된 정보가 없습니다.</p>}
  </section>;
}

function PlaceSection({ title, place, legacyText }) {
  return <section className="let-section"><h2>{title}</h2>
    {place ? <>
      <h3>{place.place_name}</h3><p className="let-address">{place.road_address || '상세 주소 확인 중'}{place.address_detail ? ` · ${place.address_detail}` : ''}</p>
      {legacyText && legacyText !== place.place_name ? <p>집결 안내: {legacyText}</p> : null}
      <PlaceMap key={place.place_id} place={place} />
      {place.directions ? <p className="let-description">{place.directions}</p> : null}
    </> : <p className="let-muted">{legacyText || '확인된 장소가 아직 등록되지 않았습니다.'}{legacyText ? ' · 지도 주소 확인 전' : ''}</p>}
  </section>;
}

function canApplyToSession(session) {
  if (!session || session.status !== 'RECRUITING') return false;
  const now = Date.now();
  const startsAt = Date.parse(session.starts_at);
  const deadline = session.recruit_deadline ? Date.parse(session.recruit_deadline) : null;
  return Number.isFinite(startsAt) && startsAt > now && (deadline === null || (Number.isFinite(deadline) && deadline > now));
}

export default function ExperienceDetailContent({ record, session, onSessionChange, preview = false }) {
  const { experience, sessions, steps, places, host } = record;
  const venue = places.find(place => place.place_id === experience.venue_place_id);
  const meeting = places.find(place => place.place_id === session?.meeting_place_id);
  const samePlace = venue && meeting && venue.place_id === meeting.place_id;
  const timeline = timelineRows(steps, session);
  return <>
    {preview ? <p className="let-preview-notice">저장 전 여행자 화면 미리보기</p> : null}
    {experience.is_demo ? <div className="let-demo-notice"><strong>시연용 · 실제 예약 불가</strong><span>실제 시설 주소를 사용한 개발 시연입니다. 일정·금액·정원은 임의 설정이며 시설과의 운영 협약을 뜻하지 않습니다.</span></div> : null}
    <div className="let-detail-hero">
      <div className="let-detail-image"><ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt || ''} eager /></div>
      <div className="let-detail-heading">
        <div className="let-tags"><span>{REGION_LABELS[experience.region_code] || experience.region_code || '지역 미등록'}</span>{experience.demo_code ? <span>{experience.demo_code}</span> : null}</div>
        <h1>{experience.title}</h1><p>{experience.description || '짧은 소개가 아직 등록되지 않았습니다.'}</p>
        <div className="let-host-byline"><span aria-hidden="true">◎</span><span>{host.display_name}와 함께</span></div>
        <dl className="let-summary-facts">
          <div><dt>1인 시연 참가비</dt><dd>{session ? formatWon(session.fee_amount) : '일정 미등록'}</dd></div>
          <div><dt>소요 시간</dt><dd>{session ? `${sessionDuration(session)}분` : '확인 중'}</dd></div>
          <div><dt>인원</dt><dd>{session ? `${session.min_people}~${session.capacity}명` : '확인 중'}</dd></div>
        </dl>
        {sessions.length && onSessionChange ? <label className="let-session-label">운영 회차 선택
          <select value={String(session?.session_id || '')} onChange={event => onSessionChange(event.target.value)}>
            {sessions.map(item => <option key={item.session_id} value={String(item.session_id)}>{formatKst(item.starts_at)} {formatKst(item.starts_at, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'})} · {formatWon(item.fee_amount)} · 회차 #{item.session_id}</option>)}
          </select>
        </label> : null}
        <p className="let-session-time">{session ? `${formatKst(session.starts_at, { year:'numeric',month:'long',day:'numeric',weekday:'short' })} · ${formatKst(session.starts_at, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}–${formatKst(session.ends_at, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'})} (한국 시각)` : '공개된 운영 회차가 없습니다.'}</p>
        {canApplyToSession(session) ? <Link className="let-button lea-detail-apply" to={`/local-eum/experiences/${experience.experience_id}?session=${session.session_id}&apply=1`}>참가 신청</Link> : null}
      </div>
    </div>
    <div className="let-detail-columns">
      <div>
        <section className="let-section"><span className="let-overline">ABOUT THE EXPERIENCE</span><h2>이 체험을 소개해요</h2><p className="let-description">{experience.detail_description || '상세 소개는 호스트 확인 후 등록됩니다.'}</p></section>
        <section className="let-section"><span className="let-overline">OUR TIME TOGETHER</span><h2>함께하는 순서</h2>
          {timeline.length ? <ol className="let-timeline">{timeline.map(step => <li key={step.step_id || step.step_order}>
            <div className="let-timeline-number">{String(step.step_order).padStart(2,'0')}</div>
            <div><span className="let-step-time">{step.startsAt ? `${formatKst(step.startsAt, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}–${formatKst(step.endsAt, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}` : `시작 ${step.elapsed_min}분 후`} · {step.duration_min}분</span><h3>{step.title}</h3>{step.description ? <p>{step.description}</p> : null}
              {step.exceedsSession ? <p className="let-timeline-warning">선택한 회차 종료 시간을 넘는 일정입니다. 호스트의 시간 확인이 필요합니다.</p> : null}</div>
          </li>)}</ol> : <p className="let-muted">상세 일정은 아직 등록되지 않았습니다.</p>}
        </section>
        <PlaceSection title={samePlace ? '만남·체험 장소' : '만남 장소'} place={meeting} legacyText={session?.meeting_place} />
        {!samePlace ? <PlaceSection title="실제 체험 장소" place={venue} /> : null}
      </div>
      <aside className="let-detail-sidebar">
        <DetailList title="제공 사항" items={experience.inclusions} />
        <DetailList title="준비물" items={experience.preparation_items} />
        <DetailList title="유의사항" items={experience.precautions} />
        <section className="let-section let-small-section"><span className="let-overline">YOUR LOCAL HOST</span><h2>{host.display_name}</h2><p className="let-description">{host.bio || '호스트 소개는 아직 등록되지 않았습니다.'}</p></section>
      </aside>
    </div>
  </>;
}
