import express from "express";
import { getDbPlace, getNearbyPlaces, getTourDetail, listDbPlaces } from "./repositories/placeDetailRepository.js";

const router = express.Router();

router.get("/nearby", async (req, res) => {
  try {
    const result = await getNearbyPlaces({
      lat: Number(req.query.lat), lng: Number(req.query.lng), category: String(req.query.category || ""),
      excludeContentId: String(req.query.excludeContentId || ""),
    });
    res.json(result);
  } catch (error) {
    if (error instanceof RangeError) return res.status(400).json({ message: error.message });
    console.error("[places] 주변 장소 조회 오류:", error.message);
    return res.status(502).json({ message: "주변 장소를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." });
  }
});

router.get("/", async (_req, res) => {
  try { res.json({ items: await listDbPlaces() }); }
  catch (error) { console.error("[places] 목록 조회 오류:", error.message); res.status(500).json({ message: "여행지 목록을 불러오지 못했어요." }); }
});

router.get("/tourapi/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: "잘못된 여행지 번호예요." });
  try {
    const place = await getTourDetail(req.params.id);
    return place ? res.json(place) : res.status(404).json({ message: "여행지를 찾지 못했어요." });
  } catch (error) {
    console.error("[places] TourAPI 상세 조회 오류:", error.message);
    return res.status(502).json({ message: "관광 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "잘못된 여행지 번호예요." });
  try {
    const place = await getDbPlace(id);
    return place ? res.json(place) : res.status(404).json({ message: "여행지를 찾지 못했어요." });
  } catch (error) {
    console.error("[places] DB 상세 조회 오류:", error.message);
    return res.status(500).json({ message: "여행지 정보를 불러오지 못했어요." });
  }
});

export default router;
