import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlaceCard, SearchBox } from "./Home.jsx";
import "./TravelHome.css";

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() || "";
  const [searchState, setSearchState] = useState({ query: "", status: "idle" });

  useEffect(() => {
    if (!query) return undefined;

    const controller = new AbortController();

    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8 }),
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
          {data && <span className="travel-data-badge">{data.dataSource === "example" ? "예시 데이터" : "검색 데이터"}</span>}
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
              조건 일치 {data.matchedCount}곳 · 응답 결과 {data.returnedCount}곳
            </p>
            {data.items.length > 0 ? (
              <div className="travel-results-grid">
                {data.items.map((place, index) => (
                  <div className="travel-result-item" key={`${place.id ?? place.sourcePlaceId ?? place.name}-${index}`}>
                    <PlaceCard place={place} index={index} />
                    <div className="travel-reason"><strong>추천 이유</strong><p>{place.reason}</p></div>
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
          </>
        )}
      </section>
    </main>
  );
}
