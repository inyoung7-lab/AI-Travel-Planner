import AiExperienceAgent from './AiExperienceAgent.jsx';
import { getDemoAiExample } from '../hostOperationsDemo.js';

export default function HostDemoProgramPanels({ experience, session, panel, locale, text }) {
  if (panel === 'ai') return <div className="le-host-demo-ai"><p className="le-host-demo-note">{text.demoAi}</p><AiExperienceAgent key={`${experience.experience_id}:${locale}`} experience={experience} session={session} locale={locale} readOnly initialAnalysis={getDemoAiExample(experience)} /></div>;
  return <section className="le-host-demo-panel">
    <p className="le-host-demo-note">{text.demoReadOnly}</p>
    {panel === 'description' ? <><h3>{text.description}</h3><label>{experience.title}<textarea rows={5} readOnly value={experience.description} /></label><button type="button" className="le-button-primary" disabled>{text.demoSave}</button></> : null}
    {panel === 'schedule' ? <><h3>{text.schedule}</h3><dl className="le-host-demo-facts">
      <div><dt>{text.selected}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(session.starts_at))} (KST)</dd></div>
      <div><dt>{text.demoDuration}</dt><dd>{experience.duration} {text.demoMinutes}</dd></div>
      <div><dt>{text.demoFee}</dt><dd>{session.fee_amount.toLocaleString()} KRW</dd></div>
      <div><dt>{text.demoCapacity}</dt><dd>{session.min_people}–{session.capacity}</dd></div>
      <div><dt>{text.demoMeeting}</dt><dd>{session.meeting_place}</dd></div>
    </dl><div className="le-host-contact-actions"><button type="button" disabled>{text.demoAdd}</button><button type="button" disabled>{text.demoCancel}</button></div></> : null}
    {panel === 'timeline' ? <><h3>{text.timeline}</h3><ol className="le-host-demo-timeline">{experience.steps.map((step) => <li key={step}>{step}</li>)}</ol></> : null}
    {panel === 'preview' ? <><span className="le-overline">DEMO EXPERIENCE</span><h3>{experience.title}</h3><p>{experience.description}</p><ol className="le-host-demo-timeline">{experience.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="le-host-demo-note">{text.demoNoBooking}</p></> : null}
  </section>;
}
