import './ExperienceApplication.css';
import { useEffect, useState } from 'react';
import ExperienceImage from './ExperienceImage.jsx';
import { applicationErrorMessage, validateApplicationInput } from '../applicationValidation.js';
import { submitExperienceApplication } from '../applicationRepository.js';
import { getAuthSession } from '../sessionRepository.js';
import { formatKst, formatWon } from '../experiencePresentation.js';

const PRIVACY_NOTICE_VERSION = 'local-eum-demo-v1';

function FieldError({ children }) {
  return children ? <span className="lea-field-error" role="alert">{children}</span> : null;
}

function ApplicationSummary({ record, session, count }) {
  const { experience, host } = record;
  const total = Number(session.fee_amount || 0) * Number(count || 0);
  return <aside className="lea-summary let-section" aria-label="신청 체험 요약">
    <ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt || ''} eager />
    <p className="let-overline">YOUR EXPERIENCE</p>
    <h2>{experience.title}</h2>
    <p className="lea-summary-meta">
      {formatKst(session.starts_at, { month: 'long', day: 'numeric', weekday: 'short' })} · {formatKst(session.starts_at, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
      <br />호스트 {host.display_name}
    </p>
    <dl className="lea-price-list">
      <div><dt>신청 인원</dt><dd>{count}명</dd></div>
      <div><dt>시연 참가비 (1인)</dt><dd>{formatWon(session.fee_amount)}</dd></div>
      <div className="lea-total"><dt>표시 금액</dt><dd>{formatWon(total)}</dd></div>
    </dl>
    <p className="lea-demo-copy">신청 접수는 참가 확정이나 실제 결제가 아닙니다.</p>
  </aside>;
}

function Receipt({ receipt, onBack }) {
  return <section className="lea-receipt let-section" aria-live="polite">
    <span className="let-overline">APPLICATION RECEIVED</span>
    <h1>신청이 접수되었습니다</h1>
    <p className="lea-receipt-status">신청 접수 · 결제 및 참가 미확정</p>
    <dl className="lea-receipt-list">
      <div><dt>접수번호</dt><dd>{receipt.receipt_code}</dd></div>
      <div><dt>체험</dt><dd>{receipt.experience_title}</dd></div>
      <div><dt>일정</dt><dd>{formatKst(receipt.starts_at, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}–{formatKst(receipt.ends_at, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</dd></div>
      <div><dt>신청 인원</dt><dd>{receipt.attendee_count}명</dd></div>
      <div><dt>표시 금액</dt><dd>{formatWon(receipt.total_amount)}</dd></div>
      <div><dt>시연용 번호</dt><dd>{receipt.demo_reference}</dd></div>
      <div><dt>시연 번호 유효 시각</dt><dd>{formatKst(receipt.expires_at, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</dd></div>
    </dl>
    <div className="lea-demo-warning" role="note">
      이 번호는 은행에서 발급한 가상계좌가 아닙니다. 입금하지 마세요. 카드 결제와 실제 예약은 아직 연결되지 않았습니다.
    </div>
    <button className="let-button" type="button" onClick={onBack}>체험 상세로 돌아가기</button>
  </section>;
}

export default function ExperienceApplicationFlow({ record, session, onBack }) {
  const [authSession, setAuthSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', contactLanguage: 'ko', attendeeCount: '1', note: '', privacyConsent: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    getAuthSession().then(current => {
      if (!active) return;
      setAuthSession(current);
      const user = current?.user;
      const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
      setForm(value => ({
        ...value,
        name: value.name || metadataName,
        email: value.email || user?.email || '',
      }));
    }).catch(() => {
      // Auth 확인에 실패해도 비회원 양식은 열어 둔다. 제출 RPC가 최종 상태를 검증한다.
    }).finally(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, []);

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: '' }));
    setSubmitError('');
  }

  async function submit(event) {
    event.preventDefault();
    const validation = validateApplicationInput(form, session, PRIVACY_NOTICE_VERSION);
    setErrors(validation.errors);
    setSubmitError('');
    if (!validation.valid) return;

    setSubmitting(true);
    try {
      const result = await submitExperienceApplication({
        ...form,
        sessionId: session.session_id,
        attendeeCount: Number(form.attendeeCount),
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      });
      setReceipt(result);
    } catch (error) {
      setSubmitError(applicationErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) return <Receipt receipt={receipt} onBack={onBack} />;

  const maxAttendees = Math.max(1, Number(session.capacity) || 1);
  return <section className="lea-page">
    <button className="let-text-button lea-back" type="button" onClick={onBack}>← 체험 상세로</button>
    <header className="lea-heading">
      <span className="let-overline">JOIN THE EXPERIENCE</span>
      <h1>참가 신청</h1>
      <p>로그인하거나 비회원으로 신청할 수 있습니다. 신청 접수 후 호스트가 확인합니다.</p>
    </header>
    <div className="lea-layout">
      <form className="lea-form let-section" onSubmit={submit} noValidate>
        <div className="lea-form-heading">
          <h2>신청자 정보</h2>
          <span className="lea-required">필수 항목 *</span>
        </div>
        <p className="lea-auth-state" aria-live="polite">
          {authChecked ? (authSession ? `로그인 계정으로 신청 · ${authSession.user.email || ''}` : '비회원 신청 · 계정 생성 없이 접수할 수 있습니다.') : '로그인 상태를 확인하고 있습니다…'}
        </p>
        <div className="lea-fields">
          <label className="lea-field">이름 *
            <input autoComplete="name" maxLength={80} value={form.name} onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
            <FieldError>{errors.name}</FieldError>
          </label>
          <label className="lea-field">이메일 *
            <input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
            <FieldError>{errors.email}</FieldError>
          </label>
          <label className="lea-field">연락처 (선택)
            <input type="tel" autoComplete="tel" maxLength={40} placeholder="010-0000-0000" value={form.phone} onChange={event => update('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} />
            <FieldError>{errors.phone}</FieldError>
          </label>
          <label className="lea-field">연락 언어 *
            <select value={form.contactLanguage} onChange={event => update('contactLanguage', event.target.value)} aria-invalid={Boolean(errors.contactLanguage)}>
              <option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option>
            </select>
            <FieldError>{errors.contactLanguage}</FieldError>
          </label>
          <label className="lea-field lea-field-wide">참가 인원 *
            <select value={form.attendeeCount} onChange={event => update('attendeeCount', event.target.value)} aria-invalid={Boolean(errors.attendeeCount)}>
              {Array.from({ length: maxAttendees }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count}명</option>)}
            </select>
            <FieldError>{errors.attendeeCount}</FieldError>
          </label>
          <label className="lea-field lea-field-wide">문의 메모 (선택)
            <textarea maxLength={1000} rows={3} placeholder="호스트에게 전달할 내용을 입력해 주세요." value={form.note} onChange={event => update('note', event.target.value)} aria-invalid={Boolean(errors.note)} />
            <FieldError>{errors.note}</FieldError>
          </label>
        </div>

        <fieldset className="lea-payment-options">
          <legend>결제 방법</legend>
          <label className="lea-payment-option is-selected">
            <input type="radio" name="payment-method" checked readOnly />
            <span><strong>시연용 가상계좌</strong><small>임의 시연 번호를 표시합니다. 실제 입금은 불가능합니다.</small></span>
            <b>선택</b>
          </label>
          <div className="lea-payment-option is-disabled" aria-disabled="true">
            <span className="lea-radio-placeholder" aria-hidden="true" />
            <span><strong>카드 결제</strong><small>결제사 연동 준비 중</small></span>
            <b>준비 중</b>
          </div>
        </fieldset>

        <label className="lea-consent">
          <input type="checkbox" checked={form.privacyConsent} onChange={event => update('privacyConsent', event.target.checked)} aria-invalid={Boolean(errors.privacyConsent)} />
          <span><strong>개인정보 수집 및 이용에 동의합니다. *</strong><small>신청 확인과 호스트 연락을 위해 이름, 이메일, 선택 연락처 및 신청 정보를 개발 시연 환경에 저장합니다. 안내 버전 {PRIVACY_NOTICE_VERSION}</small></span>
        </label>
        <FieldError>{errors.privacyConsent}</FieldError>
        {submitError ? <p className="lea-submit-error" role="alert">{submitError}</p> : null}
        <button className="let-button lea-submit" type="submit" disabled={submitting || !authChecked}>
          {submitting ? '신청 접수 중…' : '신청 접수하기'}
        </button>
        <p className="lea-submit-note">접수는 결제 완료나 참가 확정이 아닙니다. 실제 예약·결제 기능은 연결되어 있지 않습니다.</p>
      </form>
      <ApplicationSummary record={record} session={session} count={form.attendeeCount} />
    </div>
  </section>;
}
