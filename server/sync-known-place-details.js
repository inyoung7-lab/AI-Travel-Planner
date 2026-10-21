// Refresh verified TourAPI aliases whose COMM_PLACE ext_key is not a TourAPI ID.
import "dotenv/config";
import oracledb from "oracledb";
import { getConnection } from "./db.js";
import { getTourDetail } from "./repositories/placeDetailRepository.js";

const aliases = [
  { placeId: 2, placeName: "제주 협재해변", contentId: "127490", tourName: "협재해수욕장" },
  { placeId: 3, placeName: "여수 해양케이블카", contentId: "1997202", tourName: "여수 해상케이블카" },
  { placeId: 1003, placeName: "인천 차이나타운", contentId: "264512", tourName: "인천 차이나타운" },
  { placeId: 1017, placeName: "통영 동피랑마을", contentId: "753306", tourName: "동피랑마을" },
];

const connection = await getConnection();
try {
  for (const alias of aliases) {
    const result = await connection.execute(
      "SELECT name FROM COMM_PLACE WHERE place_id = :id", { id: alias.placeId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    if (result.rows[0]?.NAME !== alias.placeName) throw new Error(`DB 장소 불일치: ${alias.placeId}`);
    const tour = await getTourDetail(alias.contentId);
    if (tour?.name !== alias.tourName || tour.category !== "관광지") throw new Error(`TourAPI 장소 불일치: ${alias.placeId}`);
    const detail = { ...tour, name: alias.placeName, tourOriginalName: tour.name, tourContentId: alias.contentId };
    await connection.execute(
      `MERGE INTO COMM_PLACE_TOUR_DETAIL d
       USING (SELECT :placeId AS place_id FROM dual) s ON (d.place_id = s.place_id)
       WHEN MATCHED THEN UPDATE SET content_id = :contentId, payload = :payload, synced_at = CURRENT_TIMESTAMP
       WHEN NOT MATCHED THEN INSERT (place_id, content_id, payload, synced_at)
         VALUES (:placeId, :contentId, :payload, CURRENT_TIMESTAMP)`,
      { placeId: alias.placeId, contentId: alias.contentId, payload: { val: JSON.stringify(detail), type: oracledb.CLOB } },
    );
    await connection.commit();
    console.log(`${alias.placeId}: ${alias.placeName}`);
  }
} catch (error) {
  await connection.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally { await connection.close(); }
