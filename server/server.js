import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import loginRouter from "./login.js";
import communityRouter from "./community.js";
import mytripRouter from "./mytrip.js";
import { createSearchHandler } from "./search.js";
import { createTravelPlaceRepository } from "./repositories/travelPlaceRepository.js";
import { createSearchHistoryRepository, isOracleConnectionConfigured } from "./repositories/searchHistoryRepository.js";
import { createJsonSearchHistoryRepository } from "./repositories/jsonSearchHistoryRepository.js";
import { loadBrowserCookieSecret, createBrowserIdentityMiddleware } from "./browserIdentity.js";
import { createHomeRecommendationsHandler } from "./recommendations/handlers.js";
import { getConnection } from "./db.js";

// Resolve configuration from the repository root, independent of the shell's working directory.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const serverDirectory = fileURLToPath(new URL(".", import.meta.url));
const dataDirectory = resolve(serverDirectory, "data");
const historyStoreMode = process.env.TRAVEL_SEARCH_HISTORY_STORE || "json";
const historyFilePath = resolve(dataDirectory, "search-history.json");

let searchHistoryRepository = null;
let browserIdentityMiddleware = (_req, _res, next) => next();
if (historyStoreMode === "json") {
  searchHistoryRepository = createJsonSearchHistoryRepository({ filePath: historyFilePath });
  await searchHistoryRepository.initialize();
  if (process.env.NODE_ENV === "production" && !process.env.TRAVEL_BROWSER_COOKIE_SECRET) {
    throw new Error("Production requires a stable TRAVEL_BROWSER_COOKIE_SECRET from the server environment.");
  }
  const secret = await loadBrowserCookieSecret({
    filePath: resolve(dataDirectory, "browser-cookie-secret"),
  });
  browserIdentityMiddleware = createBrowserIdentityMiddleware({ secret });
} else if (historyStoreMode === "oracle" && isOracleConnectionConfigured()) {
  searchHistoryRepository = createSearchHistoryRepository({ getConnection });
} else if (historyStoreMode !== "oracle" && historyStoreMode !== "disabled") {
  throw new Error("TRAVEL_SEARCH_HISTORY_STORE must be json, oracle, or disabled.");
}

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/login", loginRouter);
app.use("/api/community", communityRouter);
app.use("/api/mytrip", mytripRouter);
const placeRepository = createTravelPlaceRepository();
app.post("/api/search", browserIdentityMiddleware, createSearchHandler(placeRepository, { historyRepository: searchHistoryRepository }));
app.get("/api/recommendations", browserIdentityMiddleware, createHomeRecommendationsHandler(placeRepository, { historyRepository: searchHistoryRepository }));

app.listen(3000, () => {
  console.log("서버 실행중: http://localhost:3000");
});
