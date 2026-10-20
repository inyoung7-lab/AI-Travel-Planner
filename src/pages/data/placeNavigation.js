const detailPaths = {
  trending: (placeId) => `/trending/${encodeURIComponent(placeId)}`,
  team: (placeId) => {
    const value = String(placeId);
    if (value.startsWith("tourapi:")) return `/places/tourapi/${encodeURIComponent(value.slice(8))}`;
    return /^\d+$/.test(value) ? `/places/${encodeURIComponent(value)}` : null;
  },
};

export function getPlaceDetailPath(placeId, detailType = "team") {
  return detailPaths[detailType]?.(placeId) ?? null;
}

export function openPlaceDetail(placeId, navigate, detailType = "team") {
  const path = getPlaceDetailPath(placeId, detailType);
  if (!path) return false;
  navigate(path);
  return true;
}
