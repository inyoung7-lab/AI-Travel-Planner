import { Link } from "react-router-dom";
import "./Header.css";

function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">

        {/* 로고 */}
        <Link to="/" className="site-header-logo">
          여행, 한걸음
        </Link>

        {/* 중앙 메뉴 */}
        <nav className="site-header-nav">
          <Link to="/">여행지 찾기</Link>
          <Link to="/">사진 & 추천</Link>
          <Link to="/">AI 여행 일정</Link>
          <Link to="/">교통·숙소</Link>
          <Link to="/">커뮤니티</Link>
          <Link to="/">나의 여행</Link>
        </nav>

        {/* 오른쪽 */}
        <div className="site-header-actions">

          <button
            type="button"
            className="site-header-heart"
            aria-label="관심 여행"
          >
            ♡
          </button>

          <Link
            to="/login"
            className="site-header-login"
          >
            로그인
          </Link>

          <Link
            to="/signup"
            className="site-header-signup"
          >
            회원가입
          </Link>

        </div>

      </div>
    </header>
  );
}

export default Header;