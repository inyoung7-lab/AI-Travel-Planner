import express from "express";
import { getConnection } from "./db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  let connection;

  try {
    const { userId, password } = req.body;

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        USER_ID,
        USER_PASSWORD,
        USER_NAME,
        EMAIL
      FROM MEMBER
      WHERE USER_ID = :userId
        AND USER_PASSWORD = :password
      `,
      {
        userId,
        password,
      }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "아이디 또는 비밀번호가 일치하지 않습니다.",
      });
    }

    const user = result.rows[0];

    return res.json({
      success: true,
      user: {
        userId: user[0],
        name: user[2],
        email: user[3],
      },
    });

  } catch (error) {
    console.error("로그인 오류:", error);

    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

export default router;