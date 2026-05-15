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
 * Map container pixel coordinates from a DOM pointer/mouse event using Leaflet’s
 * internal mapping (pan, zoom, CRS, padding). Prefer this over raw clientX/clientY math.
 */
export function domMouseEventToMapContainerPoint(map: L.Map, ev: MouseEvent): L.Point | null {
  try {
    const m = map as LeafletMapWithContainerPoint;
    if (typeof m.mouseEventToContainerPoint === "function") {
      return m.mouseEventToContainerPoint(ev);
    }
    const ll = map.mouseEventToLatLng(ev);
    return map.latLngToContainerPoint(ll);
  } catch {
    return null;
  }
}

/** Normalize touch events to a MouseEvent-like target Leaflet accepts. */
export function touchToMouseLike(ev: TouchEvent, touch: Touch, type: "down" | "move" | "up" = "move"): MouseEvent {
  return new MouseEvent(
    type === "down" ? "mousedown" : type === "up" ? "mouseup" : "mousemove",
    {
      clientX: touch.clientX,
      clientY: touch.clientY,
      bubbles: true,
      cancelable: true,
      view: ev.view ?? window,
    },
  );
}

export function domPointerEventToMapContainerPoint(
  map: L.Map,
  ev: PointerEvent | MouseEvent | TouchEvent,
): L.Point | null {
  if (ev instanceof TouchEvent) {
    const t = ev.touches[0] ?? ev.changedTouches[0];
    if (!t) return null;
    const kind = ev.type === "touchstart" ? "down" : ev.type === "touchend" || ev.type === "touchcancel" ? "up" : "move";
    return domMouseEventToMapContainerPoint(map, touchToMouseLike(ev, t, kind));
  }
  return domMouseEventToMapContainerPoint(map, ev);
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

  const lx = containerPoint.x - insetX;
  const ly = containerPoint.y - insetY;
  const x = Math.max(0, Math.min(lx, width));
  const y = Math.max(0, Math.min(ly, height));

  const mapContainerPoint = L.point(x + insetX, y + insetY);
  const latLng = map.containerPointToLatLng(mapContainerPoint);

  return {
    x,
    y,
    timestamp: Date.now(),
    latLng: { lat: latLng.lat, lng: latLng.lng },
  };
}

export function domEventToDrawingPoint(
  map: L.Map,
  layout: DrawingLayoutMetrics,
  ev: PointerEvent | MouseEvent | TouchEvent,
): DrawingPoint | null {
  const cp = domPointerEventToMapContainerPoint(map, ev);
  if (!cp) return null;
  return containerPointToDrawingPoint(map, layout, cp);
}

/** Geographic position under the pointer (no overlay clamping). */
export function domEventToMapLatLng(map: L.Map, ev: PointerEvent | MouseEvent | TouchEvent): L.LatLng | null {
  try {
    const mouse =
      ev instanceof TouchEvent
        ? (() => {
            const t = ev.touches[0] ?? ev.changedTouches[0];
            if (!t) return null;
            const kind =
              ev.type === "touchstart" ? "down" : ev.type === "touchend" || ev.type === "touchcancel" ? "up" : "move";
            return touchToMouseLike(ev, t, kind);
          })()
        : ev;
    if (!mouse) return null;
    return map.mouseEventToLatLng(mouse);
  } catch {
    return null;
  }
}
