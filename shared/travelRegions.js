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

export function normalizeTourApiRegion(item) {
  if (String(item.lDongRegnCd) === '12') return /^전남광주통합특별시\s+(동구|서구|남구|북구|광산구)(\s|$)/.test(item.addr1 || '') ? '광주' : '전남';
  const legal = { '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주', '30': '대전', '31': '울산', '36': '세종', '41': '경기', '42': '강원', '51': '강원', '43': '충북', '44': '충남', '45': '전북', '52': '전북', '46': '전남', '47': '경북', '48': '경남', '49': '제주', '50': '제주' };
  return legal[String(item.lDongRegnCd || '')] || normalizeTravelRegion(String(item.areacode || '')) || normalizeTravelRegion(item.addr1);
}

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
