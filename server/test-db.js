import { getConnection } from "./db.js";

let connection;

try {
  connection = await getConnection();

  console.log("Oracle DB 연결 성공");

  const result = await connection.execute(
    `SELECT * FROM MEMBER`
  );

  console.log(result.rows);

} catch (error) {
  console.error("DB 연결 실패");
  console.error(error);

} finally {
  if (connection) {
    await connection.close();
  }
}