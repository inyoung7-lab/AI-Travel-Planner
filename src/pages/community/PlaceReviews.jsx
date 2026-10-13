import { useParams } from "react-router-dom";
import "./PlaceReviews.css";
import { Thumb, ChevDown, ChevRight, Heart, ImageIcon, Star, Plus, Pencil } from "./Icons.jsx";
import { places, placeInfo, placeReviews, GRADIENTS } from "./data/mockPosts.js";

export default function PlaceReviews() {
  // App.jsx의 주소 이름이 :id 든 :placeId 든 둘 다 읽어요
  const params = useParams();
  const placeId = params.placeId ?? params.id;
  const place = places[placeId];
  const info = placeInfo[placeId];
  const reviews = placeReviews[placeId] || [];

  if (!place || !info) {
    return (
      <div className="cml-root">
        <div className="cml-wrap">
          <p style={{ padding: "80px 0", textAlign: "center" }}>여행지를 찾을 수 없어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cml-root">
      <div className="cml-wrap">
        <div className="cml-crumb">
          커뮤니티 <ChevRight /> 리뷰 <ChevRight /> <b>장소 리뷰</b>
        </div>

        <section className="cml-card cml-ph0">
          <div className="cml-phi" style={{ background: place.bg }}><ImageIcon size={40} /></div>
          <div className="cml-phb">
            <div className="cml-pht">{place.name}</div>
            <div className="cml-phs"><span className="cml-muted">리뷰 {place.reviews}</span></div>
            <div className="cml-pls">
              {info.tags.map(([t, c]) => (
                <span className={"cml-tag cml-" + c} key={t}>{t}</span>
              ))}
            </div>
            <div className="cml-pab">
              <span className="cml-btn cml-nv"><Heart filled /> 찜하기</span>
              <span className="cml-btn cml-ol"><Plus /> 일정에 추가</span>
              <span className="cml-btn cml-co"><Pencil /> 리뷰 쓰기</span>
            </div>
          </div>
          <div className="cml-mapx">
            <div className="cml-mapb" style={{ background: "linear-gradient(135deg,#F2DFC9,#D9B48F)" }}>
              <ImageIcon size={40} />
            </div>
            <div className="cml-adr">{info.address}</div>
          </div>
        </section>

        <div className="cml-main2" style={{ gridTemplateColumns: "1fr" }}>
          <section>
            <div className="cml-fh">
              <div className="cml-fl">
                <span className="cml-pl3 cml-sortc">추천순 <ChevDown /></span>
              </div>
              <span className="cml-muted">리뷰 {place.reviews}개</span>
            </div>

            <div className="cml-rvl">
              {reviews.map((r) => (
                <article className="cml-rv" key={r.author + r.text}>
                  <div className="cml-rvh">
                    <span className="cml-av">{r.author[0]}</span>
                    <b>{r.author}</b>
                    <span className="cml-sp"></span>
                    <span className="cml-muted">{r.visited}</span>
                  </div>
                  <div className="cml-rvs">
                    <span className="cml-stars">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} on={n <= r.rating} />)}
                    </span>
                  </div>
                  <p>{r.text}</p>
                  {r.photos > 0 && (
                    <div className="cml-rths">
                      {GRADIENTS.slice(0, r.photos).map((bg, i) => (
                        <div className="cml-rth" style={{ background: bg }} key={i}><ImageIcon size={18} /></div>
                      ))}
                    </div>
                  )}
                  <div className="cml-rvf"><span><Thumb /> {r.likes}</span></div>
                </article>
              ))}
            </div>

            <div className="cml-pgn">
              <span>‹</span><span className="cml-on">1</span><span>2</span><span>3</span><span>›</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
