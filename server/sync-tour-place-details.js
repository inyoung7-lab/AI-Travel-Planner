// Usage: node server/sync-tour-place-details.js [--all]
// Refreshes the TourAPI detail snapshot for imported places in COMM_PLACE.
import oracledb from "oracledb";
import { getConnection } from "./db.js";
import { getTourDetail } from "./repositories/placeDetailRepository.js";

export async function syncTourPlaceDetails({ all = false } = {}) {
  const connection = await getConnection();
  try {
    try {
      await connection.execute(`CREATE TABLE COMM_PLACE_TOUR_DETAIL (
        place_id NUMBER(30) PRIMARY KEY REFERENCES COMM_PLACE(place_id),
        content_id VARCHAR2(30 CHAR) NOT NULL,
        payload CLOB NOT NULL,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`);
    } catch (error) {
      if (error.errorNum !== 955) throw error;
    }

    const result = await connection.execute(
      `SELECT p.place_id, p.name, p.ext_key FROM COMM_PLACE p
       WHERE REGEXP_LIKE(p.ext_key, '^tourapi:[0-9]+$')
       ${all ? "" : "AND NOT EXISTS (SELECT 1 FROM COMM_PLACE_TOUR_DETAIL d WHERE d.place_id = p.place_id)"}
       ORDER BY p.place_id`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    let saved = 0;
    const incomplete = [];
    const failed = [];
    for (const row of result.rows) {
      const contentId = row.EXT_KEY.slice("tourapi:".length);
      try {
        const detail = await getTourDetail(contentId);
        if (!detail?.name || detail.category !== "관광지") throw new Error("관광지 상세 응답 없음");
        await connection.execute(
          `MERGE INTO COMM_PLACE_TOUR_DETAIL d
           USING (SELECT :placeId AS place_id FROM dual) s ON (d.place_id = s.place_id)
           WHEN MATCHED THEN UPDATE SET content_id = :contentId, payload = :payload, synced_at = CURRENT_TIMESTAMP
           WHEN NOT MATCHED THEN INSERT (place_id, content_id, payload, synced_at)
             VALUES (:placeId, :contentId, :payload, CURRENT_TIMESTAMP)`,
          { placeId: row.PLACE_ID, contentId, payload: { val: JSON.stringify(detail), type: oracledb.CLOB } },
        );
        await connection.commit();
        saved += 1;
        if (!detail.overview || !detail.images.length) incomplete.push({ id: row.PLACE_ID, name: row.NAME, overview: !!detail.overview, photos: detail.images.length });
      } catch (error) {
        failed.push({ id: row.PLACE_ID, name: row.NAME, reason: error.message });
      }
      if ((saved + failed.length) % 10 === 0) console.log(`${saved + failed.length}/${result.rows.length}곳 처리`);
    }
    console.log(`저장: ${saved}곳, 실패: ${failed.length}곳, 소개·사진 일부 누락: ${incomplete.length}곳`);
    if (incomplete.length) console.log("일부 누락:", incomplete);
    if (failed.length) console.log("실패:", failed);
    if (failed.length) process.exitCode = 1;
    return { saved, failed, incomplete };
  } finally {
    await connection.close();
  }
}

if (process.argv[1]?.endsWith("sync-tour-place-details.js")) {
  syncTourPlaceDetails({ all: process.argv.includes("--all") })
    .catch((error) => { console.error("상세 정보 저장 실패:", error.message); process.exitCode = 1; });
}
