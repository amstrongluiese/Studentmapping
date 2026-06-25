import type { Map } from "leaflet";

type TapHandler = { disable: () => void; enable: () => void };

const suppressed = new WeakMap<Map, boolean>();

function setHandlers(map: Map, disabled: boolean) {
  const action = disabled ? "disable" : "enable";
  map.dragging[action]();
  map.touchZoom[action]();
  map.scrollWheelZoom[action]();
  map.doubleClickZoom[action]();
  map.boxZoom[action]();
  map.keyboard[action]();
  const tap = (map as Map & { tap?: TapHandler }).tap;
  tap?.[action]?.();
}

/**
 * Synchronous Leaflet gesture suppression for draw strokes (Android).
 * Idempotent per map instance so pointerdown / pointerup pairs stay balanced.
 */
export function setLeafletDrawGestureSuppression(map: Map | null, wantSuppressed: boolean): void {
  if (!map) return;
  const was = suppressed.get(map) === true;
  if (wantSuppressed === was) return;
  suppressed.set(map, wantSuppressed);
  setHandlers(map, wantSuppressed);
}

/** Force release if this map was left locked (e.g. hot reload). */
export function resetLeafletDrawGestureSuppression(map: Map | null): void {
  if (!map || suppressed.get(map) !== true) return;
  suppressed.set(map, false);
  setHandlers(map, false);
}
