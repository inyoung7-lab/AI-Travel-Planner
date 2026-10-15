import express from "express";
import oracledb from "oracledb";
import { getConnection } from "./db.js";

// 커뮤니티(수민) API — /api/community
const router = express.Router();

const GRADIENTS = [
  "linear-gradient(135deg,#8FA4BA,#5B7491)",
  "linear-gradient(135deg,#F2DFC9,#D9B48F)",
  "linear-gradient(135deg,#EFCFC4,#D9A595)",
  "linear-gradient(135deg,#BFCEDD,#8CA3BA)",
];

function typeOf(category, sub) {
  if (category === "리뷰") return sub === "장소 리뷰" ? "place" : "review";
  if (category === "질문") return "question";
  return "talk";
}

function timeAgo(date) {
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  return day === 1 ? "어제" : `${day}일 전`;
}

// 글 목록 (홈 첫 페이지)
router.get("/posts", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const opt = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const main = await connection.execute(
      `SELECT p.post_id, p.category, p.sub_category, p.title,
              DBMS_LOB.SUBSTR(p.content, 150, 1) AS excerpt,
              p.region, p.rating, p.like_count, p.created_at, m.user_name,
              (SELECT COUNT(*) FROM COMM_COMMENT c WHERE c.post_id = p.post_id) AS cmt,
              (SELECT COUNT(*) FROM COMM_COMMENT c WHERE c.post_id = p.post_id AND c.parent_id IS NULL) AS ans
         FROM COMM_POST p
         JOIN MEMBER m ON m.user_id = p.user_id
        ORDER BY p.created_at DESC
        FETCH FIRST 20 ROWS ONLY`,
      [],
      opt
    );

    const ids = main.rows.map((r) => r.POST_ID);
    const placeMap = {};
    const imgMap = {};
    const topMap = {};

    if (ids.length > 0) {
      const binds = ids.map((_, i) => `:${i + 1}`).join(",");

      const pl = await connection.execute(
        `SELECT post_id, place_id FROM COMM_POST_PLACE WHERE post_id IN (${binds}) ORDER BY pp_id`,
        ids, opt
      );
      pl.rows.forEach((r) => (placeMap[r.POST_ID] ||= []).push(r.PLACE_ID));

      const im = await connection.execute(
        `SELECT post_id, COUNT(*) AS cnt FROM COMM_POST_IMAGE WHERE post_id IN (${binds}) GROUP BY post_id`,
        ids, opt
      );
      im.rows.forEach((r) => (imgMap[r.POST_ID] = r.CNT));

      const tp = await connection.execute(
        `SELECT post_id, DBMS_LOB.SUBSTR(content, 100, 1) AS content FROM (
           SELECT c.post_id, c.content,
                  ROW_NUMBER() OVER (PARTITION BY c.post_id ORDER BY c.like_count DESC, c.created_at) AS rn
             FROM COMM_COMMENT c
            WHERE c.parent_id IS NULL AND c.post_id IN (${binds}))
          WHERE rn = 1`,
        ids, opt
      );
      tp.rows.forEach((r) => (topMap[r.POST_ID] = r.CONTENT));
    }

    const posts = main.rows.map((r) => {
      const type = typeOf(r.CATEGORY, r.SUB_CATEGORY);
      const post = {
        id: r.POST_ID,
        type,
        title: r.TITLE,
        excerpt: r.EXCERPT,
        likes: r.LIKE_COUNT,
        comments: r.CMT,
        author: r.USER_NAME,
        time: timeAgo(r.CREATED_AT),
      };
      if (r.REGION) post.region = r.REGION;
      if (placeMap[r.POST_ID]) post.placeIds = placeMap[r.POST_ID];
      if (type === "place" && r.RATING) post.rating = Number(r.RATING);
      if (type === "question") {
        post.answers = r.ANS;
        if (topMap[r.POST_ID]) post.topAnswer = { label: "인기 답변", text: topMap[r.POST_ID] };
      }
      if (imgMap[r.POST_ID]) {
        post.thumb = { bg: GRADIENTS[r.POST_ID % GRADIENTS.length], more: imgMap[r.POST_ID] - 1 };
      }
      return post;
    });

    res.json(posts);
  } catch (err) {
    console.error("[community] posts 오류:", err.message);
    res.status(500).json({ message: "글 목록을 불러오지 못했어요." });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

export default router;
