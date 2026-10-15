import { Fragment, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./CommunityHome.css";
import { Pin, Thumb, Chat, Check, ImageIcon } from "./Icons.jsx";
import { posts as mockPosts, places, waitingQuestions, hotPlaces as mockHot, GRADIENTS } from "./data/mockPosts.js";
import { loadPostList, loadHot, placeDetailPath } from "./data/api.js";
import Pager from "./Pager.jsx";
import SortMenu from "./SortMenu.jsx";

const CATEGORY = {
  review: { label: "여행 리뷰", cls: "cmh-r" },
  place: { label: "장소 리뷰", cls: "cmh-r" },
  question: { label: "질문", cls: "cmh-q" },
  talk: { label: "소통", cls: "cmh-cm" },
};

// 글 종류에 따라 눌렀을 때 이동할 주소 (소통 글 상세는 아직 없음)
function linkOf(p) {
  if (p.type === "review") return `/community/reviews/${p.id}`;
  if (p.type === "question") return `/community/questions/${p.id}`;
  if (p.type === "talk") return `/community/talks/${p.id}`;
  return null;
}


const HOT_INTERVAL = 3500; // 3.5초마다 다음 순위로 넘어가요

// 예시 표에 없는 여행지는 번호로 보여줘요 (팀 PLACE 테이블이 정해지면 교체)
const placeOf = (id) => places[id] ?? { name: `여행지 ${id}`, bg: GRADIENTS[Number(id) % GRADIENTS.length] };

function HotPlaces({ items }) {
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false); // 마우스를 올려두면 멈춰요
  const [round, setRound] = useState(0); // 멈췄다 다시 시작할 때 진행 막대를 처음부터 채우기 위한 값

  useEffect(() => {
    if (hold) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % items.length), HOT_INTERVAL);
    return () => clearTimeout(t);
  }, [active, hold, round, items.length]);

  const pick = (i) => {
    setActive(i);
    setRound((r) => r + 1);
  };

  const cur = items[active % items.length];
  const curPlace = placeOf(cur.placeId);

  return (
    <div
      className="cmh-hx"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => {
        setHold(false);
        setRound((r) => r + 1);
      }}
    >
      <article className="cmh-hxf" key={cur.placeId} style={{ background: curPlace.bg }}>
        <div className="cmh-hxi">
          <ImageIcon size={44} />
        </div>
        <span className="cmh-hxn">{cur.rank}</span>
        <div className="cmh-hxb">
          <span className="cmh-hxc">{cur.region}</span>
          <div className="cmh-hxt">{curPlace.name}</div>
          <div className="cmh-hxm">이번 달 리뷰 <b>{cur.count}</b></div>
        </div>
        <Link className="cmh-hxbtn" to={placeDetailPath(cur.placeId)}>
          리뷰 보기
        </Link>
      </article>

      <div className="cmh-hxl">
        {items.map((h, i) => {
          const pl = placeOf(h.placeId);
          return (
            <div
              key={h.placeId}
              className={"cmh-hxr" + (i === active ? " cmh-on" : "")}
              role="button"
              tabIndex={0}
              onClick={() => pick(i)}
              onKeyDown={(e) => e.key === "Enter" && pick(i)}
            >
              <span className="cmh-hxk">{h.rank}</span>
              <span className="cmh-hxth" style={{ background: pl.bg }}></span>
              <div className="cmh-hxnm"><b>{pl.name}</b><em>{h.region}</em></div>
              <span className="cmh-hxcn">리뷰 <b>{h.count}</b></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostCard({ p }) {
  const cat = CATEGORY[p.type];
  const to = linkOf(p);
  const Wrap = to ? Link : "article";
  const wrapProps = to
    ? { to, style: { textDecoration: "none", color: "inherit" } }
    : {};
  return (
    <Wrap className={"cmh-bp" + (p.type === "question" ? " cmh-qa" : "")} {...wrapProps}>
      <div className="cmh-bpx">
        <div className="cmh-l1b">
          <span className={"cmh-cat " + cat.cls}><i></i>{cat.label}</span>
          <span className="cmh-lt">{p.title}</span>
          {p.type === "question" &&
            (p.answers > 0 ? (
              <span className="cmh-tag cmh-g"><Check /> 답변 {p.answers}</span>
            ) : (
              <span className="cmh-tag cmh-n">답변 대기</span>
            ))}
        </div>
        <p className="cmh-ex">{p.excerpt}</p>
        {p.type === "question" &&
          (p.topAnswer ? (
            <div className="cmh-bans"><b>{p.topAnswer.label}</b>{p.topAnswer.text}</div>
          ) : (
            <div className="cmh-bans cmh-none">아직 답변이 없어요. 첫 답변을 남겨보세요.</div>
          ))}
        {(p.placeIds || p.region) && (
          <div className="cmh-chips">
            {p.placeIds &&
              p.placeIds.map((id) => (
                <span className="cmh-pchip" key={id}>
                  <Pin /> {places[id]?.name ?? `여행지 ${id}`}
                  {p.placeRatings?.[id] && (
                    <>
                      <span className="cmh-dv"></span>
                      <span className="cmh-rt5">★ {Number(p.placeRatings[id]).toFixed(1)}</span>
                    </>
                  )}
                </span>
              ))}
            {p.region && <span className="cmh-pchip"><Pin /> {p.region}</span>}
          </div>
        )}
        <div className="cmh-ft2">
          <span className="cmh-ct"><Thumb /> {p.likes}</span>
          <span className="cmh-ct"><Chat /> {p.comments}</span>
          <span className="cmh-sp1"></span>
          <span className="cmh-who">{p.author} · {p.time}</span>
        </div>
      </div>
      {p.thumb && (
        <div className="cmh-bth" style={{ background: p.thumb.bg }}>
          <ImageIcon />
          <span className="cmh-pbd">+{p.thumb.more}</span>
        </div>
      )}
    </Wrap>
  );
}

function WaitingStrip({ items }) {
  return (
    <div className="cmh-inl">
      <div className="cmh-inh">
        <b>답변을 기다리는 질문</b>
        <span className="cmh-muted">아직 답변이 없어요</span>
      </div>
      <div className="cmh-inq">
        {items.map((q) =>
          q.id ? (
            <Link className="cmh-iq" key={q.id} to={`/community/questions/${q.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              {q.title} {q.region && <i>{q.region}</i>}
            </Link>
          ) : (
            <span className="cmh-iq" key={q.title}>{q.title} <i>{q.region}</i></span>
          )
        )}
      </div>
    </div>
  );
}


const API = "http://localhost:3000";

const CATS = [
  { key: "all", label: "전체", n: "total" },
  { key: "review", label: "여행 리뷰", n: "review" },
  { key: "question", label: "질문", n: "question" },
  { key: "talk", label: "소통", n: "talk" },
];
// 위에서 아래로: 수도권 → 강원 → 충청 → 호남 → 영남 → 제주 (같은 도끼리, 광역시는 소속 권역 뒤에 붙였어요)
const REGIONS = ["서울", "인천", "경기", "강원", "세종", "대전", "충북", "충남", "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주"];
// 서버가 꺼져 있을 때만 보여주는 예시 숫자
const FALLBACK_COUNTS = {
  total: 1284, review: 862, trip: 318, place: 544, question: 322, talk: 100,
  regions: { 서울: 212, 부산: 168, 제주: 301, 강원: 142, 경기: 96, 전남: 118, 경북: 87, 경남: 64 },
};
const fmt = (v) => (v == null ? "" : Number(v).toLocaleString());

export default function CommunityHome() {
  const [region, setRegion] = useState("전체");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState(null); // null = 불러오는 중
  const [counts, setCounts] = useState(null);
  const [sort, setSort] = useState("latest");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [hot, setHot] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cat, setCat] = useState(["review", "question", "talk"].includes(searchParams.get("type")) ? searchParams.get("type") : "all");
  const author = searchParams.get("author") ?? ""; // 작성자의 글 모아보기
  const authorName = searchParams.get("name") ?? author;

  // 왼쪽 숫자: DB에서 센 개수 (서버가 꺼져 있으면 예시 숫자)
  useEffect(() => {
    fetch(`${API}/api/community/counts`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCounts)
      .catch(() => setCounts(FALLBACK_COUNTS));
  }, []);

  // 글 목록: 카테고리·지역을 바꿀 때마다 DB에서 다시 가져와요 (서버가 꺼져 있으면 예시 글)
  useEffect(() => {
    let alive = true;
    loadPostList({ category: cat, region, sort, q, author, limit: 200 }).then((data) => {
      if (alive) {
        setPosts(data ?? mockPosts);
        setPage(1);
      }
    });
    return () => {
      alive = false;
    };
  }, [cat, region, sort, q, author]);

  // 인기 여행지 · 답변을 기다리는 질문 (서버가 꺼져 있으면 예시)
  useEffect(() => {
    loadHot().then((d) => setHot(d ?? mockHot));
    loadPostList({ category: "question", unanswered: 1, limit: 3, sort: "latest" }).then((d) =>
      setWaiting(d ? d.map((x) => ({ id: x.id, title: x.title, region: x.region })) : waitingQuestions)
    );
  }, []);

  const PAGE_SIZE = 10;
  const all = posts ?? [];
  const list = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const searchNow = () => setQ(qInput.trim());
  const catLabel = CATS.find((c) => c.key === cat).label;

  return (
    <div className="cmh-root">
<div className="cmh-srow"><div className="cmh-srin"><svg style={{ cursor: "pointer" }} onClick={searchNow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchNow()}
            placeholder="여행지, 제목, 내용으로 검색"
            style={{ flex: 1, border: 0, outline: "none", background: "transparent", font: "inherit", color: "#1E3042" }}
          /></div></div><div className="cmh-wrap"><section className="cmh-hot"><div className="cmh-ph2"><div className="cmh-h2">이번 달 가장 많이 리뷰된 여행지</div><span className="cmh-sub">유저들이 직접 다녀와서 리뷰를 남긴 곳 · 순위별로 자동으로 바뀌어요</span></div>{hot && hot.length > 0 && <HotPlaces items={hot} />}</section>
<div className="cmh-board"><aside className="cmh-rail"><div className="cmh-rl"><div className="cmh-rtt">카테고리</div>
{CATS.map((c) => (
  <div key={c.key} className={"cmh-ni" + (c.sub ? " cmh-sub" : "") + (cat === c.key ? " cmh-on" : "")} onClick={() => setCat(c.key)} style={{ cursor: "pointer" }}>
    <span>{c.label}</span>
    <em>{fmt(counts && counts[c.n])}</em>
  </div>
))}
</div><div className="cmh-rl"><div className="cmh-rtt">지역</div>
<div className={"cmh-ri" + (region === "전체" ? " cmh-on" : "")} onClick={() => setRegion("전체")} style={{ cursor: "pointer" }}><i></i><span>전체</span><em>{fmt(counts && counts.total)}</em></div>
{REGIONS.map((r) => (
  <div key={r} className={"cmh-ri" + (region === r ? " cmh-on" : "")} onClick={() => setRegion(r)} style={{ cursor: "pointer" }}><i></i><span>{r}</span><em>{fmt(counts && (counts.regions[r] ?? 0))}</em></div>
))}
</div></aside>
<section className="cmh-feedc"><div className="cmh-fbar"><div className="cmh-fl2"><div className="cmh-fcnt">{catLabel} 글 <b>{all.length}</b></div><SortMenu
            className="cmh-pl3 cmh-sortc"
            value={sort}
            onChange={setSort}
            options={[{ key: "recommend", label: "추천순" }, { key: "latest", label: "최신순" }]}
          /></div><div className="cmh-fr"><Link to="/community/write" className="cmh-btn cmh-co" style={{ textDecoration: "none" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg> 글쓰기</Link></div></div><div className="cmh-bpl">
          {(author || q) && (
            <div className="cmh-inl" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {author && (
                <span>
                  <b>{authorName}</b>님의 {cat === "all" ? "글" : catLabel}만 보는 중{" "}
                  <span style={{ cursor: "pointer", color: "#E8695A" }} onClick={() => setSearchParams({})}>✕ 해제</span>
                </span>
              )}
              {q && (
                <span>
                  "<b>{q}</b>" 검색 결과{" "}
                  <span style={{ cursor: "pointer", color: "#E8695A" }} onClick={() => { setQ(""); setQInput(""); }}>✕ 해제</span>
                </span>
              )}
            </div>
          )}
          {posts && posts.length === 0 && (
            <div className="cmh-inl"><div className="cmh-inh"><b>아직 글이 없어요</b><span className="cmh-muted">다른 카테고리나 지역을 선택해 보세요</span></div></div>
          )}
          {list.map((p, i) => (
            <Fragment key={p.id}>
              <PostCard p={p} />
              {i === 3 && waiting && waiting.length > 0 && <WaitingStrip items={waiting} />}
            </Fragment>
          ))}
        </div>
<Pager prefix="cmh" page={page} total={all.length} size={PAGE_SIZE} onChange={(n) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }} /></section></div></div>
    </div>
  );
}
