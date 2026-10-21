// Prepare local photo metadata when the API starts. Existing Oracle rows are preserved.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getConnection } from "./db.js";

const sql = await readFile(fileURLToPath(new URL("./sql/02_place_photo_metadata.sql", import.meta.url)), "utf8");
const statements = sql.split(/^\s*\/\s*$/m)
  .map((part) => part.replace(/^--.*$/gm, "").trim()).filter(Boolean);

export async function ensurePlacePhotos() {
  const connection = await getConnection();
  try {
    for (const statement of statements) {
      try { await connection.execute(statement); }
      catch (error) {
        if (!(statement.startsWith("CREATE TABLE") && error.errorNum === 955)) throw error;
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}
