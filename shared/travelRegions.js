const TOUR_API_REGION_CODES = {
  "1": "서울", "2": "인천", "3": "대전", "4": "대구", "5": "광주", "6": "부산", "7": "울산", "8": "세종",
  "31": "경기", "32": "강원", "33": "충북", "34": "충남", "35": "경북", "36": "경남", "37": "전북", "38": "전남", "39": "제주",
};

const REGION_ALIASES = [
  ["서울특별시", "서울"], ["부산광역시", "부산"], ["대구광역시", "대구"], ["인천광역시", "인천"],
  ["광주광역시", "광주"], ["대전광역시", "대전"], ["울산광역시", "울산"], ["세종특별자치시", "세종"],
  ["경기도", "경기"], ["강원특별자치도", "강원"], ["강원도", "강원"], ["충청북도", "충북"],
  ["충청남도", "충남"], ["전북특별자치도", "전북"], ["전라북도", "전북"], ["전라남도", "전남"],
  ["경상북도", "경북"], ["경상남도", "경남"], ["제주특별자치도", "제주"],
];

/** Canonical short region names shared by parsed history and TourAPI candidates. */
export function normalizeTravelRegion(value) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (TOUR_API_REGION_CODES[normalized]) return TOUR_API_REGION_CODES[normalized];
  const shortNames = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  const shortName = shortNames.find((name) => normalized === name || normalized.startsWith(`${name} `));
  if (shortName) return shortName;
  for (const [alias, canonical] of REGION_ALIASES) {
    if (normalized === alias || normalized.startsWith(`${alias} `)) return canonical;
  }
  return "";
}
