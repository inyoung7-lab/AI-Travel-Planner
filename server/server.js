import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import loginRouter from "./login.js";
import { createSearchHandler } from "./search.js";
import { createTravelPlaceRepository } from "./repositories/travelPlaceRepository.js";
import { createSearchHistoryRepository, isOracleConnectionConfigured } from "./repositories/searchHistoryRepository.js";
import { getConnection } from "./db.js";

// Resolve configuration from the repository root, independent of the shell's working directory.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/login", loginRouter);
const searchHistoryRepository = isOracleConnectionConfigured()
  ? createSearchHistoryRepository({ getConnection })
  : null;
app.post("/api/search", createSearchHandler(createTravelPlaceRepository(), { historyRepository: searchHistoryRepository }));

app.listen(3000, () => {
  console.log("서버 실행중: http://localhost:3000");
});
