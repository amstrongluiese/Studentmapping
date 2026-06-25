/**
 * Runtime pointer / device traits for draw-layer tuning (Android WebView vs iOS vs desktop).
 * Values are computed once per page load; UA and hardware caps do not change mid-session.
 */

export type PointerDrawEnvironment = {
  isAndroid: boolean;
  isIOS: boolean;
  maxTouchPoints: number;
  hasTouchScreen: boolean;
  prefersCoarsePointer: boolean;
  supportsHover: boolean;
  /** Stronger draw-layer defaults: touch-action, stroke sampling, pen quirks. */
  androidDrawingOptimizations: boolean;
};

const defaultEnv: PointerDrawEnvironment = {
  isAndroid: false,
  isIOS: false,
  maxTouchPoints: 0,
  hasTouchScreen: false,
  prefersCoarsePointer: false,
  supportsHover: true,
  androidDrawingOptimizations: false,
};

let cached: PointerDrawEnvironment | null = null;

function readMatchMedia(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Safe on the client only; during SSR returns a neutral profile.
 */
export function readPointerDrawEnvironment(): PointerDrawEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return defaultEnv;
  }
  if (cached) return cached;

  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iP(hone|ad|od)/i.test(ua) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1);
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const hasTouchScreen = maxTouchPoints > 0 || "ontouchstart" in window;
  const prefersCoarsePointer = readMatchMedia("(pointer: coarse)");
  const supportsHover = readMatchMedia("(hover: hover)");
  const androidDrawingOptimizations = isAndroid && hasTouchScreen;

  cached = {
    isAndroid,
    isIOS,
    maxTouchPoints,
    hasTouchScreen,
    prefersCoarsePointer,
    supportsHover,
    androidDrawingOptimizations,
  };
  return cached;
}
