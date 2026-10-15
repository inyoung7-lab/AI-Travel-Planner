import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./QuestionDetail.css";
import { Pin, Thumb, Chat, Check, ChevDown, ChevRight } from "./Icons.jsx";
import { loadPost, getUser, postComment, sendLike } from "./data/api.js";
import CommentBox from "./CommentBox.jsx";
import DeleteButton from "./DeleteButton.jsx";

export default function QuestionDetail() {
  const { id } = useParams();
  const [data, setData] = useState(undefined); // undefined = 불러오는 중, null = 글 없음
  const counted = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const first = counted.current !== id; // 조회수는 처음 열 때 한 번만 올려요
    counted.current = id;
    setData(undefined);
    loadPost(id, "question", first).then(setData);
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
      setData(await loadPost(id, "question", false));
    } catch (e) {
      alert(e.message);
    }
  }
  const likeStyle = (on) => ({ cursor: "pointer", color: on ? "var(--coral)" : undefined, fontWeight: on ? 700 : undefined });

  async function submitAnswer(content) {
    const user = getUser();
    if (!user) {
      alert("로그인이 필요해요.");
      navigate("/login");
      return false;
    }
    try {
      await postComment(id, user.userId, content);
      setData(await loadPost(id, "question", false));
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  }

  if (data === undefined) return <div className="cmq-root"><div className="cmq-wrap" /></div>;

  if (data === null) {
    return (
      <div className="cmq-root">
        <div className="cmq-wrap">
          <p style={{ padding: "80px 0", textAlign: "center" }}>글을 찾을 수 없어요. (삭제되었을 수 있어요)</p>
          <p style={{ textAlign: "center" }}><Link to="/community" style={{ color: "#E8695A", fontWeight: 700 }}>커뮤니티로 돌아가기</Link></p>
        </div>
      </div>
    );
  }

  const { post, body, comments: list, profile, similar } = data;

  return (
    <div className="cmq-root">
      <div className="cmq-wrap">
        <div className="cmq-crumb"><Link to="/community" style={{ color: "inherit", textDecoration: "none" }}>커뮤니티</Link> <ChevRight /> <b>질문</b></div>
        <div className="cmq-main2">
          <section>
            <article className="cmq-card cmq-qq">
              <div className="cmq-qh">
                <span className="cmq-cat cmq-q"><i></i>질문</span>
                {post.answers > 0 ? (
                  <span className="cmq-tag cmq-g"><Check /> 답변 {post.answers}</span>
                ) : (
                  <span className="cmq-tag cmq-n">답변 대기</span>
                )}
              </div>
              <h1>{post.title}</h1>
              <div className="cmq-qm">
                <span className="cmq-av">{post.author[0]}</span>
                <b>{post.author}</b>
                <span className="cmq-muted">{post.time} · 조회 {post.views}</span>
                {post.region && <span className="cmq-plc2"><Pin /> {post.region}</span>}
              </div>
              {body.map((t, i) => (
                <p className="cmq-qb" style={i ? { marginTop: "12px" } : undefined} key={i}>{t}</p>
              ))}
              <div className="cmq-rvf">
                <span onClick={() => toggleLike("post", post.id)} style={likeStyle(post.liked)}><Thumb /> {post.likes}</span>
                <span><Chat /> {list.length}</span>
                <DeleteButton post={post} />
              </div>
            </article>

            <div className="cmq-ah">
              <div className="cmq-h2">답변 {list.length}개</div>
              
            </div>
            <CommentBox prefix="cmq" placeholder="답변을 남겨보세요." onSubmit={submitAnswer} />
            <div className="cmq-rvl">
              {list.length === 0 && (
                <p className="cmq-muted" style={{ textAlign: "center", padding: "32px 0" }}>
                  아직 답변이 없어요. 첫 답변을 남겨보세요.
                </p>
              )}
              {list.map((a, ai) => (
                <article className="cmq-an" key={ai}>
                  <div className="cmq-rvh">
                    <span className="cmq-av">{a.name[0]}</span>
                    <b>{a.name}</b>
                    <span className="cmq-sp"></span>
                    <span className="cmq-muted">{a.time}</span>
                  </div>
                  <p>{a.text}</p>
                  <div className="cmq-rvf">
                    <span onClick={() => { if (a.id) toggleLike("comment", a.id); }} style={likeStyle(a.liked)}><Thumb /> {a.likes}</span>
                    <span><Chat /> {a.replyCount}</span>
                  </div>
                  {a.replyList.map((rp, ri) => (
                    <div className="cmq-rep" key={ri}>
                      <div className="cmq-rvh">
                        <span className="cmq-av">{rp.name[0]}</span>
                        <b>{rp.name}</b>
                        {rp.name === post.author && <span className="cmq-wr2">작성자</span>}
                      </div>
                      <p>{rp.text}</p>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>

          <aside>
            <div className="cmq-card cmq-sd cmq-pfc">
              <div className="cmq-h2s" style={{ marginBottom: "14px" }}>작성자</div>
              <div className="cmq-pfh">
                <div className="cmq-pfa">{post.author[0]}</div>
                <div>
                  <div className="cmq-pfn">{post.author}</div>
                  {profile.joined && <div className="cmq-pfs">{profile.joined} 가입</div>}
                </div>
              </div>
              <div className="cmq-pfst">
                {post.authorId ? (
                  <Link to={`/community?author=${encodeURIComponent(post.authorId)}&name=${encodeURIComponent(post.author)}&type=review`} style={{ textDecoration: "none", color: "inherit", cursor: "pointer", textAlign: "center", display: "block" }} title={`${post.author}의 여행 리뷰 모아보기`}>
                    <b>{profile.reviews}</b><span>여행 리뷰 ›</span>
                  </Link>
                ) : (
                  <div><b>{profile.reviews}</b><span>여행 리뷰</span></div>
                )}
                <div><b>{profile.trips}</b><span>다녀온 여행지</span></div>
                <div><b>{profile.likes}</b><span><Thumb /></span></div>
              </div>
              {profile.recent?.length > 0 && (
              <div className="cmq-pfr">
                <small>최근 다녀온 여행지</small>
                <div className="cmq-tg">
                  {profile.recent.map((r) => <span key={r}>{r}</span>)}
                </div>
              </div>
              )}
              
            </div>

            <div className="cmq-card cmq-sd" style={{ marginTop: "16px" }}>
              <div className="cmq-h2s">비슷한 질문</div>
              {similar.length === 0 && <p className="cmq-muted" style={{ marginTop: "12px" }}>비슷한 질문이 아직 없어요.</p>}
              {similar.map((q, i) => (
                <Link
                  className="cmq-rr"
                  to={q.id ? `/community/questions/${q.id}` : "#"}
                  style={{ textDecoration: "none", color: "inherit", ...(i === similar.length - 1 ? { border: "0" } : {}) }}
                  key={q.title + i}
                >
                  <div className="cmq-rr2" style={{ color: "var(--ink)", fontWeight: "600" }}>{q.title}</div>
                  <div className="cmq-rr3">답변 {q.answers}</div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
