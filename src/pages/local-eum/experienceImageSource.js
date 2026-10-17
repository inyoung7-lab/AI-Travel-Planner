const STORAGE_IMAGE_PATH = /^experiences\/[1-9]\d*\/cover\.webp$/;
const LOCAL_IMAGE_PATH = /^\/images\/local-eum\/(?:[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|avif)|experiences\/[1-9]\d*\/cover\.webp)$/i;

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function resolveExperienceImageUrl(src, storageClient) {
  if (typeof src !== 'string' || !src.trim()) return null;
  if (validHttpsUrl(src)) return src;
  if (LOCAL_IMAGE_PATH.test(src)) return src;
  if (!STORAGE_IMAGE_PATH.test(src) || !storageClient?.storage) return null;

  const { data, error } = storageClient.storage.from('local-eum-media').getPublicUrl(src);
  return !error && validHttpsUrl(data?.publicUrl) ? data.publicUrl : null;
}

export function isGeneratedExperienceImage(src) {
  if (typeof src !== 'string') return false;
  if (STORAGE_IMAGE_PATH.test(src) || /^\/images\/local-eum\/experiences\/[1-9]\d*\/cover\.webp$/.test(src)) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:'
      && /\/storage\/v1\/object\/public\/local-eum-media\/experiences\/[1-9]\d*\/cover\.webp$/.test(url.pathname);
  } catch {
    return false;
  }
}
