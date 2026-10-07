import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const loginData = {
      userId: formData.get("userId"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message);
        return;
      }

      // 로그인 성공
      localStorage.setItem(
        "user",
        JSON.stringify(result.user)
      );

      alert(`${result.user.name}님 환영합니다.`);

      // 홈으로 이동
      navigate("/");

    } catch (error) {
      console.error("로그인 오류:", error);

      alert("서버에 연결할 수 없습니다.");
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
            <p>반가워요! 여행을 계속 이어가볼까요?</p>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="input-group">
              <label>아이디</label>

              <input
                type="text"
                name="userId"
                placeholder="아이디를 입력해주세요"
                required
              />
            </div>

            <div className="input-group">
              <label>비밀번호</label>

              <input
                type="password"
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

            <button
              type="submit"
              className="auth-button"
            >
              로그인
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