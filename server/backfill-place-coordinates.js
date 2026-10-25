import { getConnection } from "./db.js";

// Verified against TourAPI searchKeyword2. The three broad areas use
// OpenStreetMap administrative/quarter centers; Odongdo uses its OSM feature.
const coordinates = [
  [1, "제주 애월", 33.450790, 126.375200],
  [2, "제주 협재해변", 33.393746, 126.239431],
  [3, "여수 해양케이블카", 34.730797, 127.739326],
  [4, "여수 오동도", 34.745035, 127.767093],
  [5, "순천만 국가정원", 34.928603, 127.499699],
  [6, "순천 낙안읍성", 34.906062, 127.341728],
  [7, "부산 흰여울문화마을", 35.079890, 129.043540],
  [8, "서울 성수동", 37.540480, 127.056010],
  [1001, "경복궁", 37.576031, 126.976722],
  [1002, "북촌한옥마을", 37.578999, 126.986690],
  [1003, "인천 차이나타운", 37.475600, 126.617900],
  [1004, "수원 화성행궁", 37.281816, 127.016373],
  [1005, "설악산 국립공원", 38.167524, 128.516800],
  [1006, "속초 해수욕장", 38.190549, 128.601933],
  [1007, "세종호수공원", 36.498999, 127.270199],
  [1008, "한밭수목원", 36.368583, 127.386252],
  [1009, "단양 도담삼봉", 37.000295, 128.344801],
  [1010, "공주 공산성", 36.462950, 127.126791],
  [1011, "전주 한옥마을", 35.818273, 127.153613],
  [1012, "광주 양림동 역사문화마을", 35.138350, 126.914410],
  [1013, "대구 김광석 다시그리기길", 35.861416, 128.607461],
  [1014, "경주 불국사", 35.792302, 129.331725],
  [1015, "경주 황리단길", 35.837408, 129.209954],
  [1016, "울산 간절곶", 35.358967, 129.360574],
  [1017, "통영 동피랑마을", 34.845346, 128.427647],
  [1018, "부산 감천문화마을", 35.097461, 129.010597],
  [1019, "제주 성산일출봉", 33.458080, 126.941500],
];

let connection;
try {
  connection = await getConnection();
  let updated = 0;
  for (const [id, name, lat, lng] of coordinates) {
    const result = await connection.execute(
      `UPDATE COMM_PLACE SET lat = :lat, lng = :lng
       WHERE place_id = :id AND name = :name AND (lat IS NULL OR lng IS NULL)`,
      { id, name, lat, lng },
    );
    if (result.rowsAffected > 1) throw new Error(`Unexpected update count for ${id}`);
    updated += result.rowsAffected;
  }
  const { rows } = await connection.execute(
    `SELECT COUNT(*) total, SUM(CASE WHEN lat IS NULL OR lng IS NULL THEN 1 ELSE 0 END) missing
     FROM COMM_PLACE`,
  );
  if (Number(rows[0][1]) !== 0) throw new Error(`${rows[0][1]} places still lack coordinates`);
  await connection.commit();
  console.log(JSON.stringify({ updated, total: rows[0][0], missing: rows[0][1] }));
} catch (error) {
  if (connection) await connection.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
}
