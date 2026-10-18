import { useSyncExternalStore } from 'react';
import { normalizeLocalEumLocale, SUPPORTED_LOCALES } from './localEumI18n.js';

const STORAGE_KEY = 'local-eum-locale';
const listeners = new Set();

function readLocale() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // Continue with legacy URL state if local storage is unavailable.
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const legacyLocale = params.get('locale') || params.get('lang');
    return normalizeLocalEumLocale(legacyLocale);
  } catch {
    return 'ko';
  }
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function handleStorage(event) {
  if (event.key === STORAGE_KEY || event.key === null) emitChange();
}

export function getLocalEumLocale() {
  return readLocale();
}

export function setLocalEumLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new RangeError('Unsupported Local Eum locale');
  const nextLocale = normalizeLocalEumLocale(locale);
  try {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  } catch {
    // The current view still changes when browser storage is unavailable.
  }
  emitChange();
  return nextLocale;
}

export function subscribeLocalEumLocale(listener) {
  listeners.add(listener);
  if (typeof window !== 'undefined') window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
  };
}

export function useLocalEumLocale() {
  return useSyncExternalStore(subscribeLocalEumLocale, getLocalEumLocale, () => 'ko');
}
