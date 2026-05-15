/**
 * Responsive Viewport Calculations
 *
 * Derives the axis-aligned “visible map” rectangle used for drawing: map
 * container bounds minus fixed overlays (header, sidebar, etc.). Annotation
 * coordinates stay in that rectangle’s CSS pixel space so they stay aligned
 * with Leaflet’s map container math after responsive layout and resize.
 */

/** Elements that cover the map and must not receive strokes (space-separated sides). */
export const GIS_MAP_DRAW_OCCLUDE_SELECTOR = "[data-gis-draw-occlude]";

/** Shared options for map drawing viewport (Dashboard + MapWrapper). */
export const DEFAULT_MAP_DRAW_VIEWPORT_OPTIONS = {
  sidebarSelector: "aside.absolute" as const,
  navbarSelector: "header",
  checkSidebarVisibility: true,
  useDeclarativeOccluders: true as const,
};

export interface ViewportBounds {
  /** Left edge of visible map area (relative to window) */
  left: number;
  /** Top edge of visible map area (relative to window) */
  top: number;
  /** Right edge of visible map area (relative to window) */
  right: number;
  /** Bottom edge of visible map area (relative to window) */
  bottom: number;
  /** Width of visible map area */
  width: number;
  /** Height of visible map area */
  height: number;
  /** Timestamp when bounds were calculated */
  calculatedAt: number;
}

function isLayoutVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const opacity = Number.parseFloat(style.opacity);
  if (Number.isFinite(opacity) && opacity < 0.02) return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

function parseOccludeSides(value: string | null | undefined): Set<"top" | "left" | "right" | "bottom"> {
  const out = new Set<"top" | "left" | "right" | "bottom">();
  if (!value) return out;
  for (const token of value.trim().toLowerCase().split(/\s+/)) {
    if (token === "top" || token === "left" || token === "right" || token === "bottom") {
      out.add(token);
    }
  }
  return out;
}

/**
 * Shrink the map rectangle on each side using visible occluder elements.
 * Occluders use `data-gis-draw-occlude="top|left|right|bottom"` (space-separated).
 */
function applyDataOccludersToMapRect(mapRect: DOMRect, root: ParentNode = document): DOMRect | null {
  const nodes = root.querySelectorAll<HTMLElement>(GIS_MAP_DRAW_OCCLUDE_SELECTOR);
  if (nodes.length === 0) return null;

  let left = mapRect.left;
  let top = mapRect.top;
  let right = mapRect.right;
  let bottom = mapRect.bottom;

  nodes.forEach((el) => {
    if (!isLayoutVisible(el)) return;
    const sides = parseOccludeSides(el.getAttribute("data-gis-draw-occlude"));
    if (sides.size === 0) return;
    const o = el.getBoundingClientRect();
    const overlapsHoriz = o.right > mapRect.left + 0.5 && o.left < mapRect.right - 0.5;
    const overlapsVert = o.bottom > mapRect.top + 0.5 && o.top < mapRect.bottom - 0.5;
    if (!overlapsHoriz || !overlapsVert) return;

    if (sides.has("left") && o.right > left && o.left <= left + 1) {
      left = Math.max(left, o.right);
    }
    if (sides.has("right") && o.left < right && o.right >= right - 1) {
      right = Math.min(right, o.left);
    }
    if (sides.has("top") && o.bottom > top && o.top <= top + 1) {
      top = Math.max(top, o.bottom);
    }
    if (sides.has("bottom") && o.top < bottom && o.bottom >= bottom - 1) {
      bottom = Math.min(bottom, o.top);
    }
  });

  const width = right - left;
  const height = bottom - top;
  if (width <= 1 || height <= 1) {
    return DOMRect.fromRect({ x: mapRect.left, y: mapRect.top, width: mapRect.width, height: mapRect.height });
  }

  return DOMRect.fromRect({ x: left, y: top, width, height });
}

/** Map container (CSS px) origin → visible drawing overlay origin. */
export function getViewportInsetInMapContainer(viewport: ViewportBounds, mapContainerRect: DOMRect): { x: number; y: number } {
  return {
    x: viewport.left - mapContainerRect.left,
    y: viewport.top - mapContainerRect.top,
  };
}

/**
 * Convert a client point to overlay-local coordinates using the overlay’s
 * live bounding rect (avoids stale viewport math when layout lags refs).
 */
export function clientPointToOverlayLocal(
  clientX: number,
  clientY: number,
  overlayRect: DOMRect,
  viewportFallback: ViewportBounds | null,
): { x: number; y: number } {
  const o = overlayRect;
  if (o.width > 0 && o.height > 0) {
    return {
      x: clientX - o.left,
      y: clientY - o.top,
    };
  }
  if (viewportFallback) {
    return {
      x: clientX - viewportFallback.left,
      y: clientY - viewportFallback.top,
    };
  }
  return { x: 0, y: 0 };
}

export interface ContainerMetrics {
  /** Bounding rect of the map container */
  containerRect: DOMRect;
  /** Bounding rect of sidebar (if visible) */
  sidebarRect?: DOMRect;
  /** Bounding rect of navbar/header */
  navbarRect?: DOMRect;
  /** Device pixel ratio for HiDPI support */
  devicePixelRatio: number;
}

