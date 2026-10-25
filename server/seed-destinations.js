import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getSupabase, unwrap } from './db.js';

// Curated landmarks, not invented businesses or live operating information.
const candidates = [
  ['경복궁','서울','서울 종로구','조선 왕조의 궁궐로, 궁궐 건축과 도심의 역사 풍경을 둘러볼 수 있는 곳입니다.'],
  ['창덕궁','서울','서울 종로구','전통 궁궐 건축과 정원 풍경을 만날 수 있는 역사 여행지입니다.'],
  ['덕수궁','서울','서울 중구','도심에서 궁궐과 근대 건축의 풍경을 함께 살펴볼 수 있는 곳입니다.'],
  ['N서울타워','서울','서울 용산구','남산에 자리한 전망 명소로 서울 도심의 풍경을 조망할 수 있습니다.'],
  ['북촌 한옥마을','서울','서울 종로구','한옥과 골목 풍경이 남아 있는 마을로 주민 생활 공간을 존중하며 둘러보는 곳입니다.'],
  ['서울숲','서울','서울 성동구','도심에서 산책과 녹지 풍경을 즐길 수 있는 공원입니다.'],
  ['수원 화성','경기','경기 수원시','조선 시대 성곽과 성문을 따라 역사 산책을 즐길 수 있는 여행지입니다.'],
  ['한국민속촌','경기','경기 용인시','전통 가옥과 생활문화를 살펴볼 수 있는 민속 문화 공간입니다.'],
  ['남한산성','경기','경기 광주시','산성과 숲길을 함께 둘러볼 수 있는 역사 유적입니다.'],
  ['아침고요수목원','경기','경기 가평군','다양한 정원과 식물 풍경을 감상할 수 있는 수목원입니다.'],
  ['송도 센트럴파크','인천','인천 연수구','도심의 수로와 녹지를 따라 산책할 수 있는 공원입니다.'],
  ['인천 차이나타운','인천','인천 중구','특색 있는 거리 풍경과 문화 공간을 둘러볼 수 있는 지역입니다.'],
  ['전등사','인천','인천 강화군','강화도에 자리한 사찰로 전통 건축과 숲의 풍경을 만날 수 있습니다.'],
  ['경포대','강원','강원 강릉시','경포호 주변의 경관과 전통 누각을 함께 살펴볼 수 있는 곳입니다.'],
  ['설악산','강원','강원 속초시','산악 경관과 탐방로를 만날 수 있는 대표적인 자연 여행지입니다.'],
  ['남이섬','강원','강원 춘천시','강 위의 섬에서 나무길과 산책 공간을 둘러볼 수 있는 여행지입니다.'],
  ['오죽헌','강원','강원 강릉시','전통 가옥과 역사 전시를 함께 살펴볼 수 있는 유적입니다.'],
  ['속리산','충북','충북 보은군','산세와 사찰 주변의 자연을 함께 살펴볼 수 있는 산악 여행지입니다.'],
  ['청풍문화재단지','충북','충북 제천시','전통 건축과 문화유산을 모아 보존한 역사 문화 공간입니다.'],
  ['도담삼봉','충북','충북 단양군','강물 위에 솟은 바위 봉우리의 경관을 감상할 수 있는 명소입니다.'],
  ['공산성','충남','충남 공주시','백제의 역사를 따라 성곽과 강변 풍경을 둘러볼 수 있는 유적입니다.'],
  ['부소산성','충남','충남 부여군','백제 유적과 숲길을 함께 살펴볼 수 있는 역사 여행지입니다.'],
  ['대천해수욕장','충남','충남 보령시','넓은 해변을 따라 바다 풍경과 산책을 즐길 수 있는 곳입니다.'],
  ['국립중앙과학관','대전','대전 유성구','과학과 기술을 주제로 한 전시를 살펴볼 수 있는 과학 문화 공간입니다.'],
  ['엑스포과학공원','대전','대전 유성구','대전 엑스포의 흔적과 도심 공원 풍경을 둘러볼 수 있는 곳입니다.'],
  ['세종호수공원','세종','세종특별자치시','호수 주변 산책로와 수변 경관을 즐길 수 있는 공원입니다.'],
  ['전주 한옥마을','전북','전북 전주시','한옥이 모여 있는 거리에서 전통 건축과 골목 풍경을 둘러볼 수 있습니다.'],
  ['경기전','전북','전북 전주시','조선 왕조와 관련된 역사와 전통 건축을 살펴볼 수 있는 유적입니다.'],
  ['광한루원','전북','전북 남원시','누각과 연못이 어우러진 전통 정원 풍경을 감상할 수 있습니다.'],
  ['내장산','전북','전북 정읍시','산림과 계곡 경관을 따라 자연을 둘러볼 수 있는 산악 여행지입니다.'],
  ['죽녹원','전남','전남 담양군','대나무 숲길을 따라 걸으며 숲의 풍경을 감상할 수 있는 곳입니다.'],
  ['보성 녹차밭','전남','전남 보성군','차밭이 펼쳐진 구릉의 경관을 감상할 수 있는 지역입니다.'],
  ['무등산','광주','광주광역시 동구','광주와 전남에 걸친 산으로 산악 경관과 탐방로를 만날 수 있습니다.'],
  ['국립아시아문화전당','광주','광주광역시 동구','아시아 문화를 주제로 전시와 공연을 만날 수 있는 복합 문화 공간입니다.'],
  ['불국사','경북','경북 경주시','통일신라의 사찰 건축과 석조 문화유산을 살펴볼 수 있는 곳입니다.'],
  ['석굴암','경북','경북 경주시','신라의 불교 조각과 석굴 사원 문화를 살펴볼 수 있는 유적입니다.'],
  ['첨성대','경북','경북 경주시','신라 시대의 천문 관측과 관련된 석조 유적을 만날 수 있는 곳입니다.'],
  ['안동 하회마을','경북','경북 안동시','전통 가옥과 마을의 역사 경관이 보존된 문화유산입니다.'],
  ['해인사','경남','경남 합천군','가야산에 자리한 사찰로 불교 문화와 전통 건축을 살펴볼 수 있습니다.'],
  ['진주성','경남','경남 진주시','남강을 바라보며 성곽과 역사 유적을 둘러볼 수 있는 곳입니다.'],
  ['통영 미륵산','경남','경남 통영시','통영의 섬과 바다 경관을 바라볼 수 있는 산입니다.'],
  ['대구 근대골목','대구','대구광역시 중구','근대 건축과 도심의 역사 이야기를 따라 걸을 수 있는 지역입니다.'],
  ['서문시장','대구','대구광역시 중구','대구의 시장 문화와 골목 풍경을 둘러볼 수 있는 전통시장입니다.'],
  ['간절곶','울산','울산 울주군','해안 산책과 바다 전망을 즐길 수 있는 곶입니다.'],
  ['대왕암공원','울산','울산광역시 동구','바위 해안과 숲길이 어우러진 해안 공원입니다.'],
  ['해운대해수욕장','부산','부산광역시 해운대구','도심과 이어지는 해변에서 바다 풍경을 즐길 수 있는 여행지입니다.'],
  ['광안리해수욕장','부산','부산광역시 수영구','광안대교와 바다 전망을 함께 만날 수 있는 해변입니다.'],
  ['감천문화마을','부산','부산광역시 사하구','언덕을 따라 모인 집과 골목의 문화 풍경을 둘러볼 수 있는 마을입니다.'],
  ['태종대','부산','부산광역시 영도구','해안 절벽과 숲이 어우러진 자연 경관을 감상할 수 있는 곳입니다.'],
  ['성산 일출봉','제주','제주특별자치도 서귀포시','화산 지형과 바다 경관을 함께 만날 수 있는 제주 동부의 명소입니다.'],
  ['천지연폭포','제주','제주특별자치도 서귀포시','숲길을 따라 폭포와 계곡 풍경을 둘러볼 수 있는 곳입니다.'],
  ['한라산','제주','제주특별자치도 제주시','제주의 화산 지형과 고도에 따른 자연 풍경을 만날 수 있는 산입니다.'],
  ['만장굴','제주','제주특별자치도 제주시','용암동굴의 지형과 제주 화산 활동의 흔적을 살펴볼 수 있는 곳입니다. 개방 여부는 방문 전 확인해 주세요.'],
  ['우도','제주','제주특별자치도 제주시','제주 동쪽의 섬으로 해안과 마을 풍경을 둘러볼 수 있습니다.'],
];

