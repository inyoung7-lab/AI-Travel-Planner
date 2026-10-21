import ExperienceImage from './ExperienceImage.jsx';
import { Link } from 'react-router-dom';
import PlaceMap from '../maps/PlaceMap.jsx';
import { formatKst, formatWon, meetingPlaceAddress, regionLabel, sessionDuration, timelineRows } from '../experiencePresentation.js';
import { hasLocalizedField, localizedField, translate } from '../localEumI18n.js';
import { useLocalEumLocale } from '../localEumLocaleStore.js';

function DetailList({ title, items = [], locale, needsTranslation = false }) {
  return <section className="let-section let-small-section"><h2>{title}</h2>
    {items.length ? <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="let-muted">{translate(locale, 'noInformationYet')}</p>}
    {needsTranslation ? <small className="let-translation-notice">{translate(locale, 'translationPending')}</small> : null}
  </section>;
}

function PlaceSection({ title, place, legacyText, fallbackAddress, locale }) {
  const t = (key, values) => translate(locale, key, values);
  return <section className="let-section"><h2>{title}</h2>
    {place ? <>
      <h3>{place.place_name}</h3><p className="let-address">{place.road_address || t('placeDetailsPending')}{place.address_detail ? ` · ${place.address_detail}` : ''}</p>
      {legacyText && legacyText !== place.place_name ? <p>{t('meetingInstructions', { value: legacyText })}</p> : null}
      <PlaceMap key={place.place_id} place={place} />
      {place.directions && (!legacyText || legacyText === place.place_name) ? <p className="let-description">{place.directions}</p> : null}
    </> : <>
      <p className="let-muted">{legacyText || t('verifiedPlacePending')}{legacyText && !fallbackAddress ? ` · ${t('mapAddressPending')}` : ''}</p>
      {fallbackAddress ? <PlaceMap place={{ place_name: title, road_address: fallbackAddress }} /> : null}
    </>}
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
  const locale = useLocalEumLocale();
  const t = (key, values) => translate(locale, key, values);
  const { experience, sessions, steps, places, host } = record;
  const experienceTitle = localizedField(experience, 'title', locale);
  const shortDescription = localizedField(experience, 'description', locale);
  const detailDescription = localizedField(experience, 'detail_description', locale);
  const hostBio = localizedField(host, 'bio', locale);
  const translatedSteps = steps.map(step => ({
    ...step,
    title: localizedField(step, 'title', locale),
    description: localizedField(step, 'description', locale),
  }));
  const venue = places.find(place => place.place_id === experience.venue_place_id);
  const meeting = places.find(place => place.place_id === session?.meeting_place_id);
  const samePlace = venue && meeting && venue.place_id === meeting.place_id;
  const timeline = timelineRows(translatedSteps, session);
  const experienceNeedsTranslation = locale !== 'ko' && ['title', 'description', 'detail_description']
    .some(field => !hasLocalizedField(experience, field, locale));
  const hostNeedsTranslation = locale !== 'ko' && !hasLocalizedField(host, 'bio', locale);
  const stepsNeedTranslation = locale !== 'ko' && steps.some(step => !hasLocalizedField(step, 'title', locale) || !hasLocalizedField(step, 'description', locale));
  return <>
    {preview ? <p className="let-preview-notice">{t('previewBeforeSave')}</p> : null}
    {experience.is_demo ? <div className="let-demo-notice"><strong>{t('demoNoticeTitle')}</strong><span>{t('demoNoticeBody')}</span></div> : null}
    <div className="let-detail-hero">
      <div className="let-detail-image"><ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt || ''} eager /></div>
      <div className="let-detail-heading">
        <div className="let-tags"><span>{regionLabel(experience.region_code, locale) || t('regionNotRegistered')}</span>{experience.demo_code ? <span>{experience.demo_code}</span> : null}</div>
        <h1>{experienceTitle}</h1><p>{shortDescription || t('shortIntroMissing')}</p>
        {experienceNeedsTranslation ? <small className="let-translation-notice">{t('translationPending')}</small> : null}
        <div className="let-host-byline"><span aria-hidden="true">◎</span><span>{t('hostByline', { host: host.display_name })}</span></div>
        <dl className="let-summary-facts">
          <div><dt>{t('demoFeePerPerson')}</dt><dd>{session ? formatWon(session.fee_amount, locale) : t('noUpcomingSession')}</dd></div>
          <div><dt>{t('duration')}</dt><dd>{session ? t('minutes', { count: sessionDuration(session) }) : t('checking')}</dd></div>
          <div><dt>{t('attendees')}</dt><dd>{session ? t('peopleRange', { min: session.min_people, max: session.capacity }) : t('checking')}</dd></div>
        </dl>
        {sessions.length && onSessionChange ? <label className="let-session-label">{t('chooseSession')}
          <select value={String(session?.session_id || '')} onChange={event => onSessionChange(event.target.value)}>
            {sessions.map(item => <option key={item.session_id} value={String(item.session_id)}>{formatKst(item.starts_at, undefined, locale)} {formatKst(item.starts_at, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'}, locale)} · {formatWon(item.fee_amount, locale)} · #{item.session_id}</option>)}
          </select>
        </label> : null}
        <p className="let-session-time">{session ? `${formatKst(session.starts_at, { year:'numeric',month:'long',day:'numeric',weekday:'short' }, locale)} · ${formatKst(session.starts_at, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'}, locale)}–${formatKst(session.ends_at, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'}, locale)} (${t('koreaTime')})` : t('noPublicSessions')}</p>
        {canApplyToSession(session) ? <Link className="let-button lea-detail-apply" to={`/local-eum/experiences/${experience.experience_id}?session=${session.session_id}&apply=1`}>{t('applyForExperience')}</Link> : null}
      </div>
    </div>
    <div className="let-detail-columns">
      <div>
        <section className="let-section"><span className="let-overline">{t('aboutExperienceEyebrow')}</span><h2>{t('aboutExperience')}</h2><p className="let-description">{detailDescription || t('experienceDetailsPending')}</p></section>
        <section className="let-section"><span className="let-overline">{t('timeTogetherEyebrow')}</span><h2>{t('timeTogether')}</h2>
          {stepsNeedTranslation ? <small className="let-translation-notice">{t('translationPending')}</small> : null}
          {timeline.length ? <ol className="let-timeline">{timeline.map(step => <li key={step.step_id || step.step_order}>
            <div className="let-timeline-number">{String(step.step_order).padStart(2,'0')}</div>
            <div><span className="let-step-time">{step.startsAt ? `${formatKst(step.startsAt, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'}, locale)}–${formatKst(step.endsAt, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'}, locale)}` : t('startsAfterMinutes', { count: step.elapsed_min })} · {t('minutes', { count: step.duration_min })}</span><h3>{step.title}</h3>{step.description ? <p>{step.description}</p> : null}
              {step.exceedsSession ? <p className="let-timeline-warning">{t('stepOverrun')}</p> : null}</div>
          </li>)}</ol> : <p className="let-muted">{t('scheduleNotRegistered')}</p>}
        </section>
        <PlaceSection title={samePlace ? t('meetingAndExperiencePlace') : t('meetingPlace')} place={meeting} legacyText={session?.meeting_place} fallbackAddress={meetingPlaceAddress(session?.meeting_place)} locale={locale} />
        {venue && !samePlace ? <PlaceSection title={t('actualExperiencePlace')} place={venue} locale={locale} /> : null}
      </div>
      <aside className="let-detail-sidebar">
        <DetailList locale={locale} title={t('providedItems')} items={localizedField(experience, 'inclusions', locale)} needsTranslation={locale !== 'ko' && !hasLocalizedField(experience, 'inclusions', locale)} />
        <DetailList locale={locale} title={t('preparationItems')} items={localizedField(experience, 'preparation_items', locale)} needsTranslation={locale !== 'ko' && !hasLocalizedField(experience, 'preparation_items', locale)} />
        <DetailList locale={locale} title={t('precautions')} items={localizedField(experience, 'precautions', locale)} needsTranslation={locale !== 'ko' && !hasLocalizedField(experience, 'precautions', locale)} />
        <section className="let-section let-small-section"><span className="let-overline">{t('yourLocalHost')}</span><h2>{host.display_name}</h2><p className="let-description">{hostBio || t('hostBioPending')}</p>{hostNeedsTranslation ? <small className="let-translation-notice">{t('translationPending')}</small> : null}</section>
      </aside>
    </div>
  </>;
}
