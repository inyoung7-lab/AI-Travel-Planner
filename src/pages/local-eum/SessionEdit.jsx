import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ExperienceDetailContent from './components/ExperienceDetailContent.jsx';
import ExperienceTimelineEditor from './components/ExperienceTimelineEditor.jsx';
import AiExperienceAgent from './components/AiExperienceAgent.jsx';
import LocalEumLanguageSelector from './components/LocalEumLanguageSelector.jsx';
import { translate, localizedField } from './localEumI18n.js';
import { setLocalEumLocale, useLocalEumLocale } from './localEumLocaleStore.js';
import { validateExperienceSteps } from './experienceStepValidation.js';
import {
  getAuthSession,
  getSupabaseSetupMessage,
  isSupabaseConfigured,
  fromKstFields,
  loadHostExperiences,
  loadExperienceSteps,
  loadSession,
  saveSession,
  cancelSession,
  cancelExperience,
  createSession,
  saveExperienceDescription,
  saveExperienceSteps,
  signIn,
  signOut,
  toKstFields,
  watchAuthSession,
} from './sessionRepository.js';
import { createDraftSessionPayload } from './sessionLifecycle.js';
import './SessionEdit.css';

function toForm(session) {
  const { date, time } = toKstFields(session.starts_at);
  const end = toKstFields(session.ends_at);
  const deadline = session.recruit_deadline ? toKstFields(session.recruit_deadline) : { date: '', time: '' };
  return {
    date,
    time,
    end_date: end.date,
    end_time: end.time,
    deadline_date: deadline.date,
    deadline_time: deadline.time,
    min_people: String(session.min_people),
    capacity: String(session.capacity),
    fee_amount: String(session.fee_amount),
    meeting_place: session.meeting_place,
    status: session.status,
  };
}

function validate(form) {
  const errors = {};
  const minimum = Number(form.min_people);
  const capacity = Number(form.capacity);
  const fee = Number(form.fee_amount);

  try {
    const startsAt = fromKstFields(form.date, form.time);
    const endsAt = fromKstFields(form.end_date, form.end_time);
    if (Date.parse(endsAt) <= Date.parse(startsAt)) errors.end_time = '종료 시간은 시작 시간보다 뒤여야 합니다.';
  } catch {
    errors.date = '운영 날짜와 시작·종료 시간을 입력해 주세요.';
  }
  if (Boolean(form.deadline_date) !== Boolean(form.deadline_time)) errors.deadline = '모집 마감 날짜와 시간을 함께 입력해 주세요.';
  if (form.deadline_date && form.deadline_time) {
    try {
      if (Date.parse(fromKstFields(form.deadline_date, form.deadline_time)) > Date.parse(fromKstFields(form.date, form.time))) {
        errors.deadline = '모집 마감은 운영 시작 전이어야 합니다.';
      }
    } catch { errors.deadline = '모집 마감 날짜와 시간을 확인해 주세요.'; }
  }
  if (!Number.isInteger(minimum) || minimum < 1) {
    errors.min_people = '최소 인원은 1명 이상이어야 합니다.';
  }
  if (!Number.isInteger(capacity) || capacity < minimum || capacity < 1) {
    errors.capacity = '최대 인원은 최소 인원 이상이어야 합니다.';
  }
  if (form.fee_amount.trim() === '' || !Number.isInteger(fee) || fee < 0) {
    errors.fee_amount = '회비는 0원 이상의 정수로 입력해 주세요.';
  }
  if (!form.meeting_place.trim() || form.meeting_place.trim().length > 200) {
    errors.meeting_place = '공개 가능한 만남 장소를 1~200자로 입력해 주세요.';
  }
  if (!['DRAFT', 'RECRUITING', 'CANCELLED'].includes(form.status)) {
    errors.status = '모집 상태를 선택해 주세요.';
  }

  return errors;
}

function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className="le-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="le-field-error" id={`${htmlFor}-error`}>{error}</p> : null}
      {!error && hint ? <p className="le-field-hint">{hint}</p> : null}
    </div>
  );
}

