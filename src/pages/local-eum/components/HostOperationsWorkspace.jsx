import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildHostOperationsModel, selectHostOperationsContext } from '../hostOperations.js';
import { hostOperationsCopy } from '../hostOperationsCopy.js';
import SessionEdit from '../SessionEdit.jsx';
import HostApplicationContacts from './HostApplicationContacts.jsx';
import HostDemoProgramPanels from './HostDemoProgramPanels.jsx';

const workspaceCopy = {
  ko: { overview: '운영현황', programs: '프로그램·회차 관리', contacts: '신청자·연락처', ai: 'AI 기획·진단', profile: '호스트 프로필', choose: '프로그램·회차 선택', refresh: '새로고침', selected: '선택한 운영 회차', contactHelp: '신청자를 선택하면 연락처와 문의 내용을 확인할 수 있습니다.', contactDisclaimer: '전화·메일 버튼은 기기의 앱을 엽니다. 연락 완료 상태와 호스트 메모는 저장하지 않습니다.', requests: '건', people: '명', selectApplicant: '신청자 선택', applicantDetails: '선택한 신청자 정보', phone: '전화번호', email: '이메일', language: '연락 언어', receipt: '접수번호', created: '신청일', expires: '접수 유효기한', notProvided: '미입력', call: '전화 앱 열기', copyPhone: '전화번호 복사', sendEmail: '메일 앱 열기', copyEmail: '이메일 복사', copied: '복사했습니다.', copyFailed: '복사하지 못했습니다. 연락처를 선택해 복사해 주세요.', note: '신청자 문의', noNote: '등록된 문의가 없습니다.', previous: '이전', next: '다음', description: '체험 소개', schedule: '일정·회비', timeline: '상세 일정', preview: '여행자 미리보기', manageContacts: '신청자 확인', selectHelp: '왼쪽 목록에서 회차를 선택하세요.', unsaved: '저장하지 않은 프로그램 변경사항이 있습니다. 다른 회차로 이동하면 입력 내용이 사라집니다. 계속할까요?', draftSaved: '프로필과 프로그램의 입력 내용은 메뉴를 전환해도 유지됩니다.', cancelled: '운영 취소', recruiting: '모집 중', draft: '준비 중' },
  en: { overview: 'Overview', programs: 'Programs & sessions', contacts: 'Applicants & contacts', ai: 'AI planning & review', profile: 'Host profile', choose: 'Choose a program & session', refresh: 'Refresh', selected: 'Selected session', contactHelp: 'Select an applicant to view contact details and their message.', contactDisclaimer: 'Phone and email links open your device’s apps. Contact status and host notes are not saved.', requests: 'applications', people: 'people', selectApplicant: 'Select applicant', applicantDetails: 'Selected applicant', phone: 'Phone', email: 'Email', language: 'Contact language', receipt: 'Receipt', created: 'Applied', expires: 'Request expires', notProvided: 'Not provided', call: 'Open phone app', copyPhone: 'Copy phone', sendEmail: 'Open email app', copyEmail: 'Copy email', copied: 'Copied.', copyFailed: 'Could not copy. Select and copy the contact manually.', note: 'Applicant message', noNote: 'No message provided.', previous: 'Previous', next: 'Next', description: 'Description', schedule: 'Schedule & fee', timeline: 'Itinerary', preview: 'Traveler preview', manageContacts: 'View applicants', selectHelp: 'Choose a session from the list on the left.', unsaved: 'You have unsaved program changes. Switching sessions will discard them. Continue?', draftSaved: 'Profile and program drafts remain when switching menus.', cancelled: 'Cancelled', recruiting: 'Recruiting', draft: 'Draft' },
  ja: { overview: '運営状況', programs: 'プログラム・開催回', contacts: '申請者・連絡先', ai: 'AI企画・診断', profile: 'ホストプロフィール', choose: 'プログラム・開催回を選択', refresh: '更新', selected: '選択中の開催回', contactHelp: '申請者を選ぶと連絡先と問い合わせを確認できます。', contactDisclaimer: '電話・メールのリンクは端末のアプリを開きます。連絡状況とホストメモは保存されません。', requests: '件', people: '名', selectApplicant: '申請者を選択', applicantDetails: '選択中の申請者', phone: '電話番号', email: 'メール', language: '連絡言語', receipt: '受付番号', created: '申請日時', expires: '受付有効期限', notProvided: '未入力', call: '電話アプリを開く', copyPhone: '電話番号をコピー', sendEmail: 'メールアプリを開く', copyEmail: 'メールをコピー', copied: 'コピーしました。', copyFailed: 'コピーできませんでした。連絡先を選択してコピーしてください。', note: '申請者の問い合わせ', noNote: '問い合わせはありません。', previous: '前へ', next: '次へ', description: '体験紹介', schedule: '日程・参加費', timeline: '詳細日程', preview: '旅行者プレビュー', manageContacts: '申請者を確認', selectHelp: '左の一覧から開催回を選んでください。', unsaved: '未保存の変更があります。開催回を変更すると入力が失われます。続行しますか？', draftSaved: 'メニューを切り替えてもプロフィールとプログラムの下書きは保持されます。', cancelled: 'キャンセル済み', recruiting: '募集中', draft: '準備中' },
};

