import { useState } from "react";
import { Link } from "react-router-dom";
import "./PlacePreview.css";

const images = {
  beach: "/images/place-preview/hyeopjae-beach.png",
  cafe: "/images/place-preview/seaside-cafe.png",
  seafood: "/images/place-preview/jeju-seafood.png",
};

const recommendations = {
  맛집: [
    { name: "협재 바다 식탁", description: "제주 해산물 한 상", distance: "도보 8분", image: images.seafood },
    { name: "비양도 노을 카페", description: "바다를 마주한 쉬어가는 공간", distance: "도보 12분", image: images.cafe },
    { name: "한림 해안 산책길", description: "해 질 녘 걷기 좋은 길", distance: "차로 5분", image: images.beach },
  ],
  카페: [
    { name: "비양도 노을 카페", description: "창가에서 즐기는 제주 바다", distance: "도보 12분", image: images.cafe },
    { name: "협재 바다 식탁", description: "산책 뒤 들르기 좋은 곳", distance: "도보 8분", image: images.seafood },
  ],
  "가볼 만한 곳": [
    { name: "한림 해안 산책길", description: "비양도를 바라보는 해안길", distance: "차로 5분", image: images.beach },
    { name: "비양도 노을 카페", description: "노을이 아름다운 쉼터", distance: "도보 12분", image: images.cafe },
  ],
};

const facts = [
  { icon: "clock", label: "이용 시간", value: "상시 개방", detail: "방문 전 현지 안내 확인" },
  { icon: "ticket", label: "이용 요금", value: "무료", detail: "해변 입장 기준" },
  { icon: "pin", label: "위치", value: "제주 제주시", detail: "한림읍 협재리" },
  { icon: "car", label: "주차", value: "인근 주차장", detail: "혼잡 시 여유 있게 방문" },
];

