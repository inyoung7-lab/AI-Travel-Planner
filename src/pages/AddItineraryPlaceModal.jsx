import { useEffect, useRef, useState } from "react";

export default function AddItineraryPlaceModal({ dayLabel, existingIds, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
      requestRef.current?.abort();
    };
  }, [onClose]);

  async function search(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setResults([]);
    setError("");
    setStatus("loading");
    try {
      const response = await fetch(`/api/community/place-search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
      if (!response.ok) throw new Error("여행지를 검색하지 못했어요. 다시 시도해 주세요.");
      const places = await response.json();
      if (!Array.isArray(places)) throw new Error("검색 결과를 불러오지 못했어요.");
      setResults(places);
      setStatus("success");
    } catch (problem) {
      if (problem.name === "AbortError") return;
      setError(problem.message);
      setStatus("error");
    }
  }

  return <div className="ai-plan-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ai-plan-add-modal" role="dialog" aria-modal="true" aria-labelledby="ai-plan-add-title">
      <header className="ai-plan-saved-modal-header">
        <div><p className="ai-plan-kicker">ADD A PLACE · {dayLabel}</p><h2 id="ai-plan-add-title">어떤 여행지를 추가할까요?</h2><span>여행지 이름이나 주소로 검색해 주세요.</span></div>
        <button type="button" className="ai-plan-modal-close" onClick={onClose} aria-label="닫기">×</button>
      </header>
      <form className="ai-plan-place-search" onSubmit={search} role="search">
        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="가고 싶은 여행지를 검색해 보세요" aria-label="추가할 여행지 검색" />
        <button type="submit" disabled={!query.trim() || status === "loading"}>검색</button>
      </form>
      <div className="ai-plan-place-results" aria-live="polite">
        {status === "idle" && <p className="ai-plan-place-state">검색어를 입력하면 여행지를 찾을 수 있어요.</p>}
        {status === "loading" && <p className="ai-plan-place-state">여행지를 찾는 중이에요…</p>}
        {status === "error" && <p className="ai-plan-place-state ai-plan-place-error" role="alert">{error}</p>}
        {status === "success" && (results.length ? <ul>{results.map((place) => {
          const alreadyAdded = existingIds.includes(`db:${place.id}`);
          return <li key={place.id}>
            {place.image && <img className="ai-plan-place-thumbnail" src={place.image} alt="" />}
            <div><strong>{place.name}</strong><span>{place.addr || place.region || "주소 정보 없음"}</span></div>
            <button type="button" disabled={alreadyAdded} onClick={() => onAdd(place)}>{alreadyAdded ? "추가됨" : "추가하기"}</button>
          </li>;
        })}</ul> : <p className="ai-plan-place-state">검색 결과가 없어요. 다른 이름이나 주소로 검색해 보세요.</p>)}
      </div>
    </section>
  </div>;
}
