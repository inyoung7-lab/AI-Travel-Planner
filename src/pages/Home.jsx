import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { examplePlaces } from "./data/travelExamples.js";
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
  const [saved, setSaved] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const navigate = useNavigate();
  const showDetail = () => {
    if (!openPlaceDetail(place.id, navigate, detailType)) setDetailMessage("상세페이지 준비 중");
  };

  return (
    <article className="travel-place-card">
      <button className="travel-card-main" type="button" onClick={showDetail} aria-label={`${place.name} 상세페이지 열기`}>
        <span className="travel-card-media">
          {place.image ? <img src={place.image} alt={`${place.name} 풍경`} /> : <span className="travel-photo-placeholder">사진 준비 중</span>}
          {showRank && <span className="travel-card-rank">{String(index + 1).padStart(2, "0")}</span>}
        </span>
        <span className="travel-card-copy">
          <span className="travel-card-region">{place.region}</span>
          <span className="travel-card-title">{place.name}</span>
          <span className="travel-card-description">{place.recommendationReason || place.reason}</span>
          <span className="travel-card-tags">{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</span>
        </span>
      </button>
      {detailMessage && <span className="travel-detail-status" role="status" aria-live="polite">{detailMessage}</span>}
      <button className={`travel-heart${saved ? " is-saved" : ""}`} type="button" aria-label={saved ? "관심 여행지 해제" : "관심 여행지 저장"} aria-pressed={saved} onClick={() => setSaved(!saved)}>{saved ? "♥" : "♡"}</button>
    </article>
  );
}

function TrendChart() {
  const data = [
    { x: 30, y: 61 }, { x: 90, y: 52 }, { x: 150, y: 56 },
    { x: 210, y: 36 }, { x: 270, y: 43 }, { x: 330, y: 25 }, { x: 390, y: 12 },
  ];
  const points = data.map(({ x, y }) => `${x},${y}`).join(" ");
  return (
    <div className="travel-trend" aria-label="예시 데이터 관심도 추이 그래프">
      <div className="travel-trend-heading"><h3>관심도 추이</h3><span className="travel-trend-note">예시 데이터</span></div>
      <svg viewBox="0 0 420 76" role="img" aria-label="실제 통계가 아닌 예시 그래프">
        <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3978b8" stopOpacity=".18"/><stop offset="1" stopColor="#3978b8" stopOpacity="0"/></linearGradient></defs>
        <path d={`M${points} L420,76 L0,76 Z`} fill="url(#trendFill)" />
        <polyline points={points} fill="none" stroke="#3978b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map(({ x, y }) => <circle key={x} cx={x} cy={y} r="3.5" fill="#fff" stroke="#3978b8" strokeWidth="2" />)}
      </svg>
      <div className="travel-trend-labels"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span></div>
    </div>
  );
}

export default function Home() {
  const [recommendationState, setRecommendationState] = useState({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
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
  }, []);

  const recommendation = recommendationState.status === "success" ? recommendationState.data : null;
  const recommendationNote = recommendation?.dataSource === "example"
    ? "화면 확인용 예시 데이터이며 개인화 결과가 아닙니다."
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
        <div className="travel-section-head"><div><h2>요즘 뜨는 여행지</h2><p>화면 확인을 위한 예시 데이터입니다.</p></div><span className="travel-data-badge">예시 데이터</span></div>
        <div className="travel-trending-layout">
          <div className="travel-card-grid">{examplePlaces.slice(0, 3).map((place, index) => <PlaceCard key={place.id} place={place} index={index} showRank detailType="trending" />)}</div>
          <TrendChart />
        </div>
      </section>
      <section className="travel-section travel-personal">
        <div className="travel-section-head"><div><h2>내 취향에 맞는 여행지</h2><p>{recommendationNote}</p></div>{recommendation?.personalized && <span className="travel-data-badge">브라우저 기준</span>}</div>
        {recommendationState.status === "loading" && <p className="travel-search-state" role="status">여행지를 불러오는 중입니다.</p>}
        {recommendationState.status === "error" && <p className="travel-search-error" role="status">{recommendationState.message}</p>}
        {recommendationState.status === "success" && recommendation.items.length === 0 && <p className="travel-no-results">표시할 여행지가 없습니다.</p>}
        {recommendationState.status === "success" && recommendation.items.length > 0 && <div className="travel-personal-grid">{recommendation.items.map((place, index) => <PlaceCard key={`${place.sourceCode || recommendation.dataSource}:${place.sourcePlaceId || place.id}`} place={{ ...place, recommendationReason: place.recommendationReason || (recommendation.personalized ? "일반 목록 · 최근 검색 취향 점수 없음" : "일반 여행지 목록") }} index={index} />)}</div>}
      </section>
    </main>
  );
}

export { SearchBox, PlaceCard };
