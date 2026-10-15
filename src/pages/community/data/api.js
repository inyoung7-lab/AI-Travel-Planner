// 글 상세를 서버(DB)에서 가져와요. 서버가 꺼져 있으면 예시 데이터(mockPosts)로 대신 보여줘요.
import { posts, profiles, reviewDetails, questionDetails, places as placeTable, placeInfo as placeInfoTable, GRADIENTS } from "./mockPosts.js";

const API = "http://localhost:3000";

// 장소 상세 페이지 주소 — 장소 페이지를 만드는 팀원 화면의 주소로 바꾸면 모든 연결이 한 번에 바뀌어요
export const placeDetailPath = (id) => `/places/${id}`;

// ── 장소 이름·주소 (DB의 COMM_PLACE) ──
// 화면들은 예시 장소표(placeTable)에서 이름을 찾아요. DB에만 있는 장소는 여기서 채워 넣어요.
const ID_KEYS = new Set(["placeId", "placeIds", "wishedPlaceIds", "wishes"]);
function collectIds(o, out = new Set(), key = "") {
  if (o == null) return out;
  if (typeof o === "number") {
    if (ID_KEYS.has(key)) out.add(o);
  } else if (Array.isArray(o)) {
    o.forEach((v) => collectIds(v, out, key));
  } else if (typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (k === "placeReviews" && v && typeof v === "object") Object.keys(v).forEach((x) => Number(x) && out.add(Number(x)));
      collectIds(v, out, k);
    }
  }
  return out;
}
export async function ensurePlaces(data) {
  try {
    const missing = [...collectIds(data)].filter((id) => !placeTable[id]);
    if (missing.length === 0) return data;
    const r = await fetch(`${API}/api/community/places-by-ids?ids=${missing.join(",")}`);
    if (!r.ok) return data;
    const map = await r.json();
    for (const [id, v] of Object.entries(map)) {
      placeTable[id] = { name: v.name, addr: v.addr, reviews: 0, bg: GRADIENTS[Number(id) % GRADIENTS.length] };
      placeInfoTable[id] = { tags: [], address: v.addr };
    }
  } catch {
    /* 이름을 못 가져와도 화면은 그대로 보여줘요 */
  }
  return data;
}

// 주소의 시·도 이름 → 짧은 지역 이름 (제주특별자치도 → 제주)
const REGION_PREFIX = [
  ["서울", "서울"], ["부산", "부산"], ["대구", "대구"], ["인천", "인천"], ["광주", "광주"], ["대전", "대전"],
  ["울산", "울산"], ["세종", "세종"], ["경기", "경기"], ["강원", "강원"], ["충청북", "충북"], ["충북", "충북"],
  ["충청남", "충남"], ["충남", "충남"], ["전라북", "전북"], ["전북", "전북"], ["전라남", "전남"], ["전남", "전남"],
  ["경상북", "경북"], ["경북", "경북"], ["경상남", "경남"], ["경남", "경남"], ["제주", "제주"],
];
export function regionFromAddr(addr) {
  const t = String(addr || "").trim();
  const hit = REGION_PREFIX.find(([pre]) => t.startsWith(pre));
  return hit ? hit[1] : "";
}

