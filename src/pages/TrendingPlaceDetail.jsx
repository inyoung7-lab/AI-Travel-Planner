import { useLayoutEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getPlaceDetailPath } from "./data/placeNavigation.js";
import { scrollToPageTop } from "./data/pageScroll.js";
import {
  getRelatedTrendingPlaces,
  getTrendingPlaceById,
  summarizeTrend,
} from "./data/trendingPlaceDetails.js";
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

function TrendChart({ trend }) {
  const maximum = Math.ceil(Math.max(...trend.previous, ...trend.current) / 10) * 10;
  const ticks = Array.from({ length: maximum / 10 + 1 }, (_, index) => maximum - index * 10);
  const previousPoints = getPoints(trend.previous, maximum);
  const currentPoints = getPoints(trend.current, maximum);

  return (
    <div className="trending-detail-chart" aria-label="두 기간의 예시 관심도 지수 그래프">
      <svg viewBox="0 0 680 250" role="img" aria-label="세로축은 예시 관심도 지수이며 실제 관광 통계가 아닙니다">
        {ticks.map((value) => {
          const y = getY(value, maximum);
          return (
            <g key={value}>
              <line x1={plotLeft} x2={plotRight} y1={y} y2={y} className="trending-chart-gridline" />
              <text x="55" y={y + 4} className="trending-chart-tick">{value}</text>
            </g>
          );
        })}
        <text x="17" y="118" transform="rotate(-90 17 118)" className="trending-chart-axis-title">예시 관심도 지수</text>
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
        {dayLabels.map((label, index) => {
          const x = plotLeft + index * ((plotRight - plotLeft) / (dayLabels.length - 1));
          return <text key={label} x={x} y="228" className="trending-chart-label">{label}</text>;
        })}
      </svg>
      <div className="trending-chart-legend">
        <span><i className="trending-legend-previous" />이전 7일 예시</span>
        <span><i className="trending-legend-current" />최근 7일 예시</span>
      </div>
    </div>
  );
}

function RelatedPlaceCard({ place }) {
  return (
    <Link className="trending-related-card" to={getPlaceDetailPath(place.id, "trending")}>
      <span className="trending-related-image">
        {place.image ? <img src={place.image} alt={`${place.name} 대표 사진`} /> : <span>사진 준비 중</span>}
      </span>
      <span className="trending-related-copy">
        <span className="trending-related-region">{place.region}</span>
        <strong>{place.name}</strong>
        <span>{place.tags.join(" · ")}</span>
      </span>
    </Link>
  );
}

export default function TrendingPlaceDetail() {
  const { id } = useParams();
  const place = getTrendingPlaceById(id);

  useLayoutEffect(() => {
    scrollToPageTop();
  }, [id]);

  if (!place) {
    return (
      <main className="trending-detail-page">
        <section className="trending-not-found" role="status">
          <h1>여행지를 찾을 수 없습니다</h1>
          <p>주소의 여행지 ID를 확인해 주세요.</p>
          <Link to="/">메인으로 돌아가기</Link>
        </section>
      </main>
    );
  }

  const summary = summarizeTrend(place.trend);
  const relatedPlaces = getRelatedTrendingPlaces(place);
  const changeLabel = summary.changePercent === null
    ? "비교 기준 없음"
    : `${summary.changePercent > 0 ? "+" : ""}${summary.changePercent}%`;

  return (
    <main className="trending-detail-page">
      <div className="trending-detail-container">
        <Link className="trending-detail-back" to="/">← 메인으로</Link>
        <header className="trending-detail-heading">
          <p>{place.region}</p>
          <h1>{place.name}</h1>
        </header>

        <div className={`trending-detail-hero-image${place.image ? "" : " is-placeholder"}`}>
          {place.image ? <img src={place.image} alt={`${place.name} 대표 사진`} /> : <span>사진 준비 중</span>}
        </div>

        <section className="trending-detail-section trending-place-intro">
          <h2>여행지 소개</h2>
          <p>{place.introduction}</p>
          <div className="trending-place-themes" aria-label="여행지 테마">
            {place.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </section>

        <section className="trending-detail-section">
          <div className="trending-section-heading">
            <div><h2>관심도 추이</h2><p>예시 관심도 지수 · 실제 검색 기록이나 관광 통계가 아닙니다.</p></div>
            <span className="trending-example-badge">예시 데이터</span>
          </div>
          <TrendChart trend={place.trend} />
        </section>

        <section className="trending-detail-section trending-period-section">
          <div className="trending-section-heading">
            <div><h2>이전 기간과 비교</h2><p>임의의 예시 수치로 계산한 변화이며, 상승 이유를 나타내지 않습니다.</p></div>
            <span className="trending-example-badge">예시 데이터</span>
          </div>
          <div className="trending-period-summary">
            <div><span>이전 기간별 예시 지수 합계 · 7일</span><strong>{summary.previousTotal}</strong></div>
            <div><span>최근 기간별 예시 지수 합계 · 7일</span><strong>{summary.currentTotal}</strong></div>
            <div className="trending-period-change"><span>예시 변화율</span><strong>{changeLabel}</strong></div>
          </div>
          <p className="trending-no-cause">현재 실제 인기 통계와 인기 상승 이유는 연결되어 있지 않습니다.</p>
        </section>

        <section className="trending-detail-section">
          <div className="trending-section-heading">
            <div><h2>관련 여행지</h2><p>예시 장소 중 공통 테마가 있는 여행지입니다.</p></div>
            <span className="trending-example-badge">예시 데이터</span>
          </div>
          {relatedPlaces.length > 0 ? (
            <div className="trending-related-grid">
              {relatedPlaces.map((related) => <RelatedPlaceCard key={related.id} place={related} />)}
            </div>
          ) : <p className="trending-related-empty">관련 예시 여행지가 없습니다.</p>}
        </section>
      </div>
    </main>
  );
}
