import oracledb from "oracledb";
import { getRecentSearchWindow } from "../recommendations/recentSearchRecommendations.js";

const insertSearchSql = `
  INSERT INTO TRAVEL_SEARCH_LOG (
    actor_key, query_text, conditions_json, matched_count, returned_count
  ) VALUES (
    :actorKey, :queryText, :conditionsJson, :matchedCount, :returnedCount
  )
  RETURNING search_id INTO :searchId
`;

const insertResultsSql = `
  INSERT INTO TRAVEL_SEARCH_PLACE (
    search_id, source_code, source_place_id, result_position
  ) VALUES (
    :searchId, :sourceCode, :sourcePlaceId, :resultPosition
  )
`;

const selectRecentConditionsSql = `
  SELECT conditions_json, searched_at
  FROM TRAVEL_SEARCH_LOG
  WHERE actor_key = :actorKey
    AND actor_key IS NOT NULL
    AND searched_at >= TO_TIMESTAMP_TZ(:windowStart, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM')
    AND searched_at <= TO_TIMESTAMP_TZ(:windowEnd, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM')
  ORDER BY searched_at DESC
`;

export class SearchHistoryInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "SearchHistoryInputError";
    this.code = "INVALID_SEARCH_HISTORY";
  }
}

export function isOracleConnectionConfigured(env = process.env) {
  return Boolean(env.DB_USER?.trim() && env.DB_PASSWORD?.trim() && env.DB_CONNECT_STRING?.trim());
}

function validateSearchRecord(record) {
  const {
    queryText, conditions, matchedCount, returnedCount, returnedPlaces, actorKey = null,
  } = record || {};

  if (typeof queryText !== "string" || !queryText.trim() || queryText.length > 1000) {
    throw new SearchHistoryInputError("검색어 길이 또는 형식이 올바르지 않습니다.");
  }
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) {
    throw new SearchHistoryInputError("검색 조건은 객체여야 합니다.");
  }
  if (!Number.isInteger(matchedCount) || matchedCount < 0
      || !Number.isInteger(returnedCount) || returnedCount < 0 || returnedCount > matchedCount) {
    throw new SearchHistoryInputError("검색 결과 건수가 올바르지 않습니다.");
  }
  if (!Array.isArray(returnedPlaces) || returnedPlaces.length !== returnedCount) {
    throw new SearchHistoryInputError("반환 건수와 결과 목록 수가 일치해야 합니다.");
  }
  if (actorKey !== null && (typeof actorKey !== "string" || actorKey.length > 128)) {
    throw new SearchHistoryInputError("인증 주체 키 형식이 올바르지 않습니다.");
  }

  const seen = new Set();
  const normalizedPlaces = returnedPlaces.map((place, index) => {
    if (!place || typeof place.sourceCode !== "string" || !place.sourceCode.trim()
        || place.sourceCode.length > 40 || typeof place.sourcePlaceId !== "string"
        || !place.sourcePlaceId.trim() || place.sourcePlaceId.length > 120) {
      throw new SearchHistoryInputError("검색 결과에 저장 가능한 원천 코드와 원천 ID가 필요합니다.");
    }
    const uniqueKey = `${place.sourceCode}\u0000${place.sourcePlaceId}`;
    if (seen.has(uniqueKey)) throw new SearchHistoryInputError("검색 결과에 같은 원천 장소가 중복되었습니다.");
    seen.add(uniqueKey);
    return {
      sourceCode: place.sourceCode,
      sourcePlaceId: place.sourcePlaceId,
      resultPosition: index + 1,
    };
  });

  let conditionsJson;
  try {
    conditionsJson = JSON.stringify(conditions);
  } catch {
    throw new SearchHistoryInputError("검색 조건을 JSON으로 변환할 수 없습니다.");
  }

  return {
    actorKey,
    queryText: queryText.trim(),
    conditionsJson,
    matchedCount,
    returnedCount,
    returnedPlaces: normalizedPlaces,
  };
}

function extractSearchId(result) {
  const value = result?.outBinds?.searchId;
  const searchId = Array.isArray(value) ? value[0] : value;
  if (searchId === null || searchId === undefined) {
    throw new Error("Search history insert did not return a search ID.");
  }
  return searchId;
}

export function createSearchHistoryRepository({ getConnection, driver = oracledb } = {}) {
  if (typeof getConnection !== "function") {
    throw new TypeError("Search history repository requires a connection factory.");
  }

  return {
    async listRecentConditions({ actorKey, now = new Date() } = {}) {
      if (typeof actorKey !== "string" || !actorKey.trim() || actorKey.length > 128) {
        throw new SearchHistoryInputError("최근 검색 이력 조회에는 검증된 ACTOR_KEY가 필요합니다.");
      }
      const { from, to } = getRecentSearchWindow(now);
      const connection = await getConnection();

      try {
        const result = await connection.execute(selectRecentConditionsSql, {
          actorKey,
          windowStart: from.toISOString().replace(/Z$/u, "+00:00"),
          windowEnd: to.toISOString().replace(/Z$/u, "+00:00"),
        }, {
          outFormat: driver.OUT_FORMAT_OBJECT,
          fetchInfo: { CONDITIONS_JSON: { type: driver.STRING } },
        });
        const rows = result.rows || [];
        return Promise.all(rows.map(async (row) => {
          let conditionsJson = row.CONDITIONS_JSON ?? row.conditions_json;
          if (conditionsJson && typeof conditionsJson.getData === "function") {
            conditionsJson = await conditionsJson.getData();
          }
          const searchedAt = row.SEARCHED_AT ?? row.searched_at;
          return { conditionsJson, searchedAt };
        }));
      } finally {
        try { await connection.close(); } catch { /* do not expose connection cleanup errors */ }
      }
    },

    async recordSearch(record) {
      const valid = validateSearchRecord(record);
      const connection = await getConnection();
      let committed = false;

      try {
        const result = await connection.execute(insertSearchSql, {
          actorKey: valid.actorKey,
          queryText: valid.queryText,
          conditionsJson: { val: valid.conditionsJson, type: driver.CLOB },
          matchedCount: valid.matchedCount,
          returnedCount: valid.returnedCount,
          searchId: { dir: driver.BIND_OUT, type: driver.NUMBER },
        }, { autoCommit: false });
        const searchId = extractSearchId(result);

        if (valid.returnedPlaces.length > 0) {
          const resultsInsert = await connection.executeMany(insertResultsSql, valid.returnedPlaces.map((place) => ({
            searchId,
            sourceCode: place.sourceCode,
            sourcePlaceId: place.sourcePlaceId,
            resultPosition: place.resultPosition,
          })), {
            autoCommit: false,
            bindDefs: {
              searchId: { type: driver.NUMBER },
              sourceCode: { type: driver.STRING, maxSize: 40 },
              sourcePlaceId: { type: driver.STRING, maxSize: 120 },
              resultPosition: { type: driver.NUMBER },
            },
          });
          if (resultsInsert.rowsAffected !== undefined && resultsInsert.rowsAffected !== valid.returnedPlaces.length) {
            throw new Error("Search history result insert count did not match the returned results.");
          }
        }

        await connection.commit();
        committed = true;
        return { searchId, saved: true };
      } catch (error) {
        if (!committed) {
          try { await connection.rollback(); } catch { /* preserve the original transaction failure */ }
        }
        throw error;
      } finally {
        try { await connection.close(); } catch { /* close errors must not misreport a committed transaction */ }
      }
    },
  };
}
