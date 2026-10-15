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

    // 걸러내기: ?category=all|review|trip|place|question|talk  &region=서울 …
    const where = [];
    const fbinds = {};
    const cat = req.query.category;
    if (cat === "review") where.push("p.category = '리뷰'");
    else if (cat === "trip") where.push("p.category = '리뷰' AND p.sub_category = '여행 리뷰'");
    else if (cat === "place") where.push("p.category = '리뷰' AND p.sub_category = '장소 리뷰'");
    else if (cat === "question") where.push("p.category = '질문'");
    else if (cat === "talk") where.push("p.category = '소통'");
    const region = req.query.region;
    if (region && region !== "전체") {
      where.push("p.region = :region");
      fbinds.region = region;
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const main = await connection.execute(
      `SELECT p.post_id, p.category, p.sub_category, p.title,
              DBMS_LOB.SUBSTR(p.content, 150, 1) AS excerpt,
              p.region, p.rating, p.like_count, p.created_at,
              COALESCE(m.user_name, p.user_id) AS user_name,
              (SELECT COUNT(*) FROM COMM_COMMENT c WHERE c.post_id = p.post_id) AS cmt,
              (SELECT COUNT(*) FROM COMM_COMMENT c WHERE c.post_id = p.post_id AND c.parent_id IS NULL) AS ans
         FROM COMM_POST p
         LEFT JOIN MEMBER m ON m.user_id = p.user_id
        ${whereSql}
        ORDER BY p.created_at DESC
        FETCH FIRST 20 ROWS ONLY`,
      fbinds,
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

// 글 하나 (리뷰 상세·질문 상세) — /api/community/posts/:id   (?view=1 이면 조회수 +1)
router.get("/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ message: "글을 찾을 수 없어요." });

  let connection;
  try {
    connection = await getConnection();
    const opt = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    if (req.query.view === "1") {
      await connection.execute(
        "UPDATE COMM_POST SET view_count = view_count + 1 WHERE post_id = :id",
        { id },
        { autoCommit: true }
      );
    }

    const main = await connection.execute(
      `SELECT p.post_id, p.user_id, p.category, p.sub_category, p.title, p.content,
              p.region, p.rating, p.like_count, p.view_count, p.created_at,
              COALESCE(m.user_name, p.user_id) AS user_name
         FROM COMM_POST p
         LEFT JOIN MEMBER m ON m.user_id = p.user_id
        WHERE p.post_id = :id`,
      { id },
      { ...opt, fetchInfo: { CONTENT: { type: oracledb.STRING } } }
    );
    if (main.rows.length === 0) return res.status(404).json({ message: "글을 찾을 수 없어요." });
    const r = main.rows[0];
    const type = typeOf(r.CATEGORY, r.SUB_CATEGORY);

    // 여행지
    const pl = await connection.execute(
      "SELECT place_id FROM COMM_POST_PLACE WHERE post_id = :id ORDER BY pp_id",
      { id },
      opt
    );
    const placeIds = pl.rows.map((x) => x.PLACE_ID);

    // 여행지별 리뷰 개수
    const placeReviews = {};
    for (const pid of placeIds) {
      const c = await connection.execute(
        "SELECT COUNT(*) AS cnt FROM COMM_POST_PLACE WHERE place_id = :pid",
        { pid },
        opt
      );
      placeReviews[pid] = c.rows[0].CNT;
    }

    // 사진 개수
    const im = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM COMM_POST_IMAGE WHERE post_id = :id",
      { id },
      opt
    );
    const photoCount = im.rows[0].CNT;

    // 댓글 → 부모 댓글(답변)과 대댓글로 묶기
    const cm = await connection.execute(
      `SELECT c.comment_id, c.parent_id, c.content, c.like_count, c.created_at,
              COALESCE(m.user_name, c.user_id) AS user_name
         FROM COMM_COMMENT c
         LEFT JOIN MEMBER m ON m.user_id = c.user_id
        WHERE c.post_id = :id
        ORDER BY c.created_at`,
      { id },
      opt
    );
    const parents = cm.rows.filter((x) => x.PARENT_ID == null);
    const comments = parents.map((x) => {
      const replyList = cm.rows
        .filter((y) => y.PARENT_ID === x.COMMENT_ID)
        .map((y) => ({ name: y.USER_NAME, text: y.CONTENT }));
      return {
        name: x.USER_NAME,
        time: timeAgo(x.CREATED_AT),
        text: x.CONTENT,
        likes: x.LIKE_COUNT,
        replyCount: replyList.length,
        replyList,
        _at: new Date(x.CREATED_AT).getTime(),
      };
    });
    // 리뷰는 최신순, 질문 답변은 추천순
    if (type === "question") comments.sort((a, b) => b.likes - a.likes || a._at - b._at);
    else comments.sort((a, b) => b._at - a._at);
    comments.forEach((c) => delete c._at);

    // 작성자 정보 (가입일·최근 여행지는 DB에 없어서 비워 둬요)
    const pf = await connection.execute(
      `SELECT COUNT(CASE WHEN category = '리뷰' THEN 1 END) AS reviews,
              COALESCE(SUM(like_count), 0) AS likes
         FROM COMM_POST WHERE user_id = :u`,
      { u: r.USER_ID },
      opt
    );
    let trips = 0;
    try {
      const t = await connection.execute(
        "SELECT COUNT(*) AS cnt FROM MYTRIP_PLAN WHERE user_id = :u",
        { u: r.USER_ID },
        opt
      );
      trips = t.rows[0].CNT;
    } catch (e) {
      console.error("[community] trips 오류:", e.message);
    }
    const profile = {
      joined: null,
      reviews: pf.rows[0].REVIEWS,
      trips,
      likes: pf.rows[0].LIKES,
      recent: [],
    };

    // 이 여행지의 다른 리뷰 / 비슷한 질문
    let related = [];
    let similar = [];
    if (type === "review") {
      const rl = await connection.execute(
        `SELECT p2.post_id, p2.title, p2.like_count
           FROM COMM_POST p2
          WHERE p2.category = '리뷰' AND p2.post_id <> :id
            AND p2.post_id IN (
              SELECT b.post_id FROM COMM_POST_PLACE a
                JOIN COMM_POST_PLACE b ON b.place_id = a.place_id
               WHERE a.post_id = :id)
          ORDER BY p2.like_count DESC
          FETCH FIRST 3 ROWS ONLY`,
        { id },
        opt
      );
      related = rl.rows.map((x) => ({ id: x.POST_ID, title: x.TITLE, likes: x.LIKE_COUNT }));
    }
    if (type === "question") {
      const sm = await connection.execute(
        `SELECT p2.post_id, p2.title,
                (SELECT COUNT(*) FROM COMM_COMMENT c WHERE c.post_id = p2.post_id AND c.parent_id IS NULL) AS ans
           FROM COMM_POST p2
          WHERE p2.category = '질문' AND p2.post_id <> :id
          ORDER BY CASE WHEN p2.region = :region THEN 0 ELSE 1 END, p2.created_at DESC
          FETCH FIRST 3 ROWS ONLY`,
        { id, region: r.REGION ?? "" },
        opt
      );
      similar = sm.rows.map((x) => ({ id: x.POST_ID, title: x.TITLE, answers: x.ANS }));
    }

    const post = {
      id: r.POST_ID,
      type,
      title: r.TITLE,
      author: r.USER_NAME,
      time: timeAgo(r.CREATED_AT),
      likes: r.LIKE_COUNT,
      views: r.VIEW_COUNT,
      comments: cm.rows.length,
      placeIds,
    };
    if (r.REGION) post.region = r.REGION;
    if (type === "question") post.answers = parents.length;

    res.json({
      post,
      body: String(r.CONTENT).split(/\n+/).filter(Boolean),
      photoCount,
      photoMore: Math.max(photoCount - 3, 0),
      placeReviews,
      comments,
      profile,
      related,
      similar,
    });
  } catch (err) {
    console.error("[community] post 상세 오류:", err.message);
    res.status(500).json({ message: "글을 불러오지 못했어요." });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

// 댓글·답변 쓰기 — POST /api/community/posts/:id/comments   { userId, content, parentId? }
router.post("/posts/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  const userId = String(req.body?.userId ?? "").trim();
  const content = String(req.body?.content ?? "").trim();
  const parentId = req.body?.parentId == null ? null : Number(req.body.parentId);

  if (!Number.isInteger(id)) return res.status(404).json({ message: "글을 찾을 수 없어요." });
  if (!userId) return res.status(401).json({ message: "로그인이 필요해요." });
  if (content.length === 0) return res.status(400).json({ message: "내용을 입력해 주세요." });
  if (content.length > 1000) return res.status(400).json({ message: "1000자까지 쓸 수 있어요." });

  let connection;
  try {
    connection = await getConnection();
    const opt = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const mem = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM MEMBER WHERE USER_ID = :u", { u: userId }, opt
    );
    if (mem.rows[0].CNT === 0) return res.status(401).json({ message: "회원 정보를 찾을 수 없어요. 다시 로그인해 주세요." });

    const post = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM COMM_POST WHERE post_id = :id", { id }, opt
    );
    if (post.rows[0].CNT === 0) return res.status(404).json({ message: "글을 찾을 수 없어요." });

    if (parentId !== null) {
      const par = await connection.execute(
        "SELECT COUNT(*) AS cnt FROM COMM_COMMENT WHERE comment_id = :pid AND post_id = :id AND parent_id IS NULL",
        { pid: parentId, id }, opt
      );
      if (par.rows[0].CNT === 0) return res.status(400).json({ message: "답글을 달 댓글을 찾을 수 없어요." });
    }

    await connection.execute(
      `INSERT INTO COMM_COMMENT (post_id, user_id, parent_id, content)
       VALUES (:id, :u, :pid, :content)`,
      { id, u: userId, pid: parentId, content },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[community] 댓글 쓰기 오류:", err.message);
    res.status(500).json({ message: "등록하지 못했어요." });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

// 왼쪽 숫자 (카테고리별·지역별 글 개수) — 저장해 두지 않고 매번 세어요
router.get("/counts", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const opt = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const c = await connection.execute(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN category = '리뷰' THEN 1 ELSE 0 END), 0) AS review,
              COALESCE(SUM(CASE WHEN category = '리뷰' AND sub_category = '여행 리뷰' THEN 1 ELSE 0 END), 0) AS trip,
              COALESCE(SUM(CASE WHEN category = '리뷰' AND sub_category = '장소 리뷰' THEN 1 ELSE 0 END), 0) AS place,
              COALESCE(SUM(CASE WHEN category = '질문' THEN 1 ELSE 0 END), 0) AS question,
              COALESCE(SUM(CASE WHEN category = '소통' THEN 1 ELSE 0 END), 0) AS talk
         FROM COMM_POST`,
      [],
      opt
    );
    const r = c.rows[0];

    const g = await connection.execute(
      `SELECT region, COUNT(*) AS cnt FROM COMM_POST WHERE region IS NOT NULL GROUP BY region`,
      [],
      opt
    );
    const regions = {};
    g.rows.forEach((x) => (regions[x.REGION] = x.CNT));

    res.json({
      total: r.TOTAL, review: r.REVIEW, trip: r.TRIP, place: r.PLACE,
      question: r.QUESTION, talk: r.TALK, regions,
    });
  } catch (err) {
    console.error("[community] counts 오류:", err.message);
    res.status(500).json({ message: "글 개수를 불러오지 못했어요." });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

export default router;
