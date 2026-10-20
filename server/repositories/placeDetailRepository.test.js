import test from "node:test";
import assert from "node:assert/strict";
import { cleanText, getNearbyPlaces, mapDbPlaceListRow, selectTourMatch } from "./placeDetailRepository.js";

test("TourAPI 설명은 HTML 태그를 화면용 텍스트로 바꾼다", () => {
  assert.equal(cleanText("<p>해변<br>산책 &amp; 휴식</p>"), "해변\n산책 & 휴식");
});

test("지역이 다른 동명의 관광지는 DB 장소와 연결하지 않는다", () => {
  const place = { name: "경복궁", region: "서울", address: "서울 종로구", extKey: "seed:gyeongbok" };
  const candidates = [
    { contentid: "wrong", title: "경복궁", addr1: "부산광역시" },
    { contentid: "right", title: "경복궁", addr1: "서울특별시 종로구" },
  ];
  assert.equal(selectTourMatch(place, candidates)?.contentid, "right");
  assert.equal(selectTourMatch(place, candidates.slice(0, 1)), null);
});

test("검증한 협재 DB 항목만 TourAPI 협재해수욕장과 연결한다", () => {
  const candidate = { contentid: "127490", title: "협재해수욕장", addr1: "제주특별자치도 제주시" };
  assert.equal(selectTourMatch({ name: "제주 협재해변", extKey: "sample:2" }, [candidate]), candidate);
});

test("여행지 목록 항목에 저장된 관광공사 대표 사진을 연결한다", () => {
  const place = mapDbPlaceListRow({ PLACE_ID: 20, NAME: "해변", ADDRESS: "제주", REGION: "제주", EXT_KEY: "tourapi:123", PAYLOAD: JSON.stringify({ images: ["https://images.example/beach.jpg"] }) });
  assert.equal(place.image, "https://images.example/beach.jpg");
  const oldPhoto = mapDbPlaceListRow({ PLACE_ID: 23, NAME: "마을", PAYLOAD: JSON.stringify({ images: ["http://tong.visitkorea.or.kr/cms/photo.jpg"] }) });
  assert.equal(oldPhoto.image, "https://tong.visitkorea.or.kr/cms/photo.jpg");
  const noPhoto = mapDbPlaceListRow({ PLACE_ID: 21, NAME: "장소", EXT_KEY: "seed:place", PAYLOAD: "invalid" });
  assert.equal(noPhoto.image, null);
  assert.equal(mapDbPlaceListRow({ PLACE_ID: 22, NAME: "장소", PAYLOAD: "null" }).image, null);
});

test("표기 차이와 지역 정보를 함께 확인해 같은 관광지를 찾는다", () => {
  const place = { name: "전주 한옥마을", region: "전북", address: "전북 전주시 완산구", extKey: "seed:jeonju" };
  const candidates = [
    { contentid: "wrong", title: "전북 전주 한옥마을 [슬로시티]", addr1: "경상북도 경주시" },
    { contentid: "right", title: "전북 전주 한옥마을 [슬로시티]", addr1: "전북특별자치도 전주시" },
  ];
  assert.equal(selectTourMatch(place, candidates)?.contentid, "right");
});

test("주변 장소 요청은 분류와 국내 좌표를 검증한다", async () => {
  await assert.rejects(() => getNearbyPlaces({ lat: 33.39, lng: 126.23, category: "unknown" }), RangeError);
  await assert.rejects(() => getNearbyPlaces({ lat: 0, lng: 0, category: "food" }), RangeError);
});
