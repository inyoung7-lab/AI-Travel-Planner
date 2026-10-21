import { CatalogNotConfiguredError } from "./travelPlaceRepository.js";
import { classifyTourApiPlace } from "./tourApiCategories.js";
import { createAsyncTtlCache } from "../asyncTtlCache.js";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const TOUR_API_PAGE_SIZE = 100;
const TOUR_API_MAX_PAGES = 3;
const TOUR_API_TIMEOUT_MS = 8_000;
const TOUR_API_CACHE_TTL_MS = 30 * 60 * 1000;

const areaCodes = {
  서울: "1", 인천: "2", 대전: "3", 대구: "4", 광주: "5", 부산: "6", 울산: "7", 세종: "8",
  경기: "31", 강원: "32", 충북: "33", 충남: "34", 경북: "35", 경남: "36", 전북: "37", 전남: "38", 제주: "39",
};
const contentTypeIds = { 관광지: "12", 문화시설: "14", "축제·공연": "15", 여행코스: "25", 레포츠: "28", 숙박: "32", 숙소: "32", 호텔: "32", 리조트: "32", 펜션: "32", 게스트하우스: "32", 모텔: "32", 민박: "32", 캠핑장: "32", 쇼핑: "38", 음식점: "39", 맛집: "39" };
const placeTypeNames = ["게스트하우스", "캠핑장", "리조트", "펜션", "호텔", "모텔", "민박"];
const themeNames = ["바다", "산", "카페", "정원", "자연", "휴식", "산책", "액티비티"];

export class TourApiError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "TourApiError";
    this.code = code;
    this.status = status;
  }
}

function inferContentType(conditions) {
  const explicitTypes = conditions.types || [];
  const ids = new Set(explicitTypes.map((type) => contentTypeIds[type]).filter(Boolean));
  return ids.size === 1 ? [...ids][0] : undefined;
}

function inferType(item, requestedTypes) {
  const evidence = `${item.title || ""} ${item.cat1 || ""} ${item.cat2 || ""} ${item.cat3 || ""}`.toLocaleLowerCase("ko-KR");
  const explicit = requestedTypes || [];
  for (const name of placeTypeNames) {
    if (evidence.includes(name)) return name;
  }
  if (explicit.length === 1 && explicit[0] === "숙박" && String(item.contenttypeid) === "32") return "숙박";
  if (explicit.length === 1 && explicit[0] === "관광지" && String(item.contenttypeid) === "12") return "관광지";
  return "";
}

function normalizeItem(item, conditions) {
  const sourcePlaceId = String(item.contentid || "");
  if (!sourcePlaceId || !item.title) return null;
  const areaCode = String(item.areacode || "");
  const regionCode = Object.entries(areaCodes).find(([, code]) => code === areaCode)?.[0] || "";
  const region = [item.addr1, item.addr2].filter(Boolean).join(" ") || regionCode;
  const textEvidence = [item.title, item.addr1, item.addr2, item.cat1, item.cat2, item.cat3].filter(Boolean).join(" ");
  const tags = themeNames.filter((theme) => theme === "산"
    ? /(?:^|\s)산(?:$|\s|의|에|으로|속|행)/u.test(textEvidence)
    : textEvidence.includes(theme));
  const image = item.firstimage || item.firstimage2 || null;
  const contentTypeId = String(item.contenttypeid || "");
  const category = classifyTourApiPlace({ contentTypeId });
  const type = inferType(item, conditions.types) || (category === "기타" ? "" : category);
  const reason = conditions.themes.includes("바다") && item.title.includes("바다")
    ? "장소명에 ‘바다’ 포함"
    : "검색 조건 일치";
  return {
    // This is TourAPI's contentid. It is not the team's PLACE_ID and is never used for team detail routing.
    id: `tourapi:${sourcePlaceId}`,
    sourceCode: "KTO_TOURAPI",
    sourcePlaceId,
    contentTypeId,
    category,
    sourceCategoryCodes: {
      cat1: String(item.cat1 || ""),
      cat2: String(item.cat2 || ""),
      cat3: String(item.cat3 || ""),
      lclsSystm1: String(item.lclsSystm1 || ""),
      lclsSystm2: String(item.lclsSystm2 || ""),
      lclsSystm3: String(item.lclsSystm3 || ""),
    },
    name: item.title,
    region,
    regionCode,
    type,
    tags,
    image,
    sourcePhotoUrl: image,
    photoSource: image ? "한국관광공사 TourAPI" : null,
    reason,
  };
}

