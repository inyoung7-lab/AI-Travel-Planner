import test from "node:test";
import assert from "node:assert/strict";
import { generateItinerary, hydrateItinerary, validateItineraryRequest } from "./itinerary.js";

const request = { region: "제주", startDate: "2026-10-20", endDate: "2026-10-21", people: 2, budget: 500000, transport: "자차", styles: ["자연·힐링"] };
const candidates = [{ id: "db:2", name: "협재해변", type: "관광지", address: "제주", url: "/places/2", lat: 33.39, lng: 126.23 }];

test("여행 기간과 입력 범위를 검증한다", () => {
  assert.equal(validateItineraryRequest(request).days, 2);
  assert.equal(validateItineraryRequest({ ...request, endDate: "2026-10-26" }), null);
  assert.equal(validateItineraryRequest({ ...request, startDate: "2026-02-31" }), null);
  assert.equal(validateItineraryRequest({ ...request, region: "잘못된 지역" }), null);
});

test("AI가 후보 목록 밖의 장소를 만들면 결과에서 제외한다", () => {
  const plan = { title: "제주 여행", summary: "바다 여행", tips: [], days: [
    { theme: "첫날", items: [{ candidateId: "db:2", time: "10:00", reason: "바다" }, { candidateId: "fake:1", time: "11:00", reason: "가짜" }] },
    { theme: "둘째 날", items: [{ candidateId: "db:2", time: "12:00", reason: "산책" }] },
  ] };
  const result = hydrateItinerary(plan, candidates, validateItineraryRequest(request));
  assert.equal(result.days[0].date, "2026-10-20");
  assert.deepEqual(result.days[0].items.map((item) => item.name), ["협재해변"]);
  assert.equal(result.days[1].date, "2026-10-21");
});

test("Codyssey OpenAI 채팅 규격으로 요청하고 후보 장소 링크를 복원한다", async () => {
  const previous = process.env.CODYSSEY_OPENAI_KEY;
  process.env.CODYSSEY_OPENAI_KEY = "test-key";
  try {
    let sent, url;
    const fetchImpl = async (requestUrl, options) => {
      url = requestUrl;
      sent = JSON.parse(options.body);
      return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({
        title: "제주 여행", summary: "바다", tips: [],
        days: [{ theme: "첫날", items: [{ candidateId: "db:2", time: "10:00", reason: "풍경" }] },
          { theme: "둘째 날", items: [{ candidateId: "db:2", time: "11:00", reason: "산책" }] }],
      }) } }] }) };
    };
    const result = await generateItinerary(validateItineraryRequest(request), candidates, fetchImpl);
    assert.equal(url, "https://copa.codyssey.kr/v1/chat/completions");
    assert.equal(sent.model, "gpt-5-mini");
    assert.equal(sent.messages[1].role, "user");
    assert.equal(result.days[0].items[0].url, "/places/2");
  } finally { if (previous === undefined) delete process.env.CODYSSEY_OPENAI_KEY; else process.env.CODYSSEY_OPENAI_KEY = previous; }
});
