import { createHash } from "node:crypto";
import oracledb from "oracledb";
import { getConnection } from "../db.js";

let tablePromise;

async function ensureTable() {
  if (!tablePromise) tablePromise = (async () => {
    const connection = await getConnection();
    try {
      try {
        await connection.execute(`CREATE TABLE COMM_EXTERNAL_RESPONSE_CACHE (
          cache_key VARCHAR2(64 CHAR) PRIMARY KEY,
          payload CLOB NOT NULL,
          stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
      } catch (error) {
        if (error.errorNum !== 955) throw error;
      }
    } finally { await connection.close(); }
  })().catch((error) => { tablePromise = null; throw error; });
  return tablePromise;
}

function hashedKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

export function createOracleResponseCache({ connect = getConnection } = {}) {
  return {
    async get(key, maxAgeMs) {
      await ensureTable();
      const connection = await connect();
      try {
        const result = await connection.execute(
          "SELECT payload, stored_at FROM COMM_EXTERNAL_RESPONSE_CACHE WHERE cache_key = :key",
          { key: hashedKey(key) },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { PAYLOAD: { type: oracledb.STRING } } },
        );
        const row = result.rows[0];
        if (!row || Date.now() - new Date(row.STORED_AT).getTime() > maxAgeMs) return null;
        try { return JSON.parse(row.PAYLOAD); } catch { return null; }
      } finally { await connection.close(); }
    },
    async set(key, value) {
      await ensureTable();
      const connection = await connect();
      try {
        await connection.execute(
          `MERGE INTO COMM_EXTERNAL_RESPONSE_CACHE c
           USING (SELECT :key AS cache_key FROM dual) s ON (c.cache_key = s.cache_key)
           WHEN MATCHED THEN UPDATE SET payload = :payload, stored_at = CURRENT_TIMESTAMP
           WHEN NOT MATCHED THEN INSERT (cache_key, payload, stored_at) VALUES (:key, :payload, CURRENT_TIMESTAMP)`,
          { key: hashedKey(key), payload: { val: JSON.stringify(value), type: oracledb.CLOB } },
        );
        await connection.commit();
      } finally { await connection.close(); }
    },
  };
}

export const oracleResponseCache = createOracleResponseCache();
