import oracledb from "oracledb";
import { getConnection } from "../db.js";
import { classifyTourApiPlace } from "./tourApiCategories.js";
import { normalizeTravelRegion } from "../../shared/travelRegions.js";

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

async function geocodePlace(place) {
  const fullName = place.name.replace(/해양케이블카/g, "해상케이블카");
  const parts = fullName.split(/\s+/);
  const shortName = parts.slice(1).join(" ");
  const terms = [...new Set([fullName.replace(/\s/g, ""), shortName, parts[1], place.address].filter(Boolean))];
  const acceptedNames = [normalizeName(place.name), normalizeName(shortName), normalizeName(parts[1]), normalizeName(fullName)];
  const expectedRegion = normalizeTravelRegion(place.region);
  const expectedCity = String(place.address || "").match(/[가-힣]+시/)?.[0];
  for (const term of terms) {
    try {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", term);
      url.searchParams.set("limit", "6");
      url.searchParams.set("bbox", "124.5,33,132,38.7");
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const payload = await response.json();
      const match = (payload.features || []).find((feature) => {
        const properties = feature.properties || {};
        const actualName = normalizeName(properties.name);
        const nameMatches = acceptedNames.some((name) => name.length >= 2 &&
          (actualName === name || (name.length >= 2 && actualName.startsWith(name) && actualName.length <= name.length + 2)));
        const actualRegion = normalizeTravelRegion(properties.state) || normalizeTravelRegion(properties.city);
        const combinedRegion = String(properties.state || "");
        const regionMatches = actualRegion === expectedRegion ||
          (combinedRegion.startsWith("전남광주") && ["전남", "광주"].includes(expectedRegion));
        const cityMatches = !expectedCity || `${properties.city || ""} ${properties.county || ""}`.includes(expectedCity);
        const [lng, lat] = feature.geometry?.coordinates || [];
        return nameMatches && regionMatches && cityMatches && Number.isFinite(lat) && Number.isFinite(lng);
      });
      if (match) return { lat: match.geometry.coordinates[1], lng: match.geometry.coordinates[0] };
    } catch { /* 다른 검색어를 시도합니다. */ }
  }
  return null;
}

export async function getTourDetail(contentId) {
  if (!/^\d+$/.test(String(contentId))) return null;
  const key = `tour:${contentId}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
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
  return value;
}

export async function getNearbyPlaces({ lat, lng, category, excludeContentId = "" }) {
  const config = NEARBY_CATEGORIES[category];
  if (!config) throw new RangeError("지원하지 않는 주변 장소 분류예요.");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    throw new RangeError("올바른 국내 위치 좌표가 필요해요.");
  }
  if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error("TourAPI 인증키가 설정되지 않았어요.");
  const key = `nearby:${category}:${lat.toFixed(5)}:${lng.toFixed(5)}`;
  const cached = cache.get(key);
  let items;
  if (cached && Date.now() - cached.at < CACHE_MS) {
    items = cached.value;
  } else {
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
        `SELECT p.place_id, p.name, p.address, p.region, p.ext_key, d.payload
         FROM COMM_PLACE p LEFT JOIN COMM_PLACE_TOUR_DETAIL d ON d.place_id = p.place_id
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
  return {
    id: row.PLACE_ID, name: row.NAME, address: row.ADDRESS || "", region: row.REGION || "", extKey: row.EXT_KEY || "",
    image: secureImage || (row.EXT_KEY === "sample:2" ? "/images/place-preview/hyeopjae-beach.png" : null),
  };
}

export async function getDbPlace(id) {
  const connection = await getConnection();
  let row;
  let storedTour = null;
  try {
    const result = await connection.execute("SELECT place_id, name, address, region, lat, lng, ext_key FROM COMM_PLACE WHERE place_id = :id", { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    row = result.rows[0];
    if (row && /^tourapi:\d+$/.test(row.EXT_KEY || "")) {
      try {
        const snapshot = await connection.execute(
          "SELECT payload FROM COMM_PLACE_TOUR_DETAIL WHERE place_id = :id",
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { PAYLOAD: { type: oracledb.STRING } } },
        );
        if (snapshot.rows[0]?.PAYLOAD) storedTour = JSON.parse(snapshot.rows[0].PAYLOAD);
      } catch (error) {
        if (error.errorNum !== 942 && !(error instanceof SyntaxError)) throw error;
      }
    }
  } finally { await connection.close(); }
    if (!row) return null;
    const place = { id: row.PLACE_ID, name: row.NAME, address: row.ADDRESS || "", region: row.REGION || "", lat: row.LAT, lng: row.LNG, extKey: row.EXT_KEY || "" };
    let tourId = /^tourapi:(\d+)$/.exec(place.extKey)?.[1];
    if (!tourId && place.extKey === "sample:2") tourId = "127490";
    if (!tourId && process.env.TOUR_API_SERVICE_KEY?.trim()) {
      const matchKey = `match:${place.id}:${place.name}`;
      const cachedMatch = cache.get(matchKey);
      if (cachedMatch && Date.now() - cachedMatch.at < (cachedMatch.value ? CACHE_MS : 5 * 60 * 1000)) {
        tourId = cachedMatch.value;
      } else try {
        const keywords = [...new Set([
          normalizeName(place.name),
          place.name.split(/\s+/).slice(1).join(" "),
          place.name.split(/\s+/)[1],
        ].filter((keyword) => typeof keyword === "string" && keyword.length >= 2))];
        for (const keyword of keywords) {
          const candidates = await request("searchKeyword2", { keyword, numOfRows: "100" });
          tourId = selectTourMatch(place, candidates)?.contentid;
          if (tourId) break;
        }
        cache.set(matchKey, { at: Date.now(), value: tourId || null });
      } catch { /* DB 정보만으로 상세를 표시합니다. */ }
    }
    let tour = storedTour;
    if (tourId && !tour) {
      try { tour = await getTourDetail(tourId); } catch { /* DB 정보만으로 상세를 표시합니다. */ }
    }
    let geocoded = null;
    if (!place.lat && !tour?.lat) {
      const geocodeKey = `geocode:${place.id}:${place.name}:${place.address}`;
      const cachedGeocode = cache.get(geocodeKey);
      if (cachedGeocode && Date.now() - cachedGeocode.at < (cachedGeocode.value ? CACHE_MS : 5 * 60 * 1000)) {
        geocoded = cachedGeocode.value;
      } else {
        geocoded = await geocodePlace(place);
        cache.set(geocodeKey, { at: Date.now(), value: geocoded });
      }
    }
    return {
      source: "db", id: place.id, name: place.name, category: tour?.category || null, address: place.address || tour?.address || "",
      region: place.region, lat: place.lat ?? tour?.lat ?? geocoded?.lat ?? null, lng: place.lng ?? tour?.lng ?? geocoded?.lng ?? null,
      coordinateSource: geocoded ? "OpenStreetMap 기반 주소 검색" : null, coordinateApproximate: !!geocoded,
      overview: tour?.overview || "", phone: tour?.phone || "", hours: tour?.hours || "", closed: tour?.closed || "",
      parking: tour?.parking || "", fee: tour?.fee || "", images: tour?.images || [],
      imageSource: tour?.imageSource || null, extraInfo: tour?.extraInfo || [], tourContentId: tour?.contentId || null,
    };
}
