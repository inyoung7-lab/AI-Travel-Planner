const detailPaths = {
  trending: (placeId) => `/trending/${encodeURIComponent(placeId)}`,
  team: () => null,
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
