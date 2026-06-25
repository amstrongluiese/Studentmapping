import { useEffect, useMemo, useState } from "react";

export type MapInteractionProfile = {
  hasTouch: boolean;
  hasFinePointer: boolean;
  isCoarsePointer: boolean;
  isIos: boolean;
  isIpados: boolean;
  prefersReducedMotion: boolean;
};

function detectIos(ua: string) {
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
}

/**
 * Lightweight environment hints for map + draw interaction policy.
 */
export function useMapInteractionProfile(): MapInteractionProfile {
  const [coarse, setCoarse] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mq = window.matchMedia("(pointer: coarse)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setCoarse(mq.matches);
    const updateMotion = () => setReducedMotion(mqMotion.matches);

    update();
    updateMotion();
    mq.addEventListener("change", update);
    mqMotion.addEventListener("change", updateMotion);

    return () => {
      mq.removeEventListener("change", update);
      mqMotion.removeEventListener("change", updateMotion);
    };
  }, []);

  return useMemo(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
    const hasTouch = typeof navigator !== "undefined" && (maxTouchPoints > 0 || ("ontouchstart" in globalThis));
    const isIos = typeof navigator !== "undefined" && detectIos(ua);
    const hasFinePointer =
      typeof globalThis !== "undefined" &&
      "matchMedia" in globalThis &&
      globalThis.matchMedia("(pointer: fine)").matches === true;

    return {
      hasTouch,
      hasFinePointer,
      isCoarsePointer: coarse || (!hasFinePointer && hasTouch),
      isIos,
      isIpados: isIos,
      prefersReducedMotion: reducedMotion,
    };
  }, [coarse, reducedMotion]);
}
