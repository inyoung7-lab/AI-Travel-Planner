import './ExperienceApplication.css';
import { useEffect, useState } from 'react';
import ExperienceImage from './ExperienceImage.jsx';
import { applicationErrorMessage, validateApplicationInput } from '../applicationValidation.js';
import { submitExperienceApplication } from '../applicationRepository.js';
import { getAuthSession } from '../sessionRepository.js';
import { formatKst, formatWon } from '../experiencePresentation.js';
import { formatAttendeeCount, localizedField, translate } from '../localEumI18n.js';
import { getLocalEumLocale, useLocalEumLocale } from '../localEumLocaleStore.js';

const PRIVACY_NOTICE_VERSION = 'local-eum-demo-v1';

function FieldError({ children }) {
  return children ? <span className="lea-field-error" role="alert">{children}</span> : null;
}

function ApplicationSummary({ record, session, count, locale }) {
  const t = (key, params) => translate(locale, key, params);
  const { experience, host } = record;
  const total = Number(session.fee_amount || 0) * Number(count || 0);
  return <aside className="lea-summary let-section" aria-label={t('applicationSummary')}>
    <ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt || ''} eager />
    <p className="let-overline">{t('yourExperience')}</p>
    <h2>{localizedField(experience, 'title', locale)}</h2>
    <p className="lea-summary-meta">
      {formatKst(session.starts_at, { month: 'long', day: 'numeric', weekday: 'short' }, locale)} · {formatKst(session.starts_at, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, locale)}
      <br />{t('hostByline', { host: host.display_name })}
    </p>
    <dl className="lea-price-list">
      <div><dt>{t('attendeeCount')}</dt><dd>{formatAttendeeCount(locale, count)}</dd></div>
      <div><dt>{t('demoFeePerPerson')}</dt><dd>{formatWon(session.fee_amount, locale)}</dd></div>
      <div className="lea-total"><dt>{t('displayAmount')}</dt><dd>{formatWon(total, locale)}</dd></div>
    </dl>
    <p className="lea-demo-copy">{t('applicationPending')}</p>
  </aside>;
}

function Receipt({ receipt, onBack, locale, experienceTitle }) {
  const t = (key) => translate(locale, key);
  return <section className="lea-receipt let-section" aria-live="polite">
    <span className="let-overline">{t('applicationReceived')}</span>
    <h1>{t('applicationSuccess')}</h1>
    <p className="lea-receipt-status">{t('applicationPending')}</p>
    <dl className="lea-receipt-list">
      <div><dt>{t('receiptNumber')}</dt><dd>{receipt.receipt_code}</dd></div>
      <div><dt>{t('experience')}</dt><dd>{experienceTitle}</dd></div>
      <div><dt>{t('schedule')}</dt><dd>{formatKst(receipt.starts_at, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, locale)}–{formatKst(receipt.ends_at, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, locale)}</dd></div>
      <div><dt>{t('attendeeCount')}</dt><dd>{formatAttendeeCount(locale, receipt.attendee_count)}</dd></div>
      <div><dt>{t('displayAmount')}</dt><dd>{formatWon(receipt.total_amount, locale)}</dd></div>
      <div><dt>{t('demoNumber')}</dt><dd>{receipt.demo_reference}</dd></div>
      <div><dt>{t('demoNumberExpiry')}</dt><dd>{formatKst(receipt.expires_at, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, locale)}</dd></div>
    </dl>
    <div className="lea-demo-warning" role="note">{t('virtualAccountWarning')}</div>
    <button className="let-button" type="button" onClick={onBack}>{t('returnToDetail')}</button>
  </section>;
}

