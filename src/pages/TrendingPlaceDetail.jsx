import { useEffect, useState, useLayoutEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getPlaceDetailPath } from "./data/placeNavigation.js";
import { scrollToPageTop } from "./data/pageScroll.js";
import "./TrendingPlaceDetail.css";

const dayLabels = ["1일차", "2일차", "3일차", "4일차", "5일차", "6일차", "7일차"];

const plotLeft = 66;
const plotRight = 640;
const plotTop = 46;
const plotBottom = 190;
const plotHeight = plotBottom - plotTop;

function getY(value, maximum) {
  return plotBottom - (value / maximum) * plotHeight;
}

function getPoints(values, maximum) {
  return values.map((value, index) => {
    const x = plotLeft + index * ((plotRight - plotLeft) / (values.length - 1));
    const y = getY(value, maximum);
    return `${x},${y}`;
  }).join(" ");
}

function TrendChart({ trend, dates }) {
  const peak = Math.max(1, ...trend.previous, ...trend.current);
  const step = Math.max(1, Math.ceil(peak / 5));
  const maximum = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: maximum / step + 1 }, (_, index) => maximum - index * step);
  const previousPoints = getPoints(trend.previous, maximum);
  const currentPoints = getPoints(trend.current, maximum);

  return (
    <div className="trending-detail-chart" aria-label="이전 7일과 최근 7일의 회원 활동 비교 그래프">
      <svg viewBox="0 0 680 250" role="img" aria-label="세로축은 실제 활동 건수입니다. 날짜별 수치는 아래 표에서 확인할 수 있습니다">
        {ticks.map((value) => {
          const y = getY(value, maximum);
          return (
            <g key={value}>
              <line x1={plotLeft} x2={plotRight} y1={y} y2={y} className="trending-chart-gridline" />
              <text x="55" y={y + 4} className="trending-chart-tick">{value}</text>
            </g>
          );
        })}
        <text x="17" y="118" transform="rotate(-90 17 118)" className="trending-chart-axis-title">활동 건수</text>
        <polyline points={previousPoints} className="trending-chart-line trending-chart-line-previous" />
        <polyline points={currentPoints} className="trending-chart-line trending-chart-line-current" />
        {trend.previous.map((value, index) => {
          const x = plotLeft + index * ((plotRight - plotLeft) / (trend.previous.length - 1));
          const y = getY(value, maximum);
          return <circle key={`previous-${dayLabels[index]}`} cx={x} cy={y} r="3.5" className="trending-chart-dot trending-chart-dot-previous" />;
        })}
        {trend.current.map((value, index) => {
          const x = plotLeft + index * ((plotRight - plotLeft) / (trend.current.length - 1));
          const y = getY(value, maximum);
          return <circle key={`current-${dayLabels[index]}`} cx={x} cy={y} r="3.5" className="trending-chart-dot trending-chart-dot-current" />;
        })}
        {dates.map((date, index) => {
          const label = date.slice(5).replace("-", "/");
          const x = plotLeft + index * ((plotRight - plotLeft) / (dayLabels.length - 1));
          return <text key={label} x={x} y="228" className="trending-chart-label">{label}</text>;
        })}
      </svg>
      <div className="trending-chart-legend">
        <span><i className="trending-legend-previous" />이전 7일</span>
        <span><i className="trending-legend-current" />최근 7일</span>
      </div>
    </div>
  );
}

