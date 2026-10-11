import { Link, useParams } from "react-router-dom";
import "./ReviewDetail.css";
import { Thumb, Chat, ChevDown, ChevRight, Heart, ImageIcon } from "./Icons.jsx";
import { posts, places, profiles, reviewDetails, GRADIENTS } from "./data/mockPosts.js";

export default function ReviewDetail() {
  const { id } = useParams();
  const post = posts.find((p) => String(p.id) === id && p.type === "review");
  const detail = reviewDetails[id];

  if (!post || !detail) {
    return (
      <div className="cmp-root">
        <div className="cmp-wrap">
          <p style={{ padding: "80px 0", textAlign: "center" }}>글을 찾을 수 없어요.</p>
        </div>
      </div>
    );
  }

  const profile = profiles[post.author];
  const photoBg = [post.thumb?.bg || GRADIENTS[0], GRADIENTS[1], GRADIENTS[2]];

  return (
    <div className="cmp-root">
      <div className="cmp-wrap">
        <div className="cmp-crumb">
          커뮤니티 <ChevRight /> 리뷰 <ChevRight /> <b>여행 리뷰</b>
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
                <span className="cmp-muted">{post.time} · {detail.visited} · 조회 {detail.views}</span>
              </div>

              <div className="cmp-muted" style={{ fontSize: "13px", fontWeight: "600", marginTop: "20px" }}>
                태그한 여행지 {post.placeIds.length}곳
              </div>
              {post.placeIds.map((pid, i) => {
                const pl = places[pid];
                return (
                  <div className="cmp-plc3" style={{ marginTop: i === 0 ? "8px" : "10px" }} key={pid}>
                    <div className="cmp-mth2" style={{ background: pl.bg }}><ImageIcon size={22} /></div>
                    <div className="cmp-pc3t">
                      <b>{pl.name}</b>
                      <span>{pl.addr} · 리뷰 {pl.reviews}</span>
                    </div>
                    <span className="cmp-btn cmp-nv cmp-sm"><Heart /> 찜</span>
                    <Link className="cmp-btn cmp-ol cmp-sm" to={`/community/places/${pid}/reviews`}>
                      이 여행지 리뷰 보기
                    </Link>
                  </div>
                );
              })}

              {detail.body.map((t, i) => (
                <p className="cmp-qb" style={i ? { marginTop: "12px" } : undefined} key={i}>{t}</p>
              ))}

              <div className="cmp-mos">
                <div className="cmp-mA" style={{ background: photoBg[0] }}><ImageIcon size={40} /></div>
                <div className="cmp-mB" style={{ background: photoBg[1] }}><ImageIcon size={28} /></div>
                <div className="cmp-mC" style={{ background: photoBg[2] }}>
                  <ImageIcon size={28} />
                  <span className="cmp-mo"><b>+{detail.photoMore}</b></span>
                </div>
              </div>

              <div className="cmp-rvf">
                <span><Thumb /> {post.likes}</span>
                <span>공유</span>
              </div>
            </article>

            <div className="cmp-ah">
              <div className="cmp-h2">댓글 {post.comments}</div>
              <span className="cmp-pl3 cmp-sortc">최신순 <ChevDown /></span>
            </div>
            <div className="cmp-card cmp-wbox" style={{ marginTop: "0", marginBottom: "16px" }}>
              <div className="cmp-wph" style={{ height: "64px" }}>댓글을 남겨보세요.</div>
              <div className="cmp-wbt"><span className="cmp-btn cmp-co">등록</span></div>
            </div>
            <div className="cmp-rvl">
              {detail.comments.map((c) => (
                <article className="cmp-an" key={c.name + c.text}>
                  <div className="cmp-rvh">
                    <span className="cmp-av">{c.name[0]}</span>
                    <b>{c.name}</b>
                    <span className="cmp-sp"></span>
                    <span className="cmp-muted">{c.time}</span>
                  </div>
                  <p>{c.text}</p>
                  <div className="cmp-rvf">
                    <span><Thumb /> {c.likes}</span>
                    <span><Chat /> {c.replies}</span>
                  </div>
                  {c.reply && (
                    <div className="cmp-rep">
                      <div className="cmp-rvh">
                        <span className="cmp-av">{c.reply.name[0]}</span>
                        <b>{c.reply.name}</b>
                        {c.reply.name === post.author && <span className="cmp-wr2">작성자</span>}
                      </div>
                      <p>{c.reply.text}</p>
                    </div>
                  )}
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
                  <div className="cmp-pfs">{profile.joined} 가입</div>
                </div>
              </div>
              <div className="cmp-pfst">
                <div><b>{profile.reviews}</b><span>리뷰</span></div>
                <div><b>{profile.trips}</b><span>다녀온 여행지</span></div>
                <div><b>{profile.likes}</b><span><Thumb /></span></div>
              </div>
              <div className="cmp-pfr">
                <small>최근 다녀온 여행지</small>
                <div className="cmp-tg">
                  {profile.recent.map((r) => <span key={r}>{r}</span>)}
                </div>
              </div>
              <div className="cmp-pfb">
                <span className="cmp-p1">{post.author}의 리뷰 모아보기</span>
                <span className="cmp-p2">다녀온 여행 보기</span>
              </div>
            </div>

            <div className="cmp-card cmp-sd" style={{ marginTop: "16px" }}>
              <div className="cmp-h2s">이 여행지의 다른 리뷰</div>
              {detail.related.map((r, i) => (
                <div className="cmp-rr" style={i === detail.related.length - 1 ? { border: "0" } : undefined} key={r.title}>
                  <div className="cmp-rr2" style={{ color: "var(--ink)", fontWeight: "600" }}>{r.title}</div>
                  <div className="cmp-rr3"><Thumb /> {r.likes}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
