import { useEffect, useState } from 'react';
import { loadHostSessionApplications } from '../sessionRepository.js';
import { applicantContactHref } from '../hostOperations.js';

export default function HostApplicationContacts({ userId, hostId, session, locale, text, refreshKey, demoApplications = null }) {
  const [page, setPage] = useState(0);
  const [state, setState] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const requestKey = `${userId}:${hostId}:${session.session_id}:${page}:${refreshKey}`;
  const current = demoApplications ? { key: requestKey, applications: demoApplications.slice(page * 20, (page + 1) * 20), total: demoApplications.length, pageSize: 20, checkedAt: Date.parse('2026-10-18T00:00:00Z') } : state?.key === requestKey ? state : null;
  useEffect(() => {
    if (demoApplications) return undefined;
    let active = true;
    loadHostSessionApplications(userId, hostId, session.session_id, page)
      .then((result) => { if (active) setState({ ...result, key: requestKey, checkedAt: Date.now(), error: '' }); })
      .catch((error) => { if (active) setState({ key: requestKey, error: error.message }); });
    return () => { active = false; };
  }, [userId, hostId, session.session_id, page, requestKey, demoApplications]);
  const applications = current?.applications || [];
  const selected = applications.find((item) => item.application_id === selectedId) || applications[0];
  const date = (value) => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value)) : '—';
  async function copyContact(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(text.copied);
    } catch { setCopyMessage(text.copyFailed); }
  }
  if (!current) return <p className="le-loading" role="status">{text.loading}</p>;
  if (current.error) return <p className="le-message le-message-error" role="alert">{current.error}</p>;
  return <section className="le-host-contacts" aria-label={text.contacts}>
    <div className="le-host-section-heading"><div><h3>{text.contacts}</h3><p>{text.contactHelp}</p></div><strong>{current.total} {text.requests}</strong></div>
    {current.total === 0 ? <div className="le-host-empty">{text.noApplications}</div> : <>
      <div className="le-host-contact-grid">
        <div className="le-host-applicant-list" aria-label={text.selectApplicant}>
          {applications.map((application) => <button type="button" key={application.application_id}
            aria-pressed={selected?.application_id === application.application_id}
            onClick={() => { setSelectedId(application.application_id); setCopyMessage(''); }}>
            <span><strong>{application.applicant_name}</strong><small>{application.attendee_count} {text.people}</small></span>
            <small className="le-host-receipt">{application.receipt_code}</small>
            <span className="le-host-applicant-status">{new Date(application.expires_at).getTime() <= current.checkedAt ? text.expired : text.received}</span>
          </button>)}
        </div>
        {selected ? <article className="le-host-contact-detail" aria-label={text.applicantDetails}>
          <h3>{selected.applicant_name}</h3>
          <dl>
            <div><dt>{text.phone}</dt><dd>{selected.applicant_phone || text.notProvided}</dd></div>
            <div><dt>{text.email}</dt><dd>{selected.applicant_email || text.notProvided}</dd></div>
            <div><dt>{text.language}</dt><dd>{{ ko: '한국어', en: 'English', ja: '日本語' }[selected.contact_language] || selected.contact_language}</dd></div>
            <div><dt>{text.people}</dt><dd>{selected.attendee_count}</dd></div>
            <div><dt>{text.receipt}</dt><dd className="le-host-receipt">{selected.receipt_code}</dd></div>
            <div><dt>{text.created}</dt><dd>{date(selected.created_at)}</dd></div>
            <div><dt>{text.expires}</dt><dd>{date(selected.expires_at)}</dd></div>
          </dl>
          {!demoApplications ? <div className="le-host-contact-actions">
            {applicantContactHref('phone', selected.applicant_phone) ? <a href={applicantContactHref('phone', selected.applicant_phone)}>{text.call}</a> : null}
            {selected.applicant_phone ? <button type="button" onClick={() => copyContact(selected.applicant_phone)}>{text.copyPhone}</button> : null}
            {applicantContactHref('email', selected.applicant_email) ? <a href={applicantContactHref('email', selected.applicant_email)}>{text.sendEmail}</a> : null}
            {selected.applicant_email ? <button type="button" onClick={() => copyContact(selected.applicant_email)}>{text.copyEmail}</button> : null}
          </div> : <p className="le-host-demo-note">{text.demoReadOnly}</p>}
          <p className="le-host-copy-status" role="status" aria-live="polite">{copyMessage}</p>
          <h4>{text.note}</h4><p className="le-host-applicant-note">{selected.note || text.noNote}</p>
          {!demoApplications ? <p className="le-host-ops-note">{text.contactDisclaimer}</p> : null}
        </article> : null}
      </div>
      <div className="le-host-pagination">
        <button type="button" disabled={page === 0} onClick={() => { setPage((value) => value - 1); setSelectedId(null); setCopyMessage(''); }}>{text.previous}</button>
        <span>{page + 1} / {Math.max(1, Math.ceil(current.total / current.pageSize))}</span>
        <button type="button" disabled={(page + 1) * current.pageSize >= current.total} onClick={() => { setPage((value) => value + 1); setSelectedId(null); setCopyMessage(''); }}>{text.next}</button>
      </div>
    </>}
  </section>;
}
