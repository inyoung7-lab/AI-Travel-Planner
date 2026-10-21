import oracledb from "oracledb";
import { getConnection } from "../db.js";
import { classifyTourApiPlace } from "./tourApiCategories.js";
import { normalizeTravelRegion } from "../../shared/travelRegions.js";
import { photoFromRow } from "./placePhotoRepository.js";

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const REQUEST_TIMEOUT = 8000;
const cache = new Map();
const CACHE_MS = 30 * 60 * 1000;
const NEARBY_CATEGORIES = Object.freeze({ food: { contentTypeId: "39", radius: 10000 }, lodging: { contentTypeId: "32", radius: 10000 }, festival: { contentTypeId: "15", radius: 20000 }, sights: { contentTypeId: "12", radius: 10000 } });

export function cleanText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function itemsOf(payload) {
  if (payload?.response?.header?.resultCode !== "0000") throw new Error("TourAPI 응답 오류");
  const item = payload?.response?.body?.items?.item;
  return item ? (Array.isArray(item) ? item : [item]) : [];
}

async function request(operation, params, fetchImpl = fetch) {
  const key = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!key) return [];
  const base = process.env.TOUR_API_BASE_URL?.trim() || BASE_URL;
  const url = new URL(`${base.replace(/\/$/, "")}/${operation}`);
  Object.entries({ serviceKey: key, MobileOS: "ETC", MobileApp: process.env.TOUR_API_MOBILE_APP?.trim() || "AITravelPlanner", _type: "json", numOfRows: "30", pageNo: "1", ...params })
    .forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}`);
  return itemsOf(await response.json());
}

function normalizeName(name) {
  return String(name || "").replace(/\[[^\]]*\]|\([^)]*\)/g, "").replace(/[\s·-]/g, "").toLowerCase();
}

export function selectTourMatch(place, candidates) {
  if (place.extKey === "sample:2") return candidates.find((item) => String(item.contentid) === "127490") || null;
  const name = normalizeName(place.name);
  const shortName = normalizeName(place.name.split(/\s+/).slice(1).join(" "));
  const region = normalizeTravelRegion(place.region);
  if (name.length < 2) return null;
  return candidates.find((item) => {
    const candidateName = normalizeName(item.title);
    if (candidateName !== name && !(shortName.length >= 3 && candidateName === shortName) &&
        !(name.length >= 5 && candidateName.endsWith(name))) return false;
    const address = String(item.addr1 || "");
    const candidateRegion = normalizeTravelRegion(String(item.areacode || "")) || normalizeTravelRegion(address);
    const city = String(place.address || "").match(/[가-힣]+(?:시|군|구)/g)?.at(0);
    return region ? candidateRegion === region || (!candidateRegion && !!city && address.includes(city)) : false;
  }) || null;
}

export async function getTourDetail(contentId, { responseCache = null } = {}) {
  if (!/^\d+$/.test(String(contentId))) return null;
  const key = `tour:${contentId}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  if (responseCache) {
    const stored = await responseCache.get(key, 30 * 24 * 60 * 60 * 1000).catch(() => null);
    if (stored?.contentId === String(contentId)) {
      cache.set(key, { at: Date.now(), value: stored });
      return stored;
    }
  }
  const common = (await request("detailCommon2", { contentId })).at(0);
  if (!common?.title) return null;
  const contentTypeId = String(common.contenttypeid || "12");
  const [introResult, infoResult, imageResult] = await Promise.allSettled([
    request("detailIntro2", { contentId, contentTypeId }),
    request("detailInfo2", { contentId, contentTypeId }),
    request("detailImage2", { contentId, imageYN: "Y", numOfRows: "30" }),
  ]);
  const intro = introResult.status === "fulfilled" ? introResult.value.at(0) || {} : {};
  const info = infoResult.status === "fulfilled" ? infoResult.value : [];
  const images = imageResult.status === "fulfilled" ? imageResult.value : [];
  const permittedPhotoTypes = new Set(["Type1", "Type3"]);
  const mainPhotos = permittedPhotoTypes.has(common.cpyrhtDivCd) ? [common.firstimage, common.firstimage2] : [];
  const fee = info.find((entry) => /입장료|이용요금|요금/.test(entry.infoname || ""));
  const value = {
    source: "tourapi", contentId: String(contentId), name: cleanText(common.title), category: classifyTourApiPlace({ contentTypeId }),
    address: cleanText([common.addr1, common.addr2].filter(Boolean).join(" ")),
    overview: cleanText(common.overview),
    phone: cleanText(common.tel || intro.infocenter || intro.infocenterculture),
    hours: cleanText(intro.usetime || intro.usetimeculture || intro.usetimeleports || intro.opentime),
    closed: cleanText(intro.restdate || intro.restdateculture || intro.restdateleports),
    parking: cleanText(intro.parking || intro.parkingculture || intro.parkingleports),
    fee: cleanText(fee?.infotext || intro.usefee || intro.usefeeculture),
    lat: Number(common.mapy) || null, lng: Number(common.mapx) || null,
    images: [...new Set([...mainPhotos, ...images.filter((item) => permittedPhotoTypes.has(item.cpyrhtDivCd)).map((item) => item.originimgurl || item.smallimageurl)].filter(Boolean))].slice(0, 12),
    imageSource: "한국관광공사 TourAPI",
    extraInfo: info.filter((entry) => entry.infoname && entry.infotext).map((entry) => ({ label: cleanText(entry.infoname), value: cleanText(entry.infotext) })).slice(0, 12),
  };
  cache.set(key, { at: Date.now(), value });
  if (responseCache) await responseCache.set(key, value).catch(() => {});
  return value;
}

