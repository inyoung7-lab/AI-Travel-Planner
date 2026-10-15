// 글 상세를 서버(DB)에서 가져와요. 서버가 꺼져 있으면 예시 데이터(mockPosts)로 대신 보여줘요.
import { posts, profiles, reviewDetails, questionDetails } from "./mockPosts.js";

const API = "http://localhost:3000";

// 예시 데이터를 서버 응답과 같은 모양으로 바꿔요
function mockDetail(id, type) {
  const post = posts.find((p) => String(p.id) === String(id) && p.type === type);
  if (!post) return null;
  const profile = profiles[post.author] ?? { joined: null, reviews: 0, trips: 0, likes: 0, recent: [] };
  if (type === "review") {
    const d = reviewDetails[id];
    if (!d) return null;
    return {
      post: { ...post, views: d.views, visited: d.visited },
      body: d.body,
      photoCount: 3 + d.photoMore,
      photoMore: d.photoMore,
      comments: d.comments.map((c) => ({
        name: c.name, time: c.time, text: c.text, likes: c.likes,
        replyCount: c.replies, replyList: c.reply ? [c.reply] : [],
      })),
      profile,
      related: d.related,
      similar: [],
    };
  }
  const d = questionDetails[id];
  if (!d) return null;
  return {
    post: { ...post, views: d.views },
    body: [d.body],
    photoCount: 0,
    photoMore: 0,
    comments: d.answersList.map((a) => ({
      name: a.name, time: a.time, text: a.text, likes: a.likes,
      replyCount: a.replies, replyList: a.reply ? [a.reply] : [],
    })),
    profile,
    related: [],
    similar: d.similar,
  };
}

// 반환: 글 데이터 / null(글이 없음)
export async function loadPost(id, type, countView) {
  try {
    const r = await fetch(`${API}/api/community/posts/${id}${countView ? "?view=1" : ""}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("server");
    const d = await r.json();
    return d.post.type === type ? d : null;
  } catch {
    return mockDetail(id, type);
  }
}

// 로그인한 회원 (팀 로그인 화면이 브라우저에 저장해 둔 정보)
export function getUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user"));
    return u && u.userId ? u : null;
  } catch {
    return null;
  }
}

// 댓글·답변 쓰기 (실패하면 Error 를 던져요)
export async function postComment(postId, userId, content, parentId = null) {
  let r;
  try {
    r = await fetch(`${API}/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content, parentId }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || "등록하지 못했어요.");
  }
}
