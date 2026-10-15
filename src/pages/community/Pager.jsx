// 페이지 번호 — 글 수에 맞춰 필요한 만큼만 보여줘요 (prefix: 페이지 CSS 접두사 "cmh" 또는 "cml")
export default function Pager({ prefix, page, total, size, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = [];
  for (let n = start; n <= Math.min(pages, start + 4); n++) nums.push(n);
  const go = (n) => onChange(Math.min(pages, Math.max(1, n)));
  const cs = { cursor: "pointer" };
  return (
    <div className={`${prefix}-pgn`}>
      <span style={cs} onClick={() => go(page - 1)}>‹</span>
      {nums.map((n) => (
        <span key={n} className={n === page ? `${prefix}-on` : ""} style={cs} onClick={() => go(n)}>{n}</span>
      ))}
      <span style={cs} onClick={() => go(page + 1)}>›</span>
    </div>
  );
}
