import type Lenis from "lenis";

/**
 * Module-level handle to the root Lenis instance (created by <SmoothScroll />).
 * `null` when smooth scrolling is disabled (reduced motion / not mounted yet).
 * Overlays (mobile menu) and ScrollToTop use this to pause / reset scrolling.
 */
let instance: Lenis | null = null;
const listeners = new Set<(lenis: Lenis | null) => void>();

export function setLenis(next: Lenis | null) {
  instance = next;
  listeners.forEach((fn) => fn(next));
}

export function getLenis() {
  return instance;
}

export function onLenisChange(fn: (lenis: Lenis | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Pause / resume page scrolling (works with and without Lenis). */
export function lockScroll(locked: boolean) {
  if (instance) {
    if (locked) instance.stop();
    else instance.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
