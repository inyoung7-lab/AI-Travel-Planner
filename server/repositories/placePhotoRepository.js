// COMM_PLACE_PHOTO is the source of truth; the photo bytes stay in public/images/place-preview.
export function photoFromRow(row) {
  const path = row?.PHOTO_PATH;
  if (typeof path !== "string" || !/^\/images\/place-preview\/[\w.-]+$/.test(path)) return null;
  return {
    image: path,
    imageSource: row.IMAGE_SOURCE || null,
    imageSourceUrl: row.SOURCE_URL || null,
    subject: row.PHOTO_SUBJECT || null,
    regional: Number(row.IS_REGIONAL) === 1,
    tourContentId: row.PHOTO_TOUR_CONTENT_ID || null,
  };
}
