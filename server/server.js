import express from "express";
import cors from "cors";

import loginRouter from "./login.js";
import communityRouter from "./community.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/login", loginRouter);
app.use("/api/community", communityRouter);

app.listen(3000, () => {
  console.log("서버 실행중: http://localhost:3000");
});