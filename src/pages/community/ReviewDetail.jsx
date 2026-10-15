import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./ReviewDetail.css";
import { Thumb, Chat, ChevDown, ChevRight, Heart, ImageIcon } from "./Icons.jsx";
import { places, GRADIENTS } from "./data/mockPosts.js";
import { loadPost, getUser, postComment, sendLike, toggleWish } from "./data/api.js";
import CommentBox from "./CommentBox.jsx";

export default function ReviewDetail() {
  const { id } = useParams();
  const [data, setData] = useState(undefined); // undefined = 불러오는 중, null = 글 없음
  const counted = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const first = counted.current !== id; // 조회수는 처음 열 때 한 번만 올려요
    counted.current = id;
    setData(undefined);
    loadPost(id, "review", first).then(setData);
  }, [id]);

  async function toggleLike(kind, targetId) {
    const user = getUser();
    if (!user) {
      alert("로그인이 필요해요.");
      navigate("/login");
      return;
    }
    try {
      await sendLike(kind, targetId, user.userId);
      setData(await loadPost(id, "review", false));
    } catch (e) {
      alert(e.message);
    }
  }
  async function wish(placeId) {
    const user = getUser();
    if (!user) {
      alert("로그인이 필요해요.");
      navigate("/login");
      return;
    }
    try {
      await toggleWish(placeId, user.userId);
      setData(await loadPost(id, "review", false));
    } catch (e) {
      alert(e.message);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("링크를 복사했어요.");
    } catch {
      alert("링크를 복사하지 못했어요.");
    }
  }
  const likeStyle = (on) => ({ cursor: "pointer", color: on ? "var(--coral)" : undefined, fontWeight: on ? 700 : undefined });

  async function submitComment(content) {
    const user = getUser();
    if (!user) {
      alert("로그인이 필요해요.");
      navigate("/login");
      return false;
    }
    try {
      await postComment(id, user.userId, content);
      setData(await loadPost(id, "review", false));
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  }

  if (data === undefined) return <div className="cmp-root"><div className="cmp-wrap" /></div>;

  if (data === null) {
    return (
      <div className="cmp-root">
        <div className="cmp-wrap">
          <p style={{ padding: "80px 0", textAlign: "center" }}>글을 찾을 수 없어요.</p>
        </div>
      </div>
    );
  }

  const { post, body, photoCount, photoMore, comments, profile, related } = data;
  const placeIds = post.placeIds ?? [];
  const photoBg = [post.thumb?.bg || GRADIENTS[0], GRADIENTS[1], GRADIENTS[2]];

  return (
    <div className="cmp-root">
      <div className="cmp-wrap">
        <div className="cmp-crumb">
          <Link to="/community" style={{ color: "inherit", textDecoration: "none" }}>커뮤니티</Link> <ChevRight /> 리뷰 <ChevRight /> <b>여행 리뷰</b>
        </div>
        <div className="cmp-main2">
          <section>
            <article className="cmp-card cmp-qq">
              <div className="cmp-qh">
                <span className="cmp-cat cmp-r"><i></i>여행 리뷰</span>
              </div>
              <h1>{post.title}</h1>
              <div className="cmp-qm">
                <span className="cmp-av">{post.author[0]}</span>
                <b>{post.author}</b>
                <span className="cmp-muted">{post.time}{post.visited ? ` · ${post.visited}` : ""} · 조회 {post.views}</span>
              </div>

              <div className="cmp-muted" style={{ fontSize: "13px", fontWeight: "600", marginTop: "20px" }}>
                태그한 여행지 {placeIds.length}곳
              </div>
              {placeIds.map((pid, i) => {
                const base = places[pid] ?? { name: `여행지 ${pid}`, addr: "", bg: GRADIENTS[0] };
                const pl = { ...base, reviews: data.placeReviews?.[pid] ?? base.reviews ?? 0 };
                return (
                  <div className="cmp-plc3" style={{ marginTop: i === 0 ? "8px" : "10px" }} key={pid}>
                    <div className="cmp-mth2" style={{ background: pl.bg }}><ImageIcon size={22} /></div>
                    <div className="cmp-pc3t">
                      <b>{pl.name}</b>
                      <span>{pl.addr ? `${pl.addr} · ` : ""}리뷰 {pl.reviews}</span>
                    </div>
                    <span
                      className="cmp-btn cmp-nv cmp-sm"
                      style={{ cursor: "pointer", ...((data.wishedPlaceIds ?? []).includes(pid) ? { borderColor: "#E8695A" } : {}) }}
                      onClick={() => wish(pid)}
                    >
                      <Heart filled={(data.wishedPlaceIds ?? []).includes(pid)} /> 찜
                    </span>
                    <Link className="cmp-btn cmp-ol cmp-sm" to={`/community/places/${pid}/reviews`}>
                      이 여행지 리뷰 보기
                    </Link>
                  </div>
                );
              })}

              {body.map((t, i) => (
                <p className="cmp-qb" style={i ? { marginTop: "12px" } : undefined} key={i}>{t}</p>
              ))}

              {photoCount > 0 && (
              <div className="cmp-mos">
                <div className="cmp-mA" style={{ background: photoBg[0] }}><ImageIcon size={40} /></div>
                <div className="cmp-mB" style={{ background: photoBg[1] }}><ImageIcon size={28} /></div>
                <div className="cmp-mC" style={{ background: photoBg[2] }}>
                  <ImageIcon size={28} />
                  {photoMore > 0 && <span className="cmp-mo"><b>+{photoMore}</b></span>}
                </div>
              </div>
              )}

              <div className="cmp-rvf">
                <span onClick={() => toggleLike("post", post.id)} style={likeStyle(post.liked)}><Thumb /> {post.likes}</span>
                <span onClick={share} style={{ cursor: "pointer" }}>공유</span>
              </div>
            </article>

            <div className="cmp-ah">
              <div className="cmp-h2">댓글 {post.comments}</div>
              <span className="cmp-pl3 cmp-sortc">최신순 <ChevDown /></span>
            </div>
            <CommentBox prefix="cmp" placeholder="댓글을 남겨보세요." onSubmit={submitComment} />
            <div className="cmp-rvl">
              {comments.map((c, ci) => (
                <article className="cmp-an" key={ci}>
                  <div className="cmp-rvh">
                    <span className="cmp-av">{c.name[0]}</span>
                    <b>{c.name}</b>
                    <span className="cmp-sp"></span>
                    <span className="cmp-muted">{c.time}</span>
                  </div>
                  <p>{c.text}</p>
                  <div className="cmp-rvf">
                    <span onClick={() => { if (c.id) toggleLike("comment", c.id); }} style={likeStyle(c.liked)}><Thumb /> {c.likes}</span>
                    <span><Chat /> {c.replyCount}</span>
                  </div>
                  {c.replyList.map((rp, ri) => (
                    <div className="cmp-rep" key={ri}>
                      <div className="cmp-rvh">
                        <span className="cmp-av">{rp.name[0]}</span>
                        <b>{rp.name}</b>
                        {rp.name === post.author && <span className="cmp-wr2">작성자</span>}
                      </div>
                      <p>{rp.text}</p>
                    </div>
                  ))}
                </article>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
              <span className="cmp-btn cmp-nv">댓글 더보기 <ChevDown /></span>
            </div>
          </section>

          <aside>
            <div className="cmp-card cmp-sd cmp-pfc">
              <div className="cmp-h2s" style={{ marginBottom: "14px" }}>작성자</div>
              <div className="cmp-pfh">
                <div className="cmp-pfa">{post.author[0]}</div>
                <div>
                  <div className="cmp-pfn">{post.author}</div>
                  {profile.joined && <div className="cmp-pfs">{profile.joined} 가입</div>}
                </div>
              </div>
              <div className="cmp-pfst">
                <div><b>{profile.reviews}</b><span>리뷰</span></div>
                <div><b>{profile.trips}</b><span>다녀온 여행지</span></div>
                <div><b>{profile.likes}</b><span><Thumb /></span></div>
              </div>
              {profile.recent?.length > 0 && (
              <div className="cmp-pfr">
                <small>최근 다녀온 여행지</small>
                <div className="cmp-tg">
                  {profile.recent.map((r) => <span key={r}>{r}</span>)}
                </div>
              </div>
              )}
              <div className="cmp-pfb">
                {post.authorId ? (
                  <Link className="cmp-p1" style={{ textDecoration: "none" }} to={`/community?author=${encodeURIComponent(post.authorId)}&name=${encodeURIComponent(post.author)}`}>
                    {post.author}의 리뷰 모아보기
                  </Link>
                ) : (
                  <span className="cmp-p1">{post.author}의 리뷰 모아보기</span>
                )}
                <span className="cmp-p2">다녀온 여행 보기</span>
              </div>
            </div>

            <div className="cmp-card cmp-sd" style={{ marginTop: "16px" }}>
              <div className="cmp-h2s">이 여행지의 다른 리뷰</div>
              {related.length === 0 && <p className="cmp-muted" style={{ marginTop: "12px" }}>아직 다른 리뷰가 없어요.</p>}
              {related.map((r, i) => (
                <Link
                  className="cmp-rr"
                  to={r.id ? `/community/reviews/${r.id}` : "#"}
                  style={{ textDecoration: "none", color: "inherit", ...(i === related.length - 1 ? { border: "0" } : {}) }}
                  key={r.title + i}
                >
                  <div className="cmp-rr2" style={{ color: "var(--ink)", fontWeight: "600" }}>{r.title}</div>
                  <div className="cmp-rr3"><Thumb /> {r.likes}</div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
