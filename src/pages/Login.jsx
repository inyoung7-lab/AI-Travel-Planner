import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signIn } from "./local-eum/sessionRepository.js";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isHostLogin = searchParams.get("host") === "1";
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(e.target);

    const loginData = {
      userId: formData.get("userId"),
      password: formData.get("password"),
    };

    try {
      await signIn(String(loginData.userId).trim(), loginData.password);
      const destination = location.state?.from;
      navigate(isHostLogin
        ? (typeof destination === "string" && /^\/local-eum\/host\/profile(?:\?|$)/.test(destination) ? destination : "/local-eum/host/profile")
        : (destination === "/ai-itinerary" ? destination : "/"), { replace: true });

    } catch (error) {
      console.error("로그인 오류:", error);

      setErrorMessage(error.message || "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-overlay"></div>

      <div className="login-content">

        <div className="login-intro">
          <span>여행, 한걸음</span>

          <h1>
            다시 떠날<br />
            준비되셨나요?
          </h1>

          <p>
            로그인하고 저장한 여행지와<br />
            나만의 여행 일정을 확인해보세요.
          </p>
        </div>

        <div className="login-card">

          <div className="login-card-title">
            <h2>로그인</h2>
            <p>{isHostLogin ? "호스트 계정으로 로그인하면 프로필 관리로 이동합니다." : "반가워요! 여행을 계속 이어가볼까요?"}</p>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="input-group">
              <label htmlFor="login-user-id">이메일</label>

              <input
                id="login-user-id"
                type="email"
                autoComplete="username"
                name="userId"
                placeholder="이메일을 입력해주세요"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="login-password">비밀번호</label>

              <input
                type="password"
                id="login-password"
                autoComplete="current-password"
                name="password"
                placeholder="비밀번호를 입력해주세요"
                required
              />
            </div>

            <div className="login-options">

              <label className="remember">
                <input type="checkbox" />
                <span>로그인 상태 유지</span>
              </label>

              <a href="#">비밀번호 찾기</a>

            </div>

            {errorMessage && <p role="alert">{errorMessage}</p>}

            <button
              type="submit"
              className="auth-button"
              disabled={submitting}
            >
              {submitting ? "로그인 중…" : "로그인"}
            </button>

          </form>

          <div className="login-signup">
            아직 회원이 아니신가요?

            <Link to="/signup">
              회원가입
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
