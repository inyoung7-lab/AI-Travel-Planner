import { mkdir, writeFile } from 'node:fs/promises';

const selected = [
  [1, '제주 애월', 'File:Aewol in Jeju.jpg'],
  [2, '제주 협재해변', 'File:Hyeopjae Beach Scenery.jpg'],
  [3, '여수 해양케이블카', 'File:Yeosu Maritime Cable Car View.jpg'],
  [4, '여수 오동도', 'File:Yeosu Odongdo 20180929 002.jpg'],
  [5, '순천만 국가정원', 'File:Netherlands garden in Suncheon Bay National Garden.jpg'],
  [6, '순천 낙안읍성', 'File:Naganeupseong Village 08.jpg'],
  [7, '부산 흰여울문화마을', 'File:Huinnyeoul culture village, Busan on October 25th, 2019.jpg'],
  [8, '서울 성수동', 'File:Seongsu-dong storefronts.jpg'],
];
const url = new URL('https://commons.wikimedia.org/w/api.php');
url.search = new URLSearchParams({ action: 'query', titles: selected.map((p) => p[2]).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1200', format: 'json' });
const response = await fetch(url, { headers: { 'User-Agent': 'TravelPlannerSample/1.0' } });
if (!response.ok) throw new Error(`Commons metadata: ${response.status}`);
const pages = Object.values((await response.json()).query.pages);
const directory = new URL('../public/images/community/', import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = {};
for (const [id, name, title] of selected) {
  const info = pages.find((p) => p.title === title)?.imageinfo?.[0];
  if (!info) throw new Error(`Missing photo: ${title}`);
  const image = await fetch(info.thumburl || info.url);
  if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) throw new Error(`Photo download failed: ${title} ${image.status}`);
  await writeFile(new URL(`${id}.jpg`, directory), Buffer.from(await image.arrayBuffer()));
  const meta = info.extmetadata;
  manifest[id] = { name, url: `/images/community/${id}.jpg`, source: info.descriptionurl,
    author: (meta.Artist?.value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&'),
    license: meta.LicenseShortName?.value, licenseUrl: meta.LicenseUrl?.value || 'https://creativecommons.org/publicdomain/zero/1.0/',
    note: '원본 사진을 화면 크기에 맞춰 표시·크롭합니다.' };
}
await writeFile(new URL('credits.json', directory), JSON.stringify(manifest, null, 2));
console.log(`Downloaded ${Object.keys(manifest).length} place-specific photos.`);