const api = new URL('https://ko.wikipedia.org/w/api.php');
const wikiPages = [];
for (let start = 0; start < candidates.length; start += 40) {
  api.search = new URLSearchParams({ action: 'query', titles: candidates.slice(start, start + 40).map((p) => p[0]).join('|'), redirects: '1', prop: 'pageimages|coordinates', piprop: 'original', colimit: 'max', format: 'json' });
  const response = await fetch(api, { headers: { 'User-Agent': 'TravelPlannerCatalog/1.0' } });
  if (!response.ok) throw new Error(`Wikipedia ${response.status}`);
  const data = await response.json();
  const redirects = data.query.redirects || [];
  const normalized = data.query.normalized || [];
  const pages = Object.values(data.query.pages);
  for (const candidate of candidates.slice(start, start + 40)) {
    let name = candidate[0];
    name = normalized.find((p) => p.from === name)?.to || name;
    name = redirects.find((p) => p.from === name)?.to || name;
    const page = pages.find((p) => p.title === name);
    wikiPages.push({ candidate, page });
  }
}
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify(wikiPages.map(({ candidate, page }) => ({ name: candidate[0], found: !!page && page.missing === undefined, image: page?.original?.source, coords: page?.coordinates?.[0] })), null, 2));
  process.exit(0);
}
await mkdir(new URL('../public/images/destinations/', import.meta.url), { recursive: true });
const eligible = wikiPages.filter(({ page }) => page?.original?.source?.includes('/wikipedia/commons/'));
const fileTitle = (page) => 'File:' + decodeURIComponent(new URL(page.original.source).pathname.split('/').at(-1)).replaceAll('_', ' ');
const files = [];
for (let start = 0; start < eligible.length; start += 30) {
  const commons = new URL('https://commons.wikimedia.org/w/api.php');
  commons.search = new URLSearchParams({ action: 'query', titles: eligible.slice(start, start + 30).map(({ page }) => fileTitle(page)).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1000', format: 'json' });
  const response = await fetch(commons, { headers: { 'User-Agent': 'TravelPlannerCatalog/1.0' } });
  if (!response.ok) throw new Error(`Image metadata ${response.status}`);
  files.push(...Object.values((await response.json()).query.pages));
}
const credits = {};
for (const { page, candidate: [name] } of eligible) {
  const info = files.find((file) => file.title === fileTitle(page))?.imageinfo?.[0];
  const license = info?.extmetadata?.LicenseShortName?.value || '';
  if (!info || !/CC|Public domain|KOGL|GFDL/i.test(license)) continue;
  const imagePath = new URL(`../public/images/destinations/${page.pageid}.jpg`, import.meta.url);
  const cached = await readFile(imagePath).catch(() => null);
  if (!cached?.length) {
    let image;
    for (let attempt = 0; attempt < 4; attempt++) {
      image = await fetch(info.thumburl || info.url);
      if (image.status !== 429) break;
      const seconds = Number(image.headers.get('retry-after')) || 60;
      console.log(`사진 제공처 요청 제한: ${name}, ${seconds}초 후 재시도`);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }
    if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) throw new Error(`Download ${name}: ${image.status}`);
    await writeFile(imagePath, Buffer.from(await image.arrayBuffer()));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  credits[page.pageid] = { name, url: `/images/destinations/${page.pageid}.jpg`, source: info.descriptionurl,
    author: (info.extmetadata.Artist?.value || '').replace(/<[^>]*>/g, '').replaceAll('&amp;', '&'),
    license, licenseUrl: info.extmetadata.LicenseUrl?.value || info.descriptionurl };
}
if (Object.keys(credits).length < 42) throw new Error('사진이 확인된 여행지가 42곳 미만입니다.');
await writeFile(new URL('../public/images/destinations/credits.json', import.meta.url), JSON.stringify(credits, null, 2));
const db = getSupabase({ admin: true });
let added = 0;
for (const { candidate: [name, region, address, overview], page } of wikiPages) {
  if (!page || !credits[page.pageid]) continue;
  const ext_key = `curated:wiki:${page.pageid}`;
  let existing = await unwrap(db.from('comm_place').select('place_id').eq('ext_key', ext_key).maybeSingle());
  if (!existing) {
    existing = await unwrap(db.from('comm_place').insert({ name, region, address, ext_key, lat: page.coordinates?.[0]?.lat || null, lng: page.coordinates?.[0]?.lon || null }).select('place_id').single());
    added++;
  }
  const details = { source: 'curated', name, region, address, overview, images: [credits[page.pageid].url], imageCredits: [credits[page.pageid]], imageSource: 'Wikimedia Commons · 여행지 참고 사진', sourceUrl: `https://ko.wikipedia.org/?curid=${page.pageid}` };
  await unwrap(db.from('comm_place_tour_detail').upsert({ place_id: existing.place_id, content_id: `wiki:${page.pageid}`, payload: details }));
}
const { count, error } = await db.from('comm_place').select('place_id', { count: 'exact', head: true });
if (error) throw error;
console.log(JSON.stringify({ added, totalDestinations: count }));
