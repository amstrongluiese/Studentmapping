import L from "leaflet";
import type { DrawingPoint } from "@/lib/drawingUtils";

export type DrawingLayoutMetrics = {
  /** Top-left of the drawable overlay in map container pixel space (same space as `latLngToContainerPoint`). */
  insetX: number;
  insetY: number;
  width: number;
  height: number;
};

type LeafletMapWithContainerPoint = L.Map & {
  mouseEventToContainerPoint?(ev: MouseEvent): L.Point;
};

/**
 * Map container pixel coordinates from a DOM pointer event using Leaflet's
 * internal mapping (pan, zoom, CRS, padding). Prefer this over raw clientX/clientY math.
 */
export function domPointerEventToMapContainerPoint(map: L.Map, ev: PointerEvent): L.Point | null {
  try {
    const m = map as LeafletMapWithContainerPoint;
    if (typeof m.mouseEventToContainerPoint === "function") {
      return m.mouseEventToContainerPoint(ev);
    }

    return map.latLngToContainerPoint(map.mouseEventToLatLng(ev));
  } catch {
    return null;
  }
}

/**
 * Hit-test: whether the Leaflet-resolved container point lies inside the drawable overlay.
 */
export function isContainerPointInDrawingLayout(cp: L.Point, layout: DrawingLayoutMetrics): boolean {
  const { insetX, insetY, width, height } = layout;
  return (
    cp.x >= insetX - 0.5 &&
    cp.x <= insetX + width + 0.5 &&
    cp.y >= insetY - 0.5 &&
    cp.y <= insetY + height + 0.5
  );
}

/**
 * Clamp a container-space point into the drawable overlay and return overlay-local pixels + latLng
 * consistent with `containerPointToLatLng` on the clamped map container point.
 */
export function containerPointToDrawingPoint(
  map: L.Map,
  layout: DrawingLayoutMetrics,
  containerPoint: L.Point,
): DrawingPoint | null {
  const { insetX, insetY, width, height } = layout;
  if (width <= 0 || height <= 0) return null;

  // Convert to overlay-local coordinates WITHOUT clamping to preserve exact pointer position
  const lx = containerPoint.x - insetX;
  const ly = containerPoint.y - insetY;

  // For map coordinate conversion, use the exact container point (not clamped)
  // This ensures first drawn point is exactly where pointer is
  const latLng = map.containerPointToLatLng(containerPoint);

  return {
    x: lx,
    y: ly,
    timestamp: Date.now(),
    latLng: { lat: latLng.lat, lng: latLng.lng },
  };
}

/**
 * Clamp overlay-local point to drawable bounds for rendering/hit-test purposes.
 * Use this AFTER coordinate conversion if you need bounds checking.
 */
export function clampPointToBounds(
  point: DrawingPoint,
  layout: DrawingLayoutMetrics,
): DrawingPoint {
  const { width, height } = layout;
  return {
    ...point,
    x: Math.max(0, Math.min(point.x, width)),
    y: Math.max(0, Math.min(point.y, height)),
  };
}

export function domEventToDrawingPoint(
  map: L.Map,
  layout: DrawingLayoutMetrics,
  ev: PointerEvent,
): DrawingPoint | null {
  const cp = domPointerEventToMapContainerPoint(map, ev);
  if (!cp) return null;
  return containerPointToDrawingPoint(map, layout, cp);
}

/** Geographic position under the pointer (no overlay clamping). */
export function domEventToMapLatLng(map: L.Map, ev: PointerEvent): L.LatLng | null {
  try {
    return map.mouseEventToLatLng(ev);
  } catch {
    return null;
  }
}
