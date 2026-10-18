import { Link } from 'react-router-dom';
import { formatKst, formatWon, placeLinks, regionLabel, timelineRows } from '../experiencePresentation.js';
import { localizedField } from '../localEumI18n.js';
import ExperienceImage from './ExperienceImage.jsx';
import '../Traveler.css';
import './LanguageFriendsDemoDetail.css';

const UI = {
  ko: {
    back: '← 언어·친구 시연 목록', draft: 'DRAFT 시연 · 실제 예약 불가',
    draftBody: '호스트 검수와 실제 운영 승인이 끝나지 않았습니다. 이 화면에서는 신청·예약·결제를 할 수 없습니다.',
    host: '기존 로컬이음 호스트', review: '제목·소개는 번역 초안이며, 단계별 일정은 HOST 검수 전까지 한국어로 표시됩니다.', schedule: '운영 일정 (시연 예시)',
    deadline: '모집 마감 예시 (미적용)', fee: '시연 입력 금액', attendees: '예시 정원', time: '예상 소요 시간',
    about: '체험 소개', flow: '90분 운영 흐름', place: '장소와 집결 방법', source: '공식 장소 정보',
    kakao: '카카오맵에서 주소 검색', outputs: '참가자 결과물', safety: '안전·운영 안내',
    status: 'DRAFT · 모집하지 않음', noPayment: '결제 기능이 연결되지 않았습니다.',
  },
  en: {
    back: '← Language & Friends demo list', draft: 'DRAFT demo · no booking',
    draftBody: 'Host review and operating approval are pending. Applications, bookings, and payments are disabled.',
    host: 'Existing Local Eum host', review: 'Titles and descriptions are draft translations; step-by-step details remain in Korean until host review.', schedule: 'Schedule (demo example)',
    deadline: 'Recruitment deadline example (inactive)', fee: 'Demo input amount', attendees: 'Example capacity', time: 'Estimated duration',
    about: 'About this experience', flow: '90-minute program flow', place: 'Venue and meeting point', source: 'Official venue information',
    kakao: 'Search address on Kakao Map', outputs: 'Participant take-away', safety: 'Safety and operations',
    status: 'DRAFT · not recruiting', noPayment: 'Payment is not connected.',
  },
  ja: {
    back: '← 言語・友だちデモ一覧', draft: 'DRAFTデモ · 予約不可',
    draftBody: 'ホスト確認と運営承認前です。申込・予約・決済はできません。',
    host: '既存のローカルイウムホスト', review: 'タイトルと紹介文は翻訳案です。ホスト確認までは各ステップの詳細を韓国語で表示します。', schedule: '日程（デモ例）',
    deadline: '募集締切例（未適用）', fee: 'デモ入力金額', attendees: '定員例', time: '所要時間',
    about: '体験紹介', flow: '90分の進行', place: '場所と集合方法', source: '公式の場所情報',
    kakao: 'カカオマップで住所を検索', outputs: '参加者の成果物', safety: '安全・運営案内',
    status: 'DRAFT · 募集中ではありません', noPayment: '決済機能は接続されていません。',
  },
};

function timeLabel(timestamp, locale) {
  return formatKst(timestamp, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, locale);
}

export default function LanguageFriendsDemoDetail({ experience, locale = 'ko' }) {
  const labels = UI[locale] || UI.ko;
  const title = localizedField(experience, 'title', locale);
  const description = localizedField(experience, 'description', locale);
  const details = localizedField(experience, 'detail_description', locale);
  const rows = timelineRows(experience.steps, experience.sessions[0]);
  const venue = experience.venue;
  const addressSearch = placeLinks(venue).search;
  const session = experience.sessions[0];

  return <>
    <div className="let-demo-notice" role="note"><strong>{labels.draft}</strong><span>{labels.draftBody}</span></div>
    <div className="let-detail-hero">
      <div className="let-detail-image"><ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt} eager /></div>
      <div className="let-detail-heading">
        <div className="let-tags"><span>{regionLabel(experience.region_code, locale)}</span><span>{experience.demo_code} · DRAFT</span></div>
        <h1>{title}</h1>
        <p>{description}</p>
        {locale !== 'ko' ? <small className="let-translation-notice">{labels.review}</small> : null}
        <div className="let-host-byline"><span aria-hidden="true">◎</span><span>{labels.host} · #500</span></div>
        <dl className="let-summary-facts">
          <div><dt>{labels.time}</dt><dd>90{locale === 'ko' ? '분' : locale === 'ja' ? '分' : ' min'}</dd></div>
          <div><dt>{labels.attendees}</dt><dd>2–6</dd></div>
          <div><dt>{labels.fee}</dt><dd>{formatWon(session.fee_amount, locale)}</dd></div>
        </dl>
        <section className="lf-demo-schedule" aria-label={labels.schedule}>
          <h2>{labels.schedule}</h2>
          <p><strong>{labels.status}</strong></p>
          <p>{formatKst(session.starts_at, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }, locale)} · {timeLabel(session.starts_at, locale)}–{timeLabel(session.ends_at, locale)} (KST)</p>
          <p>{labels.deadline}: {formatKst(session.recruit_deadline, { month: 'long', day: 'numeric' }, locale)} {timeLabel(session.recruit_deadline, locale)}</p>
          <small>{labels.noPayment}</small>
        </section>
      </div>
    </div>
    <div className="let-detail-columns">
      <div>
        <section className="let-section"><span className="let-overline">ABOUT THE EXPERIENCE</span><h2>{labels.about}</h2><p className="let-description">{details}</p>{locale !== 'ko' ? <small className="let-translation-notice">{labels.review}</small> : null}</section>
        <section className="let-section"><span className="let-overline">OUR TIME TOGETHER</span><h2>{labels.flow}</h2><ol className="let-timeline">{rows.map(step => <li key={step.step_order}>
          <div className="let-timeline-number">{String(step.step_order).padStart(2, '0')}</div>
          <div><span className="let-step-time">{timeLabel(step.startsAt, locale)}–{timeLabel(step.endsAt, locale)} · {step.duration_min} min</span><h3>{localizedField(step, 'title', locale)}</h3><p>{localizedField(step, 'description', locale)}</p></div>
        </li>)}</ol></section>
        <section className="let-section"><span className="let-overline">MEETING POINT</span><h2>{labels.place}</h2><h3>{venue.place_name}</h3><p className="let-address">{venue.road_address}</p><p className="let-description">{venue.meeting_point}</p><p className="let-muted">{venue.usage_notice}</p>
          <div className="let-map-links"><a href={addressSearch} target="_blank" rel="noopener noreferrer">{labels.kakao} ↗</a><a href={venue.source_reference} target="_blank" rel="noopener noreferrer">{labels.source} ↗</a></div>
        </section>
      </div>
      <aside className="let-detail-sidebar">
        <section className="let-section let-small-section"><span className="let-overline">TAKE-AWAY</span><h2>{labels.outputs}</h2><ul>{experience.inclusions.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="let-section let-small-section"><span className="let-overline">SAFETY</span><h2>{labels.safety}</h2><ul>{experience.precautions.map(item => <li key={item}>{item}</li>)}</ul></section>
        <Link className="let-button lf-demo-back" to="/local-eum?interest=LANGUAGE_FRIENDS&recruiting=off&demo=language-friends">{labels.back}</Link>
      </aside>
    </div>
  </>;
}
