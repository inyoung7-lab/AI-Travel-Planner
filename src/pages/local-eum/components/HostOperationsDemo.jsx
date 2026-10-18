import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HostOperationsWorkspace from './HostOperationsWorkspace.jsx';
import LocalEumLanguageSelector from './LocalEumLanguageSelector.jsx';
import { useLocalEumLocale, setLocalEumLocale } from '../localEumLocaleStore.js';
import { demoHosts, getHostOperationsDemo } from '../hostOperationsDemo.js';

const demoCopy = {
  ko: { title: '호스트 운영센터 데모', intro: '심사위원·팀원을 위한 공개 미리보기', banner: '가상 데이터 · 읽기 전용', help: '호스트 역할을 둘러보는 데모입니다. 실제 프로그램 관리와 AI 실행에는 HOST 로그인이 필요합니다.', login: 'HOST 로그인 · 실제 관리', persona: '데모 호스트 선택', profile: '호스트 프로필', readonly: '시연용 프로필입니다. 실제 호스트 정보와 신청자 데이터는 변경되지 않습니다.', share: '데모 링크 복사', copied: '데모 링크를 복사했습니다.', local: '현재 주소는 이 PC에서만 열립니다. 외부 공유에는 팀 배포 주소가 필요합니다.', failed: '주소창의 링크를 복사해 주세요.' },
  en: { title: 'Host Operations Demo', intro: 'Public preview for reviewers and teammates', banner: 'Synthetic data · Read only', help: 'Explore the HOST role. Real management and AI requests require HOST sign-in.', login: 'HOST sign-in · Live management', persona: 'Demo host', profile: 'Host profile', readonly: 'Sample profile only. Real host and applicant records are unchanged.', share: 'Copy demo link', copied: 'Demo link copied.', local: 'This address is available on this computer only. Use the team deployment URL to share externally.', failed: 'Copy the link from the address bar.' },
  ja: { title: 'ホスト運営センターデモ', intro: '審査員・チーム向け公開プレビュー', banner: '架空データ・閲覧専用', help: 'HOSTの役割を体験するデモです。実際の管理とAI実行にはHOSTログインが必要です。', login: 'HOSTログイン・実際の管理', persona: 'デモホストを選択', profile: 'ホストプロフィール', readonly: 'デモプロフィールです。実際のホスト・申請者データは変更されません。', share: 'デモリンクをコピー', copied: 'コピーしました。', local: 'このアドレスはこのPCのみで利用できます。外部共有にはチームの公開URLが必要です。', failed: 'アドレスバーのリンクをコピーしてください。' },
};
const noop = () => {};

export default function HostOperationsDemo() {
  const locale = useLocalEumLocale();
  const text = demoCopy[locale] || demoCopy.ko;
  const [hostId, setHostId] = useState(demoHosts[0].host_id);
  const [message, setMessage] = useState('');
  const operations = useMemo(() => getHostOperationsDemo(hostId), [hostId]);
  async function share() {
    try {
      await navigator.clipboard.writeText(new URL('/local-eum/host/profile?demo=1', window.location.origin).href);
      setMessage(['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) ? text.local : text.copied);
    } catch { setMessage(text.failed); }
  }
  return <main className="le-session-page le-host-center-page le-host-demo-page"><div className="le-shell le-host-center-shell">
    <div className="le-host-center-topbar"><header className="le-host-center-heading"><span className="le-overline">LOCAL EUM · PUBLIC DEMO</span><h1>{text.title}</h1><p>{text.intro}</p></header><LocalEumLanguageSelector className="le-locale-selector-compact" locale={locale} onChange={setLocalEumLocale} /></div>
    <section className="le-host-demo-banner" aria-label={text.banner}><div><strong>{text.banner}</strong><p>{text.help}</p></div><Link to="/local-eum/host/profile">{text.login}</Link></section>
    <div className="le-host-demo-toolbar"><label>{text.persona}<select value={hostId} onChange={(event) => setHostId(event.target.value)}>{demoHosts.map((host) => <option key={host.host_id} value={host.host_id}>{host.display_name}</option>)}</select></label><button type="button" onClick={share}>{text.share}</button><span role="status">{message}</span></div>
    <HostOperationsWorkspace key={hostId} userId="public-demo" host={operations.host} locale={locale} operations={operations} onRefresh={noop} onExperiencesChanged={noop} onEditorStateChange={noop} demo>
      <section className="le-host-demo-panel"><h3>{text.profile}</h3><p className="le-host-demo-note">{text.readonly}</p><h4>{operations.host.display_name}</h4><p className="le-host-demo-bio">{operations.host.bio}</p></section>
    </HostOperationsWorkspace>
  </div></main>;
}
