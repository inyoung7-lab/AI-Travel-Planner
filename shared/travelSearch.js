export const regionAliases = [
  { value: "경남", aliases: ["경남", "경상남도"] },
  { value: "부산", aliases: ["부산"] },
  { value: "전남", aliases: ["전남", "전라남도"] },
  { value: "제주", aliases: ["제주", "제주도"] },
  { value: "서울", aliases: ["서울"] },
  { value: "강원", aliases: ["강원", "강원도"] },
];

export const placeTypes = ["펜션", "숙소", "호텔", "리조트", "게스트하우스", "모텔", "민박", "캠핑장", "관광지"];
export const themes = ["바다", "산", "카페", "정원", "자연", "휴식", "산책", "액티비티"];

export function parseTravelQuery(query) {
  const tokens = query.trim().toLocaleLowerCase("ko-KR").split(/\s+/).filter(Boolean);
  const conditions = { regions: [], types: [], themes: [], keywords: [] };

  for (const token of tokens) {
    const region = regionAliases.find(({ aliases }) => aliases.some((alias) => token.includes(alias)));
    if (region) {
      if (!conditions.regions.includes(region.value)) conditions.regions.push(region.value);
      continue;
    }

    const type = placeTypes.find((value) => token.includes(value));
    if (type) {
      if (!conditions.types.includes(type)) conditions.types.push(type);
      continue;
    }

    const theme = themes.find((value) => token.includes(value));
    if (theme) {
      if (!conditions.themes.includes(theme)) conditions.themes.push(theme);
      continue;
    }

    conditions.keywords.push(token);
  }

  return conditions;
}

export function filterTravelPlaces(places, conditions) {
  return places.filter((place) => {
    const matchesRegions = conditions.regions.every((region) => place.regionCode === region);
    const matchesTypes = conditions.types.every((type) => place.type === type);
    const matchesThemes = conditions.themes.every((theme) => place.tags.includes(theme));
    const searchable = [place.name, place.region, place.type, ...place.tags]
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    const matchesKeywords = conditions.keywords.every((keyword) => searchable.includes(keyword));
    return matchesRegions && matchesTypes && matchesThemes && matchesKeywords;
  });
}
