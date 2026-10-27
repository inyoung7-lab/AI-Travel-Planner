import { useWish } from "../lib/useWish.js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { openPlaceDetail } from "./data/placeNavigation.js";
import "./TravelHome.css";

function SearchBox({ initial = "" }) {
  const [query, setQuery] = useState(initial);
  const navigate = useNavigate();
  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form className="travel-search" onSubmit={submit} role="search">
      <span aria-hidden="true" className="travel-search-icon">⌕</span>
      <input aria-label="여행지 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="어디로 떠나고 싶으세요?" />
      <button type="submit">검색</button>
    </form>
  );
}

function PlaceCard({ place, index, showRank = false, detailType = "team" }) {
  const {saved, busy, toggle} = useWish(place.id);
  const [detailMessage, setDetailMessage] = useState("");
  const navigate = useNavigate();
  const showDetail = () => {
    if (!openPlaceDetail(place.id, navigate, detailType)) setDetailMessage("상세페이지 준비 중");
  };

  return (
    <article className="travel-place-card">
      <button className="travel-card-main" type="button" onClick={showDetail} aria-label={`${place.name} ${detailType === "trending" ? "상세 추이 그래프" : "상세페이지"} 열기`}>
        <span className="travel-card-media">
          {place.image ? <img src={place.image} alt={`${place.name} 풍경`} /> : <span className="travel-photo-placeholder">사진 준비 중</span>}
          {showRank && <span className="travel-card-rank">{String(index + 1).padStart(2, "0")}</span>}
        </span>
        <span className="travel-card-copy">
          <span className="travel-card-region">{place.region}{place.category && ` · ${place.category}`}</span>
          <span className="travel-card-title">{place.name}</span>
          <span className="travel-card-description">{place.recommendationReason || place.reason}</span>
          {place.photoCredit && <span style={{ display: 'block', fontSize: '10px', color: '#7a8797' }}>사진: {place.photoCredit.author} · {place.photoCredit.license} · 크롭 (출처는 상세에서 확인)</span>}
          <span className="travel-card-tags">{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</span>
        </span>
      </button>
      {detailMessage && <span className="travel-detail-status" role="status" aria-live="polite">{detailMessage}</span>}
      <button className={`travel-heart${saved ? " is-saved" : ""}`} type="button" aria-label={saved ? "관심 여행지 해제" : "관심 여행지 저장"} aria-pressed={saved} disabled={busy} onClick={() => toggle().catch(error => setDetailMessage(error.message))}>{saved ? "♥" : "♡"}</button>
    </article>
  );
}

function TrendChart({ days }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.searches, d.views]));
  const points = (key) => days.map((d, i) => `${20 + i * 60},${100 - d[key] / max * 80}`).join(' ');
  return <div className="travel-trend" aria-label="최근 7일 사이트 검색·상세 조회 추이">
    <div className="travel-trend-heading"><h3>검색·조회 추이</h3><span className="travel-trend-note">최근 7일 · 한국 시간</span></div>
    <svg viewBox="0 0 400 130" role="img" aria-label={days.map((d) => `${d.date}: 검색 ${d.searches}건, 조회 ${d.views}건`).join(', ')}>
      <text x="0" y="14" fontSize="10" fill="#7a8797">{max}건</text>
      <line x1="20" y1="100" x2="380" y2="100" stroke="#dce4ee" />
      <polyline points={points('searches')} fill="none" stroke="#557db7" strokeWidth="2.5" />
      <polyline points={points('views')} fill="none" stroke="#d28b76" strokeWidth="2.5" />
      {days.map((d, i) => <g key={d.date}><circle cx={20 + i * 60} cy={100 - d.searches / max * 80} r="3" fill="#557db7" /><circle cx={20 + i * 60} cy={100 - d.views / max * 80} r="3" fill="#d28b76" /><text x={20 + i * 60} y="122" textAnchor="middle" fontSize="10" fill="#7a8797">{d.date.slice(5).replace('-', '/')}</text></g>)}
    </svg>
    <p style={{ fontSize: '12px', color: '#557db7' }}>● 검색 {days.reduce((n, d) => n + d.searches, 0)}건 <span style={{ color: '#d28b76' }}>● 상세 조회 {days.reduce((n, d) => n + d.views, 0)}건</span></p>
    <p style={{ fontSize: '12px', color: '#7a8797', marginTop: '12px' }}>전체 로그인 회원의 검색 요청과 여행지 상세 조회 기록입니다. 같은 회원의 동일 장소 조회는 30분에 한 번 집계합니다. 기록 없는 날은 0입니다.</p>
  </div>;
}

