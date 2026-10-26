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
import { createSearchHistoryRepository } from "./repositories/searchHistoryRepository.js";
import { loadBrowserCookieSecret, createBrowserIdentityMiddleware } from "./browserIdentity.js";
import { createHomeRecommendationsHandler } from "./recommendations/handlers.js";
import { databaseError, databaseSession } from "./db.js";
import placeDetailsRouter from "./placeDetails.js";
import itineraryRouter from "./itinerary.js";
import { createActivityRouter, recordSearchActivity } from './siteActivity.js';

// Resolve configuration from the repository root, independent of the shell's working directory.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const serverDirectory = fileURLToPath(new URL(".", import.meta.url));
const dataDirectory = resolve(serverDirectory, "data");
const historyStoreMode = process.env.TRAVEL_SEARCH_HISTORY_STORE || "supabase";

let searchHistoryRepository = null;
let browserIdentityMiddleware = (_req, _res, next) => next();
if (historyStoreMode === "supabase") {
  searchHistoryRepository = createSearchHistoryRepository();
  if (process.env.NODE_ENV === "production" && !process.env.TRAVEL_BROWSER_COOKIE_SECRET) {
    throw new Error("Production requires a stable TRAVEL_BROWSER_COOKIE_SECRET.");
  }
  const secret = await loadBrowserCookieSecret({ filePath: resolve(dataDirectory, "browser-cookie-secret") });
  browserIdentityMiddleware = createBrowserIdentityMiddleware({ secret });
} else if (historyStoreMode !== "disabled") {
  throw new Error("TRAVEL_SEARCH_HISTORY_STORE must be supabase or disabled. JSON file storage has been retired.");
}

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/login", loginRouter);
app.use("/api/community", communityRouter);
app.use("/api/mytrip", mytripRouter);
app.use("/api/places", placeDetailsRouter);
app.use("/api/itineraries", itineraryRouter);
app.use('/api/activity', createActivityRouter(browserIdentityMiddleware));
const placeRepository = createTravelPlaceRepository();
app.post("/api/search", databaseSession, browserIdentityMiddleware, createSearchHandler(placeRepository, { historyRepository: searchHistoryRepository, activityRecorder: recordSearchActivity }));
app.get("/api/recommendations", browserIdentityMiddleware, createHomeRecommendationsHandler(placeRepository, { historyRepository: searchHistoryRepository }));

app.use("/api", (_req, res) => res.status(404).json({ message: "요청한 API를 찾을 수 없습니다." }));
app.use(databaseError);

export default app;
