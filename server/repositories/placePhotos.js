import { readFile } from 'node:fs/promises';

export const placePhotoCredits = JSON.parse(await readFile(new URL('../../public/images/community/credits.json', import.meta.url), 'utf8'));
export const photoCreditFor = (url) => Object.values(placePhotoCredits).find((credit) => credit.url === url);
export function samplePlacePhoto(extKey) {
  const id = /^sample:(\d+)$/.exec(extKey || '')?.[1];
  return id ? placePhotoCredits[id] || null : null;
}
