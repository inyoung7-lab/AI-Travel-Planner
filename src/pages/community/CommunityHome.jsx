import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CommunityHome.css";
import { Pin, Thumb, Chat, Check, ImageIcon } from "./Icons.jsx";
import { posts as mockPosts, places, waitingQuestions, hotPlaces } from "./data/mockPosts.js";

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
  if (p.type === "place" && p.placeIds) return `/community/places/${p.placeIds[0]}/reviews`;
  return null;
}


const HOT_INTERVAL = 3500; // 3.5초마다 다음 순위로 넘어가요

function HotPlaces() {
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false); // 마우스를 올려두면 멈춰요
  const [round, setRound] = useState(0); // 멈췄다 다시 시작할 때 진행 막대를 처음부터 채우기 위한 값

  useEffect(() => {
    if (hold) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % hotPlaces.length), HOT_INTERVAL);
    return () => clearTimeout(t);
  }, [active, hold, round]);

  const pick = (i) => {
    setActive(i);
    setRound((r) => r + 1);
  };

  const cur = hotPlaces[active];
  const curPlace = places[cur.placeId];

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
        <Link className="cmh-hxbtn" to={`/community/places/${cur.placeId}/reviews`}>
          리뷰 보기
        </Link>
      </article>

      <div className="cmh-hxl">
        {hotPlaces.map((h, i) => {
          const pl = places[h.placeId];
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
                  {p.type === "place" && p.rating && (
                    <>
                      <span className="cmh-dv"></span>
                      <span className="cmh-rt5">★ {p.rating.toFixed(1)}</span>
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

function WaitingStrip() {
  return (
    <div className="cmh-inl">
      <div className="cmh-inh">
        <b>답변을 기다리는 질문</b>
        <span className="cmh-muted">아직 답변이 없어요</span>
      </div>
      <div className="cmh-inq">
        {waitingQuestions.map((q) => (
          <span className="cmh-iq" key={q.title}>{q.title} <i>{q.region}</i></span>
        ))}
      </div>
    </div>
  );
}


const API = "http://localhost:3000";

export default function CommunityHome() {
  // DB에서 글을 가져와요. 서버가 꺼져 있거나 글이 없으면 예시 글을 보여줘요.
  const [posts, setPosts] = useState(mockPosts);
  useEffect(() => {
    fetch(`${API}/api/community/posts`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPosts(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="cmh-root">
<div className="cmh-srow"><div className="cmh-srin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><span>여행지·리뷰·질문 검색</span></div></div><div className="cmh-wrap"><section className="cmh-hot"><div className="cmh-ph2"><div className="cmh-h2">이번 달 가장 많이 리뷰된 여행지</div><span className="cmh-sub">유저들이 직접 다녀와서 리뷰를 남긴 곳 · 순위별로 자동으로 바뀌어요</span></div><HotPlaces /></section>
<div className="cmh-board"><aside className="cmh-rail"><div className="cmh-rl"><div className="cmh-rtt">카테고리</div><div className="cmh-ni cmh-on"><span>전체</span><em>1,284</em></div><div className="cmh-ni cmh-open"><span>리뷰</span><em>862 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg></em></div><div className="cmh-ni cmh-sub"><span>여행 리뷰</span><em>318</em></div><div className="cmh-ni cmh-sub"><span>장소 리뷰</span><em>544</em></div><div className="cmh-ni"><span>질문</span><em>322</em></div><div className="cmh-ni"><span>소통</span><em>100</em></div></div><div className="cmh-rl"><div className="cmh-rtt">지역</div><div className="cmh-ri cmh-on"><i></i><span>전체</span><em>1,284</em></div><div className="cmh-ri"><i></i><span>서울</span><em>212</em></div><div className="cmh-ri"><i></i><span>부산</span><em>168</em></div><div className="cmh-ri"><i></i><span>제주</span><em>301</em></div><div className="cmh-ri"><i></i><span>강원</span><em>142</em></div><div className="cmh-ri"><i></i><span>경기</span><em>96</em></div><div className="cmh-ri"><i></i><span>전남</span><em>118</em></div><div className="cmh-ri"><i></i><span>경북</span><em>87</em></div><div className="cmh-ri"><i></i><span>경남</span><em>64</em></div><div className="cmh-more2">더보기 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></div></div></aside>
<section className="cmh-feedc"><div className="cmh-fbar"><div className="cmh-fl2"><div className="cmh-fcnt">전체 글 <b>1,284</b></div><span className="cmh-pl3 cmh-sortc">추천순 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></span></div><div className="cmh-fr"><span className="cmh-btn cmh-co"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg> 글쓰기</span></div></div><div className="cmh-bpl">
          {posts.map((p, i) => (
            <Fragment key={p.id}>
              <PostCard p={p} />
              {i === 3 && <WaitingStrip />}
            </Fragment>
          ))}
        </div>
<div className="cmh-pgn"><span>‹</span><span className="cmh-on">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>›</span></div></section></div></div>
    </div>
  );
}