/**
 * Calculate the actual visible map viewport bounds, accounting for:
 * - Sidebar overlay width
 * - Navbar height
 * - Responsive layout changes
 * - Device pixel ratio scaling
 */
export function calculateVisibleMapViewportBounds(
  mapContainer: HTMLElement | null,
  options: {
    sidebarSelector?: string | false;
    navbarSelector?: string;
    checkSidebarVisibility?: boolean;
    /** Root for `[data-gis-draw-occlude]` queries (default `document`). */
    occluderQueryRoot?: ParentNode;
    /** When false, skip declarative occluders (tests / special hosts). */
    useDeclarativeOccluders?: boolean;
  } = {},
): ViewportBounds | null {
  if (!mapContainer) return null;

  try {
    const containerRect = mapContainer.getBoundingClientRect();

    let left = containerRect.left;
    let top = containerRect.top;
    let right = containerRect.right;
    let bottom = containerRect.bottom;

    const useDeclarative = options.useDeclarativeOccluders !== false;
    const ocRoot = options.occluderQueryRoot ?? document;
    const dataRect = useDeclarative ? applyDataOccludersToMapRect(containerRect, ocRoot) : null;

    if (dataRect) {
      left = dataRect.left;
      top = dataRect.top;
      right = dataRect.right;
      bottom = dataRect.bottom;
    } else {
      if (options.navbarSelector) {
        const navbar = document.querySelector<HTMLElement>(options.navbarSelector);
        if (navbar && isLayoutVisible(navbar)) {
          const navbarRect = navbar.getBoundingClientRect();
          const navbarBottom = navbarRect.bottom;
          if (navbarBottom > top && navbarRect.top <= top + 2) {
            top = Math.max(top, navbarBottom);
          }
        }
      }

      if (options.sidebarSelector !== false) {
        const sidebarSelector = options.sidebarSelector || "aside.absolute";
        const sidebar = document.querySelector<HTMLElement>(sidebarSelector);

        if (sidebar) {
          const isVisible = options.checkSidebarVisibility
            ? window.getComputedStyle(sidebar).display !== "none" &&
              window.getComputedStyle(sidebar).visibility !== "hidden"
            : true;

          if (isVisible && isLayoutVisible(sidebar)) {
            const sidebarRect = sidebar.getBoundingClientRect();
            const sidebarRight = sidebarRect.right;
            if (sidebarRight > left && sidebarRect.left <= left + 2) {
              left = Math.max(left, sidebarRight);
            }
          }
        }
      }
    }

    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    return {
      left,
      top,
      right,
      bottom,
      width,
      height,
      calculatedAt: Date.now(),
    };
  } catch (error) {
    console.error("[Viewport] Failed to calculate bounds:", error);
    return null;
  }
}

/**
 * Get the offset from client coordinates to container-relative coordinates,
 * accounting for the visible viewport bounds.
 */
export function getContainerRelativeCoordinates(
  clientX: number,
  clientY: number,
  viewportBounds: ViewportBounds | null,
): { x: number; y: number } | null {
  if (!viewportBounds) return null;

  return {
    x: clientX - viewportBounds.left,
    y: clientY - viewportBounds.top,
  };
}

/**
 * Validate that coordinates fall within visible viewport bounds.
 * Returns true if coordinates are within bounds, false if they exceed boundaries.
 */
export function isCoordinateWithinViewport(
  x: number,
  y: number,
  viewportBounds: ViewportBounds | null,
  margin: number = 0,
): boolean {
  if (!viewportBounds) return false;

  const minX = -margin;
  const minY = -margin;
  const maxX = viewportBounds.width + margin;
  const maxY = viewportBounds.height + margin;

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

/**
 * Clamp coordinates to viewport bounds to prevent strokes from escaping.
 */
export function clampCoordinateToViewport(
  x: number,
  y: number,
  viewportBounds: ViewportBounds | null,
): { x: number; y: number } {
  if (!viewportBounds) {
    return { x, y };
  }

  return {
    x: Math.max(0, Math.min(x, viewportBounds.width)),
    y: Math.max(0, Math.min(y, viewportBounds.height)),
  };
}

/**
 * Create a clipping region for the canvas based on viewport bounds.
 * This prevents annotations from rendering outside the visible map area.
 */
export function applyViewportClipping(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  viewportBounds: ViewportBounds,
  devicePixelRatio: number = 1,
): void {
  void canvas;
  void devicePixelRatio;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewportBounds.width, viewportBounds.height);
  ctx.clip();
}

/**
 * Restore canvas state after viewport clipping.
 */
