import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./Write.css";
import { places } from "./data/mockPosts.js";
import { getUser, createPost } from "./data/api.js";

const KINDS = [
  { key: "trip", param: "review", label: "여행 리뷰", hint: "다녀온 여행을 후기로 남겨요. 다녀온 장소를 1곳 이상 태그해 주세요." },
  { key: "question", param: "question", label: "질문", hint: "여행 준비 중 궁금한 걸 물어보세요. 관련 장소를 태그하면 더 잘 찾아져요." },
  { key: "talk", param: "talk", label: "소통", hint: "여행 이야기를 자유롭게 나눠요. 장소 태그는 선택이에요." },
];
const MAX_BODY = 1200; // 서버는 4000바이트(한글 약 1,300자)까지만 받아요
const MAX_TAGS = 10;

// 장소 검색 — 지금은 예시 장소표(mockPosts)에서 찾아요. 팀 장소 테이블이 정해지면 이 함수만 서버 검색으로 바꾸면 돼요.
function searchPlaces(q) {
  const k = q.trim().replace(/\s+/g, "");
  if (!k) return [];
  return Object.entries(places)
    .map(([id, p]) => ({ id: Number(id), name: p.name, addr: p.addr }))
    .filter((p) => (p.name + p.addr).replace(/\s+/g, "").includes(k));
}
// 주소 맨 앞 단어로 지역을 정해요 (제주특별자치도 → 제주)
function regionOfAddr(addr) {
  const t = (addr || "").split(" ")[0];
  return t.startsWith("제주") ? "제주" : t.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "");
}

export default function Write() {
  const user = getUser();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const initKind = KINDS.find((k) => k.param === sp.get("type"))?.key ?? "trip";
  const initPlace = Number(sp.get("placeId")) || null;

  const [kind, setKind] = useState(initKind);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState(
    initPlace && places[initPlace] ? [{ id: initPlace, name: places[initPlace].name, addr: places[initPlace].addr }] : []
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!user) {
    return (
      <div className="cmw-root">
        <div className="cmw-wrap">
          <div className="cmw-card" style={{ textAlign: "center", padding: "56px 24px" }}>
            <div className="cmw-h1" style={{ fontSize: "24px", marginBottom: "12px" }}>로그인이 필요해요</div>
            <p style={{ color: "#7A8088", marginBottom: "24px" }}>로그인하면 글을 쓸 수 있어요.</p>
            <Link to="/login" className="cmw-btn cmw-co">로그인하러 가기</Link>
          </div>
        </div>
      </div>
    );
  }

  const cur = KINDS.find((k) => k.key === kind);
  const results = searchPlaces(q).filter((r) => !tags.some((t) => t.id === r.id));
  const regions = [...new Set(tags.map((t) => regionOfAddr(t.addr)).filter(Boolean))];

  function addTag(r) {
    if (tags.length >= MAX_TAGS) return setErr(`장소는 ${MAX_TAGS}곳까지 태그할 수 있어요.`);
    setTags([...tags, r]);
    setQ("");
    setErr("");
  }

  async function submit() {
    setErr("");
    if (!title.trim()) return setErr("제목을 입력해 주세요.");
    if (!body.trim()) return setErr("내용을 입력해 주세요.");
    if (kind === "trip" && tags.length < 1) return setErr("다녀온 장소를 1곳 이상 태그해 주세요.");
    setBusy(true);
    try {
      const r = await createPost({
        userId: user.userId,
        kind,
        title: title.trim(),
        content: body.trim(),
        region: regions[0] || undefined,
        placeIds: tags.map((t) => t.id),
      });
      const to =
        kind === "trip" ? `/community/reviews/${r.id}`
        : kind === "question" ? `/community/questions/${r.id}`
        : `/community/talks/${r.id}`;
      navigate(to);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="cmw-root">
      <div className="cmw-wrap">
        <div className="cmw-crumb"><Link to="/community">커뮤니티</Link> › <b>글쓰기</b></div>
        <h1 className="cmw-h1">글쓰기</h1>
        <div className="cmw-card">
          <div className="cmw-f">
            <div className="cmw-l">글 종류</div>
            <div className="cmw-chips">
              {KINDS.map((k) => (
                <button type="button" key={k.key} className={"cmw-chip" + (kind === k.key ? " cmw-on" : "")} onClick={() => pickKind(k.key)}>
                  {k.label}
                </button>
              ))}
            </div>
            <div className="cmw-hint">{cur.hint}</div>
          </div>

          <div className="cmw-f">
            <div className="cmw-l">제목 <small>{title.length}/100</small></div>
            <input className="cmw-in" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
          </div>

          <div className="cmw-f">
            <div className="cmw-l">장소 태그 <small>{kind === "trip" ? "필수" : "선택"} · {tags.length}/{MAX_TAGS}</small></div>
            {tags.length > 0 && (
              <div className="cmw-chips" style={{ marginBottom: "10px" }}>
                {tags.map((t) => (
                  <span className="cmw-tag" key={t.id}>
                    <b>{t.name}</b><i>{t.addr}</i>
                    <button type="button" aria-label="태그 삭제" onClick={() => setTags(tags.filter((x) => x.id !== t.id))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="cmw-sw">
              <input
                className="cmw-in"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (results[0]) addTag(results[0]); } }}
                placeholder="장소 이름이나 주소를 검색해 태그하세요 (예: 애월, 여수)"
              />
              {q.trim() && (
                <div className="cmw-dd">
                  {results.length === 0 && <div className="cmw-none">검색 결과가 없어요.</div>}
                  {results.map((r) => (
                    <button type="button" className="cmw-opt" key={r.id} onClick={() => addTag(r)}>
                      <b>{r.name}</b><span>{r.addr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="cmw-hint">
              {regions.length > 0 ? `지역은 장소 주소로 자동 분류돼요: ${regions.join(", ")}` : "태그한 장소의 주소로 지역이 자동 분류돼요."}
            </div>
          </div>

          <div className="cmw-f">
            <div className="cmw-l">내용 <small>{body.length}/{MAX_BODY}</small></div>
            <textarea className="cmw-ta" maxLength={MAX_BODY} value={body} onChange={(e) => setBody(e.target.value)} placeholder="내용을 입력하세요" />
          </div>

          <div className="cmw-f">
            <div className="cmw-l">사진 <small>준비 중</small></div>
            <div className="cmw-photo">사진 올리기는 곧 추가될 예정이에요.</div>
          </div>

          {err && <p className="cmw-err">{err}</p>}
          <div className="cmw-bar">
            <button type="button" className="cmw-btn" onClick={() => navigate(-1)}>취소</button>
            <button type="button" className="cmw-btn cmw-co" disabled={busy} onClick={submit}>{busy ? "등록 중…" : "등록"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
