import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUser, loadOverview, addPlaceToTrip, fmtShort } from "./api.js";

// "일정에 추가" — 내 예정된 여행 중 하나를 골라 여행지를 넣어요
export default function AddToTripModal({ placeId, placeName, onClose, onAdded }) {
  const user = getUser();
  const [trips, setTrips] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    loadOverview(user.userId)
      .then((d) => setTrips(d.trips.filter((t) => t.status === "upcoming")))
      .catch((e) => {
        setMsg(e.message);
        setTrips([]);
      });
  }, []);

  async function add(tripId) {
    try {
      await addPlaceToTrip(tripId, user.userId, Number(placeId));
      onAdded?.();
      alert("일정에 추가했어요.");
      onClose();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(23,37,54,.45)", zIndex: 100, display: "grid", placeItems: "center", padding: "16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "20px", padding: "28px", boxShadow: "0 24px 60px rgba(23,37,54,.3)", color: "#1E3042", fontFamily: "Pretendard,'Noto Sans KR',sans-serif" }}
      >
        <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-.03em" }}>어느 여행에 추가할까요?</div>
        <div style={{ fontSize: "14px", color: "#7A8088", marginTop: "6px" }}>{placeName}</div>

        {!user && (
          <p style={{ marginTop: "20px" }}>
            로그인이 필요해요. <Link to="/login" style={{ color: "#E8695A", fontWeight: 700 }}>로그인하러 가기</Link>
          </p>
        )}
        {user && trips === null && <p style={{ marginTop: "20px", color: "#7A8088" }}>불러오는 중…</p>}
        {user && trips && trips.length === 0 && (
          <p style={{ marginTop: "20px", color: "#7A8088" }}>{msg || "예정된 여행이 아직 없어요."}</p>
        )}
        {user && trips && trips.length > 0 && (
          <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
            {trips.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid #EEE8DC", borderRadius: "14px", padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t.title}</div>
                  <div style={{ fontSize: "13px", color: "#7A8088" }}>{fmtShort(t.start)} ~ {fmtShort(t.end)} · 여행지 {t.placeCount}곳</div>
                </div>
                <span
                  onClick={() => add(t.id)}
                  style={{ cursor: "pointer", background: "#E8695A", color: "#fff", fontWeight: 700, fontSize: "13px", borderRadius: "10px", padding: "8px 14px" }}
                >
                  추가
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <span onClick={onClose} style={{ cursor: "pointer", color: "#7A8088", fontSize: "14px" }}>닫기</span>
        </div>
      </div>
    </div>
  );
}