function Icon({ name, size = 20 }) {
  const paths = {
    heart: <path d="M20.8 8.6c0 4.2-8.8 10.1-8.8 10.1S3.2 12.8 3.2 8.6a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    ticket: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 6v12M12 10h5M12 14h3" /></>,
    car: <><path d="m5 10 2-5h10l2 5M4 10h16v8H4zM6 18v2M18 18v2" /><circle cx="7.5" cy="14" r="1" /><circle cx="16.5" cy="14" r="1" /></>,
    arrow: <path d="m9 5 7 7-7 7" />,
    star: <path d="m12 2.5 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1Z" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function PlacePreview() {
  const [category, setCategory] = useState("맛집");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");

  const showPreviewNotice = (message) => {
    setNotice(message);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showPreviewNotice("시안 링크를 복사했어요.");
    } catch {
      showPreviewNotice("주소창의 링크를 복사해 공유해 주세요.");
    }
  };

  return (
    <main className="place-preview">
      <div className="place-preview-inner">
        <div className="place-preview-topline">
          <nav className="place-preview-crumb" aria-label="현재 위치">
            <Link to="/">홈</Link><Icon name="arrow" size={13} /><Link to="/search">여행지 찾기</Link><Icon name="arrow" size={13} /><span>제주 · 협재해변</span>
          </nav>
          <span className="place-preview-demo">화면 시안 · 예시 콘텐츠</span>
        </div>

        <div className="place-preview-title-row">
          <div>
            <p className="place-preview-eyebrow">JEJU ISLAND · BEACH GUIDE</p>
            <h1>협재해변</h1>
            <p className="place-preview-subtitle">푸른 바다와 비양도가 만나는 제주의 서쪽</p>
          </div>
          <div className="place-preview-share-actions">
            <button type="button" onClick={() => { setSaved(!saved); showPreviewNotice(saved ? "저장을 취소했어요. 시안에서만 표시됩니다." : "저장했어요. 시안에서만 표시됩니다."); }} aria-pressed={saved}><Icon name="heart" />{saved ? "저장됨" : "저장하기"}</button>
            <button type="button" onClick={share}><Icon name="share" />공유</button>
          </div>
        </div>

        <div className="place-preview-lead">
          <div className="place-preview-photo">
            <img src={images.beach} alt="제주 협재해변을 표현한 시안용 이미지" />
            <span>제주 바다 · 시안용 이미지</span>
          </div>
          <section className="place-preview-intro" aria-label="여행지 소개">
            <div className="place-preview-chips"><span>제주특별자치도</span><span>해변</span><span>자연</span></div>
            <h2>느리게 걷고 싶은<br />제주의 푸른 해변</h2>
            <p>투명한 물빛과 고운 모래사장, 바다 너머 보이는 비양도까지. 협재해변에서 제주의 여유로운 오후를 만나보세요.</p>
            <div className="place-preview-weather"><span className="place-preview-weather-dot" />여행 메모 <strong>노을 무렵의 해안 산책을 추천해요</strong></div>
            <button className="place-preview-primary" type="button" onClick={() => showPreviewNotice("일정 추가는 화면 구성 확인용입니다. 저장 기능은 최종 제작 때 연결할 수 있어요.")}><Icon name="calendar" />내 여행 일정에 담기<Icon name="arrow" size={16} /></button>
          </section>
        </div>

        <section className="place-preview-facts" aria-label="방문 정보">
          {facts.map((fact) => <div className="place-preview-fact" key={fact.label}><span className={`place-preview-fact-icon ${fact.icon}`}><Icon name={fact.icon} size={23} /></span><div><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div></div>)}
        </section>

        <section className="place-preview-section">
          <div className="place-preview-section-head"><div><p className="place-preview-eyebrow">EXPLORE NEARBY</p><h2>근처에서 함께 즐겨요</h2><p>해변에서 이어지는 제주의 작은 발견</p></div><span className="place-preview-section-index">01 / 02</span></div>
          <div className="place-preview-tabs" role="tablist" aria-label="주변 추천 종류">
            {Object.keys(recommendations).map((item) => <button type="button" role="tab" aria-selected={category === item} className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <div className="place-preview-card-grid">
            {recommendations[category].map((item) => <article className="place-preview-card" key={item.name}><img src={item.image} alt="" /><div><span>{item.distance}</span><h3>{item.name}</h3><p>{item.description}</p></div></article>)}
          </div>
          <p className="place-preview-disclaimer">추천 장소와 정보는 화면 디자인 확인을 위한 예시입니다.</p>
        </section>

        <section className="place-preview-section place-preview-review-section">
          <div className="place-preview-section-head"><div><p className="place-preview-eyebrow">TRAVELER STORIES</p><h2>여행자가 남긴 이야기</h2><p>해변에서 기억에 남은 순간들</p></div><span className="place-preview-section-index">02 / 02</span></div>
          <div className="place-preview-review-grid">
            <article className="place-preview-review"><div className="place-preview-review-top"><span className="place-preview-avatar">지</span><div><strong>지윤</strong><small>예시 리뷰 · 2026. 10.</small></div><span className="place-preview-stars"><Icon name="star" size={15} /> 5.0</span></div><p>바다가 정말 맑고, 산책하며 바라본 비양도가 오래 기억에 남아요. 해 질 무렵에는 풍경이 또 달라져요.</p></article>
            <article className="place-preview-review"><div className="place-preview-review-top"><span className="place-preview-avatar second">민</span><div><strong>민서</strong><small>예시 리뷰 · 2026. 09.</small></div><span className="place-preview-stars"><Icon name="star" size={15} /> 5.0</span></div><p>근처 카페에서 쉬었다가 해변으로 걸어왔어요. 제주의 서쪽을 천천히 즐기기에 좋은 곳이었어요.</p></article>
          </div>
        </section>
        {notice && <div className="place-preview-notice" role="status"><span>{notice}</span><button type="button" aria-label="알림 닫기" onClick={() => setNotice("")}>×</button></div>}
      </div>
    </main>
  );
}