const demoLabels = {
  ko: { demoReadOnly: '읽기 전용 데모입니다. 실제 변경은 HOST 로그인 후 가능합니다.', demoAi: '저장된 UI 예시 결과입니다. 이 데모에서는 AI를 호출하지 않습니다.', demoSave: 'HOST 로그인 후 저장', demoDuration: '소요 시간', demoMinutes: '분', demoFee: '1인 시연 회비', demoCapacity: '참가 인원', demoMeeting: '집결지', demoAdd: '회차 추가 · 로그인 필요', demoCancel: '운영 취소 · 로그인 필요', demoNoBooking: '시연용 · 실제 예약·결제 불가' },
  en: { demoReadOnly: 'Read-only demo. Sign in as a HOST to manage real records.', demoAi: 'Stored UI example. This demo does not call the AI service.', demoSave: 'Sign in to save', demoDuration: 'Duration', demoMinutes: 'min', demoFee: 'Demo fee per person', demoCapacity: 'Attendees', demoMeeting: 'Meeting point', demoAdd: 'Add session · Sign in required', demoCancel: 'Cancel · Sign in required', demoNoBooking: 'Demo only · No real booking or payment' },
  ja: { demoReadOnly: '閲覧専用デモです。実際の変更にはHOSTログインが必要です。', demoAi: '保存されたUI例です。このデモはAIを呼び出しません。', demoSave: 'ログイン後に保存', demoDuration: '所要時間', demoMinutes: '分', demoFee: '1人分のデモ参加費', demoCapacity: '参加人数', demoMeeting: '集合場所', demoAdd: '開催回を追加・ログインが必要', demoCancel: 'キャンセル・ログインが必要', demoNoBooking: 'デモのみ・実際の予約と決済は不可' },
};

