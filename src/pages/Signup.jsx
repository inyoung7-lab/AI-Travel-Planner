import { Link } from "react-router-dom";
import "./Signup.css";

function Signup() {
  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const signupData = {
      name: formData.get("name"),
      userId: formData.get("userId"),
      email: formData.get("email"),
      password: formData.get("password"),
      passwordConfirm: formData.get("passwordConfirm"),
    };

    console.log(signupData);

    if (signupData.password !== signupData.passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 나중에 Node.js → Oracle 전송
    /*
    fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: signupData.name,
        userId: signupData.userId,
        email: signupData.email,
        password: signupData.password,
      }),
    });
    */
  };

  return (
    <div className="signup-page">
      <div className="signup-overlay"></div>

      <div className="signup-layout">

        <div className="signup-intro">
          <span className="signup-brand">여행, 한걸음</span>

          <h1>
            새로운 여행을<br />
            시작해볼까요?
          </h1>

          <p>
            회원가입하고 마음에 드는 여행지를 저장하고<br />
            나만의 여행 일정을 만들어보세요.
          </p>
        </div>

        <div className="signup-card">

          <div className="signup-title">
            <h2>회원가입</h2>
            <p>여행, 한걸음에 오신 것을 환영합니다.</p>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="signup-input-group">
              <label>이름</label>
              <input
                type="text"
                name="name"
                placeholder="이름을 입력해주세요"
                required
              />
            </div>

            <div className="signup-input-group">
              <label>아이디</label>

              <div className="signup-id-row">
                <input
                  type="text"
                  name="userId"
                  placeholder="사용할 아이디"
                  required
                />

                <button type="button">
                  중복 확인
                </button>
              </div>
            </div>

            <div className="signup-input-group">
              <label>이메일</label>

              <input
                type="email"
                name="email"
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="signup-password-row">

              <div className="signup-input-group">
                <label>비밀번호</label>

                <input
                  type="password"
                  name="password"
                  placeholder="8자 이상 입력"
                  minLength="8"
                  required
                />
              </div>

              <div className="signup-input-group">
                <label>비밀번호 확인</label>

                <input
                  type="password"
                  name="passwordConfirm"
                  placeholder="비밀번호 확인"
                  minLength="8"
                  required
                />
              </div>

            </div>

            <label className="signup-agreement">
              <input type="checkbox" required />

              <span>
                이용약관 및 개인정보 처리방침에 동의합니다.
              </span>
            </label>

            <button
              type="submit"
              className="signup-submit"
            >
              회원가입
            </button>

          </form>

          <div className="signup-login-link">
            이미 계정이 있으신가요?

            <Link to="/login">
              로그인
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Signup;