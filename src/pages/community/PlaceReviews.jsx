import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./PlaceReviews.css";
import { Thumb, ChevRight, Heart, ImageIcon, Star, Plus, Pencil } from "./Icons.jsx";
import { places, placeInfo, placeReviews as mockPlaceReviews, GRADIENTS } from "./data/mockPosts.js";
import { loadPlace, getUser, toggleWish } from "./data/api.js";
import SortMenu from "./SortMenu.jsx";
import AddToTripModal from "../mytrip/AddToTripModal.jsx";

export default function PlaceReviews() {
  // App.jsx의 주소 이름이 :id 든 :placeId 든 둘 다 읽어요
  const params = useParams();
  const placeId = params.placeId ?? params.id;
  const navigate = useNavigate();
  const [sort, setSort] = useState("recommend");
  const [adding, setAdding] = useState(false);
  const [data, setData] = useState(undefined); // undefined = 불러오는 중

  // DB에서 이 여행지의 리뷰를 가져와요. 서버가 꺼져 있으면 예시 데이터를 보여줘요.
  useEffect(() => {
    let alive = true;
    loadPlace(placeId, sort).then((d) => {
      if (!alive) return;
      if (d) {
        setData(d);
      } else {
        const mock = (mockPlaceReviews[placeId] || []).map((r) => ({ ...r, time: r.visited }));
        setData({ placeId, reviewCount: mock.length, wished: false, reviews: mock, offline: true });
      }
    });
    return () => {
      alive = false;
    };
  }, [placeId, sort]);

  async function wish() {
    const user = getUser();
    if (!user) {
      alert("로그인이 필요해요.");
      navigate("/login");
      return;
    }
    try {
      await toggleWish(Number(placeId), user.userId);
      setData(await loadPlace(placeId, sort));
    } catch (e) {
      alert(e.message);
    }
  }

  if (data === undefined) return <div className="cml-root"><div className="cml-wrap" /></div>;

  const known = places[placeId];
  const reviews = data.reviews;
  // 이름은 예시 여행지 표에서 찾고, 없으면 번호로 보여줘요 (팀 PLACE 테이블이 정해지면 교체)
  const place = known ?? { name: `여행지 ${placeId}`, bg: GRADIENTS[Number(placeId) % GRADIENTS.length] };
  const info = placeInfo[placeId] ?? { tags: [], address: "" };

  if (!known && reviews.length === 0) {
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
          <Link to="/community" style={{ color: "inherit", textDecoration: "none" }}>커뮤니티</Link> <ChevRight /> 리뷰 <ChevRight /> <b>장소 리뷰</b>
        </div>

        <section className="cml-card cml-ph0">
          <div className="cml-phi" style={{ background: place.bg }}><ImageIcon size={40} /></div>
          <div className="cml-phb">
            <div className="cml-pht">{place.name}</div>
            <div className="cml-phs"><span className="cml-muted">리뷰 {data.offline ? place.reviews ?? reviews.length : data.reviewCount}</span></div>
            <div className="cml-pls">
              {info.tags.map(([t, c]) => (
                <span className={"cml-tag cml-" + c} key={t}>{t}</span>
              ))}
            </div>
            <div className="cml-pab">
              <span className="cml-btn cml-nv" style={{ cursor: "pointer", ...(data.wished ? { borderColor: "#E8695A" } : {}) }} onClick={wish}><Heart filled={data.wished} /> 찜하기</span>
              <span className="cml-btn cml-ol" style={{ cursor: "pointer" }} onClick={() => {
                if (!getUser()) { alert("로그인이 필요해요."); navigate("/login"); return; }
                setAdding(true);
              }}><Plus /> 일정에 추가</span>
              <Link className="cml-btn cml-co" style={{ textDecoration: "none" }} to={`/community/write?type=review&placeId=${placeId}`}><Pencil /> 리뷰 쓰기</Link>
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
                <SortMenu
                  className="cml-pl3 cml-sortc"
                  value={sort}
                  onChange={setSort}
                  options={[{ key: "recommend", label: "추천순" }, { key: "latest", label: "최신순" }]}
                />
              </div>
              <span className="cml-muted">리뷰 {data.offline ? place.reviews ?? reviews.length : data.reviewCount}개</span>
            </div>

            <div className="cml-rvl">
              {reviews.length === 0 && (
                <p className="cml-muted" style={{ textAlign: "center", padding: "32px 0" }}>아직 이 여행지의 리뷰가 없어요.</p>
              )}
              {reviews.map((r, ri) => (
                <article className="cml-rv" key={r.id ?? ri}>
                  <div className="cml-rvh">
                    <span className="cml-av">{r.author[0]}</span>
                    <b>{r.author}</b>
                    <span className="cml-sp"></span>
                    <span className="cml-muted">{r.time ?? r.visited}</span>
                  </div>
                  {r.rating != null && (
                    <div className="cml-rvs">
                      <span className="cml-stars">
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} on={n <= r.rating} />)}
                      </span>
                    </div>
                  )}
                  <p>{r.text}</p>
                  {r.type === "review" && r.id && (
                    <Link to={`/community/reviews/${r.id}`} style={{ fontSize: "13px", color: "var(--coral)", textDecoration: "none" }}>
                      여행 리뷰 전체 보기 →
                    </Link>
                  )}
                  {r.photos > 0 && (
                    <div className="cml-rths">
                      {GRADIENTS.slice(0, Math.min(r.photos, 3)).map((bg, i) => (
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
      {adding && <AddToTripModal placeId={placeId} placeName={place.name} onClose={() => setAdding(false)} />}
    </div>
  );
}