export default function SessionEdit({ embedded = false, embeddedSessionId, editorPanel = 'description', onEditorPanelChange, onEditorStateChange, onDataChanged, onExperiencesChanged, onSelectSession } = {}) {
  const locale = useLocalEumLocale();
  const t = (key, values) => translate(locale, key, values);
  const params = useParams();
  const sessionId = embedded ? embeddedSessionId : params.sessionId;
  const PageTag = embedded ? 'div' : 'main';
  const navigate = useNavigate();
  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadErrorKey, setLoadErrorKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [experienceCancelMessage, setExperienceCancelMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [choicesState, setChoicesState] = useState(null);
  const [stepsState, setStepsState] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepsSaving, setStepsSaving] = useState(false);
  const [stepsMessage, setStepsMessage] = useState('');
  const [experienceDescriptions, setExperienceDescriptions] = useState({});
  const [experienceLocalizations, setExperienceLocalizations] = useState({});
  const [experienceDescriptionSaving, setExperienceDescriptionSaving] = useState(false);
  const [experienceDescriptionMessage, setExperienceDescriptionMessage] = useState('');
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState(null);
  const [newSessionError, setNewSessionError] = useState('');
  const [addingSession, setAddingSession] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [agentBusy, setAgentBusy] = useState(false);

  const requestKey = authSession?.user?.id ? `${authSession.user.id}:${sessionId}` : '';
  const currentRecord = loadedKey === requestKey ? record : null;
  const currentForm = loadedKey === requestKey ? form : null;
  const currentLoadError = loadErrorKey === requestKey ? loadError : '';
  const loading = Boolean(requestKey && !currentRecord && !currentLoadError);
  const currentStepsState = currentRecord && stepsState?.experienceId === currentRecord.experience.experience_id
    ? stepsState
    : null;
  const originalSteps = currentStepsState?.items || [];
  const stepsChanged = Boolean(currentStepsState && JSON.stringify(steps) !== JSON.stringify(originalSteps));
  const currentExperienceDescription = currentRecord && Object.hasOwn(experienceDescriptions, currentRecord.experience.experience_id)
    ? experienceDescriptions[currentRecord.experience.experience_id]
    : currentRecord?.experience?.detail_description || '';
  const currentExperienceLocalization = currentRecord && Object.hasOwn(experienceLocalizations, currentRecord.experience.experience_id)
    ? experienceLocalizations[currentRecord.experience.experience_id]
    : { translations: currentRecord?.experience?.translations || {}, availableLanguages: currentRecord?.experience?.available_languages || [] };
  const experienceDescriptionChanged = Boolean(currentRecord && (
    currentExperienceDescription.trim() !== (currentRecord.experience.detail_description || '').trim()
    || JSON.stringify(currentExperienceLocalization) !== JSON.stringify({
      translations: currentRecord.experience.translations || {},
      availableLanguages: currentRecord.experience.available_languages || [],
    })
  ));
  const hasUnsavedChanges = Boolean((currentRecord && currentForm && JSON.stringify(currentForm) !== JSON.stringify(toForm(currentRecord.session)))
    || stepsChanged || experienceDescriptionChanged || addSessionOpen);

  useEffect(() => {
    onEditorStateChange?.({ dirty: hasUnsavedChanges, busy: saving || stepsSaving || experienceDescriptionSaving || addingSession || agentBusy });
  }, [hasUnsavedChanges, saving, stepsSaving, experienceDescriptionSaving, addingSession, agentBusy, onEditorStateChange]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured()) {
      return () => { active = false; };
    }

    const subscription = watchAuthSession((session) => {
      if (!active) return;
      setAuthSession(session);
      setAuthLoading(false);
      setAuthError('');
    });
    getAuthSession()
      .then((session) => {
        if (active) setAuthSession(session);
      })
      .catch((error) => {
        if (active) setAuthError(error.message);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = authSession?.user?.id;
    const hostId = currentRecord?.host?.host_id;
    if (!userId || !hostId) return undefined;

    let active = true;
    loadHostExperiences(userId, hostId)
      .then((items) => {
        if (active) setChoicesState({ userId, hostId, items, error: '' });
      })
      .catch((error) => {
        if (active) setChoicesState({ userId, hostId, items: [], error: error.message });
      });

    return () => { active = false; };
  }, [authSession?.user?.id, currentRecord?.host?.host_id]);

  useEffect(() => {
    let active = true;
    if (!authSession?.user?.id) {
      return () => { active = false; };
    }

    const requestKey = `${authSession.user.id}:${sessionId}`;
    loadSession(sessionId, authSession.user.id)
      .then((data) => {
        if (!active) return;
        setRecord(data);
        setForm(toForm(data.session));
        setLoadError('');
        setLoadedKey(requestKey);
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message);
          setLoadErrorKey(requestKey);
        }
      });

    return () => { active = false; };
  }, [authSession?.user?.id, sessionId, reloadCount]);

  useEffect(() => {
    const userId = authSession?.user?.id;
    const experienceId = currentRecord?.experience?.experience_id;
    if (!userId || !experienceId) return undefined;
    let active = true;
    loadExperienceSteps(userId, experienceId)
      .then((items) => {
        if (!active) return;
        setSteps(items);
        setStepsState({ experienceId, items, loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) return;
        setSteps([]);
        setStepsState({ experienceId, items: [], loading: false, error: error.message });
      });
    return () => { active = false; };
  }, [authSession?.user?.id, currentRecord?.experience?.experience_id]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  const changed = currentRecord && currentForm && JSON.stringify(currentForm) !== JSON.stringify(toForm(currentRecord.session));
  const durationMinutes = currentForm
    ? (() => {
      try { return Math.round((Date.parse(fromKstFields(currentForm.end_date, currentForm.end_time)) - Date.parse(fromKstFields(currentForm.date, currentForm.time))) / 60000); }
      catch { return 0; }
    })()
    : 120;

  function change(field, value) {
    setForm((current) => field === 'date'
      ? ({ ...current, date: value, end_date: value })
      : ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      date: ['time', 'date'].includes(field) ? undefined : current.date,
      end_time: field === 'end_time' ? undefined : current.end_time,
      deadline: field.startsWith('deadline_') ? undefined : current.deadline,
    }));
    setMessage('');
  }

  function undo() {
    setForm(toForm(currentRecord.session));
    setExperienceDescriptions((current) => ({
      ...current,
      [currentRecord.experience.experience_id]: currentRecord.experience.detail_description || '',
    }));
    setExperienceLocalizations((current) => ({ ...current, [currentRecord.experience.experience_id]: {
      translations: currentRecord.experience.translations || {},
      availableLanguages: currentRecord.experience.available_languages || [],
    } }));
    setErrors({});
    setExperienceDescriptionMessage('');
    setMessage('입력 중이던 변경사항을 되돌렸습니다.');
  }

  async function submitExperienceDescription(event) {
    event.preventDefault();
    setExperienceDescriptionSaving(true);
    setExperienceDescriptionMessage('');
    try {
      const refreshedExperience = await saveExperienceDescription(
        authSession.user.id,
        currentRecord.experience,
        currentExperienceDescription,
        currentExperienceLocalization,
      );
      setRecord((current) => current?.experience?.experience_id === refreshedExperience.experience_id
        ? { ...current, experience: refreshedExperience }
        : current);
      setExperienceDescriptions((current) => ({
        ...current,
        [refreshedExperience.experience_id]: refreshedExperience.detail_description || '',
      }));
      setExperienceLocalizations((current) => ({ ...current, [refreshedExperience.experience_id]: {
        translations: refreshedExperience.translations || {},
        availableLanguages: refreshedExperience.available_languages || [],
      } }));
      setExperienceDescriptionMessage('체험 소개를 저장하고 데이터베이스에서 다시 불러왔습니다.');
      onDataChanged?.();
    } catch (error) {
      setExperienceDescriptionMessage(error.message || '체험 소개를 저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.');
    } finally {
      setExperienceDescriptionSaving(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (session.status === 'CANCELLED') return;
    const nextErrors = validate(currentForm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage('입력값을 확인한 뒤 다시 저장해 주세요.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const startsAt = fromKstFields(currentForm.date, currentForm.time);
      const endsAt = fromKstFields(currentForm.end_date, currentForm.end_time);
      const recruitDeadline = currentForm.deadline_date && currentForm.deadline_time
        ? fromKstFields(currentForm.deadline_date, currentForm.deadline_time)
        : null;
      await saveSession(sessionId, authSession.user.id, currentRecord.session.updated_at, {
        starts_at: startsAt,
        ends_at: endsAt,
        meeting_place: currentForm.meeting_place,
        recruit_deadline: recruitDeadline,
        min_people: Number(currentForm.min_people),
        capacity: Number(currentForm.capacity),
        fee_amount: Number(currentForm.fee_amount),
        status: currentForm.status,
      });
      const refreshed = await loadSession(sessionId, authSession.user.id);
      setRecord(refreshed);
      setForm(toForm(refreshed.session));
      setMessage('Supabase에 저장한 뒤 다시 조회했습니다. 아래 내용은 데이터베이스의 최신 값입니다.');
      onDataChanged?.();
    } catch (error) {
      setMessage(error.message || '저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function submitSteps() {
    const validationErrors = validateExperienceSteps(steps, durationMinutes);
    if (Object.keys(validationErrors).length) {
      setStepsMessage('일정의 제목과 시간을 확인해 주세요.');
      return;
    }
    setStepsSaving(true);
    setStepsMessage('');
    try {
      await saveExperienceSteps(authSession.user.id, currentRecord.experience, steps);
      const [refreshed, refreshedSteps] = await Promise.all([
        loadSession(sessionId, authSession.user.id),
        loadExperienceSteps(authSession.user.id, currentRecord.experience.experience_id),
      ]);
      setRecord(refreshed);
      setSteps(refreshedSteps);
      setStepsState({ experienceId: refreshed.experience.experience_id, items: refreshedSteps, loading: false, error: '' });
      setStepsMessage('Supabase에 상세 일정을 저장하고 다시 조회했습니다.');
      onDataChanged?.();
    } catch (error) {
      setStepsMessage(error.message || '상세 일정을 저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.');
    } finally {
      setStepsSaving(false);
    }
  }

  async function submitSignIn(event) {
    event.preventDefault();
    setSigningIn(true);
    setAuthError('');
    try {
      await signIn(email.trim(), password);
      setPassword('');
    } catch (error) {
      setAuthError(error.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.');
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    if (hasUnsavedChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 로그아웃할까요?')) return;
    setAuthError('');
    try {
      await signOut();
      setRecord(null);
      setForm(null);
      setAddSessionOpen(false);
      setNewSessionForm(null);
      setMessage('로그아웃했습니다.');
    } catch (error) {
      setAuthError(error.message);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <PageTag className={embedded ? "le-session-page le-embedded-editor" : "le-session-page"} data-panel={embedded ? editorPanel : undefined}>
        <div className="le-shell">
          <section className="le-auth-card" aria-labelledby="le-config-title">
            <span className="le-eyebrow le-eyebrow-dark">LOCAL EUM · SUPABASE</span>
            <h1 id="le-config-title">Supabase 연결 설정이 필요합니다</h1>
            <p>{getSupabaseSetupMessage()}</p>
            <div className="le-setup-steps">
              <div><span>1</span><p>저장소 루트의 <code>.env.local</code> 파일을 엽니다. 이 파일에는 프로젝트 URL을 미리 적어 두었습니다.</p></div>
              <div><span>2</span><p>두 번째 줄에서 <code>=</code> 뒤의 예시 문구를 지우고 Dashboard의 <strong>publishable key</strong>를 붙여 넣습니다.</p></div>
              <div><span>3</span><p>저장한 뒤 개발 서버를 다시 시작하면 HOST 로그인 화면이 나타납니다.</p></div>
            </div>
            <pre className="le-env-example">VITE_SUPABASE_URL=https://rhkaxmqdkztpbljkunxb.supabase.co{'\n'}VITE_SUPABASE_PUBLISHABLE_KEY=여기에_publishable_key</pre>
            <p className="le-auth-hint">키 위치: Supabase Dashboard → Project Settings → API Keys 또는 Connect. secret/service-role 키는 절대 사용하지 마세요. 키를 채팅이나 GitHub에 올릴 필요가 없습니다.</p>
          </section>
        </div>
      </PageTag>
    );
  }

  if (authLoading) {
    return <PageTag className={embedded ? "le-session-page le-embedded-editor" : "le-session-page"} data-panel={embedded ? editorPanel : undefined}><div className="le-loading">Supabase 로그인 상태를 확인하는 중입니다…</div></PageTag>;
  }

  if (!authSession) {
    return (
      <PageTag className={embedded ? "le-session-page le-embedded-editor" : "le-session-page"} data-panel={embedded ? editorPanel : undefined}>
        <div className="le-shell">
          <div className="le-crumbs" aria-label="현재 위치"><span>로컬이음</span><span aria-hidden="true">/</span><strong>호스트 로그인</strong></div>
          <section className="le-auth-card" aria-labelledby="le-login-title">
            <span className="le-eyebrow le-eyebrow-dark">LOCAL EUM · HOST STUDIO</span>
            <h1 id="le-login-title">호스트 계정으로 로그인해 주세요</h1>
            <p>Supabase Auth가 계정을 확인하고, 데이터베이스가 HOST 권한과 회차 소유권을 다시 검사합니다.</p>
            <form className="le-auth-form" onSubmit={submitSignIn}>
              <Field label="이메일" htmlFor="le-login-email">
                <input id="le-login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="비밀번호" htmlFor="le-login-password">
                <input id="le-login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              {authError ? <p className="le-message le-message-error" role="alert">{authError}</p> : null}
              <button className="le-button-primary le-auth-submit" type="submit" disabled={signingIn}>{signingIn ? '로그인 중…' : 'HOST 계정 로그인'}</button>
            </form>
            <p className="le-auth-hint">테스트 계정이 아직 없다면 Supabase Dashboard → Authentication → Users에서 테스트 사용자만 만들어 주세요. 비밀번호를 코드나 채팅에 저장할 필요가 없습니다.</p>
          </section>
        </div>
      </PageTag>
    );
  }

  if (loading) {
    return <PageTag className={embedded ? "le-session-page le-embedded-editor" : "le-session-page"} data-panel={embedded ? editorPanel : undefined}><div className="le-loading">운영 회차를 불러오는 중입니다…</div></PageTag>;
  }

  if (currentLoadError || !currentRecord || !currentForm) {
    return (
      <PageTag className={embedded ? "le-session-page le-embedded-editor" : "le-session-page"} data-panel={embedded ? editorPanel : undefined}>
        <div className="le-shell">
          <div className="le-auth-toolbar"><span>{authSession.user.email}로 로그인됨</span><button type="button" onClick={handleSignOut}>로그아웃</button></div>
          <div className="le-loading le-loading-error" role="alert">
            <p>{currentLoadError || '운영 회차를 불러올 수 없습니다.'}</p>
            <button type="button" className="le-button-primary" onClick={() => {
              setLoadError('');
              setLoadErrorKey('');
              setReloadCount((count) => count + 1);
            }}>다시 불러오기</button>
          </div>
          {authError ? <p className="le-message le-message-error" role="alert">{authError}</p> : null}
        </div>
      </PageTag>
    );
  }

  const { program, experience, host, session } = currentRecord;
  const formValues = currentForm;
  const currentChoicesState = choicesState?.userId === authSession.user.id
    && choicesState?.hostId === host.host_id
    ? choicesState
    : null;
  const selectableExperiences = (currentChoicesState?.items || []).filter((item) => item.sessions.length > 0);
  const sessionsForExperience = selectableExperiences.find(
    (item) => item.experience_id === experience.experience_id,
  )?.sessions || [];
  const experienceCancelled = experience.status === 'CANCELLED';
  const cancelled = session.status === 'CANCELLED' || experienceCancelled;
  const sessionStatusLabel = experienceCancelled ? '체험 운영 취소' : session.status === 'CANCELLED' ? '운영 취소' : session.status === 'RECRUITING' ? '모집 중' : '준비 중';

  function selectSession(nextSessionId) {
    if (hasUnsavedChanges && !window.confirm('저장하지 않은 체험 소개, 회차 또는 일정 변경이 있습니다. 이동하면 입력 내용이 사라집니다. 계속할까요?')) return;
    setAddSessionOpen(false);
    setNewSessionForm(null);
    setNewSessionError('');
    setErrors({});
    setMessage('');
    setStepsMessage('');
    setExperienceDescriptionMessage('');
    if (embedded) onSelectSession?.(nextSessionId, experience.experience_id);
    else navigate(`/local-eum/host/sessions/${nextSessionId}/edit`);
  }

  function startAddingSession() {
    if (hasUnsavedChanges) {
      setMessage('현재 입력 중인 내용을 먼저 저장하거나 취소한 뒤 새 회차를 추가해 주세요.');
      return;
    }
    setNewSessionForm({
      date: '',
      time: formValues.time,
      meeting_place: formValues.meeting_place,
      min_people: formValues.min_people,
      capacity: formValues.capacity,
      fee_amount: formValues.fee_amount,
    });
    setNewSessionError('');
    setAddSessionOpen(true);
  }

  async function submitNewSession(event) {
    event.preventDefault();
    setNewSessionError('');
    let payload;
    try {
      payload = createDraftSessionPayload(newSessionForm, durationMinutes);
    } catch (error) {
      setNewSessionError(error.message);
      return;
    }

    setAddingSession(true);
    try {
      const created = await createSession(authSession.user.id, experience.experience_id, payload);
      setAddSessionOpen(false);
      let items;
      try {
        items = await loadHostExperiences(authSession.user.id, host.host_id);
      } catch {
        setNewSessionError(`회차 #${created.session_id}는 저장됐습니다. 목록을 다시 불러오지 못했으니 새로고침해 확인해 주세요.`);
        return;
      }
      setChoicesState({ userId: authSession.user.id, hostId: host.host_id, items, error: '' });
      const visible = items.some((item) => item.experience_id === experience.experience_id
        && item.sessions.some((itemSession) => itemSession.session_id === created.session_id));
      if (!visible) {
        setNewSessionError('회차는 저장됐지만 목록에서 다시 확인되지 않았습니다. 새로고침 후 운영 회차 목록을 확인해 주세요.');
        return;
      }
      if (embedded) {
        onExperiencesChanged?.(items, authSession.user.id, host.host_id);
        onSelectSession?.(created.session_id, experience.experience_id);
      } else navigate(`/local-eum/host/sessions/${created.session_id}/edit`);
    } catch (error) {
      setNewSessionError(error.message || '새 운영 회차를 만들지 못했습니다.');
    } finally {
      setAddingSession(false);
    }
  }

  async function cancelCurrentSession() {
    if (session.status === 'CANCELLED' || hasUnsavedChanges || saving) return;
    const confirmed = window.confirm('이 운영 회차를 취소할까요? 회차 기록과 기존 신청 내역은 보존되며, 새 참가 신청은 중단됩니다.');
    if (!confirmed) return;

    setSaving(true);
    setMessage('');
    try {
      const cancelled = await cancelSession(session.session_id, authSession.user.id, session.updated_at);
      setRecord((current) => current ? { ...current, session: cancelled } : current);
      setForm(toForm(cancelled));
      setChoicesState((current) => current ? {
        ...current,
        items: current.items.map((item) => ({
          ...item,
          sessions: item.sessions.map((choice) => choice.session_id === cancelled.session_id ? cancelled : choice),
        })),
      } : current);
      setMessage('운영 회차를 취소했습니다. 기록과 기존 신청 내역은 보존됩니다.');
      onDataChanged?.();
    } catch (error) {
      setMessage(error.message || '운영 회차를 취소하지 못했습니다. 다시 불러와 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelCurrentExperience() {
    if (experience.status === 'CANCELLED' || hasUnsavedChanges || saving) return;
    const confirmed = window.confirm('이 체험 운영을 취소할까요? 시작 전 회차는 함께 취소되고, 이미 받은 신청과 결제 기록은 보존됩니다. 환불이나 참가자 알림은 자동 처리되지 않습니다.');
    if (!confirmed) return;

    setSaving(true);
    setExperienceCancelMessage('');
    try {
      const result = await cancelExperience(experience.experience_id, authSession.user.id);
      const cancelledIds = new Set((result.cancelled_session_ids || []).map(Number));
      const nextExperience = { ...experience, status: 'CANCELLED' };
      const nextSession = cancelledIds.has(Number(session.session_id))
        ? { ...session, status: 'CANCELLED' }
        : session;
      setRecord((current) => current ? { ...current, experience: nextExperience, session: nextSession } : current);
      setForm((current) => current ? { ...current, status: nextSession.status } : current);
      setChoicesState((current) => current ? {
        ...current,
        items: current.items.map((item) => item.experience_id === experience.experience_id
          ? { ...item, status: 'CANCELLED', sessions: item.sessions.map((itemSession) => cancelledIds.has(Number(itemSession.session_id))
            ? { ...itemSession, status: 'CANCELLED' }
            : itemSession) }
          : item),
      } : current);
      setExperienceCancelMessage('체험 운영을 취소했습니다. 시작 전 회차는 취소했고 신청 기록은 보존했습니다.');
      onDataChanged?.();
    } catch (error) {
      setExperienceCancelMessage(error.message || '체험 운영을 취소하지 못했습니다. 최신 상태를 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  function selectExperience(nextExperienceId) {
    const nextExperience = selectableExperiences.find(
      (item) => String(item.experience_id) === nextExperienceId,
    );
    if (nextExperience?.sessions.length) selectSession(nextExperience.sessions[0].session_id);
  }

  let previewStartsAt = session.starts_at;
  let previewEndsAt = session.ends_at;
  try {
    previewStartsAt = fromKstFields(formValues.date, formValues.time);
    previewEndsAt = fromKstFields(formValues.end_date, formValues.end_time);
  } catch { /* invalid input stays visible in the editor; preview keeps last saved timestamps */ }
  const previewSession = {
    ...session,
    starts_at: previewStartsAt,
    ends_at: previewEndsAt,
    meeting_place: formValues.meeting_place,
    min_people: Number(formValues.min_people) || session.min_people,
    capacity: Number(formValues.capacity) || session.capacity,
    fee_amount: Number(formValues.fee_amount) || 0,
    status: formValues.status,
  };
  const previewRecord = {
    experience: {
      ...experience,
      title: localizedField(experience, 'title', locale),
      description: localizedField(experience, 'description', locale),
      detail_description: localizedField({ ...experience, translations: currentExperienceLocalization.translations }, 'detail_description', locale) || currentExperienceDescription,
      translations: currentExperienceLocalization.translations,
    },
    sessions: [previewSession],
    steps,
    places: [],
    host,
  };

  return (
    <PageTag className={embedded ? "le-session-page le-embedded-editor" : "le-session-page"} data-panel={embedded ? editorPanel : undefined}>
      <div className="le-shell">
        <div className="le-crumbs" aria-label="현재 위치">
          <span>로컬이음</span><span aria-hidden="true">/</span>
          <span>호스트 센터</span><span aria-hidden="true">/</span>
          <strong>운영 회차 수정</strong>
        </div>

        <section className="le-hero le-hero-compact" aria-labelledby="le-page-title">
          <div className="le-hero-content">
            <span className="le-eyebrow">LOCAL EUM · HOST STUDIO</span>
            <h1 id="le-page-title">{host.host_studio_title}</h1>
            <p>{host.host_studio_description}</p>
            <div className="le-demo-chip"><span className="le-demo-dot" />Supabase 연결 · HOST 권한 확인 완료</div>
          </div>
          <div className="le-hero-art" aria-hidden="true"><span /><span /><span /></div>
        </section>

        <div className="le-auth-toolbar">
          <LocalEumLanguageSelector locale={locale} onChange={setLocalEumLocale} />
          <span>{authSession.user.email} · HOST 로그인</span>
          <Link
            to="/local-eum/host/profile"
            onClick={(event) => {
              if (hasUnsavedChanges && !window.confirm('저장하지 않은 체험 편집 내용이 있습니다. 호스트 프로필 화면으로 이동할까요?')) event.preventDefault();
            }}
          >호스트 운영센터</Link>
          <button type="button" onClick={handleSignOut}>로그아웃</button>
        </div>

        <section id="le-experience-picker" className="le-session-picker" aria-label="01. 체험 및 운영 회차 선택">
          <div className="le-session-picker-copy">
            <span className="le-overline">01 · MY EXPERIENCES</span>
            <h2>{experience.title}</h2>
            <p>기본 프로그램 · {program.title}</p>
            <span className={`le-picker-status ${cancelled ? 'le-picker-status-cancelled' : session.status !== 'RECRUITING' ? 'le-picker-status-draft' : ''}`}>
              {sessionStatusLabel} · 회차 #{session.session_id}
            </span>
          </div>
          <div className="le-session-picker-fields">
            <Field label="체험" htmlFor="le-experience-select">
              <select
                id="le-experience-select"
                value={String(experience.experience_id)}
                onChange={(event) => selectExperience(event.target.value)}
                disabled={!currentChoicesState || selectableExperiences.length === 0}
              >
                {!currentChoicesState
                  ? <option value={String(experience.experience_id)}>체험 목록 불러오는 중…</option>
                  : currentChoicesState.error
                    ? <option value={String(experience.experience_id)}>체험 목록을 불러오지 못했습니다</option>
                    : selectableExperiences.length === 0
                      ? <option value={String(experience.experience_id)}>운영 회차가 등록된 체험이 없습니다</option>
                      : selectableExperiences.map((item) => (
                    <option key={item.experience_id} value={String(item.experience_id)}>{item.title}</option>
                      ))}
              </select>
            </Field>
            <Field label="운영 회차" htmlFor="le-session-select">
              <select
                id="le-session-select"
                value={String(session.session_id)}
                onChange={(event) => selectSession(event.target.value)}
                disabled={!currentChoicesState || sessionsForExperience.length === 0}
              >
                {sessionsForExperience.map((item) => {
                  const { date, time } = toKstFields(item.starts_at);
                  return (
                    <option key={item.session_id} value={String(item.session_id)}>
                      {date} {time} · {item.status === 'CANCELLED' ? '운영 취소' : item.status === 'RECRUITING' ? '모집 중' : '준비 중'} · 회차 #{item.session_id}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>
          <div className="le-session-create-area">
            <div className="le-session-management-actions">
              {!addSessionOpen ? <button className="le-button-secondary" type="button" onClick={startAddingSession} disabled={saving || addingSession || experience.status === 'CANCELLED'}>＋ 운영 회차 추가</button> : null}
              {session.status !== 'CANCELLED' && !experienceCancelled ? <button className="le-button-danger" type="button" onClick={cancelCurrentSession} disabled={saving || hasUnsavedChanges}>{saving ? '처리 중…' : '이 회차 운영 취소'}</button> : session.status === 'CANCELLED' ? <span className="le-session-cancelled-note">이 회차는 취소되었습니다.</span> : null}
              {experience.status !== 'CANCELLED' ? <button className="le-button-danger" type="button" onClick={cancelCurrentExperience} disabled={saving || hasUnsavedChanges}>{saving ? '처리 중…' : '체험 전체 운영 취소'}</button> : <span className="le-session-cancelled-note">이 체험은 운영 취소되었습니다.</span>}
            </div>
            {experienceCancelMessage ? <p className={/취소하지 못|권한|적용되지 않았/.test(experienceCancelMessage) ? 'le-message le-message-error' : 'le-message'} role="status">{experienceCancelMessage}</p> : null}
              {!addSessionOpen && newSessionError ? <p className="le-session-create-error" role="alert">{newSessionError}</p> : null}
            {addSessionOpen ? <form className="le-new-session-form" onSubmit={submitNewSession}>
              <div className="le-new-session-heading"><div><h3>새 운영 회차 추가</h3><p>현재 회차의 운영값을 불러왔습니다. 날짜를 정하면 초안으로 추가됩니다.</p></div><span>{durationMinutes}분</span></div>
              <div className="le-field-grid">
                <Field label="새 운영 날짜" htmlFor="le-new-session-date">
                  <input id="le-new-session-date" type="date" required value={newSessionForm?.date || ''} onChange={(event) => setNewSessionForm((current) => ({ ...current, date: event.target.value }))} />
                </Field>
                <Field label="새 시작 시간" htmlFor="le-new-session-time">
                  <input id="le-new-session-time" type="time" required value={newSessionForm?.time || ''} onChange={(event) => setNewSessionForm((current) => ({ ...current, time: event.target.value }))} />
                </Field>
              </div>
              <div className="le-field-grid">
                <Field label="만남 장소" htmlFor="le-new-session-place">
                  <input id="le-new-session-place" type="text" maxLength="200" required value={newSessionForm?.meeting_place || ''} onChange={(event) => setNewSessionForm((current) => ({ ...current, meeting_place: event.target.value }))} />
                </Field>
                <Field label="최소 인원" htmlFor="le-new-session-min">
                  <input id="le-new-session-min" type="number" min="1" step="1" required value={newSessionForm?.min_people || ''} onChange={(event) => setNewSessionForm((current) => ({ ...current, min_people: event.target.value }))} />
                </Field>
              </div>
              <div className="le-field-grid">
                <Field label="최대 인원" htmlFor="le-new-session-capacity">
                  <input id="le-new-session-capacity" type="number" min="1" step="1" required value={newSessionForm?.capacity || ''} onChange={(event) => setNewSessionForm((current) => ({ ...current, capacity: event.target.value }))} />
                </Field>
                <Field label="1인 시연 회비" htmlFor="le-new-session-fee">
                  <input id="le-new-session-fee" type="number" min="0" step="1" required value={newSessionForm?.fee_amount || ''} onChange={(event) => setNewSessionForm((current) => ({ ...current, fee_amount: event.target.value }))} />
                </Field>
              </div>
              {newSessionError ? <p className="le-session-create-error" role="alert">{newSessionError}</p> : null}
              <p className="le-session-create-note">신청을 받지 않는 DRAFT 상태로 추가됩니다. 추가 후 날짜·장소·모집 조건을 확인하고 별도로 모집 상태를 변경해 주세요.</p>
              <div className="le-session-create-actions">
                <button className="le-button-secondary" type="button" disabled={addingSession} onClick={() => { setAddSessionOpen(false); setNewSessionForm(null); setNewSessionError(''); }}>추가 취소</button>
                <button className="le-button-primary" type="submit" disabled={addingSession}>{addingSession ? '추가 중…' : '초안 회차 추가'}</button>
              </div>
            </form> : null}
          </div>
          {currentChoicesState?.error
            ? <p className="le-session-picker-error" role="alert">체험 목록을 불러오지 못했습니다: {currentChoicesState.error}</p>
            : null}
          <div className="le-picker-shortcuts">
            <Link to={`/local-eum/experiences/${experience.experience_id}?session=${session.session_id}`} target="_blank" rel="noopener noreferrer">선택한 회차 여행자 화면 ↗</Link>
            {experience.is_demo ? <span>시연용 · 실제 예약 불가</span> : null}
          </div>
        </section>

        <AiExperienceAgent
          key={`${experience.experience_id}:${session.session_id}:${locale}`}
          experience={experience}
          session={session}
          locale={locale}
          onBusyChange={setAgentBusy}
          onCopyDraft={(draft) => {
            setExperienceDescriptions((current) => ({ ...current, [experience.experience_id]: draft }));
            setExperienceDescriptionMessage('AI 초안을 입력란에 복사했습니다. 검토 후 체험 소개 저장 버튼을 눌러 주세요.');
            onEditorPanelChange?.('description');
            requestAnimationFrame(() => document.getElementById('le-experience-detail-description')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          }}
        />

        <section className="le-copy-editor le-experience-description" aria-labelledby="le-experience-description-title">
          <div className="le-copy-editor-heading">
            <div>
              <span className="le-overline">02 · EXPERIENCE DETAILS</span>
              <h2 id="le-experience-description-title">체험 상세 소개</h2>
              <p><strong>{experience.title}</strong>의 여행자 상세 화면에 표시됩니다. 이 소개는 이 체험의 모든 운영 회차에 공통으로 사용됩니다.</p>
            </div>
            {experience.is_demo ? <span className="le-copy-source">시연용 체험</span> : null}
          </div>
          <form className="le-experience-description-form" onSubmit={submitExperienceDescription}>
            <Field label="이 체험을 소개해요" htmlFor="le-experience-detail-description" hint="비워 두면 여행자 화면에 ‘상세 소개는 호스트 확인 후 등록됩니다.’가 표시됩니다.">
              <textarea
                id="le-experience-detail-description"
                rows="5"
                maxLength={20000}
                value={currentExperienceDescription}
                onChange={(event) => {
                  setExperienceDescriptions((current) => ({ ...current, [experience.experience_id]: event.target.value }));
                  setExperienceDescriptionMessage('');
                }}
                aria-describedby="le-experience-detail-description-count"
              />
            </Field>
            {!experience.translation_columns_available ? <p className="le-message le-message-error" role="status">{t('translationSchemaPending')}</p> : null}
            <details className="le-translation-editor"><summary>{t('translationEditor')}</summary>
              <p>{t('translationEditorHelp')}</p>
              {['en', 'ja'].map((language) => {
                const translation = currentExperienceLocalization.translations?.[language] || {};
                return <fieldset className="le-translation-fieldset" key={language} disabled={!experience.translation_columns_available || experienceDescriptionSaving}>
                  <legend>{language === 'en' ? 'English' : '日本語'} · {t('experienceText')}</legend>
                  <label>{t('experienceTitle')}<input value={translation.title || ''} maxLength="200" onChange={(event) => setExperienceLocalizations((current) => {
                    const base = current[experience.experience_id] || currentExperienceLocalization;
                    const nextTranslations = { ...base.translations, [language]: { ...(base.translations?.[language] || {}), title: event.target.value, review_status: 'DRAFT' } };
                    return { ...current, [experience.experience_id]: { ...base, translations: nextTranslations } };
                  })} /></label>
                  <label>{t('experienceSummary')}<textarea rows="2" value={translation.description || ''} maxLength="2000" onChange={(event) => setExperienceLocalizations((current) => {
                    const base = current[experience.experience_id] || currentExperienceLocalization;
                    const nextTranslations = { ...base.translations, [language]: { ...(base.translations?.[language] || {}), description: event.target.value, review_status: 'DRAFT' } };
                    return { ...current, [experience.experience_id]: { ...base, translations: nextTranslations } };
                  })} /></label>
                  <label>{t('experienceDetails')}<textarea rows="4" value={translation.detail_description || ''} maxLength="20000" onChange={(event) => setExperienceLocalizations((current) => {
                    const base = current[experience.experience_id] || currentExperienceLocalization;
                    const nextTranslations = { ...base.translations, [language]: { ...(base.translations?.[language] || {}), detail_description: event.target.value, review_status: 'DRAFT' } };
                    return { ...current, [experience.experience_id]: { ...base, translations: nextTranslations } };
                  })} /></label>
                  <label className="le-translation-review"><input type="checkbox" checked={translation.review_status === 'REVIEWED'} onChange={(event) => setExperienceLocalizations((current) => {
                    const base = current[experience.experience_id] || currentExperienceLocalization;
                    const nextTranslations = { ...base.translations, [language]: { ...(base.translations?.[language] || {}), review_status: event.target.checked ? 'REVIEWED' : 'DRAFT' } };
                    return { ...current, [experience.experience_id]: { ...base, translations: nextTranslations } };
                  })} />{t('reviewTranslation')}</label>
                </fieldset>;
              })}
              <fieldset className="le-translation-fieldset" disabled={!experience.translation_columns_available || experienceDescriptionSaving}>
                <legend>{t('programLanguage')}</legend>
                <p>{t('languageFilterHint')}</p>
                <div className="le-language-options">{['ko', 'en', 'ja'].map((language) => <label key={language}>
                  <input type="checkbox" checked={currentExperienceLocalization.availableLanguages.includes(language)} onChange={(event) => setExperienceLocalizations((current) => {
                    const base = current[experience.experience_id] || currentExperienceLocalization;
                    const next = event.target.checked ? [...new Set([...base.availableLanguages, language])] : base.availableLanguages.filter((item) => item !== language);
                    return { ...current, [experience.experience_id]: { ...base, availableLanguages: next } };
                  })} />{language === 'ko' ? t('localeKo') : language === 'en' ? t('localeEn') : t('localeJa')}
                </label>)}</div>
              </fieldset>
            </details>
            <div className="le-experience-description-footer">
              <span id="le-experience-detail-description-count" className="le-field-hint">{currentExperienceDescription.length.toLocaleString('ko-KR')} / 20,000자</span>
              <div className="le-actions">
                <button
                  className="le-button-secondary"
                  type="button"
                  onClick={() => {
                    setExperienceDescriptions((current) => ({ ...current, [experience.experience_id]: experience.detail_description || '' }));
                    setExperienceDescriptionMessage('');
                  }}
                  disabled={!experienceDescriptionChanged || experienceDescriptionSaving}
                >변경 취소</button>
                <button className="le-button-primary" type="submit" disabled={!experienceDescriptionChanged || experienceDescriptionSaving}>
                  {experienceDescriptionSaving ? '저장 중…' : '체험 소개 저장'}
                </button>
              </div>
            </div>
            {experienceDescriptionMessage
              ? <p className={/저장하지 못|바뀌었습니다|20,000자/.test(experienceDescriptionMessage) ? 'le-message le-message-error' : 'le-message'} role="status">{experienceDescriptionMessage}</p>
              : null}
          </form>
        </section>

        <div className="le-content-grid">
          <form id="le-session-editor" className="le-form-card" onSubmit={submit} noValidate>
            <div className="le-card-heading">
              <div><span className="le-overline">02 · SESSION #{session.session_id}</span><h2>운영 회차 정보 수정</h2></div>
              <span className="le-session-id">회차 #{session.session_id}</span>
            </div>
            {session.status === 'CANCELLED' ? <p className="le-session-cancelled-note" role="status">취소된 회차입니다. 신청·운영 기록을 보존하고 새 신청을 받지 않습니다.</p> : null}
            {experienceCancelled && session.status !== 'CANCELLED' ? <p className="le-session-cancelled-note" role="status">체험 운영이 취소되어 더 이상 변경하거나 새 신청을 받을 수 없습니다. 기존 신청 기록은 보존됩니다.</p> : null}

            <div className="le-form-section">
              <div className="le-section-heading"><span className="le-section-number">01</span><div><h3>언제, 어디서 만날까요?</h3><p>참가자가 가장 먼저 확인하는 운영 정보입니다.</p></div></div>
              <div className="le-field-grid">
                <Field label="운영 날짜" htmlFor="le-date" error={errors.date}>
                  <input id="le-date" type="date" value={formValues.date} disabled={cancelled || saving} onChange={(event) => change('date', event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'le-date-error' : undefined} />
                </Field>
                <Field label="시작 시간" htmlFor="le-time" error={errors.date}>
                  <input id="le-time" type="time" value={formValues.time} disabled={cancelled || saving} onChange={(event) => change('time', event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'le-date-error' : undefined} />
                </Field>
                <Field label="종료 시간" htmlFor="le-end-time" error={errors.end_time}>
                  <input id="le-end-time" type="time" value={formValues.end_time} disabled={cancelled || saving} onChange={(event) => change('end_time', event.target.value)} aria-invalid={Boolean(errors.end_time)} aria-describedby={errors.end_time ? 'le-end-time-error' : undefined} />
                </Field>
                <Field label="모집 마감 날짜" htmlFor="le-deadline-date" error={errors.deadline}>
                  <input id="le-deadline-date" type="date" value={formValues.deadline_date} disabled={cancelled || saving} onChange={(event) => change('deadline_date', event.target.value)} aria-invalid={Boolean(errors.deadline)} aria-describedby={errors.deadline ? 'le-deadline-date-error' : undefined} />
                </Field>
                <Field label="모집 마감 시간" htmlFor="le-deadline-time" error={errors.deadline}>
                  <input id="le-deadline-time" type="time" value={formValues.deadline_time} disabled={cancelled || saving} onChange={(event) => change('deadline_time', event.target.value)} aria-invalid={Boolean(errors.deadline)} aria-describedby={errors.deadline ? 'le-deadline-time-error' : undefined} />
                </Field>
              </div>
              <Field label="만남 장소" htmlFor="le-meeting-place" hint="참가자에게 공개해도 되는 장소명만 적어 주세요." error={errors.meeting_place}>
                <input id="le-meeting-place" type="text" maxLength="200" value={formValues.meeting_place} disabled={cancelled || saving} onChange={(event) => change('meeting_place', event.target.value)} placeholder="예: 광장시장 정문 앞" aria-invalid={Boolean(errors.meeting_place)} aria-describedby={errors.meeting_place ? 'le-meeting-place-error' : undefined} />
              </Field>
            </div>

            <div className="le-form-section">
              <div className="le-section-heading"><span className="le-section-number">02</span><div><h3>모집 조건을 정해주세요</h3><p>실제 참가 신청을 받기 전 시연용 회차를 설정합니다.</p></div></div>
              <div className="le-field-grid">
                <Field label="최소 인원" htmlFor="le-min-people" error={errors.min_people}>
                  <div className="le-input-suffix"><input id="le-min-people" type="number" min="1" step="1" value={formValues.min_people} disabled={cancelled || saving} onChange={(event) => change('min_people', event.target.value)} aria-invalid={Boolean(errors.min_people)} aria-describedby={errors.min_people ? 'le-min-people-error' : undefined} /><span>명</span></div>
                </Field>
                <Field label="최대 인원" htmlFor="le-capacity" error={errors.capacity}>
                  <div className="le-input-suffix"><input id="le-capacity" type="number" min="1" step="1" value={formValues.capacity} disabled={cancelled || saving} onChange={(event) => change('capacity', event.target.value)} aria-invalid={Boolean(errors.capacity)} aria-describedby={errors.capacity ? 'le-capacity-error' : undefined} /><span>명</span></div>
                </Field>
              </div>
              <div className="le-field-grid">
                <Field label="1인 시연 회비" htmlFor="le-fee-amount" hint="결제 기능과 연결되지 않은 시연용 금액입니다." error={errors.fee_amount}>
                  <div className="le-input-suffix"><input id="le-fee-amount" type="number" min="0" step="1" value={formValues.fee_amount} disabled={cancelled || saving} onChange={(event) => change('fee_amount', event.target.value)} aria-invalid={Boolean(errors.fee_amount)} aria-describedby={errors.fee_amount ? 'le-fee-amount-error' : undefined} /><span>원</span></div>
                </Field>
                <Field label="모집 상태" htmlFor="le-status" error={errors.status}>
                  <select id="le-status" value={formValues.status} disabled={cancelled || saving} onChange={(event) => change('status', event.target.value)} aria-invalid={Boolean(errors.status)} aria-describedby={errors.status ? 'le-status-error' : undefined}>
                    <option value="DRAFT">준비 중</option>
                    <option value="RECRUITING">모집 중</option>
                    {cancelled ? <option value="CANCELLED">운영 취소</option> : null}
                  </select>
                </Field>
              </div>
            </div>

            <div className="le-form-footer">
              <div className="le-save-state" aria-live="polite">
                <span className={changed ? 'le-state-dot le-state-dot-dirty' : 'le-state-dot'} />
                {changed ? '저장하지 않은 변경사항이 있어요' : '저장된 내용과 같습니다'}
              </div>
              <div className="le-actions">
                <button className="le-button-secondary" type="button" onClick={undo} disabled={!changed || saving || cancelled}>변경 취소</button>
                <button className="le-button-primary" type="submit" disabled={!changed || saving || cancelled}>{saving ? '저장 중…' : changed ? '변경사항 저장' : '저장할 변경사항 없음'}</button>
              </div>
              <div className="le-session-danger-actions">
                {cancelled ? <span>취소된 회차는 수정할 수 없습니다.</span> : null}
              </div>
              {message ? <p className={Object.keys(errors).length > 0 || /실패|수정했습니다|확인/.test(message) ? 'le-message le-message-error' : 'le-message'} role="status">{message}</p> : null}
            </div>
          </form>

          <ExperienceTimelineEditor
            date={formValues.date}
            startTime={formValues.time}
            sessionDuration={durationMinutes}
            steps={steps}
            translationAvailable={Boolean(experience.translation_columns_available)}
            onChange={(next) => { setSteps(next); setStepsMessage(''); }}
            onSave={submitSteps}
            changed={stepsChanged}
            saving={stepsSaving}
            loading={!currentStepsState || currentStepsState.loading}
            loadError={currentStepsState?.error || ''}
            message={stepsMessage}
          />

          <section className="le-traveler-preview" aria-labelledby="le-preview-title">
            <div className="le-card-heading"><div><span className="le-overline">04 · TRAVELER PREVIEW</span><h2 id="le-preview-title">여행자에게 보이는 내용</h2></div>
              <Link to={`/local-eum/experiences/${experience.experience_id}?session=${session.session_id}`} target="_blank" rel="noopener noreferrer">실제 상세 화면 ↗</Link>
            </div>
            <ExperienceDetailContent record={previewRecord} session={previewSession} preview />
            <p className="le-preview-caption">미리보기는 현재 입력값을 보여줍니다. 각 저장 버튼을 누르면 Supabase에서 다시 읽은 내용으로 실제 상세 화면이 바뀝니다.</p>
          </section>
        </div>
      </div>
    </PageTag>
  );
}
