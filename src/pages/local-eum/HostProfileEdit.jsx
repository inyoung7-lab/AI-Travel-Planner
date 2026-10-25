import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useLogoutGuard } from '../../lib/auth.js';
import { hasHostProfileChanges } from './hostProfileState.js';
import { translate } from './localEumI18n.js';
import { setLocalEumLocale, useLocalEumLocale } from './localEumLocaleStore.js';
import LocalEumLanguageSelector from './components/LocalEumLanguageSelector.jsx';
import HostOperationsWorkspace from './components/HostOperationsWorkspace.jsx';
import HostOperationsDemo from './components/HostOperationsDemo.jsx';
import HostProfileRegistration from './components/HostProfileRegistration.jsx';
import { hostOperationsCopy } from './hostOperationsCopy.js';
import './HostOperations.css';
import {
  getAuthSession,
  getSupabaseSetupMessage,
  isSupabaseConfigured,
  loadHostOperations,
  loadHostProfile,
  saveHostProfile,
  watchAuthSession,
} from './sessionRepository.js';
import './SessionEdit.css';

export default function HostProfileEdit() {
  const [searchParams] = useSearchParams();
  return searchParams.get('demo') === '1' ? <HostOperationsDemo /> : <AuthenticatedHostProfileEdit />;
}

