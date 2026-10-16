export function scrollToPageTop(scrollTarget = globalThis.window) {
  scrollTarget?.scrollTo?.(0, 0);
}
