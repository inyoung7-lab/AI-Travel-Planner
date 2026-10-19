import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, regionFromAddr } from "./community/data/api.js";

const nearbyTabs = [
  { key: "food", label: "맛집 · 음식점" },
  { key: "lodging", label: "숙소" },
  { key: "festival", label: "축제 · 행사" },
  { key: "sights", label: "가볼 만한 곳" },
];

const demoReviewTexts = [
  "주변을 천천히 둘러보며 머물기 좋은 곳이었어요. 일정에 여유를 두고 방문하면 더 좋을 것 같아요.",
  "근처 장소와 함께 하루 코스로 다녀왔어요. 이동 경로를 미리 확인하니 편하게 둘러볼 수 있었습니다.",
  "사진으로 보던 풍경을 직접 만나니 기억에 남았어요. 다음에는 시간을 더 넉넉히 잡고 방문하고 싶습니다.",
  "친구와 함께 들렀는데 주변에도 둘러볼 곳이 있어 알찬 하루를 보냈어요.",
];

function distanceLabel(meters) {
  if (!Number.isFinite(meters)) return "거리 정보 없음";
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

export default function PlaceNearbyAndReviews({ place, source }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState("food");
  const [results, setResults] = useState({});
  const [reviewError, setReviewError] = useState("");
  const coordinates = place.lat && place.lng ? `${place.lat}:${place.lng}` : null;
  const resultKey = `${coordinates}:${category}:${place.tourContentId || place.contentId || ""}`;
  const current = results[resultKey];

  useEffect(() => {
    if (!coordinates) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ lat: String(place.lat), lng: String(place.lng), category });
    const contentId = place.tourContentId || place.contentId;
    if (contentId) params.set("excludeContentId", String(contentId));
    fetch(`/api/places/nearby?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "주변 장소를 불러오지 못했어요.");
        setResults((previous) => ({ ...previous, [resultKey]: { items: payload.items, radiusMeters: payload.radiusMeters } }));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setResults((previous) => ({ ...previous, [resultKey]: { error: error.message } }));
      });
    return () => controller.abort();
  }, [coordinates, category, place.lat, place.lng, place.tourContentId, place.contentId, resultKey]);

  const seed = String(place.id || place.contentId || place.name).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const demoReviews = [
    { author: "예시 여행자 A", rating: 5, text: demoReviewTexts[seed % demoReviewTexts.length] },
    { author: "예시 여행자 B", rating: 4.5, text: demoReviewTexts[(seed + 1) % demoReviewTexts.length] },
  ];
  const reviewPath = source === "db" ? `/community/write?type=review&placeId=${place.id}` : "/community/write?type=review";

  async function writeReview() {
    if (source === "db") return navigate(reviewPath);
    if (!getUser()) return navigate(reviewPath);
    setReviewError("");
    try {
      const response = await fetch("/api/community/places", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: place.name, addr: place.address, region: regionFromAddr(place.address),
          lat: place.lat, lng: place.lng, extKey: `tourapi:${place.contentId}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "리뷰 장소를 준비하지 못했어요.");
      navigate(`/community/write?type=review&placeId=${data.placeId}`);
    } catch (error) { setReviewError(error.message); }
  }

  return <>
    <section className="place-preview-section place-detail-nearby-section">
      <div className="place-preview-section-head"><div><p className="place-preview-eyebrow">EXPLORE NEARBY</p><h2>주변 추천 장소</h2><p>{place.coordinateApproximate ? "주소 검색으로 찾은 대략적인 위치 주변을 살펴보세요." : "현재 여행지 근처의 장소를 거리순으로 살펴보세요."}</p></div></div>
      <div className="place-preview-tabs" role="tablist" aria-label="주변 장소 종류">
        {nearbyTabs.map((tab) => <button type="button" role="tab" aria-selected={category === tab.key} className={category === tab.key ? "active" : ""} key={tab.key} onClick={() => setCategory(tab.key)}>{tab.label}</button>)}
      </div>
      {!coordinates ? <p className="place-detail-empty">이 장소에 위치 좌표가 없어 주변 장소를 조회할 수 없어요.</p>
        : !current ? <p className="place-detail-empty" role="status">주변 장소를 불러오는 중이에요…</p>
          : current.error ? <p className="place-detail-empty" role="alert">{current.error}</p>
            : current.items.length === 0 ? <p className="place-detail-empty">{current.radiusMeters / 1000}km 안에 등록된 {nearbyTabs.find((tab) => tab.key === category)?.label} 정보가 없어요.</p>
              : <div className="place-detail-nearby-grid">{current.items.slice(0, 4).map((item) => <Link to={`/places/tourapi/${item.contentId}`} className="place-detail-nearby-card" key={item.contentId}>
                {item.image ? <img src={item.image} alt={`${item.name} 사진`} loading="lazy" /> : <span className="place-detail-nearby-placeholder">사진 없음</span>}
                <span className="place-detail-nearby-copy"><small>{distanceLabel(item.distanceMeters)} · {item.category}</small><strong>{item.name}</strong><span>{item.address || "주소 정보 없음"}</span></span>
              </Link>)}</div>}
      <p className="place-preview-disclaimer">주변 장소·거리·사진: 한국관광공사 TourAPI.{place.coordinateSource && ` 위치: ${place.coordinateSource} (대략적인 위치).`} 축제·행사는 실제 개최 일정을 상세 정보에서 확인해 주세요.</p>
    </section>

    <section className="place-preview-section place-preview-review-section">
      <div className="place-preview-section-head"><div><p className="place-preview-eyebrow">TRAVELER STORIES</p><h2>여행자 리뷰</h2><p>★ 4.8 · 예시 리뷰 2개</p></div><button className="place-detail-review-write" type="button" onClick={writeReview}>리뷰 작성하기</button></div>
      {reviewError && <p className="place-detail-empty" role="alert">{reviewError}</p>}
      <div className="place-preview-review-grid">{demoReviews.map((review, index) => <article className="place-preview-review" key={review.author}>
        <div className="place-preview-review-top"><span className={`place-preview-avatar${index ? " second" : ""}`}>{index ? "B" : "A"}</span><div><strong>{review.author}</strong><small>화면 예시 · 실제 사용자 리뷰 아님</small></div><span className="place-preview-stars">★ {review.rating.toFixed(1)}</span></div>
        <p>{review.text}</p>
      </article>)}</div>
      <p className="place-preview-disclaimer">이 리뷰와 평점은 화면 구성을 확인하기 위한 예시입니다. 실제 사용자 리뷰가 아닙니다.</p>
      {source === "db" && <Link className="place-detail-real-reviews" to={`/community/places/${place.id}/reviews`}>커뮤니티에 등록된 리뷰 보기 →</Link>}
    </section>
  </>;
}
