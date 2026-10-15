// Set this single resolver when the destination detail route and its ID contract are confirmed.
const getPlaceDetailPath = (_placeId) => null;

export function openPlaceDetail(placeId, navigate) {
  const path = getPlaceDetailPath(placeId);
  if (!path) return false;
  navigate(path);
  return true;
}
