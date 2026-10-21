import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlaceNearbyAndReviews from "./PlaceNearbyAndReviews.jsx";
import { normalizeTravelRegion } from "../../shared/travelRegions.js";
import "./PlacePreview.css";

function usePlace(url) {
  const [state, setState] = useState({ url: null, place: null, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "여행지 정보를 불러오지 못했어요.");
        setState({ url, place: data, error: "" });
      })
      .catch((error) => { if (error.name !== "AbortError") setState({ url, place: null, error: error.message }); });
    return () => controller.abort();
  }, [url]);
  return state.url === url ? { loading: false, place: state.place, error: state.error } : { loading: true, place: null, error: "" };
}

function InfoCard({ label, value }) {
  return <div className="place-preview-fact"><div><span>{label}</span><strong className="place-detail-fact-value">{value || "정보 없음"}</strong></div></div>;
}

export default function PlaceDetail({ source = "db" }) {
  const { id } = useParams();
  const url = source === "tourapi" ? `/api/places/tourapi/${encodeURIComponent(id)}` : `/api/places/${encodeURIComponent(id)}`;
  const { loading, place, error } = usePlace(url);
  const [imageSelection, setImageSelection] = useState({ id: null, index: 0 });
  const [overviewSelection, setOverviewSelection] = useState({ id: null, expanded: false });
  const [notice, setNotice] = useState("");

  const imageIndex = imageSelection.id === `${source}:${id}` ? imageSelection.index : 0;
  const overviewExpanded = overviewSelection.id === `${source}:${id}` && overviewSelection.expanded;

  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setNotice("링크를 복사했어요."); }
    catch { setNotice("주소창의 링크를 복사해 주세요."); }
  }

  if (loading) return <main className="place-preview"><div className="place-preview-inner" role="status">여행지 정보를 불러오는 중이에요…</div></main>;
  if (error || !place) return <main className="place-preview"><div className="place-preview-inner"><h1>여행지를 열 수 없어요</h1><p>{error}</p><Link to="/places">여행지 목록으로</Link></div></main>;

  const images = place.images || [];
  const facts = [
    ["주소", place.address], ["이용 시간", place.hours], ["휴무일", place.closed],
    ["요금", place.fee], ["주차", place.parking], ["문의", place.phone],
  ].filter(([, value]) => value);
  const mapUrl = place.lat && place.lng
    ? `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`
    : place.address ? `https://map.kakao.com/?q=${encodeURIComponent(place.address)}` : null;

  return <main className="place-preview">
    <div className="place-preview-inner">
      <div className="place-preview-topline">
        <nav className="place-preview-crumb" aria-label="현재 위치"><Link to="/">홈</Link><span>›</span><Link to="/places">여행지 목록</Link><span>›</span><span>{place.name}</span></nav>
        <span className="place-preview-demo">{place.tourContentId || source === "tourapi" ? "한국관광공사 TourAPI 정보 포함" : "DB 등록 정보"}</span>
      </div>

      <div className="place-preview-title-row"><div>
        <p className="place-preview-eyebrow">TRAVEL PLACE GUIDE</p>
        <h1>{place.name}</h1>
        <p className="place-preview-subtitle">{place.address || place.region || "주소 정보 없음"}</p>
      </div><div className="place-preview-share-actions"><button type="button" onClick={share}>공유</button></div></div>

      <div className="place-preview-lead">
        <div className="place-preview-photo place-detail-photo">
          {images.length ? <img src={images[imageIndex]} alt={`${place.imageRegional ? place.imageSubject : place.name} 관광 사진 ${imageIndex + 1}`} /> : <div className="place-detail-no-photo">등록된 사진이 없습니다</div>}
          {images.length > 0 && <span>
            {place.imageSourceUrl
              ? <a href={place.imageSourceUrl} target="_blank" rel="noreferrer">{place.imageSource}</a>
              : place.imageSource || "관광지 사진"}
            {place.imageRegional && place.imageSubject ? ` · ${place.imageSubject}` : ""}
            {` · ${imageIndex + 1} / ${images.length}`}
          </span>}
        </div>
        <section className="place-preview-intro" aria-label="여행지 소개">
          <div className="place-preview-chips">{place.region && <span>{place.region}</span>}<span>{place.category || (source === "db" ? "DB 등록 장소" : "관광 정보")}</span></div>
          <h2>{place.name}</h2>
          <p className={`place-detail-overview${overviewExpanded ? " expanded" : ""}`}>{place.overview || "아직 등록된 소개 정보가 없습니다. 아래 주소와 지도를 참고해 주세요."}</p>
          {place.overview?.length > 300 && <button className="place-detail-overview-toggle" type="button" onClick={() => setOverviewSelection({ id: `${source}:${id}`, expanded: !overviewExpanded })}>{overviewExpanded ? "간략히 보기" : "소개 더 보기"}</button>}
          {mapUrl && <a className="place-preview-primary place-detail-primary" href={mapUrl} target="_blank" rel="noreferrer">지도에서 위치 보기 <span>↗</span></a>}
          {source === "db" && <Link className="place-detail-secondary" to={`/community/places/${place.id}/reviews`}>이 장소의 리뷰 보기</Link>}
        </section>
      </div>
      {images.length > 1 && <div className="place-detail-gallery" aria-label="관광지 사진 목록">{images.map((image, index) => <button type="button" key={image} className={imageIndex === index ? "active" : ""} onClick={() => setImageSelection({ id: `${source}:${id}`, index })} aria-label={`${index + 1}번째 사진 보기`}><img src={image} alt="" /></button>)}</div>}

      <section className="place-preview-section"><div className="place-preview-section-head"><div><p className="place-preview-eyebrow">VISIT INFORMATION</p><h2>방문 정보</h2></div></div>
        {facts.length ? <div className="place-preview-facts place-detail-facts">{facts.map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}</div> : <p className="place-detail-empty">아직 등록된 방문 정보가 없습니다.</p>}
        {place.extraInfo?.length > 0 && <div className="place-detail-extra">{place.extraInfo.map((item, index) => <div key={`${item.label}-${index}`}><strong>{item.label}</strong><p>{item.value}</p></div>)}</div>}
        {place.tourContentId && <p className="place-preview-disclaimer">정보 출처: 한국관광공사 국문 관광정보 서비스. 방문 전 운영 정보 확인을 권장합니다.</p>}
      </section>

      <PlaceNearbyAndReviews place={place} source={source} />
      {notice && <div className="place-preview-notice" role="status">{notice}<button type="button" aria-label="알림 닫기" onClick={() => setNotice("")}>×</button></div>}
    </div>
  </main>;
}