export async function getNearbyPlaces({ lat, lng, category, excludeContentId = "", responseCache = null }) {
  const config = NEARBY_CATEGORIES[category];
  if (!config) throw new RangeError("지원하지 않는 주변 장소 분류예요.");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    throw new RangeError("올바른 국내 위치 좌표가 필요해요.");
  }
  const key = `nearby:${category}:${lat.toFixed(5)}:${lng.toFixed(5)}`;
  const cached = cache.get(key);
  let items;
  if (cached && Date.now() - cached.at < CACHE_MS) {
    items = cached.value;
  } else {
    const stored = responseCache
      ? await responseCache.get(key, (category === "festival" ? 1 : 30) * 24 * 60 * 60 * 1000).catch(() => null)
      : null;
    if (Array.isArray(stored)) {
      items = stored;
    } else {
      if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error("TourAPI 인증키가 설정되지 않았어요.");
      const rows = await request("locationBasedList2", {
      mapX: String(lng), mapY: String(lat), radius: String(config.radius), arrange: "E",
      contentTypeId: config.contentTypeId, numOfRows: "30",
      });
      items = rows.filter((item) => item.contentid && item.title).map((item) => ({
        contentId: String(item.contentid), name: cleanText(item.title), category: classifyTourApiPlace(item),
        address: cleanText([item.addr1, item.addr2].filter(Boolean).join(" ")),
        distanceMeters: Number(item.dist) || null,
        image: ["Type1", "Type3"].includes(item.cpyrhtDivCd) ? item.firstimage || item.firstimage2 || null : null,
      }));
      if (responseCache) await responseCache.set(key, items).catch(() => {});
    }
    cache.set(key, { at: Date.now(), value: items });
  }
  return { items: items.filter((item) => item.contentId !== String(excludeContentId)).slice(0, 8), radiusMeters: config.radius };
}

export async function listDbPlaces() {
  const connection = await getConnection();
  try {
    let rows;
    try {
      const result = await connection.execute(
        `SELECT p.place_id, p.name, p.address, p.region, p.ext_key, d.payload,
                ph.photo_path, ph.image_source, ph.source_url, ph.photo_subject,
                ph.is_regional, ph.tour_content_id AS photo_tour_content_id
         FROM COMM_PLACE p LEFT JOIN COMM_PLACE_TOUR_DETAIL d ON d.place_id = p.place_id
         LEFT JOIN COMM_PLACE_PHOTO ph ON ph.place_id = p.place_id
         ORDER BY p.place_id`,
        {}, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { PAYLOAD: { type: oracledb.STRING } } },
      );
      rows = result.rows;
    } catch (error) {
      if (error.errorNum !== 942) throw error;
      const result = await connection.execute("SELECT place_id, name, address, region, ext_key FROM COMM_PLACE ORDER BY place_id", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      rows = result.rows;
    }
    return rows.map(mapDbPlaceListRow);
  } finally { await connection.close(); }
}

