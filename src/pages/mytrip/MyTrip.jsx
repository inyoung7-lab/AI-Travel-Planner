import TripHistoryDetail from "./TripHistoryDetail.jsx";
import { useUser } from "../../lib/auth.js";
import { requireSupabase } from "../../lib/supabaseClient.js";
import { createItineraryRepository } from "../../lib/itineraryRepository.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MyTrip.css";
import { places, placeInfo, GRADIENTS } from "../community/data/mockPosts.js";
import { toggleWish, placeDetailPath } from "../community/data/api.js";
import { loadOverview, fmtDate, fmtShort } from "./api.js";
import AddToTripModal from "./AddToTripModal.jsx";

// ── 작은 아이콘들 ──
const ico = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" };
const ImageIco = ({ size = 22, style }) => (
  <svg width={size} height={size} {...ico} strokeWidth="1.8" style={style}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);
const CalIco = () => (
  <svg width="15" height="15" {...ico} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const HeartIco = () => (
  <svg width="14" height="14" {...ico} strokeWidth="2" style={{ fill: "#E8695A", stroke: "#E8695A" }}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
);
const PinIco = () => (
  <svg width="12" height="12" {...ico} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const PlusIco = ({ size = 16 }) => (
  <svg width={size} height={size} {...ico} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);


const bgOf = (id) => places[id]?.bg ?? GRADIENTS[Number(id) % GRADIENTS.length];

const ddayLabel = (t) => (t.dday > 0 ? `D-${t.dday}` : t.dday === 0 ? "D-DAY" : "여행 중");

export default function MyTrip() {
  const user = useUser();
  const userId = user?.userId;
  const request = useRef(0);
  const navigate = useNavigate();
  const [data, setData] = useState(undefined); // undefined = 불러오는 중, null = 불러오지 못함
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [tripPage, setTripPage] = useState(1);
  const [wishPage, setWishPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTrip, setHistoryTrip] = useState(null);
  const [adding, setAdding] = useState(null); // 일정에 추가할 여행지 번호
  const pastRef = useRef(null);
  useEffect(()=>{
    if(data && window.location.hash === '#wishes') document.getElementById('wishes')?.scrollIntoView({block:'start'});
  },[data]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const version=++request.current;
    try { const result=await loadOverview(userId); if(version===request.current){setData(result);setError('');} }
    catch(problem) { if(version===request.current){setError(problem.message);setData(null);} }
  }, [userId]);
  useEffect(() => {
    void reload();
    return ()=>{request.current++;};
  }, [reload]);

  async function openTrip(trip) {
    try {
      if (!trip.savedId) { setError('이 일정은 기존 형식입니다. 새 일정은 AI 여행 일정에서 만들 수 있어요.'); return; }
      if(trip.source==='manual'){navigate(`/mytrip/edit/${encodeURIComponent(trip.savedId)}`);return;}
      await createItineraryRepository(requireSupabase()).open({savedId:trip.savedId});
      navigate('/ai-itinerary');
    } catch(problem) { setError(problem.message); }
  }
  async function unwish(placeId) {
    try {
      await toggleWish(placeId, user.userId);
      await reload();
    } catch (e) {
      alert(e.message);
    }
  }

  if (!user) {
    return (
      <div className="mt-root">
        <div className="mt-wrap">
          <div className="mt-card" style={{ margin: "80px auto", maxWidth: "480px", padding: "40px", textAlign: "center" }}>
            <div className="mt-h2" style={{ justifyContent: "center" }}>로그인이 필요해요</div>
            <p style={{ color: "#7A8088", margin: "12px 0 24px" }}>로그인하면 내 여행 일정과 찜한 여행지를 볼 수 있어요.</p>
            <Link to="/login" className="mt-btn mt-co" style={{ textDecoration: "none" }}>로그인하러 가기</Link>
          </div>
        </div>
      </div>
    );
  }
  if (data === undefined || (data && data.user.id !== userId)) return <div className="mt-root"><div className="mt-wrap" /></div>;
  if (data === null) {
    return (
      <div className="mt-root">
        <div className="mt-wrap">
          <p style={{ padding: "80px 0", textAlign: "center" }}>{error || "나의 여행을 불러오지 못했어요."}</p>
        </div>
      </div>
    );
  }

  const { stats, trips, wishes } = data;
  const nameOf = id => data.placeMap?.[id]?.name || places[id]?.name || `여행지 ${id}`;
  const imageOf = id => data.placeMap?.[id]?.image;
  const regionOf = id => data.placeMap?.[id]?.region || '';
  const wishPageCount = Math.max(1, Math.ceil(wishes.length / 6));
  const currentWishPage = Math.min(wishPage, wishPageCount);
  const visibleWishes = wishes.slice((currentWishPage - 1) * 6, currentWishPage * 6);
  const upcoming = trips.filter((t) => t.status === "upcoming");
  const pastTrips = trips.filter((t) => t.status === "past").sort((a, b) => (a.end < b.end ? 1 : -1));
  const historyPageCount = Math.max(1, Math.ceil(pastTrips.length / 3));
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const visibleHistory = pastTrips.slice((currentHistoryPage - 1) * 3, currentHistoryPage * 3);
  const filteredTrips = filter === 'upcoming' ? upcoming : filter === 'past' ? pastTrips : [...upcoming, ...pastTrips];
  const tripPageCount = Math.max(1, Math.ceil(filteredTrips.length / 3));
  const currentTripPage = Math.min(tripPage, tripPageCount);
  const visibleTrips = filteredTrips.slice((currentTripPage - 1) * 3, currentTripPage * 3);

  return (
    <div className="mt-root">
      <div className="mt-wrap">
        <div className="mt-card mt-pfw">
          <div className="mt-pfa">{data.user.name[0]}</div>
          <div>
            <div className="mt-pfn">{data.user.name}</div>
            <div className="mt-pfs">내가 다녀온 여행과 쓴 리뷰를 모아봐요</div>
          </div>
          <div className="mt-pfst">
            <div><b>{stats.visited}</b><span>다녀온 여행지</span></div>
            <div><b>{stats.reviews}</b><span>작성한 리뷰</span></div>
            <div><b>{stats.wishes}</b><span>찜한 여행지</span></div>
          </div>
          <div className="mt-pfb">
            <span
              className="mt-p1"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/community?author=${encodeURIComponent(data.user.id)}&name=${encodeURIComponent(data.user.name)}`)}
            >
              내 게시글 보기
            </span>
          </div>
        </div>

        <section className="mt-sec1">
          <div className="mt-hs1">
            <div className="mt-fl">
              {[
                ["all", `전체 ${trips.length}`],
                ["upcoming", `예정 ${upcoming.length}`],
                ["past", `지난 ${pastTrips.length}`],
              ].map(([k, label]) => (
                <span key={k} className={"mt-pl3" + (filter === k ? " mt-on" : "")} style={{ cursor: "pointer" }} onClick={() => { setFilter(k); setTripPage(1); }}>
                  {label}
                </span>
              ))}
            </div>
            <span className="mt-sp"></span>
            <Link className="mt-btn mt-co" to="/mytrip/new"><PlusIco /> 직접 만들기</Link><Link className="mt-btn mt-nv" to="/ai-itinerary">AI로 만들기</Link>
          </div>

          {error && <p role="alert">{error}</p>}
          {visibleTrips.length === 0 ? (
            <div className="mt-card mt-trip-empty">{filter === 'past' ? '지난 여행이 아직 없어요.' : filter === 'upcoming' ? '예정된 여행이 아직 없어요.' : '저장한 여행이 아직 없어요.'}</div>
          ) : <div className="mt-trip-grid">
            {visibleTrips.map(t => <article className="mt-card mt-trip-card" key={t.id}>
              <div className="mt-trip-photo">
                {t.image ? <img src={t.image} alt={`${t.region || ''} 여행 사진`} /> : <ImageIco size={36} />}
                <span className={`mt-trip-status${t.status === 'past' ? ' is-past' : ''}`}>{t.status === 'past' ? '지난 여행' : ddayLabel(t)}</span>
              </div>
              <div className="mt-trip-body">
                <p className="mt-trip-region">{t.region || '나의 여행'} · {t.source === 'manual' ? '직접 만든 일정' : '저장 일정'}</p>
                <h3 className="mt-trip-title" title={t.title}>{t.title}</h3>
                <p className="mt-trip-dates"><CalIco /> {fmtDate(t.start, true, false)} ~ {fmtDate(t.end, false, false)}</p>
                <p className="mt-trip-count">여행지 {t.placeCount}곳 · {Math.round((Date.parse(t.end)-Date.parse(t.start))/86400000)+1}일 일정</p>
                <details className="mt-trip-days">
                  <summary>일자별 코스 펼치기</summary>
                  {t.days.length ? t.days.map(d => <div className="mt-trip-day" key={d.day}><b>Day {d.day} · {fmtShort(d.date)}</b><p>{(d.names || d.placeIds.map(nameOf)).join(' → ') || '아직 담은 여행지가 없어요.'}</p></div>) : <p>아직 담은 여행지가 없어요.</p>}
                </details>
                <div className="mt-trip-footer"><button type="button" className="mt-btn mt-co mt-trip-open" onClick={() => openTrip(t)}>일정 보기</button>{t.savedId && <Link className="mt-btn mt-ol mt-trip-open" to={`/mytrip/edit/${encodeURIComponent(t.savedId)}`}>편집</Link>}</div>
              </div>
            </article>)}
          </div>}
          {tripPageCount > 1 && <nav className="mt-wish-pagination" aria-label="여행 일정 목록 페이지">
            <button type="button" disabled={currentTripPage === 1} onClick={() => setTripPage(currentTripPage - 1)}>이전</button>
            <span aria-live="polite">{currentTripPage} / {tripPageCount} 페이지</span>
            <button type="button" disabled={currentTripPage === tripPageCount} onClick={() => setTripPage(currentTripPage + 1)}>다음</button>
          </nav>}

        </section>

        <div className="mt-two">
          <section>
            <div className="mt-sh">
              <div className="mt-h2" id="wishes">찜한 여행지<small>하트를 누른 곳 {wishes.length}곳</small></div>
            </div>
            {wishes.length === 0 && (
              <div className="mt-card" style={{ padding: "32px", textAlign: "center", color: "#7A8088" }}>
                아직 찜한 여행지가 없어요. 여행지 리뷰에서 하트를 눌러 보세요.
              </div>
            )}
            <div className="mt-g3">
              {visibleWishes.map((pid) => (
                <article className="mt-card mt-sv" key={pid}>
                  <div className="mt-wish-photo" style={{ background: bgOf(pid) }}>
                    {imageOf(pid) ? <img src={imageOf(pid)} alt="" loading="lazy" /> : <ImageIco size={28} style={{ color: "rgba(255,255,255,.7)" }} />}
                    <button type="button" className="mt-hrt" onClick={() => unwish(pid)} aria-label={`${nameOf(pid)} 찜 취소`}>
                      <HeartIco />
                    </button>
                  </div>
                  <div className="mt-sb">
                    <Link to={placeDetailPath(pid)} className="mt-sn" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      {nameOf(pid)}
                    </Link>
                    {regionOf(pid) && <div className="mt-sr"><PinIco /> {regionOf(pid)}</div>}
                    <div className="mt-tgs">
                      {(placeInfo[pid]?.tags ?? []).map(([t, c]) => (
                        <span key={t} className={"mt-tag mt-" + c}>{t}</span>
                      ))}
                    </div>
                    <div className="mt-sa">
                      <span className="mt-ad" style={{ cursor: "pointer" }} onClick={() => setAdding(pid)}>
                        <PlusIco size={14} /> 일정에 추가
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {wishPageCount > 1 && <nav className="mt-wish-pagination" aria-label="찜한 여행지 페이지">
              <button type="button" disabled={currentWishPage === 1} onClick={() => setWishPage(currentWishPage - 1)}>이전</button>
              <span aria-live="polite">{currentWishPage} / {wishPageCount} 페이지</span>
              <button type="button" disabled={currentWishPage === wishPageCount} onClick={() => setWishPage(currentWishPage + 1)}>다음</button>
            </nav>}
          </section>

          <section className="mt-vcol" ref={pastRef}>
            <div className="mt-sh">
              <div className="mt-h2">지난 여행 일정<small>완료된 일정 {pastTrips.length}개</small></div>
            </div>
            <div className="mt-history-list">
              {pastTrips.length === 0 && <div className="mt-card mt-trip-empty">아직 지난 여행 일정이 없어요.</div>}
              {visibleHistory.map(trip => <button type="button" className="mt-card mt-history-trip" key={trip.id} onClick={() => setHistoryTrip(trip)} aria-label={`${trip.title} 전체 일정 상세 보기`}>
                {trip.image && <img src={trip.image} alt="" loading="lazy" />}
                <span className="mt-history-copy"><strong title={trip.title}>{trip.title}</strong><span>{fmtDate(trip.start,true,false)} ~ {fmtDate(trip.end,false,false)}</span><span>{trip.days.length}일 코스 · 여행지 {trip.placeCount}곳</span><b>전체 일정 상세 보기 →</b></span>
              </button>)}
            </div>
            {historyPageCount > 1 && <nav className="mt-wish-pagination" aria-label="지난 여행 일정 페이지">
              <button type="button" disabled={currentHistoryPage === 1} onClick={() => setHistoryPage(currentHistoryPage - 1)}>이전</button>
              <span aria-live="polite">{currentHistoryPage} / {historyPageCount} 페이지</span>
              <button type="button" disabled={currentHistoryPage === historyPageCount} onClick={() => setHistoryPage(currentHistoryPage + 1)}>다음</button>
            </nav>}
          </section>
        </div>
      </div>

      {historyTrip && <TripHistoryDetail trip={historyTrip} placeMap={data.placeMap} onClose={() => setHistoryTrip(null)} />}
      {adding && (
        <AddToTripModal
          placeId={adding}
          placeName={nameOf(adding)}
          onClose={() => setAdding(null)}
          onAdded={reload}
        />
      )}
    </div>
  );
}