const CATALOG_REGION_ORDER = ["서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종", "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주", "지역 미지정"];

function catalogRegion(item) {
  return normalizeTravelRegion(item.region) || normalizeTravelRegion(item.address)
    || (item.address?.startsWith("South Gyeongsang") ? "경남" : "지역 미지정");
}

function PlaceCatalogCard({ item, region }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <Link className="place-detail-catalog-card" to={`/places/${item.id}`}>
    {item.image && !imageFailed
      ? <img className="place-detail-catalog-image" src={item.image} alt={`${item.name} 대표 이미지`} loading="lazy" onError={() => setImageFailed(true)} />
      : <div className="place-detail-catalog-image-placeholder"><span>✦</span><strong>{region} 여행지</strong><small>사진 준비 중</small></div>}
    <div className="place-detail-catalog-copy"><span className="place-detail-catalog-region">{region}</span><h3>{item.name}</h3><p>{item.address || "주소 정보 없음"}</p><strong>상세 보기 <span aria-hidden="true">→</span></strong></div>
  </Link>;
}

export function PlaceCatalog() {
  const { loading, place: data, error } = usePlace("/api/places");
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const allItems = data?.items || [];
  const regionCounts = new Map();
  for (const item of allItems) {
    const region = catalogRegion(item);
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
  }
  const regions = CATALOG_REGION_ORDER.filter((region) => regionCounts.has(region));
  const searchTerm = query.trim().toLocaleLowerCase("ko-KR");
  const items = allItems.filter((item) => `${item.name} ${catalogRegion(item)} ${item.address}`.toLocaleLowerCase("ko-KR").includes(searchTerm));
  const visibleRegions = selectedRegion === "전체" ? regions : regions.filter((region) => region === selectedRegion);
  return <main className="place-preview"><div className="place-preview-inner">
    <nav className="place-preview-crumb"><Link to="/">홈</Link><span>›</span><span>여행지 목록</span></nav>
    <div className="place-preview-title-row"><div><p className="place-preview-eyebrow">OUR DESTINATIONS</p><h1>여행지 둘러보기</h1><p className="place-preview-subtitle">현재 DB에 등록된 여행지의 상세 정보를 살펴보세요.</p></div></div>
    <input className="place-detail-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 지역, 주소로 찾기" aria-label="여행지 찾기" />
    {loading ? <p role="status">여행지 목록을 불러오는 중이에요…</p> : error ? <p role="alert">{error}</p> : <>
      <div className="place-catalog-regions" aria-label="지역별 여행지 선택">
        {["전체", ...regions].map((region) => <button key={region} type="button" className={selectedRegion === region ? "active" : ""} aria-pressed={selectedRegion === region} onClick={() => setSelectedRegion(region)}>{region}<span>{region === "전체" ? allItems.length : regionCounts.get(region)}</span></button>)}
      </div>
      <p className="place-detail-count">{selectedRegion === "전체" ? "전체" : selectedRegion} · {items.filter((item) => selectedRegion === "전체" || catalogRegion(item) === selectedRegion).length}곳</p>
      {items.length === 0 || visibleRegions.every((region) => !items.some((item) => catalogRegion(item) === region))
        ? <p className="place-catalog-empty">검색 결과가 없습니다.</p>
        : visibleRegions.map((region) => {
          const regionItems = items.filter((item) => catalogRegion(item) === region);
          if (!regionItems.length) return null;
          return <section className="place-catalog-section" key={region} aria-label={`${region} 여행지`}>
            <div className="place-catalog-heading"><h2>{region} 여행지</h2><span>{regionItems.length}곳</span></div>
            <div className="place-detail-catalog">{regionItems.map((item) => <PlaceCatalogCard key={item.id} item={item} region={region} />)}</div>
          </section>;
        })}
    </>}
  </div></main>;
}
