import { authFetch } from "../lib/auth.js";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlaceCard, SearchBox } from "./Home.jsx";
import "./TravelHome.css";

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() || "";
  const [searchState, setSearchState] = useState({ query: "", status: "idle" });
  const searchRequest = useRef(null);

  useEffect(() => {
    if (!query) return undefined;

    const controller = new AbortController();
    if (searchRequest.current?.query !== query) searchRequest.current = { query, id: crypto.randomUUID() };

    authFetch("/api/search", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8, requestId: searchRequest.current.id }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error?.message || "검색 요청을 처리하지 못했습니다.");
        }
        setSearchState({ query, status: "success", data: payload });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setSearchState({ query, status: "error", message: error.message });
      });

    return () => controller.abort();
  }, [query]);

  const currentSearchState = searchState.query === query
    ? searchState
    : { status: query ? "loading" : "idle" };
  const data = currentSearchState.status === "success" ? currentSearchState.data : null;
  const conditions = data?.filters;
  const activeConditions = conditions ? [
    ...conditions.regions.map((value) => `지역: ${value}`),
    ...conditions.types.map((value) => `유형: ${value}`),
    ...conditions.themes.map((value) => `테마: ${value}`),
    ...conditions.keywords.map((value) => `키워드: ${value}`),
  ] : [];

  return (
    <main className="travel-home travel-results-page">
      <section className="travel-results-intro">
        <Link className="travel-back-link" to="/">← 메인으로</Link>
        <h1>여행지 검색</h1>
        <p>입력한 지역·유형·테마 조건에 맞는 여행지를 찾습니다.</p>
        <SearchBox key={query} initial={query} />
      </section>

      <section className="travel-results-section" aria-live="polite">
        <div className="travel-section-head">
          <div>
            <h2>“{query || "여행지"}” 검색 결과</h2>
            {activeConditions.length > 0 && <p className="travel-search-conditions">{activeConditions.join(" · ")}</p>}
          </div>
          {data && <span className="travel-data-badge">{data.dataSource === "example" ? "예시 데이터" : data.dataSource === "tourapi" ? "한국관광공사 TourAPI" : data.dataSource === 'supabase-tourapi' ? '한국관광공사 저장 데이터' : "검색 데이터"}</span>}
        </div>

        {currentSearchState.status === "loading" && (
          <div className="travel-search-state" role="status">검색 중입니다…</div>
        )}

        {currentSearchState.status === "error" && (
          <div className="travel-no-results travel-search-error" role="alert">
            <strong>검색할 수 없습니다</strong>
            <p>{currentSearchState.message}</p>
          </div>
        )}

        {currentSearchState.status === "idle" && (
          <div className="travel-no-results" role="status">
            <strong>검색어를 입력해 주세요</strong>
            <p>지역, 장소 유형, 테마를 입력해 검색할 수 있습니다.</p>
          </div>
        )}

        {data && (
          <>
            <p className="travel-result-count">
              {data.matchCountComplete === false ? "조회 범위 내 조건 일치" : "조건 일치"} {data.matchedCount}곳 · 응답 결과 {data.returnedCount}곳
            </p>
            <p className="travel-search-state">
              {data.personalization?.applied
                ? "최근 30일 검색 취향을 반영했습니다. 이 브라우저 기준이며 회원 인증과는 무관합니다."
                : data.personalization?.basis === "browser"
                  ? data.personalization.reason === "history_unavailable"
                    ? "이 브라우저의 검색 이력을 읽을 수 없어 일반 순서로 표시합니다."
                    : data.personalization.reason === "no_history"
                      ? "이 브라우저에 최근 검색 이력이 없어 일반 순서로 표시합니다."
                      : "최근 검색 이력과 맞는 후보가 없어 일반 순서로 표시합니다."
                  : "개인화되지 않은 일반 검색 결과입니다."}
            </p>            {data.items.length > 0 ? (
              <div className="travel-results-grid">
                {data.items.map((place, index) => (
                  <div className="travel-result-item" key={`${place.id ?? place.sourcePlaceId ?? place.name}-${index}`}>
                    <PlaceCard place={place} index={index} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="travel-no-results" role="status">
                <strong>조건에 맞는 여행지가 없습니다</strong>
                <p>현재 연결된 데이터에서 모든 검색 조건을 만족하는 장소가 없습니다.</p>
              </div>
            )}
            {data.dataSource === "example" && (
              <p className="travel-disclaimer">화면 확인용 예시 데이터입니다. 실제 관광 데이터가 아닙니다.</p>
            )}
            {data.dataSource === "tourapi" && (
              <p className="travel-disclaimer">한국관광공사 TourAPI 원천 데이터를 검색했습니다. 조회 페이지가 제한된 경우 표시한 일치 건수는 전체 건수가 아닙니다. 사진이 없는 항목은 원천 사진이 제공되지 않은 경우입니다.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
