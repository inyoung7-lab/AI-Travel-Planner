// Usage: node server/import-tour-places.js [--apply] [--per-region=5]
// Without --apply, preview the TourAPI attractions that would be added.
import dotenv from "dotenv";
import oracledb from "oracledb";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { getConnection } from "./db.js";
import { normalizeTravelRegion } from "../shared/travelRegions.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const REGIONS = [
  ["서울", "1"], ["경기", "31"], ["인천", "2"], ["강원", "32"],
  ["충북", "33"], ["충남", "34"], ["대전", "3"], ["세종", "8"],
  ["전북", "37"], ["전남", "38"], ["광주", "5"], ["경북", "35"],
  ["경남", "36"], ["대구", "4"], ["울산", "7"], ["부산", "6"], ["제주", "39"],
];

function normalizedName(value) {
  return String(value || "").normalize("NFKC").replace(/[\s()[\]·-]/g, "").toLocaleLowerCase("ko-KR");
}

export function chooseAttractions(items, existing, region, areaCode, limit) {
  const seen = new Set(existing.map((place) => `${place.region}:${normalizedName(place.name)}`));
  const eligible = items.filter((item) => String(item.contenttypeid) === "12"
    && String(item.areacode) === areaCode && /^\d+$/.test(String(item.contentid))
    && item.title?.trim() && item.addr1?.trim()
    && Number(item.mapx) && Number(item.mapy)
    && (normalizeTravelRegion(item.addr1) === region
      || (["전남", "광주"].includes(region) && item.addr1.startsWith("전남광주통합특별시"))));
  eligible.sort((a, b) => Number(Boolean(b.firstimage || b.firstimage2)) - Number(Boolean(a.firstimage || a.firstimage2)));
  const chosen = [];
  for (const item of eligible) {
    const name = item.title.trim();
    const nameKey = `${region}:${normalizedName(name)}`;
    if (seen.has(nameKey) || existing.some((place) => place.extKey === `tourapi:${item.contentid}`)) continue;
    seen.add(nameKey);
    chosen.push({
      name: name.slice(0, 200),
      address: [item.addr1, item.addr2].filter(Boolean).join(" ").slice(0, 300),
      region,
      lat: Number(item.mapy),
      lng: Number(item.mapx),
      extKey: `tourapi:${item.contentid}`,
    });
    if (chosen.length >= limit) break;
  }
  return chosen;
}

async function fetchAttractions(areaCode) {
  const url = new URL(`${(process.env.TOUR_API_BASE_URL || "https://apis.data.go.kr/B551011/KorService2").replace(/\/$/, "")}/areaBasedList2`);
  for (const [key, value] of Object.entries({
    serviceKey: process.env.TOUR_API_SERVICE_KEY,
    MobileOS: "ETC",
    MobileApp: process.env.TOUR_API_MOBILE_APP || "AITravelPlanner",
    _type: "json",
    numOfRows: "100",
    pageNo: "1",
    arrange: "Q",
    areaCode,
    contentTypeId: "12",
  })) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}`);
  const payload = await response.json();
  const header = payload?.response?.header;
  if (header?.resultCode !== "0000") throw new Error(`TourAPI 응답 코드 ${header?.resultCode || "없음"}`);
  const items = payload?.response?.body?.items?.item || [];
  return Array.isArray(items) ? items : [items];
}

export async function importTourPlaces({ apply = false, perRegion = 5 } = {}) {
  if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error("TOUR_API_SERVICE_KEY가 설정되지 않았습니다.");
  if (!Number.isInteger(perRegion) || perRegion < 1 || perRegion > 50) throw new Error("perRegion은 1~50이어야 합니다.");
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      "SELECT name, region, ext_key FROM COMM_PLACE",
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const existing = result.rows.map((row) => ({ name: row.NAME, region: normalizeTravelRegion(row.REGION), extKey: row.EXT_KEY }));
    const selected = [];
    for (const [region, areaCode] of REGIONS) {
      const items = await fetchAttractions(areaCode);
      const places = chooseAttractions(items, existing, region, areaCode, perRegion);
      selected.push(...places);
      console.log(`${region}: ${places.length}곳`, places.map((place) => place.name).join(", "));
    }
    if (apply && selected.length) {
      try {
        await connection.executeMany(
          `INSERT INTO COMM_PLACE (name, address, region, lat, lng, ext_key)
           VALUES (:name, :address, :region, :lat, :lng, :extKey)`,
          selected,
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
    console.log(`${apply ? "추가 완료" : "추가 예정"}: ${selected.length}곳`);
    return selected;
  } finally {
    await connection.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const perRegion = Number(process.argv.find((arg) => arg.startsWith("--per-region="))?.split("=")[1] || 5);
  importTourPlaces({ apply: process.argv.includes("--apply"), perRegion })
    .catch((error) => { console.error("관광지 가져오기 실패:", error.message); process.exitCode = 1; });
}