export default function TrendingPlaceDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [metric, setMetric] = useState('total');
  useLayoutEffect(() => { scrollToPageTop(); }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetch(`/api/activity/place/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data; })
      .then(data => setState({ status: 'success', data }))
      .catch(error => { if (error.name !== 'AbortError') setState({ status: 'error', message: error.message }); });
    return () => controller.abort();
  }, [id]);
  if (state.status !== 'success') return <main className="trending-detail-page"><section className="trending-not-found" role="status"><h1>{state.status === 'loading' ? '회원 검색·조회 추이를 불러오는 중입니다' : '추이를 불러오지 못했어요'}</h1><p>{state.message}</p><Link to="/">메인으로 돌아가기</Link></section></main>;
  const { place, previous, current } = state.data;
  const valueOf = day => metric === "total" ? day.searches + day.views : day[metric];
  const trend = { previous: previous.map(valueOf), current: current.map(valueOf) };
  const previousTotal = trend.previous.reduce((a, b) => a + b, 0);
  const currentTotal = trend.current.reduce((a, b) => a + b, 0);
  const change = previousTotal ? `${((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)}%` : '비교 기준 없음';
  const label = metric === 'total' ? '검색·조회 합계' : metric === 'searches' ? '검색 결과 포함' : '여행지 상세 조회';
  const searches = current.reduce((n,d)=>n+d.searches,0);
  const views = current.reduce((n,d)=>n+d.views,0);
  return <main className="trending-detail-page"><div className="trending-detail-container">
    <Link className="trending-detail-back" to="/">← 메인으로</Link>
    <header className="trending-detail-heading"><p>{place.region}</p><h1>{place.name} 검색·조회 추이</h1><p>전체 로그인 회원 기준 · 한국 시간</p></header>
    <section className="trending-detail-section">
      <div className="trending-section-heading"><div><h2>상세 추이 그래프</h2><p>최근 7일과 이전 7일의 실제 회원 활동을 비교합니다.</p></div><span className="trending-example-badge">전체 회원 기준</span></div>
      <div className="trending-metric-tabs" role="group" aria-label="집계 항목">
        <button aria-pressed={metric === 'total'} onClick={() => setMetric('total')}>검색·조회 합계</button>
        <button aria-pressed={metric === 'searches'} onClick={() => setMetric('searches')}>검색 결과 포함</button>
        <button aria-pressed={metric === 'views'} onClick={() => setMetric('views')}>상세 조회</button>
      </div>
      <p>최근 7일: 검색 결과 포함 <strong>{searches}건</strong> · 상세 조회 <strong>{views}건</strong></p>
      {currentTotal === 0 && <p role="status">최근 7일 동안 {label} 기록이 없습니다.{metric === 'searches' && views > 0 ? ` 상세 조회는 ${views}건 있으며, ‘상세 조회’에서 확인할 수 있습니다.` : ''}</p>}
      <h3>{label}</h3><TrendChart trend={trend} dates={current.map(d=>d.date)} />
      <p>이전: {previous[0].date} ~ {previous[6].date} / 최근: {current[0].date} ~ {current[6].date}</p>
      <div className="trending-period-summary"><div><span>이전 7일</span><strong>{previousTotal}건</strong></div><div><span>최근 7일</span><strong>{currentTotal}건</strong></div><div><span>변화율</span><strong>{change}</strong></div></div>
      <p className="trending-no-cause">검색은 이 여행지가 검색 결과에 포함된 횟수입니다. 상세 조회는 같은 회원·여행지별 30분에 한 번 집계합니다. 기록이 없는 날은 0이며, 과거 비로그인 기록은 포함하지 않습니다.</p>
    </section>
    <section className="trending-detail-section"><h2>날짜별 상세 기록</h2><table className="trending-daily-table"><thead><tr><th>날짜</th><th>검색 결과 포함</th><th>상세 조회</th></tr></thead><tbody>{[...previous, ...current].map(day => <tr key={day.date}><th>{day.date}</th><td>{day.searches}건</td><td>{day.views}건</td></tr>)}</tbody></table></section>
    <section className="trending-detail-section"><h2>여행지 정보</h2>{place.image && <div className="trending-detail-hero-image"><img src={place.image} alt={place.name} /></div>}{place.photoCredit && <p>사진: {place.photoCredit.author} · {place.photoCredit.license} {place.photoCredit.sourceUrl && <a href={place.photoCredit.sourceUrl}>출처</a>}</p>}<Link to={getPlaceDetailPath(place.id, 'team')}>여행지 상세 정보 보기 →</Link></section>
  </div></main>;
}