export default function Home() {
  const [recommendationState, setRecommendationState] = useState({ status: "loading" });
  const [hotState, setHotState] = useState({ status: 'loading', items: [], days: [] });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/activity', { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setHotState({ status: 'success', ...data }))
      .catch((error) => { if (error.name !== 'AbortError') setHotState({ status: 'error', items: [], days: [] }); });
    fetch("/api/recommendations", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error?.message || "여행지 목록을 불러오지 못했습니다.");
        setRecommendationState({ status: "success", data: payload });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setRecommendationState({ status: "error", message: error.message });
      });
    return () => controller.abort();
  }, [retry]);

  const recommendation = recommendationState.status === "success" ? recommendationState.data : null;
  const recommendationNote = recommendation?.dataSource === "example"
    ? "화면 확인용 예시 데이터이며 개인화 결과가 아닙니다."
    : recommendation?.mode === 'popular'
      ? '최근 7일 동안 회원들이 많이 조회한 여행지입니다. 기록이 부족한 자리는 기본 여행지로 채웠어요.'
      : recommendation?.mode === 'default'
        ? '여행을 어디서 시작할지 고민된다면, 다양한 지역의 여행지를 둘러보세요.'
    : recommendation?.personalized
      ? "최근 30일 검색 취향을 반영한 목록입니다. 이 브라우저 기준이며 회원 인증과는 무관합니다."
      : recommendation?.personalization?.basis === "browser"
        ? recommendation.personalization.reason === "history_unavailable"
          ? "이 브라우저의 검색 이력을 읽을 수 없어 일반 목록을 표시합니다."
          : recommendation.personalization.reason === "no_history"
            ? "이 브라우저에 최근 검색 이력이 없어 일반 목록을 표시합니다."
            : "최근 검색 이력과 맞는 후보가 없어 일반 목록을 표시합니다."
        : "일반 여행지 목록입니다. 개인 맞춤 결과가 아닙니다.";

  return (
    <main className="travel-home">
      <section className="travel-hero">
        <div className="travel-hero-content">
          <h1>지금, 한국을<br />여행할 시간</h1>
          <SearchBox />
        </div>
      </section>
      <section className="travel-section travel-trending">
        <div className="travel-section-head"><div><h2>요즘 뜨는 여행지</h2><p>전체 로그인 회원의 최근 7일 검색 결과·상세 조회를 합산한 순위입니다.</p></div><span className="travel-data-badge">전체 회원 기준</span></div>
        <div className="travel-trending-layout">
          <div className="travel-card-grid">{hotState.items.map((place, index) => <PlaceCard key={place.key} place={{ ...place, tags: [`검색 결과 ${place.searches}회`, `상세 조회 ${place.views}회`], reason: '이 사이트의 최근 7일 이용 기록을 집계한 순위입니다.' }} index={index} showRank detailType="trending" />)}</div>
          {hotState.status === 'success' && <TrendChart days={hotState.days} />}
        </div>
        {hotState.status === 'loading' && <p role="status">여행지를 불러오는 중입니다.</p>}
        {hotState.status === 'error' && <p role="status">인기 여행지를 불러오지 못했습니다.</p>}
        {hotState.status === 'success' && hotState.items.length === 0 && <p>아직 여행지별 이용 기록이 없습니다. 검색하거나 여행지 상세를 열면 집계됩니다.</p>}
      </section>
      <section className="travel-section travel-personal">
        <div className="travel-section-head"><div><h2>{recommendation?.personalized ? '내 취향에 맞는 여행지' : recommendation?.mode === 'popular' ? '많이 찾는 여행지' : '여행을 시작하기 좋은 곳'}</h2><p>{recommendationState.status === 'loading' ? '추천 여행지를 찾고 있어요.' : recommendationNote}</p></div>{recommendation?.personalized && <span className="travel-data-badge">브라우저 기준</span>}</div>
        {recommendationState.status === "loading" && <p className="travel-search-state" role="status">여행지를 불러오는 중입니다.</p>}
        {recommendationState.status === "error" && <div className="travel-search-error" role="status"><p>{recommendationState.message}</p><button type="button" onClick={() => { setRecommendationState({ status: 'loading' }); setRetry(value => value + 1); }}>다시 불러오기</button></div>}
        {recommendationState.status === "success" && recommendation.items.length === 0 && <p className="travel-no-results">표시할 여행지가 없습니다.</p>}
        {recommendationState.status === "success" && recommendation.items.length > 0 && <div className="travel-personal-grid">{recommendation.items.map((place, index) => <PlaceCard key={`${place.sourceCode || recommendation.dataSource}:${place.sourcePlaceId || place.id}`} place={{ ...place, recommendationReason: place.recommendationReason || (recommendation.personalized ? "일반 목록 · 최근 검색 취향 점수 없음" : "일반 여행지 목록") }} index={index} />)}</div>}
      </section>
    </main>
  );
}

export { SearchBox, PlaceCard };
