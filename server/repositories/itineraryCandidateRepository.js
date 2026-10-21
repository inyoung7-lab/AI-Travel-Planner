import oracledb from "oracledb";
import { getConnection } from "../db.js";

export const ITINERARY_AREA_CODES = {
  서울: "1", 인천: "2", 대전: "3", 대구: "4", 광주: "5", 부산: "6", 울산: "7", 세종: "8",
  경기: "31", 강원: "32", 충북: "33", 충남: "34", 경북: "35", 경남: "36", 전북: "37", 전남: "38", 제주: "39",
};

const TYPES = { food: { contentTypeId: "39", label: "음식점" }, lodging: { contentTypeId: "32", label: "숙소" } };

export async function listStoredItineraryCandidates(region) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT candidate_type, content_id, name, address, lat, lng, image
       FROM COMM_ITINERARY_CANDIDATE WHERE region = :region
       ORDER BY candidate_type, sort_order`,
      { region }, { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const byType = { food: [], lodging: [] };
    for (const row of result.rows) {
      const type = row.CANDIDATE_TYPE;
      if (!byType[type]) continue;
      byType[type].push({
        id: `tourapi:${row.CONTENT_ID}`, type: TYPES[type].label,
        name: row.NAME, address: row.ADDRESS,
        lat: row.LAT, lng: row.LNG, image: row.IMAGE,
        description: "", url: `/places/tourapi/${row.CONTENT_ID}`,
      });
    }
    return byType;
  } finally { await connection.close(); }
}

export async function ensureItineraryCandidateTable(connection) {
  try {
    await connection.execute(`CREATE TABLE COMM_ITINERARY_CANDIDATE (
      region VARCHAR2(20 CHAR) NOT NULL,
      candidate_type VARCHAR2(10 CHAR) NOT NULL,
      content_id VARCHAR2(30 CHAR) NOT NULL,
      name VARCHAR2(300 CHAR) NOT NULL,
      address VARCHAR2(500 CHAR),
      lat NUMBER,
      lng NUMBER,
      image VARCHAR2(1500 CHAR),
      sort_order NUMBER NOT NULL,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT comm_itinerary_candidate_pk PRIMARY KEY (region, candidate_type, content_id)
    )`);
  } catch (error) {
    if (error.errorNum !== 955) throw error;
  }
}

export async function syncItineraryCandidates({ fetchImpl = fetch } = {}) {
  if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error("TOUR_API_SERVICE_KEY가 필요합니다.");
  const connection = await getConnection();
  const counts = {};
  try {
    await ensureItineraryCandidateTable(connection);
    for (const [region, areaCode] of Object.entries(ITINERARY_AREA_CODES)) {
      counts[region] = {};
      for (const [type, config] of Object.entries(TYPES)) {
        const url = new URL(`${(process.env.TOUR_API_BASE_URL || "https://apis.data.go.kr/B551011/KorService2").replace(/\/$/, "")}/areaBasedList2`);
        for (const [key, value] of Object.entries({
          serviceKey: process.env.TOUR_API_SERVICE_KEY,
          MobileOS: "ETC", MobileApp: process.env.TOUR_API_MOBILE_APP || "AITravelPlanner",
          _type: "json", numOfRows: "60", pageNo: "1", arrange: "Q", areaCode,
          contentTypeId: config.contentTypeId,
        })) url.searchParams.set(key, value);
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`${region}/${type}: TourAPI HTTP ${response.status}`);
        const payload = await response.json();
        if (payload?.response?.header?.resultCode !== "0000") throw new Error(`${region}/${type}: TourAPI 응답 오류`);
        const rows = payload?.response?.body?.items?.item || [];
        const selected = (Array.isArray(rows) ? rows : [rows])
          .filter((row) => row.contentid && row.title && row.addr1 && String(row.areacode) === areaCode)
          .slice(0, 10).map((row, index) => ({
            region, type, contentId: String(row.contentid), name: String(row.title).slice(0, 300),
            address: String(row.addr1).slice(0, 500), lat: Number(row.mapy) || null, lng: Number(row.mapx) || null,
            image: ["Type1", "Type3"].includes(row.cpyrhtDivCd) ? String(row.firstimage || row.firstimage2 || "").slice(0, 1500) || null : null,
            sortOrder: index,
          }));
        if (!selected.length) throw new Error(`${region}/${type}: 저장할 후보가 없어 기존 목록을 유지합니다.`);
        await connection.execute("DELETE FROM COMM_ITINERARY_CANDIDATE WHERE region = :region AND candidate_type = :type", { region, type });
        await connection.executeMany(
          `INSERT INTO COMM_ITINERARY_CANDIDATE
           (region, candidate_type, content_id, name, address, lat, lng, image, sort_order)
           VALUES (:region, :type, :contentId, :name, :address, :lat, :lng, :image, :sortOrder)`, selected,
        );
        await connection.commit();
        counts[region][type] = selected.length;
      }
    }
    return counts;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { await connection.close(); }
}