export function restoreViewportClipping(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

/**
 * Detect significant viewport changes that require canvas recalculation.
 * Used to optimize when to trigger expensive recalculations.
 */
export function hasViewportChanged(
  previous: ViewportBounds | null,
  current: ViewportBounds | null,
  threshold: number = 2, // pixels
): boolean {
  if (!previous || !current) return true;

  return (
    Math.abs(previous.left - current.left) > threshold ||
    Math.abs(previous.top - current.top) > threshold ||
    Math.abs(previous.width - current.width) > threshold ||
    Math.abs(previous.height - current.height) > threshold
  );
}

/** Pixel placement of the drawing overlay inside its offset parent (`parentElement`). */
export function computeOverlayPlacementWithinParent(
  viewport: ViewportBounds,
  overlayHost: HTMLElement,
): { left: number; top: number; width: number; height: number } | null {
  const parent = overlayHost.parentElement;
  if (!parent) return null;
  const parentRect = parent.getBoundingClientRect();
  return {
    left: Math.max(0, viewport.left - parentRect.left),
    top: Math.max(0, viewport.top - parentRect.top),
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Monitor viewport bounds and trigger callback when significant changes occur.
 */
export function createViewportBoundsMonitor(
  mapContainer: HTMLElement | null,
  options: {
    onBoundsChange?: (bounds: ViewportBounds, previousBounds: ViewportBounds | null) => void;
    onChange?: (bounds: ViewportBounds) => void;
    sidebarSelector?: string | false;
    navbarSelector?: string;
    checkSidebarVisibility?: boolean;
    occluderQueryRoot?: ParentNode;
    useDeclarativeOccluders?: boolean;
    debounceMs?: number;
    changeThresholdPx?: number;
  } = {},
): {
  getCurrentBounds: () => ViewportBounds | null;
  destroy: () => void;
} {
  const calcOpts = {
    sidebarSelector: options.sidebarSelector,
    navbarSelector: options.navbarSelector,
    checkSidebarVisibility: options.checkSidebarVisibility,
    occluderQueryRoot: options.occluderQueryRoot,
    useDeclarativeOccluders: options.useDeclarativeOccluders,
  };

  let currentBounds = calculateVisibleMapViewportBounds(mapContainer, calcOpts);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let sidebarObserver: MutationObserver | null = null;
  let occluderObservers: MutationObserver[] = [];
  const occluderResizeObservers: ResizeObserver[] = [];

  const checkAndNotify = () => {
    const newBounds = calculateVisibleMapViewportBounds(mapContainer, calcOpts);

    if (newBounds && hasViewportChanged(currentBounds, newBounds, options.changeThresholdPx)) {
      const previousBounds = currentBounds;
      currentBounds = newBounds;

      options.onBoundsChange?.(newBounds, previousBounds);
      options.onChange?.(newBounds);
    }
  };

  const debouncedCheck = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(checkAndNotify, options.debounceMs ?? 100);
  };

  const rafCheck = () => {
    checkAndNotify();
  };

  // Listen for viewport changes
  const resizeObserver = new ResizeObserver(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(rafCheck);
  });

  if (mapContainer) {
    resizeObserver.observe(mapContainer);

    // Also observe parent for layout changes
    const parent = mapContainer.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }
  }

  // Listen for window resize and orientation changes
  const handleResize = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(rafCheck);
  };

  const handleOrientationChange = () => {
    checkAndNotify();
    timeoutId = setTimeout(checkAndNotify, 200);
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleOrientationChange);
  document.addEventListener("fullscreenchange", handleResize);
  document.addEventListener("webkitfullscreenchange", handleResize as EventListener);

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
  }

  // Also monitor sidebar visibility changes
  const observeSidebar = () => {
    if (options.sidebarSelector !== false) {
      const sidebarSelector = options.sidebarSelector || "aside.absolute";
      const sidebar = document.querySelector<HTMLElement>(sidebarSelector);
      if (sidebar) {
        sidebarObserver = new MutationObserver(() => {
          debouncedCheck();
        });
        sidebarObserver.observe(sidebar, {
          attributes: true,
          attributeFilter: ["class", "style"],
        });
      }
    }
  };

  observeSidebar();

  const observeDeclarativeOccluders = () => {
    if (options.useDeclarativeOccluders === false) return;
    const root = options.occluderQueryRoot ?? document;
    const nodes = root.querySelectorAll<HTMLElement>(GIS_MAP_DRAW_OCCLUDE_SELECTOR);
    nodes.forEach((el) => {
      const mo = new MutationObserver(() => debouncedCheck());
      mo.observe(el, { attributes: true, attributeFilter: ["class", "style", "data-gis-draw-occlude"] });
      occluderObservers.push(mo);
      const ro = new ResizeObserver(() => handleResize());
      ro.observe(el);
      occluderResizeObservers.push(ro);
    });
  };

  observeDeclarativeOccluders();

  return {
    getCurrentBounds: () => currentBounds,
    destroy: () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      document.removeEventListener("fullscreenchange", handleResize);
      document.removeEventListener("webkitfullscreenchange", handleResize as EventListener);
      if (vv) {
        vv.removeEventListener("resize", handleResize);
        vv.removeEventListener("scroll", handleResize);
      }
      sidebarObserver?.disconnect();
      occluderObservers.forEach((o) => o.disconnect());
      occluderObservers = [];
      occluderResizeObservers.forEach((o) => o.disconnect());
      occluderResizeObservers.length = 0;
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
