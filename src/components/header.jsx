import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, useUser } from "../lib/auth.js";
import "./header.css";

function Header() {
  const user = useUser();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true); setLogoutError("");
    try { if (await logout()) navigate("/", { replace: true }); }
    catch { setLogoutError("로그아웃하지 못했습니다. 다시 시도해 주세요."); }
    finally { setSigningOut(false); }
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">

        {/* 로고 */}
        <Link to="/" className="site-header-logo">
          여행, 한걸음
        </Link>

        {/* 중앙 메뉴 */}
        <nav className="site-header-nav">
          <Link to="/places">여행지 찾기</Link>
          <Link to="/">사진 & 추천</Link>
          <Link to="/ai-itinerary">AI 여행 일정</Link>
          <Link to="/local-eum">로컬 체험</Link>
          <Link to="/community">커뮤니티</Link>
          <Link to="/mytrip">나의 여행</Link>
        </nav>

        {/* 오른쪽 */}
        <div className="site-header-actions">

          {user ? <>
            <span className="site-header-account" title={user.name}>{user.name}님</span>
            <button type="button" className="site-header-login site-header-logout" onClick={handleLogout} disabled={signingOut}>
              {signingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
          </> : <>
            <Link to="/login" className="site-header-login">로그인</Link>
            <Link to="/signup" className="site-header-signup">회원가입</Link>
          </>}
          {logoutError && <p className="site-header-error" role="alert">{logoutError}</p>}

        </div>

      </div>
    </header>
  );
}

export default Header;
