// 나의 여행 데이터를 서버(DB)에서 가져와요.
const API = "http://localhost:3000";

// 로그인한 회원 (팀 로그인 화면이 브라우저에 저장해 둔 정보)
export function getUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user"));
    return u && u.userId ? u : null;
  } catch {
    return null;
  }
}

// 실패하면 Error 를 던져요
export async function loadOverview(userId) {
  let r;
  try {
    r = await fetch(`${API}/api/mytrip/overview?userId=${encodeURIComponent(userId)}`);
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || "나의 여행을 불러오지 못했어요.");
  }
  return r.json();
}

// 여행지를 내 일정에 추가 (실패하면 Error)
export async function addPlaceToTrip(tripId, userId, placeId) {
  let r;
  try {
    r = await fetch(`${API}/api/mytrip/trips/${tripId}/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, placeId }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || "추가하지 못했어요.");
  }
}

// "2026-10-17" → "2026.10.17(토)"
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
export function fmtDate(iso, withYear = true, withDow = true) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = DOW[new Date(y, m - 1, d).getDay()];
  return `${withYear ? y + "." : ""}${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}${withDow ? `(${dow})` : ""}`;
}
export const fmtShort = (iso) => fmtDate(iso, false, false); // "10.17"