export default function ExperienceApplicationFlow({ record, session, onBack }) {
  const locale = useLocalEumLocale();
  const t = (key, params) => translate(locale, key, params);
  const [authSession, setAuthSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', contactLanguage: getLocalEumLocale(), attendeeCount: '1', note: '', privacyConsent: false,
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
    const validation = validateApplicationInput(form, session, PRIVACY_NOTICE_VERSION, locale);
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
      setSubmitError(applicationErrorMessage(error, locale));
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) return <Receipt receipt={receipt} onBack={onBack} locale={locale} experienceTitle={localizedField(record.experience, 'title', locale)} />;

  const maxAttendees = Math.max(1, Number(session.capacity) || 1);
  return <section className="lea-page">
    <button className="let-text-button lea-back" type="button" onClick={onBack}>{t('returnToDetail')}</button>
    <header className="lea-heading">
      <span className="let-overline">{t('joinExperience')}</span>
      <h1>{t('applicationTitle')}</h1>
      <p>{t('applicationSubtitle')}</p>
    </header>
    <div className="lea-layout">
      <form className="lea-form let-section" onSubmit={submit} noValidate>
        <div className="lea-form-heading">
          <h2>{t('applicantInformation')}</h2>
          <span className="lea-required">{t('requiredItems')}</span>
        </div>
        <p className="lea-auth-state" aria-live="polite">
          {authChecked ? (authSession ? t('loggedInApplication', { email: authSession.user.email || '' }) : t('guestApplication')) : t('checkingLogin')}
        </p>
        <div className="lea-fields">
          <label className="lea-field">{t('name')} *
            <input autoComplete="name" maxLength={80} value={form.name} onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
            <FieldError>{errors.name}</FieldError>
          </label>
          <label className="lea-field">{t('email')} *
            <input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
            <FieldError>{errors.email}</FieldError>
          </label>
          <label className="lea-field">{t('phoneOptional')}
            <input type="tel" autoComplete="tel" maxLength={40} placeholder="000-0000-0000" value={form.phone} onChange={event => update('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} />
            <FieldError>{errors.phone}</FieldError>
          </label>
          <label className="lea-field">{t('contactLanguage')} *
            <select value={form.contactLanguage} onChange={event => update('contactLanguage', event.target.value)} aria-invalid={Boolean(errors.contactLanguage)}>
              <option value="ko">{t('localeKo')}</option><option value="en">{t('localeEn')}</option><option value="ja">{t('localeJa')}</option>
            </select>
            <FieldError>{errors.contactLanguage}</FieldError>
          </label>
          <label className="lea-field lea-field-wide">{t('attendeeCount')} *
            <select value={form.attendeeCount} onChange={event => update('attendeeCount', event.target.value)} aria-invalid={Boolean(errors.attendeeCount)}>
              {Array.from({ length: maxAttendees }, (_, index) => index + 1).map(count => <option key={count} value={count}>{formatAttendeeCount(locale, count)}</option>)}
            </select>
            <FieldError>{errors.attendeeCount}</FieldError>
          </label>
          <label className="lea-field lea-field-wide">{t('inquiryNoteOptional')}
            <textarea maxLength={1000} rows={3} placeholder={t('hostMessagePlaceholder')} value={form.note} onChange={event => update('note', event.target.value)} aria-invalid={Boolean(errors.note)} />
            <FieldError>{errors.note}</FieldError>
          </label>
        </div>

        <fieldset className="lea-payment-options">
          <legend>{t('paymentMethod')}</legend>
          <label className="lea-payment-option is-selected">
            <input type="radio" name="payment-method" checked readOnly />
            <span><strong>{t('demoVirtualAccount')}</strong><small>{t('demoAccountNotice')}</small></span>
            <b>{t('selected')}</b>
          </label>
          <div className="lea-payment-option is-disabled" aria-disabled="true">
            <span className="lea-radio-placeholder" aria-hidden="true" />
            <span><strong>{t('cardPayment')}</strong><small>{t('paymentIntegrationPending')}</small></span>
            <b>{t('preparing')}</b>
          </div>
        </fieldset>

        <label className="lea-consent">
          <input type="checkbox" checked={form.privacyConsent} onChange={event => update('privacyConsent', event.target.checked)} aria-invalid={Boolean(errors.privacyConsent)} />
          <span><strong>{t('privacyConsentTitle')}</strong><small>{t('privacyConsentText', { version: PRIVACY_NOTICE_VERSION })}</small></span>
        </label>
        <FieldError>{errors.privacyConsent}</FieldError>
        {submitError ? <p className="lea-submit-error" role="alert">{submitError}</p> : null}
        <button className="let-button lea-submit" type="submit" disabled={submitting || !authChecked}>
          {submitting ? t('submittingApplication') : t('submitApplication')}
        </button>
        <p className="lea-submit-note">{t('applicationDisclaimer')}</p>
      </form>
      <ApplicationSummary record={record} session={session} count={form.attendeeCount} locale={locale} />
    </div>
  </section>;
}
