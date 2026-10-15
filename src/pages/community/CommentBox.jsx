import { useState } from "react";

// 댓글·답변 입력칸 (prefix: 페이지 CSS 접두사 "cmp" 또는 "cmq")
export default function CommentBox({ prefix, placeholder, onSubmit }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !text.trim()) return;
    setBusy(true);
    const ok = await onSubmit(text.trim());
    setBusy(false);
    if (ok) setText("");
  }

  return (
    <div className={`${prefix}-card ${prefix}-wbox`} style={{ marginTop: "0", marginBottom: "16px" }}>
      <div className={`${prefix}-wph`}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          style={{
            flex: 1, height: "100%", border: 0, outline: "none", resize: "none",
            background: "transparent", font: "inherit", color: "var(--ink)", padding: "12px 0",
          }}
        />
      </div>
      <div className={`${prefix}-wbt`}>
        <span
          className={`${prefix}-btn ${prefix}-co`}
          onClick={submit}
          style={{ cursor: "pointer", opacity: busy ? 0.6 : 1 }}
        >
          등록
        </span>
      </div>
    </div>
  );
}
