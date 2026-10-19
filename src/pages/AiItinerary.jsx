import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./AiItinerary.css";

const REGIONS = ["서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종", "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주"];
const STYLES = ["자연·힐링", "맛집", "액티비티", "문화·역사", "사진 명소", "여유로운", "알찬 일정"];
const dateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const afterTomorrow = new Date(tomorrow);
afterTomorrow.setDate(afterTomorrow.getDate() + 2);
const EXAMPLE = {
  title: "제주 바다를 따라 걷는 여행", summary: "바다와 마을 풍경을 천천히 만나는 제주 일정 예시입니다.", tips: ["실제 운영 시간과 이동 시간을 출발 전에 확인해 주세요."],
  days: [
    { day: 1, theme: "서쪽 바다 산책", items: [
      { id: "preview-1", name: "협재해변", type: "관광지", time: "10:00", address: "제주시 한림읍", reason: "맑은 바다를 보며 여행을 시작해요.", image: "/images/place-preview/hyeopjae-beach.png" },
      { id: "preview-2", name: "한담해변", type: "관광지", time: "14:00", address: "제주시 애월읍", reason: "해안 산책로에서 여유로운 오후를 보내요.", image: null },
      { id: "preview-3", name: "애월 해안", type: "관광지", time: "17:00", address: "제주시 애월읍", reason: "노을을 바라보며 하루를 마무리해요.", image: null },
    ] },
    { day: 2, theme: "동쪽의 풍경", items: [
      { id: "preview-4", name: "성산일출봉", type: "관광지", time: "09:00", address: "서귀포시 성산읍", reason: "제주 동쪽의 풍경을 만나요.", image: null },
      { id: "preview-5", name: "섭지코지", type: "관광지", time: "13:00", address: "서귀포시 성산읍", reason: "바다를 따라 가볍게 걸어요.", image: null },
    ] },
    { day: 3, theme: "느긋한 마무리", items: [
      { id: "preview-6", name: "오설록 티 뮤지엄", type: "관광지", time: "10:00", address: "서귀포시 안덕면", reason: "차 한 잔과 함께 여행을 정리해요.", image: null },
      { id: "preview-7", name: "협재해변", type: "관광지", time: "15:00", address: "제주시 한림읍", reason: "다시 바다를 보며 마무리해요.", image: null },
    ] },
  ],
};

function dayLabel(date, index) {
  if (!date) return `${index + 1}일차`;
  const value = new Date(`${date}T00:00:00`);
  return `${index + 1}일차 · ${value.getMonth() + 1}월 ${value.getDate()}일`;
}