function AuthenticatedHostProfileEdit() {
  const location = useLocation();
  const locale = useLocalEumLocale();
  const t = (key, values) => translate(locale, key, values);
  const opsText = hostOperationsCopy[locale] || hostOperationsCopy.ko;
  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [authError, setAuthError] = useState('');
  const [pageState, setPageState] = useState(null);
  const [operationsState, setOperationsState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [operationsReloadCount, setOperationsReloadCount] = useState(0);
  const [workspaceState, setWorkspaceState] = useState({ dirty: false, busy: false });
  const refreshOperations = useCallback(() => setOperationsReloadCount((value) => value + 1), []);
  const updateExperiences = useCallback((experiences, expectedUserId, expectedHostId) => setOperationsState((state) => state?.userId === expectedUserId && state?.hostId === expectedHostId ? { ...state, experiences } : state), []);

  const userId = authSession?.user?.id;
  const current = pageState?.userId === userId ? pageState : null;
  const loading = Boolean(userId && !current);
  const changed = hasHostProfileChanges(current);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    let active = true;
    const subscription = watchAuthSession((session) => {
      if (!active) return;
      setAuthSession(session);
      setAuthLoading(false);
      setAuthError('');
    });
    getAuthSession()
      .then((session) => { if (active) setAuthSession(session); })
      .catch((error) => { if (active) setAuthError(error.message); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    loadHostProfile(userId)
      .then((host) => {
        if (!active) return;
        setPageState({
          userId,
          host,
          draft: { displayName: host.display_name || '', bio: host.bio || '', translations: host.translations || {} },
          error: '',
        });
      })
      .catch((error) => {
        if (active) setPageState({ userId, host: null, draft: null, error: error.message, errorCode: error.code });
      });
    return () => { active = false; };
  }, [userId, reloadCount]);

  useEffect(() => {
    if (!userId || !current?.host?.host_id || current.host.approval_status !== 'APPROVED') return undefined;
    let active = true;
    const hostId = current.host.host_id;
    loadHostOperations(userId, hostId)
      .then(({ experiences, applications }) => {
        if (active) setOperationsState({ userId, hostId, loading: false, experiences, applications, error: '' });
      })
      .catch((error) => {
        if (active) setOperationsState((state) => ({
          userId, hostId, loading: false,
          experiences: state?.userId === userId && state?.hostId === hostId ? state.experiences : [],
          applications: state?.userId === userId && state?.hostId === hostId ? state.applications : [],
          error: error.message || '운영 데이터를 불러오지 못했습니다.',
        }));
      });
    return () => { active = false; };
  }, [userId, current?.host?.host_id, current?.host?.approval_status, operationsReloadCount]);

  useEffect(() => {
    if (!changed) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed]);

  useLogoutGuard(() => {
    if (workspaceState.busy || saving) return false;
    return !(changed || workspaceState.dirty) || window.confirm(t('signOutUnsavedProfile'));
  });

  function updateDraft(field, value) {
    setPageState((state) => state?.userId === userId
      ? { ...state, draft: { ...state.draft, [field]: value } }
      : state);
    setMessage('');
  }

  function updateTranslation(language, field, value) {
    setPageState((state) => {
      if (state?.userId !== userId) return state;
      const translations = state.draft.translations || {};
      const currentTranslation = translations[language] || {};
      return {
        ...state,
        draft: {
          ...state.draft,
          translations: {
            ...translations,
            [language]: { ...currentTranslation, [field]: value, review_status: 'DRAFT' },
          },
        },
      };
    });
    setMessage('');
  }

  function updateTranslationReview(language, reviewed) {
    setPageState((state) => {
      if (state?.userId !== userId) return state;
      const translations = state.draft.translations || {};
      return {
        ...state,
        draft: {
          ...state.draft,
          translations: {
            ...translations,
            [language]: { ...(translations[language] || {}), review_status: reviewed ? 'REVIEWED' : 'DRAFT' },
          },
        },
      };
    });
    setMessage('');
  }

  function undo() {
    if (!current) return;
    setPageState((state) => state?.userId === userId
      ? { ...state, draft: { displayName: state.host.display_name || '', bio: state.host.bio || '', translations: state.host.translations || {} } }
      : state);
    setMessage('');
  }

  async function submitProfile(event) {
    event.preventDefault();
    if (!current) return;
    setSaving(true);
    setMessage('');
    try {
      const host = await saveHostProfile(userId, current.host, current.draft);
      setPageState((state) => state?.userId === userId
        ? { ...state, host, draft: { displayName: host.display_name || '', bio: host.bio || '', translations: host.translations || {} } }
        : state);
      setMessage(t('hostProfileSaved'));
    } catch (error) {
      setMessage(error.message || '호스트 프로필을 저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="le-session-page le-host-center-page"><div className="le-shell le-host-center-shell">
        <section className="le-auth-card" aria-labelledby="le-config-title">
          <span className="le-eyebrow le-eyebrow-dark">LOCAL EUM · SUPABASE</span>
          <h1 id="le-config-title">Supabase 연결 설정이 필요합니다</h1>
          <p>{getSupabaseSetupMessage()}</p>
          <div className="le-setup-steps">
            <div><span>1</span><p>저장소 루트의 <code>.env.local</code> 파일에서 프로젝트 URL을 확인합니다.</p></div>
            <div><span>2</span><p>Supabase Dashboard의 publishable key를 설정합니다. secret/service-role 키는 브라우저에서 사용하지 않습니다.</p></div>
            <div><span>3</span><p>개발 서버를 다시 시작한 뒤 HOST 계정으로 로그인합니다.</p></div>
          </div>
        </section>
      </div></main>
    );
  }

  if (authLoading) return <main className="le-session-page"><div className="le-loading">Supabase 로그인 상태를 확인하는 중입니다…</div></main>;

  if (!authSession) {
    return <Navigate to="/login?host=1" replace state={{ from: location.pathname + location.search }} />;
  }

  if (loading) return <main className="le-session-page"><div className="le-loading">호스트 프로필을 불러오는 중입니다…</div></main>;

  if (['HOST_REQUIRED', 'HOST_PROFILE_NOT_FOUND'].includes(current?.errorCode)) {
    return <HostProfileRegistration key={userId} userId={userId} onRegistered={() => { setPageState(null); setOperationsState(null); setReloadCount((value) => value + 1); }} />;
  }

  if (current?.error || !current?.host) {
    return (
      <main className="le-session-page le-host-center-page"><div className="le-shell le-host-center-shell">
        <div className="le-loading le-loading-error" role="alert">
          <p>{current?.error || '호스트 프로필을 불러올 수 없습니다.'}</p>
          <button type="button" className="le-button-primary" onClick={() => {
            setPageState(null);
            setOperationsState(null);
            setReloadCount((count) => count + 1);
          }}>다시 불러오기</button>
        </div>
        {authError ? <p className="le-message le-message-error" role="alert">{authError}</p> : null}
      </div></main>
    );
  }

  const { host, draft } = current;
  const operations = host.approval_status !== 'APPROVED'
    ? { userId, hostId: host.host_id, experiences: [], applications: [], error: '' }
    : operationsState?.userId === userId && operationsState?.hostId === host.host_id ? operationsState : null;
  return (
    <main className="le-session-page le-host-center-page"><div className="le-shell le-host-center-shell">
      <div className="le-crumbs"><Link to="/local-eum">로컬이음</Link><span aria-hidden="true">/</span><strong>{opsText.title}</strong></div>
      <div className="le-host-center-topbar"><header className="le-host-center-heading">
        <span className="le-overline">LOCAL EUM · HOST OPERATIONS</span>
        <h1 id="le-profile-page-title">{opsText.title}</h1><p>{opsText.description}</p>
        <Link className="le-host-demo-entry le-host-demo-entry-prominent" to="/local-eum/host/profile?demo=1" target="_blank" rel="noopener noreferrer">{locale === 'en' ? 'Preview public demo ↗' : locale === 'ja' ? '公開デモをプレビュー ↗' : '공개 데모 미리보기 ↗'}</Link>
      </header>
      <div className="le-auth-toolbar">
        <LocalEumLanguageSelector locale={locale} onChange={setLocalEumLocale} className="le-locale-selector-compact" disabled={workspaceState.busy || saving} />
        {host.approval_status !== 'APPROVED' && <span>호스트 승인 대기 중</span>}
      </div></div>
      {host.approval_status === 'PENDING' && <p className="le-message" role="status">프로필을 저장하고 수정할 수 있습니다. 체험 공개와 운영은 호스트 승인 후 이용할 수 있어요.</p>}
      <HostOperationsWorkspace userId={userId} host={host} locale={locale} operations={operations}
        onRefresh={refreshOperations} onExperiencesChanged={updateExperiences} onEditorStateChange={setWorkspaceState}>
      <section className="le-copy-editor le-host-profile-editor" aria-labelledby="le-host-profile-title">
        <div className="le-copy-editor-heading"><div>
          <span className="le-overline">ONE PROFILE · ALL EXPERIENCES</span>
          <h2 id="le-host-profile-title">{t('hostPublicProfile', { host: host.display_name })}</h2>
          <p>{t('hostProfileScope')}</p>
        </div></div>
        <form className="le-host-profile-form" onSubmit={submitProfile}>
          <div className="le-field">
            <label htmlFor="le-host-display-name">{t('travelerHostName')}</label>
            <input id="le-host-display-name" type="text" maxLength={80} required value={draft.displayName} onChange={(event) => updateDraft('displayName', event.target.value)} />
            <p className="le-field-hint">1~80자</p>
          </div>
          <div className="le-field">
            <label htmlFor="le-host-bio">{t('hostIntroduction')}</label>
            <textarea id="le-host-bio" rows={6} maxLength={2000} value={draft.bio} onChange={(event) => updateDraft('bio', event.target.value)} aria-describedby="le-host-bio-count" placeholder={t('hostIntroductionPlaceholder')} />
            <p id="le-host-bio-count" className="le-field-hint">{t('characters', { count: draft.bio.length.toLocaleString(locale) })} / 2,000</p>
          </div>
          <details className="le-translation-editor"><summary>{t('translationEditor')}</summary>
            <div className="le-copy-editor-heading"><div>
              <span className="le-overline">ENGLISH · 日本語</span>
              <h3 id="le-host-translations-title">{t('translationEditor')}</h3>
              <p>{t('translationEditorHelp')}</p>
            </div></div>
            {!host.translation_columns_available ? <p className="le-message le-message-error" role="status">{t('translationSchemaPending')}</p> : null}
            {['en', 'ja'].map((language) => {
              const translation = draft.translations?.[language] || {};
              return (
                <fieldset className="le-translation-fieldset" key={language} disabled={!host.translation_columns_available || saving}>
                  <legend>{language === 'en' ? t('englishBio') : t('japaneseBio')}</legend>
                  <textarea rows={5} maxLength={2000} value={translation.bio || ''}
                    aria-label={language === 'en' ? t('englishBio') : t('japaneseBio')}
                    onChange={(event) => updateTranslation(language, 'bio', event.target.value)} />
                  <label className="le-translation-review">
                    <input type="checkbox" checked={translation.review_status === 'REVIEWED'}
                      onChange={(event) => updateTranslationReview(language, event.target.checked)} />
                    {t('reviewTranslation')}
                  </label>
                </fieldset>
              );
            })}
          </details>
          <div className="le-host-profile-footer">
            <span className="le-field-hint">{t('profileSavedAllExperiences')}</span>
            <div className="le-actions">
              <button className="le-button-secondary" type="button" onClick={undo} disabled={!changed || saving}>{t('cancelChanges')}</button>
              <button className="le-button-primary" type="submit" disabled={!changed || saving || !draft.displayName.trim()}>{saving ? t('saving') : t('saveHostProfile')}</button>
            </div>
          </div>
          {message ? <p className={/저장하지 못|바뀌었습니다|입력해 주세요/.test(message) ? 'le-message le-message-error' : 'le-message'} role="status">{message}</p> : null}
        </form>
      </section>
      </HostOperationsWorkspace>
    </div></main>
  );
}
