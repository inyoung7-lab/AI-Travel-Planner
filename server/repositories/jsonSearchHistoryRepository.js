import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getRecentSearchWindow } from "../recommendations/recentSearchRecommendations.js";

const FILE_VERSION = 1;
const validBrowserId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value);

export class SearchHistoryFileError extends Error {
  constructor(message, code = "SEARCH_HISTORY_FILE_ERROR") {
    super(message);
    this.name = "SearchHistoryFileError";
    this.code = code;
  }
}

function validateRecord(record) {
  if (!validBrowserId(record?.browserId)) {
    throw new SearchHistoryFileError("서버가 발급한 브라우저 식별자가 필요합니다.", "INVALID_BROWSER_ID");
  }
  if (typeof record.queryText !== "string" || !record.queryText.trim() || record.queryText.length > 1000) {
    throw new SearchHistoryFileError("검색어 형식이 올바르지 않습니다.", "INVALID_SEARCH_HISTORY");
  }
  if (!record.conditions || typeof record.conditions !== "object" || Array.isArray(record.conditions)) {
    throw new SearchHistoryFileError("검색 조건 형식이 올바르지 않습니다.", "INVALID_SEARCH_HISTORY");
  }
  if (!Number.isInteger(record.matchedCount) || record.matchedCount < 0
      || !Number.isInteger(record.returnedCount) || record.returnedCount < 0
      || record.returnedCount > record.matchedCount
      || !Array.isArray(record.returnedPlaces)
      || record.returnedPlaces.length !== record.returnedCount) {
    throw new SearchHistoryFileError("검색 결과 건수가 올바르지 않습니다.", "INVALID_SEARCH_HISTORY");
  }
  const seen = new Set();
  const places = record.returnedPlaces.map((place) => {
    if (typeof place?.sourceCode !== "string" || !place.sourceCode.trim() || place.sourceCode.length > 40
        || typeof place.sourcePlaceId !== "string" || !place.sourcePlaceId.trim() || place.sourcePlaceId.length > 120) {
      throw new SearchHistoryFileError("반환 장소의 출처와 원천 ID가 필요합니다.", "INVALID_SEARCH_HISTORY");
    }
    const key = `${place.sourceCode}\u0000${place.sourcePlaceId}`;
    if (seen.has(key)) throw new SearchHistoryFileError("검색 결과에 중복 장소가 있습니다.", "INVALID_SEARCH_HISTORY");
    seen.add(key);
    return { sourceCode: place.sourceCode, sourcePlaceId: place.sourcePlaceId };
  });

  let conditions;
  try { conditions = JSON.parse(JSON.stringify(record.conditions)); } catch {
    throw new SearchHistoryFileError("검색 조건을 JSON으로 저장할 수 없습니다.", "INVALID_SEARCH_HISTORY");
  }
  return {
    browserId: record.browserId,
    queryText: record.queryText.trim(),
    conditions,
    searchedAt: (record.searchedAt instanceof Date ? record.searchedAt : new Date(record.searchedAt || Date.now())).toISOString(),
    matchedCount: record.matchedCount,
    returnedCount: record.returnedCount,
    returnedPlaces: places,
  };
}

function parseFile(contents) {
  let parsed;
  try { parsed = JSON.parse(contents); } catch {
    throw new SearchHistoryFileError("검색 이력 JSON이 손상되어 읽기를 중단했습니다. 원본 파일을 보존하세요.", "SEARCH_HISTORY_CORRUPT");
  }
  if (!parsed || parsed.version !== FILE_VERSION || !Array.isArray(parsed.searches)) {
    throw new SearchHistoryFileError("검색 이력 JSON 구조 또는 버전이 올바르지 않습니다. 원본 파일을 보존하세요.", "SEARCH_HISTORY_CORRUPT");
  }
  for (const entry of parsed.searches) {
    if (!entry || typeof entry.searchId !== "string" || !entry.searchId
        || !validBrowserId(entry.browserId) || typeof entry.queryText !== "string" || !entry.queryText.trim()
        || !entry.conditions || typeof entry.conditions !== "object" || Array.isArray(entry.conditions)
        || Number.isNaN(new Date(entry.searchedAt).getTime())
        || !Number.isInteger(entry.matchedCount) || entry.matchedCount < 0
        || !Number.isInteger(entry.returnedCount) || entry.returnedCount < 0 || entry.returnedCount > entry.matchedCount
        || !Array.isArray(entry.returnedPlaces) || entry.returnedPlaces.length !== entry.returnedCount
        || entry.returnedPlaces.some((place) => typeof place?.sourceCode !== "string" || !place.sourceCode.trim()
          || typeof place.sourcePlaceId !== "string" || !place.sourcePlaceId.trim())) {
      throw new SearchHistoryFileError("검색 이력 항목이 손상되어 읽기를 중단했습니다. 원본 파일을 보존하세요.", "SEARCH_HISTORY_CORRUPT");
    }
  }
  return parsed;
}

export function createJsonSearchHistoryRepository({ filePath, now = () => new Date() } = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) throw new TypeError("A server-side search history file path is required.");
  let queue = Promise.resolve();

  const exclusive = (operation) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };

  async function readStore({ initialize = true } = {}) {
    try {
      return parseFile(await readFile(filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const empty = { version: FILE_VERSION, searches: [] };
      if (initialize) await atomicWrite(empty);
      return empty;
    }
  }

  async function atomicWrite(data) {
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(tempPath, filePath);
    } catch (error) {
      try { await rm(tempPath, { force: true }); } catch { /* preserve the write error */ }
      throw error;
    }
  }

  return {
    scope: "browser",
    filePath,
    async initialize() { return exclusive(async () => { await readStore(); }); },
    async listRecentConditions({ browserId, at = now() } = {}) {
      if (!validBrowserId(browserId)) return [];
      return exclusive(async () => {
        const store = await readStore();
        const { from, to } = getRecentSearchWindow(at);
        return store.searches
          .filter((entry) => entry.browserId === browserId
            && new Date(entry.searchedAt) >= from && new Date(entry.searchedAt) <= to)
          .map((entry) => ({ conditions: entry.conditions, searchedAt: entry.searchedAt }));
      });
    },
    async recordSearch(record) {
      const valid = validateRecord(record);
      return exclusive(async () => {
        const store = await readStore();
        const searchId = randomBytes(12).toString("hex");
        store.searches.push({ searchId, ...valid });
        await atomicWrite(store);
        return { searchId, saved: true };
      });
    },
  };
}
