import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hasHostProfileChanges } from './hostProfileState.js';
import {
  getAuthSession,
  getSupabaseSetupMessage,
  isSupabaseConfigured,
  loadHostProfile,
  saveHostProfile,
  signIn,
  signOut,
  watchAuthSession,
} from './sessionRepository.js';
import './SessionEdit.css';

export default function HostProfileEdit() {
  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [pageState, setPageState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
          draft: { displayName: host.display_name || '', bio: host.bio || '' },
          error: '',
        });
      })
      .catch((error) => {
        if (active) setPageState({ userId, host: null, draft: null, error: error.message });
      });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!changed) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed]);

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
    if (changed && !window.confirm('저장하지 않은 호스트 프로필 변경사항이 있습니다. 로그아웃할까요?')) return;
    setAuthError('');
    try {
      await signOut();
      setPageState(null);
      setMessage('로그아웃했습니다.');
    } catch (error) {
      setAuthError(error.message);
    }
  }

  function updateDraft(field, value) {
    setPageState((state) => state?.userId === userId
      ? { ...state, draft: { ...state.draft, [field]: value } }
      : state);
    setMessage('');
  }

  function undo() {
    if (!current) return;
    setPageState((state) => state?.userId === userId
      ? { ...state, draft: { displayName: state.host.display_name || '', bio: state.host.bio || '' } }
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
        ? { ...state, host, draft: { displayName: host.display_name || '', bio: host.bio || '' } }
        : state);
      setMessage('호스트 프로필을 저장했습니다. 이 호스트가 운영하는 모든 체험에 공통 반영됩니다.');
    } catch (error) {
      setMessage(error.message || '호스트 프로필을 저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="le-session-page"><div className="le-shell">
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

  if (authError && !authSession) {
    return <main className="le-session-page"><div className="le-shell"><div className="le-loading le-loading-error" role="alert">{authError}</div></div></main>;
  }

  if (!authSession) {
    return (
      <main className="le-session-page"><div className="le-shell">
        <div className="le-crumbs"><Link to="/local-eum">로컬이음</Link><span aria-hidden="true">/</span><strong>호스트 프로필</strong></div>
        <section className="le-auth-card" aria-labelledby="le-login-title">
          <span className="le-eyebrow le-eyebrow-dark">LOCAL EUM · HOST PROFILE</span>
          <h1 id="le-login-title">호스트 계정으로 로그인해 주세요</h1>
          <p>호스트 프로필은 프로그램별 정보와 분리되어, 한 번 수정하면 이 호스트의 모든 체험에 공통으로 표시됩니다.</p>
          <form className="le-auth-form" onSubmit={submitSignIn}>
            <div className="le-field"><label htmlFor="le-profile-login-email">이메일</label><input id="le-profile-login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="le-field"><label htmlFor="le-profile-login-password">비밀번호</label><input id="le-profile-login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            {authError ? <p className="le-message le-message-error" role="alert">{authError}</p> : null}
            <button className="le-button-primary le-auth-submit" type="submit" disabled={signingIn}>{signingIn ? '로그인 중…' : 'HOST 계정 로그인'}</button>
          </form>
        </section>
      </div></main>
    );
  }

  if (loading) return <main className="le-session-page"><div className="le-loading">호스트 프로필을 불러오는 중입니다…</div></main>;

  if (current?.error || !current?.host) {
    return (
      <main className="le-session-page"><div className="le-shell">
        <div className="le-auth-toolbar"><span>{authSession.user.email} · HOST 로그인</span><button type="button" onClick={handleSignOut}>로그아웃</button></div>
        <div className="le-loading le-loading-error" role="alert">{current?.error || '호스트 프로필을 불러올 수 없습니다.'}</div>
        {authError ? <p className="le-message le-message-error" role="alert">{authError}</p> : null}
      </div></main>
    );
  }

  const { host, draft } = current;
  return (
    <main className="le-session-page"><div className="le-shell">
      <div className="le-crumbs"><Link to="/local-eum">로컬이음</Link><span aria-hidden="true">/</span><strong>호스트 프로필</strong></div>
      <section className="le-hero le-hero-compact" aria-labelledby="le-profile-page-title">
        <div className="le-hero-content">
          <span className="le-eyebrow">LOCAL EUM · HOST PROFILE</span>
          <h1 id="le-profile-page-title">호스트 프로필을 관리해요</h1>
          <p>프로그램마다 반복해서 입력할 필요 없이, 이 프로필 하나가 연결된 모든 체험에 표시됩니다.</p>
        </div>
        <div className="le-hero-art" aria-hidden="true"><span /><span /><span /></div>
      </section>
      <div className="le-auth-toolbar">
        <span>{authSession.user.email} · HOST 로그인{host.approval_status !== 'APPROVED' ? ' · 승인 대기 중' : ''}</span>
        <button type="button" onClick={handleSignOut}>로그아웃</button>
      </div>
      <section className="le-copy-editor le-host-profile-editor" aria-labelledby="le-host-profile-title">
        <div className="le-copy-editor-heading"><div>
          <span className="le-overline">ONE PROFILE · ALL EXPERIENCES</span>
          <h2 id="le-host-profile-title">{host.display_name}의 공개 프로필</h2>
          <p>호스트 이름과 소개는 프로그램과 별도로 이 호스트 계정에 저장됩니다. 체험별 소개는 각 체험 편집 화면에서 따로 관리합니다.</p>
        </div></div>
        <form className="le-host-profile-form" onSubmit={submitProfile}>
          <div className="le-field">
            <label htmlFor="le-host-display-name">여행자에게 보일 호스트 이름</label>
            <input id="le-host-display-name" type="text" maxLength={80} required value={draft.displayName} onChange={(event) => updateDraft('displayName', event.target.value)} />
            <p className="le-field-hint">1~80자</p>
          </div>
          <div className="le-field">
            <label htmlFor="le-host-bio">호스트 소개</label>
            <textarea id="le-host-bio" rows={6} maxLength={2000} value={draft.bio} onChange={(event) => updateDraft('bio', event.target.value)} aria-describedby="le-host-bio-count" placeholder="지역과 체험을 운영하는 호스트를 여행자에게 소개해 주세요." />
            <p id="le-host-bio-count" className="le-field-hint">{draft.bio.length.toLocaleString('ko-KR')} / 2,000자</p>
          </div>
          <div className="le-host-profile-footer">
            <span className="le-field-hint">저장하면 이 호스트와 연결된 모든 공개 체험에 반영됩니다.</span>
            <div className="le-actions">
              <button className="le-button-secondary" type="button" onClick={undo} disabled={!changed || saving}>변경 취소</button>
              <button className="le-button-primary" type="submit" disabled={!changed || saving || !draft.displayName.trim()}>{saving ? '저장 중…' : '호스트 프로필 저장'}</button>
            </div>
          </div>
          {message ? <p className={/저장하지 못|바뀌었습니다|입력해 주세요/.test(message) ? 'le-message le-message-error' : 'le-message'} role="status">{message}</p> : null}
        </form>
      </section>
      <div className="le-picker-shortcuts"><Link to="/local-eum">로컬이음 체험 목록으로 돌아가기</Link></div>
    </div></main>
  );
}
