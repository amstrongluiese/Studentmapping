import type { DrawingMode } from "@/lib/drawingUtils";

/**
 * Single global annotation interaction phase (map + toolbar + overlay).
 * "Panning" is implicit when phase is idle — the map uses Leaflet's default grab/drag.
 */
export type AnnotationInteractionPhase = "idle" | "freehand" | "shape" | "text" | "selection";

export function resolveAnnotationInteractionPhase(params: {
  mode: DrawingMode;
  selectedAnnotationId: string | null;
}): AnnotationInteractionPhase {
  const { mode, selectedAnnotationId } = params;
  if (mode === "free" || mode === "highlight" || mode === "eraser") return "freehand";
  if (mode === "line" || mode === "arrow" || mode === "rectangle" || mode === "circle") return "shape";
  if (mode === "label") return "text";
  if (selectedAnnotationId) return "selection";
  return "idle";
}

/** Cursor for the drawing overlay when it is capturing pointer events. */
export function cursorForAnnotationOverlay(phase: AnnotationInteractionPhase): string {
  switch (phase) {
    case "freehand":
    case "shape":
      return "crosshair";
    case "text":
      return "text";
    case "selection":
    case "idle":
    default:
      return "inherit";
  }
}