// 저장된 장소 검색 (실패하면 null)
export async function searchLocalPlaces(q) {
  try {
    const r = await fetch(`${API}/api/community/place-search?q=${encodeURIComponent(q)}`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// 무료 주소 검색 (키 필요 없음): 먼저 Photon, 결과가 없거나 실패하면 Nominatim — 둘 다 OpenStreetMap 데이터예요
const joinAddr = (parts) => parts.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" ");
export async function searchOpenPlaces(q) {
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=124.5,33,132,38.7`);
    if (r.ok) {
      const d = await r.json();
      const list = (d.features ?? [])
        .filter((f) => f.properties?.countrycode === "KR" && f.properties?.name)
        .map((f) => {
          const p = f.properties;
          const addr = joinAddr([p.state, p.county, p.city, p.district, p.street && (p.street + (p.housenumber ? " " + p.housenumber : ""))]);
          return {
            name: p.name, addr, region: regionFromAddr(p.state) || regionFromAddr(addr),
            lat: f.geometry?.coordinates?.[1], lng: f.geometry?.coordinates?.[0],
            extKey: `osm:${p.osm_type}${p.osm_id}`,
          };
        });
      if (list.length > 0) return list;
    }
  } catch { /* 다음 방법으로 */ }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&countrycodes=kr&accept-language=ko&limit=8&addressdetails=1`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.map((x) => {
      const a = x.address ?? {};
      const addr = joinAddr([a.state, a.county, a.city || a.town, a.borough || a.suburb || a.village, a.road]);
      return {
        name: x.name || x.display_name.split(",")[0], addr, region: regionFromAddr(a.state) || regionFromAddr(addr),
        lat: Number(x.lat), lng: Number(x.lon),
        extKey: `osm:${String(x.osm_type)[0].toUpperCase()}${x.osm_id}`,
      };
    });
  } catch {
    return [];
  }
}

// 검색에서 고른 장소를 DB에 저장하고 번호를 받아요 (실패하면 Error)
export async function savePlace(p) {
  let r;
  try {
    r = await fetch(`${API}/api/community/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "장소를 저장하지 못했어요.");
  return d.placeId;
}

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
  if (type === "talk") return null;
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
    const qs = [];
    if (countView) qs.push("view=1");
    const me = getUser();
    if (me) qs.push(`userId=${encodeURIComponent(me.userId)}`);
    const r = await fetch(`${API}/api/community/posts/${id}${qs.length ? "?" + qs.join("&") : ""}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("server");
    const d = await r.json();
    if (d.post.type !== type) return null;
    return await ensurePlaces(d);
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

// 좋아요 누르기/취소 (kind: "post" | "comment")
export async function sendLike(kind, targetId, userId) {
  const path = kind === "post" ? `posts/${targetId}/like` : `comments/${targetId}/like`;
  let r;
  try {
    r = await fetch(`${API}/api/community/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || "처리하지 못했어요.");
  }
  return r.json();
}

// 이번 달 인기 여행지 (실패하면 null)
export async function loadHot() {
  try {
    const r = await fetch(`${API}/api/community/hot-places`);
    return r.ok ? await ensurePlaces(await r.json()) : null;
  } catch {
    return null;
  }
}

// 글 목록 (params: category, region, sort, q, author, unanswered, limit) — 실패하면 null
export async function loadPostList(params) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  try {
    const r = await fetch(`${API}/api/community/posts?${qs}`);
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? await ensurePlaces(d) : null;
  } catch {
    return null;
  }
}

// 여행지 하나의 리뷰 목록 (실패하면 null)
export async function loadPlace(placeId, sort) {
  const me = getUser();
  const qs = [`sort=${sort}`];
  if (me) qs.push(`userId=${encodeURIComponent(me.userId)}`);
  try {
    const r = await fetch(`${API}/api/community/places/${placeId}?${qs.join("&")}`);
    return r.ok ? await ensurePlaces(await r.json()) : null;
  } catch {
    return null;
  }
}

// 여행지 찜하기/취소 (실패하면 Error)
export async function toggleWish(placeId, userId) {
  let r;
  try {
    r = await fetch(`${API}/api/community/wishes/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, placeId }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || "처리하지 못했어요.");
  }
  return r.json();
}

// 새 글 쓰기 (kind: trip | place | question | talk). 성공하면 { id, kind, placeIds }
export async function createPost(body) {
  let r;
  try {
    r = await fetch(`${API}/api/community/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "등록하지 못했어요.");
  return d;
}

// 내 글 삭제 (실패하면 Error)
export async function deletePost(postId, userId) {
  let r;
  try {
    r = await fetch(`${API}/api/community/posts/${postId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || "삭제하지 못했어요.");
  }
}