function RouteSketch({ items }) {
  const mapRef = useRef(null);
  const [size, setSize] = useState({ width: 320, height: 220 });
  useEffect(() => {
    const node = mapRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const coords = items.map((item, index) => ({
    ...item, lat: Number(item.lat), lng: Number(item.lng), order: index + 1,
    hasCoords: item.lat !== null && item.lat !== undefined && item.lat !== "" && item.lng !== null && item.lng !== undefined && item.lng !== "",
  })).filter((item) => item.hasCoords && Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180);
  const map = (() => {
    if (!coords.length) return null;
    const project = (lat, lng, zoom) => {
      const scale = 256 * (2 ** zoom);
      const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
      const sin = Math.sin(safeLat * Math.PI / 180);
      return { x: (lng + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
    };
    const worldPoints = coords.map((item) => project(item.lat, item.lng, 0));
    const xs = worldPoints.map((point) => point.x), ys = worldPoints.map((point) => point.y);
    const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
    const availableWidth = Math.max(80, size.width - 64), availableHeight = Math.max(80, size.height - 64);
    const fitZoom = Math.floor(Math.min(
      spanX ? Math.log2(availableWidth / spanX) : 16,
      spanY ? Math.log2(availableHeight / spanY) : 16,
    ));
    const zoom = Math.max(5, Math.min(16, fitZoom));
    const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2 * 256 * (2 ** zoom), y: (Math.min(...ys) + Math.max(...ys)) / 2 * 256 * (2 ** zoom) };
    const left = center.x - size.width / 2, top = center.y - size.height / 2;
    const points = coords.map((item) => {
      const point = project(item.lat, item.lng, zoom);
      return { ...item, x: point.x - left, y: point.y - top };
    });
    const tileCount = 2 ** zoom;
    const tiles = [];
    for (let x = Math.floor(left / 256); x <= Math.floor((left + size.width) / 256); x += 1) {
      for (let y = Math.floor(top / 256); y <= Math.floor((top + size.height) / 256); y += 1) {
        if (y < 0 || y >= tileCount) continue;
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        tiles.push({ key: `${zoom}/${wrappedX}/${y}`, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`, left: x * 256 - left, top: y * 256 - top });
      }
    }
    return { points, tiles, width: size.width, height: size.height };
  })();

  return <div className="ai-route-map" ref={mapRef} aria-label="추천 장소의 실제 위치 지도">
    {map ? <>
      <div className="ai-route-map-tiles" aria-hidden="true">{map.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" draggable="false" style={{ left: tile.left, top: tile.top }} />)}</div>
      {map.points.length > 1 && <svg className="ai-route-map-line" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={map.points.map(({ x, y }) => `${x},${y}`).join(" ")} /></svg>}
      {map.points.map((point, index) => <span className="ai-route-pin" style={{ left: point.x, top: point.y }} title={point.name} key={`${point.id}-${index}`}>{point.order}</span>)}
      <a className="ai-route-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </> : <div className="ai-route-sketch-empty">좌표가 있는 장소가 생기면 지도에 표시돼요</div>}
  </div>;
}

export default function AiItinerary() {
  const [form, setForm] = useState({ startDate: dateInput(tomorrow), endDate: dateInput(afterTomorrow), region: "제주", budget: 500000, people: 2, transport: "자차", styles: ["자연·힐링"] });
  const [plan, setPlan] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("ai-travel-itinerary") || "null"); return saved?.days?.length ? saved : null; }
    catch { return null; }
  });
  const [selectedDay, setSelectedDay] = useState(0);
  const [status, setStatus] = useState({ configured: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    fetch("/api/itineraries/status").then((response) => response.json()).then(setStatus).catch(() => setStatus({ configured: null }));
  }, []);

  const display = plan || EXAMPLE;
  const day = display.days[selectedDay] || display.days[0];
  const dayItems = day?.items || [];
  const totalDays = useMemo(() => {
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);
    return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? 0 : Math.round((end - start) / 86400000) + 1;
  }, [form.startDate, form.endDate]);

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function toggleStyle(style) { setForm((current) => ({ ...current, styles: current.styles.includes(style) ? current.styles.filter((item) => item !== style) : [...current.styles, style].slice(0, 4) })); }

  async function generate(event) {
    event.preventDefault();
    setError(""); setNotice("");
    if (totalDays < 1 || totalDays > 5) { setError("여행 기간은 1~5일로 선택해 주세요."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/itineraries/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, budget: Number(form.budget), people: Number(form.people) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "일정을 만들지 못했어요.");
      setPlan(result); setSelectedDay(0);
    } catch (problem) { setError(problem.message); }
    finally { setLoading(false); }
  }

  function moveItem(index, direction) {
    if (!plan || index + direction < 0 || index + direction >= dayItems.length) return;
    setPlan((current) => ({ ...current, days: current.days.map((entry, dayIndex) => {
      if (dayIndex !== selectedDay) return entry;
      const items = [...entry.items];
      [items[index], items[index + direction]] = [items[index + direction], items[index]];
      return { ...entry, items };
    }) }));
    setNotice("순서를 바꿨어요. 저장 버튼을 누르면 이 브라우저에 보관됩니다.");
  }

  function save() {
    if (!plan) return;
    localStorage.setItem("ai-travel-itinerary", JSON.stringify(plan));
    setNotice("이 브라우저에 일정을 저장했어요.");
  }

  return <main className="ai-plan-page">
    <section className="ai-plan-hero"><div className="ai-plan-hero-inner"><p>YOUR TRIP, YOUR WAY</p><h1>AI 여행 일정 만들기</h1><span>취향을 알려주면, 실제 관광 정보를 바탕으로 하루하루의 여행을 그려드려요.</span></div></section>
    <div className="ai-plan-layout">
      <form className="ai-plan-card ai-plan-form" onSubmit={generate}>
        <div className="ai-plan-card-title"><span className="ai-plan-icon">✦</span><div><h2>어떤 여행을 떠나시나요?</h2><p>여행 조건을 선택해 주세요.</p></div></div>
        <label className="ai-plan-field">여행 기간<div className="ai-plan-dates"><input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} required aria-label="출발일" /><span>—</span><input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} required aria-label="도착일" /></div><small>최대 5일 · {totalDays > 0 ? `${totalDays}일` : "날짜를 확인해 주세요"}</small></label>
        <label className="ai-plan-field">여행지<select value={form.region} onChange={(event) => update("region", event.target.value)}>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select></label>
        <label className="ai-plan-field">총 예산 <small>(1인 기준, 참고용)</small><select value={form.budget} onChange={(event) => update("budget", event.target.value)}><option value="0">예산 제한 없음</option><option value="200000">20만 원 내외</option><option value="500000">50만 원 내외</option><option value="1000000">100만 원 내외</option><option value="2000000">200만 원 내외</option></select></label>
        <div className="ai-plan-inline"><label className="ai-plan-field">여행 인원<select value={form.people} onChange={(event) => update("people", event.target.value)}>{Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}명</option>)}</select></label><label className="ai-plan-field">이동 수단<select value={form.transport} onChange={(event) => update("transport", event.target.value)}>{["자차", "대중교통", "도보·택시"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
        <fieldset className="ai-plan-styles"><legend>여행 스타일 <small>(최대 4개)</small></legend><div>{STYLES.map((style) => <button type="button" className={form.styles.includes(style) ? "selected" : ""} aria-pressed={form.styles.includes(style)} onClick={() => toggleStyle(style)} key={style}>{style}</button>)}</div></fieldset>
        <button className="ai-plan-generate" type="submit" disabled={loading}>{loading ? "AI가 일정을 만드는 중…" : "✦  내 여행 일정 만들기  →"}</button>
        {status.configured === false && <p className="ai-plan-config">실제 AI 생성을 위해 프로젝트 `.env`의 CODYSSEY_OPENAI_KEY에 학원 API 키를 입력해 주세요.</p>}
        {error && <p className="ai-plan-error" role="alert">{error}</p>}
      </form>

      <section className="ai-plan-card ai-plan-result"><div className="ai-plan-result-top"><div><p className="ai-plan-kicker">{plan ? "AI GENERATED ITINERARY" : "PREVIEW ITINERARY"}</p><h2>{plan ? display.title : "이런 일정을 만들 수 있어요"}</h2><p>{display.summary}</p></div>{plan ? <button className="ai-plan-save" type="button" onClick={save}>일정 저장하기</button> : <span className="ai-plan-preview-badge">화면 예시</span>}</div>
        <div className="ai-plan-day-tabs" role="tablist" aria-label="날짜별 일정">{display.days.map((entry, index) => <button role="tab" aria-selected={selectedDay === index} type="button" className={selectedDay === index ? "active" : ""} onClick={() => setSelectedDay(index)} key={entry.day}>{dayLabel(entry.date, index)}</button>)}</div>
        <div className="ai-plan-day-title"><span>DAY {selectedDay + 1}</span><h3>{day?.theme}</h3></div>
        <ol className="ai-plan-timeline">{dayItems.map((item, index) => <li key={`${item.id}-${index}`}><div className="ai-plan-time"><strong>{item.time || "시간 미정"}</strong><span>{item.type}</span></div><div className="ai-plan-timeline-dot" /><article className="ai-plan-stop">{item.image ? <img src={item.image} alt="" /> : <div className="ai-plan-photo-empty">{item.type === "음식점" ? "◌" : item.type === "숙소" ? "⌂" : "✦"}</div>}<div className="ai-plan-stop-copy"><span>{item.type}</span><h4>{plan && item.url ? <Link to={item.url}>{item.name}</Link> : item.name}</h4><p>{item.reason}</p><small>⌖ {item.address}</small></div>{plan && <div className="ai-plan-reorder"><button type="button" aria-label={`${item.name} 순서 올리기`} disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button><button type="button" aria-label={`${item.name} 순서 내리기`} disabled={index === dayItems.length - 1} onClick={() => moveItem(index, 1)}>↓</button></div>}</article></li>)}</ol>
        {notice && <p className="ai-plan-notice" role="status">{notice}</p>}
        <p className="ai-plan-disclaimer">{plan ? "AI가 생성한 제안입니다. 방문 전 영업·운영 시간, 요금과 이동 경로를 확인해 주세요. 장소 정보: 한국관광공사 TourAPI." : "위 일정은 화면 구성 예시입니다. 실제 AI 추천 결과가 아닙니다."}</p>
      </section>

      <aside className="ai-plan-side"><section className="ai-plan-card ai-plan-route"><div className="ai-plan-side-title"><h2>여행 동선</h2><span>{plan ? `${dayItems.length}곳` : "미리보기"}</span></div><RouteSketch items={dayItems} /><ol>{dayItems.map((item, index) => <li key={`${item.id}-${index}`}><span>{index + 1}</span><p>{item.name}</p><small>{item.time}</small></li>)}</ol><p className="ai-plan-route-note">점 사이의 선은 위치 관계를 나타냅니다. 실제 도로 경로가 아닙니다.</p></section>
        <section className="ai-plan-card ai-plan-helper"><div className="ai-plan-side-title"><h2>✦ AI 여행 도우미</h2></div><p>{plan ? display.summary : "여행 조건을 선택하고 일정을 만들면 추천 이유와 여행 팁을 알려드려요."}</p>{plan?.tips?.length > 0 && <ul>{plan.tips.map((tip, index) => <li key={index}>{tip}</li>)}</ul>}<div className="ai-plan-helper-source">관광공사 장소 검색 → OpenAI 일정 구성</div></section></aside>
    </div>
  </main>;
}