export function mapDbPlaceListRow(row) {
  let detail = {};
  try { detail = row.PAYLOAD ? JSON.parse(row.PAYLOAD) : {}; } catch { /* 목록은 상세 데이터가 손상되어도 계속 표시합니다. */ }
  const image = Array.isArray(detail?.images) ? detail.images.find((url) => typeof url === "string" && url.trim()) : null;
  const secureImage = image?.replace(/^http:\/\/tong\.visitkorea\.or\.kr\//i, "https://tong.visitkorea.or.kr/");
  const representative = photoFromRow(row);
  return {
    id: row.PLACE_ID, name: row.NAME, address: row.ADDRESS || "", region: row.REGION || "", extKey: row.EXT_KEY || "",
    image: representative?.image || secureImage || null,
  };
}

export async function getDbPlace(id) {
  const connection = await getConnection();
  let row;
  let storedTour = null;
  try {
    const result = await connection.execute(
      `SELECT p.place_id, p.name, p.address, p.region, p.lat, p.lng, p.ext_key,
              ph.photo_path, ph.image_source, ph.source_url, ph.photo_subject,
              ph.is_regional, ph.tour_content_id AS photo_tour_content_id
       FROM COMM_PLACE p LEFT JOIN COMM_PLACE_PHOTO ph ON ph.place_id = p.place_id
       WHERE p.place_id = :id`,
      { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    row = result.rows[0];
    if (row) {
      try {
        const snapshot = await connection.execute(
          "SELECT content_id, payload FROM COMM_PLACE_TOUR_DETAIL WHERE place_id = :id",
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { PAYLOAD: { type: oracledb.STRING } } },
        );
        const saved = snapshot.rows[0];
        if (saved?.PAYLOAD) {
          const detail = JSON.parse(saved.PAYLOAD);
          const directTourId = /^tourapi:(\d+)$/.exec(row.EXT_KEY || "")?.[1];
          const matchesStoredPlace = detail.name === row.NAME
            && String(detail.tourContentId || detail.contentId) === String(saved.CONTENT_ID);
          if (directTourId === String(saved.CONTENT_ID) || matchesStoredPlace) {
            storedTour = { ...detail, contentId: String(saved.CONTENT_ID) };
          }
        }
      } catch (error) {
        if (error.errorNum !== 942 && !(error instanceof SyntaxError)) throw error;
      }
    }
  } finally { await connection.close(); }
    if (!row) return null;
    const place = { id: row.PLACE_ID, name: row.NAME, address: row.ADDRESS || "", region: row.REGION || "", lat: row.LAT, lng: row.LNG, extKey: row.EXT_KEY || "" };
    const representative = photoFromRow(row);
    const tour = storedTour;
    return {
      source: "db", id: place.id, name: place.name, category: tour?.category || null, address: place.address || tour?.address || "",
      region: place.region, lat: place.lat ?? tour?.lat ?? null, lng: place.lng ?? tour?.lng ?? null,
      coordinateSource: null, coordinateApproximate: false,
      overview: tour?.overview || "", phone: tour?.phone || "", hours: tour?.hours || "", closed: tour?.closed || "",
      parking: tour?.parking || "", fee: tour?.fee || "", images: representative ? [representative.image] : tour?.images || [],
      imageSource: representative?.imageSource || tour?.imageSource || null,
      imageSourceUrl: representative?.imageSourceUrl || null,
      imageSubject: representative?.subject || null,
      imageRegional: !!representative?.regional,
      extraInfo: tour?.extraInfo || [], tourContentId: tour?.contentId || null,
    };
}