function extractBody(payload) {
  const header = payload?.response?.header;
  if (!header) throw new TourApiError("TOUR_API_INVALID_RESPONSE", "TourAPI 응답 형식을 확인할 수 없습니다.");
  if (header.resultCode !== "0000") {
    const code = String(header.resultCode);
    if (code === "22" || code === "23") {
      throw new TourApiError("TOUR_API_RATE_LIMIT", "TourAPI 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }
    throw new TourApiError("TOUR_API_UPSTREAM_ERROR", `TourAPI가 요청을 처리하지 못했습니다 (오류 코드 ${code}).`, 502);
  }
  const body = payload.response.body;
  if (!body || body.totalCount == null) {
    throw new TourApiError("TOUR_API_INVALID_RESPONSE", "TourAPI 응답에서 결과 정보를 확인할 수 없습니다.");
  }
  const rawItems = body?.items?.item;
  const items = rawItems == null ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
  const totalCount = Number(body?.totalCount ?? 0);
  if (!Number.isInteger(totalCount) || totalCount < 0) {
    throw new TourApiError("TOUR_API_INVALID_RESPONSE", "TourAPI 결과 건수를 확인할 수 없습니다.");
  }
  return { items, totalCount };
}

export function createTourApiRepository({
  serviceKey = process.env.TOUR_API_SERVICE_KEY,
  mobileApp = process.env.TOUR_API_MOBILE_APP,
  fetchImpl = fetch,
  baseUrl = process.env.TOUR_API_BASE_URL?.trim() || TOUR_API_BASE_URL,
  maxPages = TOUR_API_MAX_PAGES,
  pageSize = TOUR_API_PAGE_SIZE,
  timeoutMs = TOUR_API_TIMEOUT_MS,
  responseCache = null,
} = {}) {
  const cachedListPlaces = createAsyncTtlCache({ ttlMs: TOUR_API_CACHE_TTL_MS });
  return {
    dataSource: "tourapi",
    async listPlaces({ filters = {} } = {}) {
      const missing = [!serviceKey?.trim() && "TOUR_API_SERVICE_KEY", !mobileApp?.trim() && "TOUR_API_MOBILE_APP"].filter(Boolean);
      const conditions = {
        regions: filters.regions || [], types: filters.types || [], themes: filters.themes || [], keywords: filters.keywords || [],
      };
      return cachedListPlaces(JSON.stringify(conditions), async () => {
      const persistentKey = `search:${baseUrl}:${pageSize}:${maxPages}:${JSON.stringify(conditions)}`;
      if (responseCache) {
        const stored = await responseCache.get(persistentKey, 30 * 24 * 60 * 60 * 1000).catch(() => null);
        if (stored?.places && typeof stored.matchCountComplete === "boolean") return stored;
      }
      if (missing.length) {
        throw new CatalogNotConfiguredError("TOUR_API_CONFIGURATION_MISSING", `TourAPI 검색 설정이 필요합니다: ${missing.join(", ")}. 프로젝트 루트 .env를 확인해 주세요.`);
      }
      const areaCode = conditions.regions.length === 1 ? areaCodes[conditions.regions[0]] : undefined;
      const contentTypeId = inferContentType(conditions);
      // TourAPI keyword search accepts one `keyword`; query each recognized theme/text term separately,
      // then apply the exact shared local filter to the union. Never send a natural-language phrase as if
      // area, lodging subtype, and theme had all become server-side filters.
      const terms = [...new Set([...conditions.themes, ...conditions.keywords])];
      const endpoint = terms.length ? "searchKeyword2" : "areaBasedList2";
      const queries = terms.length ? terms : [""];
      const merged = new Map();
      let matchCountComplete = true;

      for (const term of queries) {
        let totalCount = 0;
        let pagesScanned = 0;
        for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
          const url = new URL(`${baseUrl}/${endpoint}`);
          const params = {
            serviceKey, MobileOS: "ETC", MobileApp: mobileApp, _type: "json",
            numOfRows: String(pageSize), pageNo: String(pageNo), arrange: "A",
          };
          if (term) params.keyword = term;
          if (areaCode) params.areaCode = areaCode;
          if (contentTypeId) params.contentTypeId = contentTypeId;
          for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

          let response;
          try {
            response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
          } catch (error) {
            if (error.name === "TimeoutError" || error.name === "AbortError") {
              throw new TourApiError("TOUR_API_TIMEOUT", "TourAPI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.", 504);
            }
            throw new TourApiError("TOUR_API_UNAVAILABLE", "TourAPI에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.", 502);
          }
          if (!response.ok) throw new TourApiError("TOUR_API_HTTP_ERROR", `TourAPI 요청이 실패했습니다 (HTTP ${response.status}).`, 502);
          let payload;
          try { payload = await response.json(); } catch { throw new TourApiError("TOUR_API_INVALID_RESPONSE", "TourAPI가 JSON 응답을 반환하지 않았습니다."); }
          const result = extractBody(payload);
          totalCount = result.totalCount;
          pagesScanned += 1;
          for (const raw of result.items) {
            const place = normalizeItem(raw, conditions);
            if (place) merged.set(place.sourcePlaceId, place);
          }
          if (result.items.length === 0 && totalCount > 0) {
            matchCountComplete = false;
            break;
          }
          if (pagesScanned * pageSize >= totalCount) break;
        }
        if (pagesScanned * pageSize < totalCount) matchCountComplete = false;
      }

      const result = { places: [...merged.values()], matchCountComplete };
      if (responseCache) await responseCache.set(persistentKey, result).catch(() => {});
      return result;
      });
    },
  };
}
