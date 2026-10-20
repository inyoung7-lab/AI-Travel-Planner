export const regionAliases = [
  { value: "경남", aliases: ["경남", "경상남도"] },
  { value: "부산", aliases: ["부산"] },
  { value: "전남", aliases: ["전남", "전라남도"] },
  { value: "제주", aliases: ["제주", "제주도"] },
  { value: "서울", aliases: ["서울"] },
  { value: "강원", aliases: ["강원", "강원도"] },
];

const placeTypeAliases = [
  { value: "숙박", aliases: ["숙박", "숙소"] },
  { value: "펜션", aliases: ["펜션"] },
  { value: "호텔", aliases: ["호텔"] },
  { value: "리조트", aliases: ["리조트"] },
  { value: "게스트하우스", aliases: ["게스트하우스"] },
  { value: "모텔", aliases: ["모텔"] },
  { value: "민박", aliases: ["민박"] },
  { value: "캠핑장", aliases: ["캠핑장"] },
  { value: "관광지", aliases: ["관광지"] },
  { value: "문화시설", aliases: ["문화시설"] },
  { value: "축제·공연", aliases: ["축제", "공연"] },
  { value: "여행코스", aliases: ["여행코스", "관광코스"] },
  { value: "레포츠", aliases: ["레포츠", "레저"] },
  { value: "쇼핑", aliases: ["쇼핑"] },
  { value: "음식점", aliases: ["음식점", "맛집", "식당"] },
];
export const placeTypes = placeTypeAliases.map(({ value }) => value);
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

    const type = placeTypeAliases.find(({ aliases }) => aliases.some((alias) => token.includes(alias)));
    if (type) {
      if (!conditions.types.includes(type.value)) conditions.types.push(type.value);
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
    const matchesTypes = conditions.types.every((type) => {
      if (type === "숙박") {
        return String(place.contentTypeId || place.sourceContentTypeId || "") === "32"
          || ["숙박", "숙소", "호텔", "리조트", "펜션", "게스트하우스", "모텔", "민박"].includes(place.type);
      }
      return place.type === type;
    });
    const matchesThemes = conditions.themes.every((theme) => place.tags.includes(theme));
    const searchable = [place.name, place.region, place.type, ...place.tags]
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    const matchesKeywords = conditions.keywords.every((keyword) => searchable.includes(keyword));
    return matchesRegions && matchesTypes && matchesThemes && matchesKeywords;
  });
}
