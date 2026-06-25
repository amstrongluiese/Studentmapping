/**
 * Cross-vendor Fullscreen API helpers for presentation GIS mode.
 * iPadOS / Safari use webkit*; Firefox moz*; legacy IE ms*.
 */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenHTMLElement = HTMLElement & {
  webkitRequestFullscreen?: (allowKeyboardInput?: number) => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export function getFullscreenElement(): Element | null {
  const d = document as FullscreenDocument;
  return (
    document.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  );
}

export async function exitFullscreenSafe(): Promise<void> {
  if (!getFullscreenElement()) return;
  const d = document as FullscreenDocument;
  try {
    const p =
      document.exitFullscreen?.() ??
      d.webkitExitFullscreen?.() ??
      d.mozCancelFullScreen?.() ??
      d.msExitFullscreen?.();
    await Promise.resolve(p);
  } catch {
    /* permission or not in fullscreen */
  }
}

/** Returns true if this element is now the fullscreen element. */
export async function requestFullscreenOnElement(element: HTMLElement | null): Promise<boolean> {
  if (!element) return false;
  const el = element as FullscreenHTMLElement;

  try {
    if (typeof element.requestFullscreen === "function") {
      try {
        await element.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
      } catch {
        await element.requestFullscreen();
      }
      return getFullscreenElement() === element;
    }
    if (el.webkitRequestFullscreen) {
      await Promise.resolve(el.webkitRequestFullscreen(1));
      return getFullscreenElement() === element;
    }
    if (el.mozRequestFullScreen) {
      await Promise.resolve(el.mozRequestFullScreen());
      return getFullscreenElement() === element;
    }
    if (el.msRequestFullscreen) {
      await Promise.resolve(el.msRequestFullscreen());
      return getFullscreenElement() === element;
    }
  } catch {
    return false;
  }
  return false;
}
