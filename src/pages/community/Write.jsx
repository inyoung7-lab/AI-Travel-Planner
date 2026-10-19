import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./Write.css";
import { places } from "./data/mockPosts.js";
import { getUser, createPost, searchLocalPlaces, searchOpenPlaces, savePlace, regionFromAddr } from "./data/api.js";

const KINDS = [
  { key: "trip", param: "review", label: "여행 리뷰", hint: "다녀온 여행을 후기로 남겨요. 여행지를 1곳 이상 태그하고, 여행지마다 별점을 남길 수도 있어요." },
  { key: "question", param: "question", label: "질문", hint: "여행 준비 중 궁금한 걸 물어보세요. 관련 여행지를 태그하면 더 잘 찾아져요." },
  { key: "talk", param: "talk", label: "소통", hint: "여행 이야기를 자유롭게 나눠요. 여행지 태그는 선택이에요." },
];
const MAX_BODY = 1200; // 서버는 4000바이트(한글 약 1,300자)까지만 받아요
const MAX_TAGS = 10;

// 서버가 꺼져 있을 때만 쓰는 예시 장소 검색
function searchMock(q) {
  const k = q.trim().replace(/\s+/g, "");
  return Object.entries(places)
    .map(([id, p]) => ({ id: Number(id), name: p.name, addr: p.addr, region: regionFromAddr(p.addr) }))
    .filter((p) => (p.name + p.addr).replace(/\s+/g, "").includes(k));
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
    initPlace && places[initPlace] ? [{ id: initPlace, name: places[initPlace].name, addr: places[initPlace].addr, region: regionFromAddr(places[initPlace].addr) }] : []
  );
  const [ratings, setRatings] = useState({}); // 장소별 별점 (선택)
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]); // 검색 결과
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Detail pages may link to a place that is in COMM_PLACE but absent from the
  // small client-side example table. Load its actual name before writing.
  useEffect(() => {
    if (!initPlace || places[initPlace]) return;
    const controller = new AbortController();
    fetch(`/api/community/places-by-ids?ids=${initPlace}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((map) => {
        const found = map[initPlace];
        if (found) setTags((current) => current.some((tag) => tag.id === initPlace) ? current : [
          ...current, { id: initPlace, name: found.name, addr: found.addr, region: regionFromAddr(found.addr) },
        ]);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initPlace]);

  // 검색어를 멈추면 0.4초 뒤에 검색해요: 저장된 장소 → 무료 주소 검색
  useEffect(() => {
    const k = q.trim();
    if (!k) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let alive = true;
    const timer = setTimeout(async () => {
      const [local, open] = await Promise.all([searchLocalPlaces(k), searchOpenPlaces(k)]);
      if (!alive) return;
      const base = local ?? searchMock(k);
      const seen = new Set(base.map((x) => x.name + "|" + x.addr));
      const extra = open.filter((x) => !seen.has(x.name + "|" + x.addr));
      setResults([...base, ...extra]);
      setSearching(false);
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

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
  const shown = results.filter((r) => !tags.some((t) => (r.id && t.id === r.id) || (t.extKey && t.extKey === r.extKey)));
  const regions = [...new Set(tags.map((t) => t.region || regionFromAddr(t.addr)).filter(Boolean))];

  function pickKind(k) {
    setKind(k);
    setErr("");
  }

  async function addTag(r) {
    if (tags.length >= MAX_TAGS) return setErr(`여행지는 ${MAX_TAGS}곳까지 태그할 수 있어요.`);
    setErr("");
    try {
      // 검색(무료 주소 API)에서 고른 장소는 DB에 저장하고 번호를 받아요
      const id = r.id ?? (await savePlace(r));
      setTags((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, { ...r, id }]));
      setQ("");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function submit() {
    setErr("");
    if (!title.trim()) return setErr("제목을 입력해 주세요.");
    if (!body.trim()) return setErr("내용을 입력해 주세요.");
    if (kind === "trip" && tags.length < 1) return setErr("다녀온 여행지를 1곳 이상 태그해 주세요.");
    setBusy(true);
    try {
      const r = await createPost({
        userId: user.userId,
        kind,
        title: title.trim(),
        content: body.trim(),
        region: regions[0] || undefined,
        placeIds: tags.map((t) => t.id),
        placeRatings: kind === "trip" ? Object.fromEntries(tags.filter((t) => ratings[t.id]).map((t) => [t.id, ratings[t.id]])) : undefined,
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
            <div className="cmw-l">여행지 태그 <small>{kind === "trip" ? "필수" : "선택"} · {tags.length}/{MAX_TAGS}</small></div>
            {tags.length > 0 && (
              <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
                {tags.map((t) => (
                  <div className="cmw-trow" key={t.id}>
                    <span className="cmw-tag">
                      <b>{t.name}</b><i>{t.addr}</i>
                      <button type="button" aria-label="태그 삭제" onClick={() => setTags(tags.filter((x) => x.id !== t.id))}>×</button>
                    </span>
                    {kind === "trip" && (
                      <span className="cmw-stars" title="별점 (선택) — 같은 별을 한 번 더 누르면 취소돼요">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            className={"cmw-star cmw-sm" + (n <= (ratings[t.id] ?? 0) ? " cmw-on" : "")}
                            onClick={() => setRatings({ ...ratings, [t.id]: ratings[t.id] === n ? 0 : n })}
                            aria-label={`${n}점`}
                          >★</button>
                        ))}
                        <small>{ratings[t.id] ? `${ratings[t.id]}점` : "별점 선택"}</small>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="cmw-sw">
              <input
                className="cmw-in"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (shown[0]) addTag(shown[0]); } }}
                placeholder="여행지 이름이나 주소를 검색해 태그하세요 (예: 성산일출봉, 여수 오동도)"
              />
              {q.trim() && (
                <div className="cmw-dd">
                  {searching && shown.length === 0 && <div className="cmw-none">검색 중…</div>}
                  {!searching && shown.length === 0 && <div className="cmw-none">검색 결과가 없어요. 다른 이름이나 주소로 검색해 보세요.</div>}
                  {shown.map((r) => (
                    <button type="button" className="cmw-opt" key={r.id ?? r.extKey} onClick={() => addTag(r)}>
                      <b>{r.name}</b><span>{r.addr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="cmw-hint">
              {regions.length > 0 ? `지역은 여행지 주소로 자동 분류돼요: ${regions.join(", ")}` : "태그한 여행지의 주소로 지역이 자동 분류돼요."}
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
