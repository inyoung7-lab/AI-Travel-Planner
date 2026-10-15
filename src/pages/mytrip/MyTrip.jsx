import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MyTrip.css";
import { places, placeInfo, GRADIENTS } from "../community/data/mockPosts.js";
import { toggleWish } from "../community/data/api.js";
import { getUser, loadOverview, fmtDate, fmtShort } from "./api.js";
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
const CheckIco = () => (
  <svg width="12" height="12" {...ico} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
);

// 여행지 이름·지역·태그는 예시 표에서 찾고, 없으면 번호로 보여줘요 (팀 PLACE 테이블이 정해지면 교체)
const nameOf = (id) => places[id]?.name ?? `여행지 ${id}`;
const bgOf = (id) => places[id]?.bg ?? GRADIENTS[Number(id) % GRADIENTS.length];
const regionOf = (id) => {
  const a = places[id]?.addr;
  if (!a) return "";
  const t = a.split(" ")[0];
  return t.startsWith("제주") ? "제주" : t;
};

const ddayLabel = (t) => (t.dday > 0 ? `D-${t.dday}` : t.dday === 0 ? "D-DAY" : "여행 중");

export default function MyTrip() {
  const user = getUser();
  const navigate = useNavigate();
  const [data, setData] = useState(undefined); // undefined = 불러오는 중, null = 불러오지 못함
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(null); // 일정에 추가할 여행지 번호
  const pastRef = useRef(null);

  const reload = () =>
    loadOverview(user.userId)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => {
        setError(e.message);
        setData(null);
      });

  useEffect(() => {
    if (user) reload();
  }, []);

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
  if (data === undefined) return <div className="mt-root"><div className="mt-wrap" /></div>;
  if (data === null) {
    return (
      <div className="mt-root">
        <div className="mt-wrap">
          <p style={{ padding: "80px 0", textAlign: "center" }}>{error || "나의 여행을 불러오지 못했어요."}</p>
        </div>
      </div>
    );
  }

  const { stats, trips, wishes, past } = data;
  const upcoming = trips.filter((t) => t.status === "upcoming");
  const pastTrips = trips.filter((t) => t.status === "past").sort((a, b) => (a.end < b.end ? 1 : -1));
  const next = upcoming[0];
  const showHero = next && filter !== "past";
  const minis =
    filter === "upcoming" ? upcoming.slice(1)
    : filter === "past" ? pastTrips
    : [...upcoming.slice(1), ...pastTrips];

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
            <span className="mt-p2" style={{ cursor: "pointer" }} onClick={() => pastRef.current?.scrollIntoView({ behavior: "smooth" })}>
              다녀온 여행 보기
            </span>
            <span
              className="mt-p1"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/community?author=${encodeURIComponent(data.user.id)}&name=${encodeURIComponent(data.user.name)}`)}
            >
              내 리뷰 모아보기
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
                <span key={k} className={"mt-pl3" + (filter === k ? " mt-on" : "")} style={{ cursor: "pointer" }} onClick={() => setFilter(k)}>
                  {label}
                </span>
              ))}
            </div>
            <span className="mt-sp"></span>
            <span className="mt-btn mt-co"><PlusIco /> 새 일정 만들기</span>
          </div>

          {showHero && (
            <article className="mt-card mt-nx">
              <div className="mt-nimg mt-ph" style={{ background: "linear-gradient(135deg,#3E566F,#1E3042)" }}>
                <ImageIco size={48} style={{ color: "rgba(255,255,255,.7)" }} />
                <span className="mt-chp mt-hot">다음 여행</span>
              </div>
              <div className="mt-nbd">
                <div className="mt-nh">
                  <div>
                    <div className="mt-nt">{next.title}</div>
                    <div className="mt-nd">
                      <CalIco /> {fmtDate(next.start)} ~ {fmtDate(next.end, false)} · 여행지 {next.placeCount}곳
                    </div>
                  </div>
                  <div className="mt-dd2">{ddayLabel(next)}</div>
                </div>
                <div className="mt-rts">
                  {next.days.length === 0 && <div className="mt-rt"><span className="mt-rp">아직 담은 여행지가 없어요.</span></div>}
                  {next.days.map((d) => (
                    <div className="mt-rt" key={d.day}>
                      <b>Day {d.day}</b>
                      <span className="mt-rd">{fmtDate(d.date, false)}</span>
                      <span className="mt-rp">{d.placeIds.map(nameOf).join(" → ")}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-nb">
                  <span className="mt-btn mt-co">일정 보기</span>
                  <span className="mt-btn mt-nv">일정 수정</span>
                </div>
              </div>
            </article>
          )}
          {!next && filter !== "past" && (
            <div className="mt-card" style={{ padding: "32px", textAlign: "center", color: "#7A8088" }}>예정된 여행이 아직 없어요.</div>
          )}

          <div className="mt-row3">
            {minis.map((t) => (
              <article className="mt-card mt-cpr" key={t.id}>
                <div className="mt-cth" style={{ background: bgOf(t.days[0]?.placeIds[0] ?? t.id) }}>
                  <ImageIco style={{ color: "rgba(255,255,255,.7)" }} />
                </div>
                <div className="mt-ctx">
                  <div className="mt-ct1">
                    <span className="mt-ctt">{t.title}</span>
                    {t.status === "upcoming" ? (
                      <span className="mt-tag mt-c">{ddayLabel(t)}</span>
                    ) : (
                      <span className="mt-tag mt-n">다녀옴</span>
                    )}
                  </div>
                  <div className="mt-ctd">{fmtShort(t.start)}{t.end !== t.start ? ` ~ ${fmtShort(t.end)}` : ""}</div>
                  <div className="mt-ctd">여행지 {t.placeCount}곳</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-two">
          <section>
            <div className="mt-sh">
              <div className="mt-h2">찜한 여행지<small>하트를 누른 곳 {wishes.length}곳</small></div>
            </div>
            {wishes.length === 0 && (
              <div className="mt-card" style={{ padding: "32px", textAlign: "center", color: "#7A8088" }}>
                아직 찜한 여행지가 없어요. 여행지 리뷰에서 하트를 눌러 보세요.
              </div>
            )}
            <div className="mt-g3">
              {wishes.slice(0, 6).map((pid) => (
                <article className="mt-card mt-sv" key={pid}>
                  <div className="mt-ph" style={{ height: "96px", background: bgOf(pid) }}>
                    <ImageIco size={28} style={{ color: "rgba(255,255,255,.7)" }} />
                    <span className="mt-hrt" style={{ cursor: "pointer" }} onClick={() => unwish(pid)} title="찜 취소">
                      <HeartIco />
                    </span>
                  </div>
                  <div className="mt-sb">
                    <Link to={`/community/places/${pid}/reviews`} className="mt-sn" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
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
          </section>

          <section className="mt-vcol" ref={pastRef}>
            <div className="mt-sh">
              <div className="mt-h2">지난 여행지<small>다녀온 곳 {stats.visited}</small></div>
            </div>
            <section className="mt-card mt-vlist2">
              {past.length === 0 && <div style={{ padding: "24px", color: "#7A8088", textAlign: "center" }}>아직 다녀온 여행지가 없어요.</div>}
              {past.slice(0, 5).map((v) => (
                <div className="mt-vr2" key={v.tripTitle + v.placeId}>
                  <span className="mt-vd">{fmtShort(v.date)}</span>
                  <div className="mt-vm">
                    <div className="mt-vp2">{nameOf(v.placeId)}</div>
                    <div className="mt-vs">{v.tripTitle}</div>
                  </div>
                  {v.reviewed ? (
                    <span className="mt-tag mt-g"><CheckIco /> 리뷰 작성</span>
                  ) : (
                    <Link className="mt-btn mt-sm mt-ol" style={{ textDecoration: "none" }} to={`/community/write?type=review&placeId=${v.placeId}`}>
                      리뷰 쓰기
                    </Link>
                  )}
                </div>
              ))}
            </section>
          </section>
        </div>
      </div>

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
