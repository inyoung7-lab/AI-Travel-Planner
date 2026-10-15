import { useLayoutEffect, useRef, useState } from "react";

// 댓글·답변 입력칸 (prefix: 페이지 CSS 접두사 "cmp" 또는 "cmq")
export default function CommentBox({ prefix, placeholder, onSubmit }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const taRef = useRef(null);
  const MAX_H = 200; // 이 높이를 넘으면 스크롤이 생겨요

  // 글이 길어지는 만큼 입력칸이 늘어나요
  useLayoutEffect(() => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, MAX_H) + "px";
    t.style.overflowY = t.scrollHeight > MAX_H ? "auto" : "hidden";
  }, [text]);

  async function submit() {
    if (busy || !text.trim()) return;
    setBusy(true);
    const ok = await onSubmit(text.trim());
    setBusy(false);
    if (ok) setText("");
  }

  return (
    <div className={`${prefix}-card ${prefix}-wbox`} style={{ marginTop: "0", marginBottom: "16px" }}>
      <div
        className={`${prefix}-wph`}
        ref={(el) => {
          if (el) {
            el.style.setProperty("height", "auto", "important");
            el.style.setProperty("min-height", "64px", "important");
            el.style.setProperty("align-items", "center", "important");
          }
        }}
      >
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          style={{
            flex: 1, height: "auto", overflowY: "hidden", border: 0, outline: "none", resize: "none",
            background: "transparent", font: "inherit", color: "var(--ink)", padding: "0",
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
