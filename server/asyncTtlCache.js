export function createAsyncTtlCache({ ttlMs, maxEntries = 128, now = Date.now }) {
  const entries = new Map();
  return async (key, load) => {
    const previous = entries.get(key);
    if (previous?.promise) return previous.promise;
    if (previous && previous.expiresAt > now()) return previous.value;
    entries.delete(key);

    const promise = Promise.resolve().then(load);
    entries.set(key, { promise });
    if (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    try {
      const value = await promise;
      if (entries.get(key)?.promise === promise) entries.set(key, { value, expiresAt: now() + ttlMs });
      return value;
    } catch (error) {
      if (entries.get(key)?.promise === promise) entries.delete(key);
      throw error;
    }
  };
}
