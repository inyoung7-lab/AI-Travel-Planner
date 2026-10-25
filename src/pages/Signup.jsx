import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { requireSupabase } from "../lib/supabaseClient.js";
import { SIGNUP_NAME_MAX_LENGTH, SIGNUP_PASSWORD_MIN_LENGTH, signupRequest, signupErrorMessage } from "./signupForm.js";
import "./Signup.css";

export default function Signup() {
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || completion) return;
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    let request;
    try { request = signupRequest(values); }
    catch (problem) { setError(problem.message); return; }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { data, error: authError } = await requireSupabase().auth.signUp(request);
      if (authError) { setError(signupErrorMessage(authError)); return; }
      if (!data.user) { setError("가입 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."); return; }
      // Email-confirmation-enabled projects can mask an existing account with an empty identity list.
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setCompletion({ kind: "check-email", email: request.email });
      } else {
        setCompletion({ kind: data.session ? "signed-in" : "confirm-email", email: request.email });
      }
      form.reset();
    } catch { setError("회원가입 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { submittingRef.current = false; setSubmitting(false); }
  }

  return (
    <main className="signup-page">
      <div className="signup-overlay" />
      <div className="signup-layout">
        <div className="signup-intro">
          <span className="signup-brand">여행, 한걸음</span>
          <h1>새로운 여행을<br />시작해볼까요?</h1>
          <p>회원가입하고 마음에 드는 여행지를 저장하고<br />나만의 여행 일정을 만들어보세요.</p>
        </div>
        <section className="signup-card" aria-labelledby="signup-title">
          <div className="signup-title">
            <h2 id="signup-title">{completion ? "가입 안내" : "회원가입"}</h2>
            <p>이메일 하나로 나의 여행을 이어가세요.</p>
          </div>
          {completion ? (
            <div className="signup-complete" role="status">
              <span className="signup-complete-mark" aria-hidden="true">✓</span>
              <h3>{completion.kind === "signed-in" ? "회원가입이 완료됐어요" : completion.kind === "confirm-email" ? "이메일을 확인해 주세요" : "이메일과 가입 상태를 확인해 주세요"}</h3>
              <p className="signup-complete-email">{completion.email}</p>
              <p>{completion.kind === "signed-in" ? "로그인되었습니다. 여행지를 저장하고 일정을 만들어보세요." : completion.kind === "confirm-email" ? "위 주소로 보낸 인증 메일의 링크를 누르면 가입을 완료할 수 있어요. 메일이 보이지 않으면 스팸함도 확인해 주세요." : "이미 가입한 이메일이라면 로그인해 주세요. 처음 가입했다면 받은 인증 메일을 확인해 주세요."}</p>
              <Link className="signup-complete-action" to={completion.kind === "signed-in" ? "/" : "/login"}>{completion.kind === "signed-in" ? "여행 시작하기" : "로그인 화면으로"}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} aria-busy={submitting}>
              <fieldset className="signup-fields" disabled={submitting}>
                <div className="signup-input-group">
                  <label htmlFor="signup-name">이름 <span>(활동명)</span></label>
                  <input id="signup-name" type="text" name="user_name" maxLength={SIGNUP_NAME_MAX_LENGTH} autoComplete="nickname" placeholder="사용할 이름을 입력해 주세요" aria-describedby="signup-name-help" required />
                  <p className="signup-field-help" id="signup-name-help">리뷰와 댓글에 표시되는 이름이에요. 1~100자로 입력해 주세요.</p>
                </div>
                <div className="signup-input-group">
                  <label htmlFor="signup-email">이메일</label>
                  <input id="signup-email" type="email" name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="example@email.com" aria-describedby="signup-email-help" required />
                  <p className="signup-field-help" id="signup-email-help">로그인과 가입 확인에 사용할 이메일을 입력해 주세요.</p>
                </div>
                <div className="signup-password-row">
                  <div className="signup-input-group">
                    <label htmlFor="signup-password">비밀번호</label>
                    <input id="signup-password" type="password" name="password" autoComplete="new-password" minLength={SIGNUP_PASSWORD_MIN_LENGTH} placeholder="8자 이상 입력" required />
                  </div>
                  <div className="signup-input-group">
                    <label htmlFor="signup-password-confirm">비밀번호 확인</label>
                    <input id="signup-password-confirm" type="password" name="passwordConfirm" autoComplete="new-password" minLength={SIGNUP_PASSWORD_MIN_LENGTH} placeholder="한 번 더 입력" required />
                  </div>
                </div>
                <label className="signup-agreement">
                  <input type="checkbox" name="agreement" value="accepted" required />
                  <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
                </label>
                {error && <p className="signup-error" role="alert">{error}</p>}
                <button type="submit" className="signup-submit">{submitting ? "가입 중…" : "회원가입"}</button>
              </fieldset>
            </form>
          )}
          {!completion && <div className="signup-login-link">이미 계정이 있으신가요?<Link to="/login">로그인</Link></div>}
        </section>
      </div>
    </main>
  );
}