export default function HostOperationsWorkspace({ userId, host, locale, operations, onRefresh, onExperiencesChanged, onEditorStateChange, demo = false, children }) {
  const text = { ...(hostOperationsCopy[locale] || hostOperationsCopy.ko), ...(workspaceCopy[locale] || workspaceCopy.ko), ...(demoLabels[locale] || demoLabels.ko) };
  const [view, setView] = useState('profile');
  const [experienceId, setExperienceId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [editorPanel, setEditorPanel] = useState('description');
  const [editorState, setEditorState] = useState({ dirty: false, busy: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const model = useMemo(() => buildHostOperationsModel(operations?.experiences || [], operations?.applications || []), [operations]);
  const selection = selectHostOperationsContext(model, experienceId, sessionId);
  const editorContextKey = `${userId}:${host.host_id}:${selection.session?.session_id || ''}`;
  const handleEditorState = useCallback((next) => { setEditorState(next); onEditorStateChange(next); }, [onEditorStateChange]);
  const date = (value) => new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(value));
  const status = (value) => value === 'CANCELLED' ? text.cancelled : value === 'RECRUITING' ? text.recruiting : text.draft;
  function selectSession(experience, session, nextView = view) {
    if (editorState.busy) return;
    const next = selectHostOperationsContext(model, experience, session);
    if (Number(next.session?.session_id) !== Number(selection.session?.session_id) && editorState.dirty && !window.confirm(text.unsaved)) return;
    setExperienceId(experience); setSessionId(session); setView(nextView === 'overview' || nextView === 'profile' ? 'programs' : nextView);
  }
  function refresh() { if (editorState.busy) return; onRefresh(); setRefreshKey((value) => value + 1); }
  const applicationCount = (id) => model.applications.filter((application) => Number(application.session_id) === Number(id)).length;
  return <div className="le-host-workspace">
    <aside className="le-host-sidebar" aria-label={text.title}>
      <div className="le-host-sidebar-brand"><span>LOCAL EUM · HOST</span><strong>{host.display_name}</strong></div>
      <nav aria-label={text.title}>{['overview', 'programs', 'contacts', 'ai', 'profile'].map((item, index) => <button key={item} type="button" aria-current={view === item ? 'page' : undefined} disabled={editorState.busy} onClick={() => setView(item)}><span aria-hidden="true">{['▦', '▤', '◎', '✧', '◉'][index]}</span>{text[item]}</button>)}</nav>
      <div className="le-host-sidebar-label">{text.choose}</div>
      <ul className="le-host-program-tree">{model.experiences.map((experience) => <li key={experience.experience_id}>
        <button type="button" disabled={editorState.busy} className={selection.experience?.experience_id === experience.experience_id ? 'is-selected' : ''} aria-expanded={selection.experience?.experience_id === experience.experience_id} onClick={() => selectSession(experience.experience_id, null)}><strong>{experience.title}</strong><small>{experience.sessions.length}{text.sessionCount}</small></button>
        {selection.experience?.experience_id === experience.experience_id ? <ul>{selection.sessions.map((session) => <li key={session.session_id}><button type="button" disabled={editorState.busy} aria-pressed={selection.session?.session_id === session.session_id} onClick={() => selectSession(experience.experience_id, session.session_id)}><time>{date(session.starts_at)}</time><small>#{session.session_id} · {status(session.status)} · {applicationCount(session.session_id)} {text.requests}</small></button></li>)}</ul> : null}
      </li>)}</ul>
      <Link className="le-host-back" to="/local-eum">← {locale === 'ko' ? '체험 목록' : locale === 'ja' ? '体験一覧' : 'Experience catalog'}</Link>
    </aside>
    <div className="le-host-workspace-main">
      <div className="le-host-workspace-heading"><div><span className="le-overline">HOST OPERATIONS</span><h2>{text[view]}</h2></div><button type="button" className="le-button-secondary" disabled={editorState.busy} onClick={refresh}>{text.refresh}</button></div>
      {operations?.error ? <p className="le-message le-message-error" role="alert">{operations.error}</p> : null}
      {!operations ? <p className="le-loading">{text.loading}</p> : null}
      {view === 'overview' ? <>
        <div className="le-host-ops-stats">{[[text.experiences, model.experienceCount], [text.sessions, model.activeSessionCount], [text.pending, model.pendingApplicationCount]].map(([label, count]) => <article key={label}><span>{label}</span><strong>{count}</strong></article>)}</div>
        <section className="le-host-ops-panel"><div className="le-host-ops-panel-heading"><h3>{text.upcoming}</h3><span>{text.manageContacts}</span></div>
          {model.upcomingSessions.length === 0 ? <p className="le-host-empty">{text.noSessions}</p> : <ul className="le-host-overview-sessions">{model.upcomingSessions.map((session) => <li key={session.session_id}><button type="button" onClick={() => selectSession(session.experience.experience_id, session.session_id, 'contacts')}><span><strong>{session.experience.title}</strong><time>{date(session.starts_at)} · #{session.session_id}</time></span><span>{applicationCount(session.session_id)} {text.requests} →</span></button></li>)}</ul>}
        </section><p className="le-host-ops-note">{demo ? text.demoReadOnly : text.draftSaved}</p>
      </> : null}
      {['programs', 'contacts', 'ai'].includes(view) && selection.session ? <div className="le-host-selection-summary"><strong>{selection.experience.title}</strong><span>{date(selection.session.starts_at)} · #{selection.session.session_id} · {status(selection.session.status)}</span></div> : null}
      {['programs', 'contacts', 'ai'].includes(view) && !selection.session ? <p className="le-host-empty">{text.noSessions} {text.selectHelp}</p> : null}
      <div hidden={!['programs', 'ai'].includes(view)}>
        {view === 'programs' ? <nav className="le-host-editor-tabs" aria-label={text.programs}>{['description', 'schedule', 'timeline', 'preview'].map((panel) => <button type="button" key={panel} aria-pressed={editorPanel === panel} onClick={() => setEditorPanel(panel)}>{text[panel]}</button>)}</nav> : null}
        {selection.session && demo ? <HostDemoProgramPanels key={`${editorContextKey}:${view === 'ai' ? 'ai' : editorPanel}`} experience={selection.experience} session={selection.session} panel={view === 'ai' ? 'ai' : editorPanel} locale={locale} text={text} /> : null}
        {selection.session && !demo ? <SessionEdit key={editorContextKey} embedded embeddedSessionId={selection.session.session_id} editorPanel={view === 'ai' ? 'ai' : editorPanel}
          onEditorPanelChange={(panel) => { setEditorPanel(panel); setView('programs'); }}
          onEditorStateChange={handleEditorState} onDataChanged={onRefresh} onExperiencesChanged={onExperiencesChanged}
          onSelectSession={(nextSessionId, nextExperienceId) => { setSessionId(Number(nextSessionId)); setExperienceId(Number(nextExperienceId)); }} /> : null}
      </div>
      {view === 'contacts' && selection.session ? <HostApplicationContacts key={`${editorContextKey}:${locale}`} userId={userId} hostId={host.host_id} session={selection.session} locale={locale} text={text} refreshKey={refreshKey} demoApplications={demo ? model.applications.filter((item) => item.session_id === selection.session.session_id) : null} /> : null}
      <div hidden={view !== 'profile'}>{children}</div>
    </div>
  </div>;
}
