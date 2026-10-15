import express from "express";
import oracledb from "oracledb";
import { getConnection } from "./db.js";

// 나의 여행(수민) API — /api/mytrip
const router = express.Router();

// Oracle DATE → "YYYY-MM-DD"
function iso(d) {
  const x = new Date(d);
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${mm}-${dd}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// 나의 여행 화면에 필요한 모든 것 — GET /api/mytrip/overview?userId=
router.get("/overview", async (req, res) => {
  const userId = String(req.query.userId ?? "").trim();
  if (!userId) return res.status(401).json({ message: "로그인이 필요해요." });

  let connection;
  try {
    connection = await getConnection();
    const opt = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const mem = await connection.execute(
      "SELECT USER_NAME FROM MEMBER WHERE USER_ID = :u", { u: userId }, opt
    );
    if (mem.rows.length === 0) return res.status(401).json({ message: "회원 정보를 찾을 수 없어요. 다시 로그인해 주세요." });
    const name = mem.rows[0].USER_NAME;

    // 여행 일정
    const tr = await connection.execute(
      `SELECT trip_id, title, region, start_date, end_date,
              TRUNC(start_date) - TRUNC(SYSDATE) AS dday,
              CASE WHEN TRUNC(end_date) >= TRUNC(SYSDATE) THEN 'upcoming' ELSE 'past' END AS status
         FROM MYTRIP_PLAN WHERE user_id = :u ORDER BY start_date`,
      { u: userId }, opt
    );
    const pl = await connection.execute(
      `SELECT trip_id, place_id, day_no FROM MYTRIP_PLACE
        WHERE trip_id IN (SELECT trip_id FROM MYTRIP_PLAN WHERE user_id = :u)
        ORDER BY trip_id, day_no, tp_id`,
      { u: userId }, opt
    );

    const trips = tr.rows.map((t) => {
      const rows = pl.rows.filter((p) => p.TRIP_ID === t.TRIP_ID);
      const byDay = new Map();
      rows.forEach((p) => {
        const day = p.DAY_NO ?? 1;
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(p.PLACE_ID);
      });
      const days = [...byDay.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([day, placeIds]) => ({ day, date: iso(addDays(t.START_DATE, day - 1)), placeIds }));
      return {
        id: t.TRIP_ID,
        title: t.TITLE,
        region: t.REGION,
        start: iso(t.START_DATE),
        end: iso(t.END_DATE),
        dday: t.DDAY,
        status: t.STATUS,
        placeCount: new Set(rows.map((p) => p.PLACE_ID)).size,
        days,
      };
    });

    // 찜한 여행지 (최근에 찜한 순)
    const wr = await connection.execute(
      "SELECT place_id FROM MYTRIP_WISH WHERE user_id = :u ORDER BY created_at DESC, wish_id DESC",
      { u: userId }, opt
    );
    const wishes = [...new Set(wr.rows.map((x) => x.PLACE_ID))];

    // 내가 리뷰를 쓴 여행지
    const rv = await connection.execute(
      `SELECT DISTINCT pp.place_id FROM COMM_POST p
         JOIN COMM_POST_PLACE pp ON pp.post_id = p.post_id
        WHERE p.user_id = :u AND p.category = '리뷰'`,
      { u: userId }, opt
    );
    const reviewedSet = new Set(rv.rows.map((x) => x.PLACE_ID));
    const rc = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM COMM_POST WHERE user_id = :u AND category = '리뷰'",
      { u: userId }, opt
    );

    // 지난 여행지 (최근 순)
    const past = [];
    const visited = new Set();
    trips
      .filter((t) => t.status === "past")
      .sort((a, b) => (a.end < b.end ? 1 : -1))
      .forEach((t) => {
        const seen = new Set();
        t.days.forEach((d) =>
          d.placeIds.forEach((pid) => {
            visited.add(pid);
            if (seen.has(pid)) return;
            seen.add(pid);
            past.push({ date: t.end, placeId: pid, tripTitle: t.title, reviewed: reviewedSet.has(pid) });
          })
        );
      });

    res.json({
      user: { id: userId, name },
      stats: { visited: visited.size, reviews: rc.rows[0].CNT, wishes: wishes.length },
      trips,
      wishes,
      past,
    });
  } catch (err) {
    console.error("[mytrip] overview 오류:", err.message);
    res.status(500).json({ message: "나의 여행을 불러오지 못했어요." });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

// 여행지를 내 일정에 추가 — POST /api/mytrip/trips/:tripId/places   { userId, placeId }
router.post("/trips/:tripId/places", async (req, res) => {
  const tripId = Number(req.params.tripId);
  const userId = String(req.body?.userId ?? "").trim();
  const placeId = Number(req.body?.placeId);
  if (!userId) return res.status(401).json({ message: "로그인이 필요해요." });
  if (!Number.isInteger(tripId) || !Number.isInteger(placeId)) return res.status(400).json({ message: "잘못된 요청이에요." });

  let connection;
  try {
    connection = await getConnection();
    const opt = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const own = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM MYTRIP_PLAN WHERE trip_id = :t AND user_id = :u",
      { t: tripId, u: userId }, opt
    );
    if (own.rows[0].CNT === 0) return res.status(404).json({ message: "일정을 찾을 수 없어요." });

    const dup = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM MYTRIP_PLACE WHERE trip_id = :t AND place_id = :p",
      { t: tripId, p: placeId }, opt
    );
    if (dup.rows[0].CNT > 0) return res.status(409).json({ message: "이미 이 일정에 들어 있어요." });

    await connection.execute(
      `INSERT INTO MYTRIP_PLACE (trip_id, place_id, day_no)
       VALUES (:t, :p, (SELECT NVL(MAX(day_no), 1) FROM MYTRIP_PLACE WHERE trip_id = :t))`,
      { t: tripId, p: placeId }
    );
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    console.error("[mytrip] 일정에 추가 오류:", err.message);
    res.status(500).json({ message: "일정에 추가하지 못했어요." });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

export default router;
