import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogoutGuard, useUser, refreshAccount } from '../../../lib/auth.js';
import { registerMyHostProfile } from '../sessionRepository.js';

export default function HostProfileRegistration({ userId, onRegistered }) {
  const user = useUser();
  const [displayName, setDisplayName] = useState((user?.name || '').slice(0, 80));
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useLogoutGuard(() => !saving);
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      await registerMyHostProfile(userId, { displayName, bio });
      await refreshAccount();
      onRegistered();
    } catch { setError('호스트 프로필을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  }
  return <main className="le-session-page le-host-center-page"><div className="le-shell le-host-center-shell">
    <div className="le-crumbs"><Link to="/local-eum">로컬 체험</Link><span aria-hidden="true">/</span><strong>호스트 관리</strong></div>
    <section className="le-auth-card" aria-labelledby="host-registration-title">
      <span className="le-eyebrow le-eyebrow-dark">LOCAL EUM · HOST PROFILE</span>
      <h1 id="host-registration-title">나의 호스트 프로필 만들기</h1>
      <p>일반 회원도 호스트 프로필을 만들고 관리할 수 있어요. 이름과 소개를 저장하고 나만의 체험을 준비해 보세요.</p>
      <form className="le-auth-form" onSubmit={submit} aria-busy={saving}>
        <div className="le-field"><label htmlFor="host-register-name">호스트 이름</label><input id="host-register-name" type="text" required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={saving} /><p className="le-field-hint">체험에 표시할 이름을 1~80자로 입력해 주세요.</p></div>
        <div className="le-field"><label htmlFor="host-register-bio">호스트 소개</label><textarea id="host-register-bio" rows={5} maxLength={2000} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="어떤 이야기를 나누고 싶은지 소개해 주세요." disabled={saving} /></div>
        <p className="le-field-hint">저장한 프로필은 바로 수정할 수 있어요. 체험 공개와 운영은 호스트 승인 후 이용할 수 있습니다.</p>
        {error && <p className="le-message le-message-error" role="alert">{error}</p>}
        <button className="le-button-primary le-auth-submit" type="submit" disabled={saving || !displayName.trim()}>{saving ? '프로필 만드는 중…' : '프로필 만들고 시작하기'}</button>
      </form>
    </section>
  </div></main>;
}
