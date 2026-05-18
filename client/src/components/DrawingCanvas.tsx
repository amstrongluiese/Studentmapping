import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  clearCanvas,
  drawArrow,
  drawCircle,
  drawLine,
  drawRectangle,
  extractPressure,
  generateId,
  getCtx,
  resizeCanvas,
  type DrawingPoint,
  type DrawingRenderOptions,
} from "@/lib/drawingUtils";
import type { UseDrawingReturn } from "@/hooks/useDrawing";
import { getOptimalStrokeSettings, useStylus } from "@/hooks/useStylus";
import { cursorForAnnotationOverlay, type AnnotationInteractionPhase } from "@/lib/annotationInteraction";
import { readPointerDrawEnvironment } from "@/lib/pointerEnvironment";
import { setLeafletDrawGestureSuppression } from "@/lib/leafletDrawGestureSuppression";
import {
  domEventToDrawingPoint,
  domPointerEventToMapContainerPoint,
  isContainerPointInDrawingLayout,
  type DrawingLayoutMetrics,
} from "@/lib/leafletAnnotationCoordinates";
import {
  calculateVisibleMapViewportBounds,
  computeOverlayPlacementWithinParent,
  createViewportBoundsMonitor,
  DEFAULT_MAP_DRAW_VIEWPORT_OPTIONS,
  isCoordinateWithinViewport,
  hasViewportChanged,
  type ViewportBounds,
} from "@/lib/responsiveViewportCalculations";

interface DrawingCanvasProps {
  drawing: UseDrawingReturn;
  layerActive: boolean;
  interactionEnabled: boolean;
  interactionPhase: AnnotationInteractionPhase;
  showStrokeAnnotations: boolean;
  interactionCoarse: boolean;
  map: L.Map | null;
  onStrokeActivityChange?: (active: boolean) => void;
}

type HoverPreview = {
  x: number;
  y: number;
  pointerType: "mouse" | "touch" | "pen" | "unknown";
  inContact: boolean;
};

const MAP_TOUCH_ACTIONS = "pan-x pan-y pinch-zoom";
const DRAW_TOUCH_ACTIONS = "pan-x pan-y pinch-zoom";

const MAX_INTERP_STEPS = 48;
/** Reject finger touch briefly after pen lifts (palm guard), not for the whole session. */
const PEN_PALM_GUARD_MS = 400;

function resolvePointingType(event: PointerEvent | MouseEvent | TouchEvent): HoverPreview["pointerType"] {
  if (event instanceof PointerEvent) {
    if (event.pointerType === "pen") return "pen";
    if (event.pointerType === "touch") return "touch";
    if (event.pointerType === "mouse") return "mouse";
    return "unknown";
  }
  if (event instanceof MouseEvent) return "mouse";
  return "touch";
}

function isStylusContact(event: PointerEvent): boolean {
  if (event.pointerType !== "pen") return true;
  return event.buttons > 0 || event.pressure > 0;
}

function isShapeMode(mode: UseDrawingReturn["mode"]) {
  return mode === "line" || mode === "arrow" || mode === "rectangle" || mode === "circle";
}

function isFreehandLikeStroke(mode: UseDrawingReturn["mode"]) {
  return mode === "free" || mode === "eraser";
}

function isUsableTouch(event: TouchEvent): boolean {
  return event.touches.length <= 1 && event.changedTouches.length <= 1;
}

/** When finger-guard is on + coarse device: ignore touch while pen is down or briefly after pen lifts. */
function touchRejectedForPalmGuard(opts: {
  fingerGuardOn: boolean;
  coarsePointer: boolean;
  penInContact: boolean;
  lastPenInputAt: number;
}) {
  if (!opts.fingerGuardOn || !opts.coarsePointer) return false;
  if (opts.penInContact) return true;
  return Date.now() - opts.lastPenInputAt < PEN_PALM_GUARD_MS;
}

function getDistance(a: DrawingPoint, b: DrawingPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Overlay-local bounds for jump / containment checks (from synced layout metrics). */
function coordBoundsFromLayoutMetrics(layout: DrawingLayoutMetrics | null): ViewportBounds | null {
  if (!layout || layout.width <= 0 || layout.height <= 0) return null;
  return {
    left: 0,
    top: 0,
    right: layout.width,
    bottom: layout.height,
    width: layout.width,
    height: layout.height,
    calculatedAt: Date.now(),
  };
}

/** Reject corrupted jumps when Android merges pan/zoom with draw (diagonal spikes). */
function androidFreehandMaxJumpPx(layout: DrawingLayoutMetrics | null): number {
  if (!layout || layout.width <= 0 || layout.height <= 0) return 120;
  return Math.min(260, Math.max(48, Math.hypot(layout.width, layout.height) * 0.16));
}

/**
 * Append freehand samples without bridging rejected gaps with a straight interpolateSegment.
 * When the jump is too large, advance the cursor only so the next accepted point does not spike.
 */
function appendFreehandSamples(
  cursor: DrawingPoint,
  samples: DrawingPoint[],
  minD: number,
  maxJump: number,
  addPoint: (point: DrawingPoint) => void,
): DrawingPoint {
  let next = cursor;
  for (const coords of samples) {
    const distance = getDistance(next, coords);
    if (distance > maxJump) {
      next = coords;
      continue;
    }
    if (distance < minD * 0.85) continue;
    interpolateSegment(next, coords, minD).forEach(addPoint);
    next = coords;
  }
  return next;
}

function resolveViewportCalculationElement(map: L.Map | null, fallback: HTMLElement | null): HTMLElement | null {
  return map?.getContainer() ?? fallback?.parentElement ?? fallback;
}

function syncDrawingLayoutFromDom(
  overlay: HTMLElement | null,
  map: L.Map | null,
  layout: { current: DrawingLayoutMetrics },
) {
  if (!overlay || !map) return;
  const mapRect = map.getContainer().getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  layout.current = {
    insetX: overlayRect.left - mapRect.left,
    insetY: overlayRect.top - mapRect.top,
    width: overlayRect.width,
    height: overlayRect.height,
  };
}

function interpolateSegment(start: DrawingPoint, end: DrawingPoint, spacing: number): DrawingPoint[] {
  const distance = getDistance(start, end);
  if (distance <= spacing * 1.2) return [end];
  const steps = Math.min(MAX_INTERP_STEPS, Math.max(1, Math.floor(distance / Math.max(0.6, spacing * 0.65))));
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    const startTime = start.timestamp || end.timestamp || Date.now();
    const endTime = end.timestamp || startTime;
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      pressure: (start.pressure || 0.5) + ((end.pressure || 0.5) - (start.pressure || 0.5)) * t,
      timestamp: Math.round(startTime + (endTime - startTime) * t),
      latLng:
        start.latLng && end.latLng
          ? {
              lat: start.latLng.lat + (end.latLng.lat - start.latLng.lat) * t,
              lng: start.latLng.lng + (end.latLng.lng - start.latLng.lng) * t,
            }
          : end.latLng,
    } satisfies DrawingPoint;
  });
}

export const DrawingCanvas = ({
  drawing,
  layerActive,
  interactionEnabled,
  interactionPhase,
  showStrokeAnnotations,
  interactionCoarse,
  map,
  onStrokeActivityChange,
}: DrawingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportBoundsRef = useRef<ViewportBounds | null>(null);
  const drawingLayoutRef = useRef<DrawingLayoutMetrics>({ insetX: 0, insetY: 0, width: 1, height: 1 });
  const viewportMonitorRef = useRef<ReturnType<typeof createViewportBoundsMonitor> | null>(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const capturedPointerIdRef = useRef<number | null>(null);
  const activeTouchPointersRef = useRef<Set<number>>(new Set());
  const lastPointRef = useRef<DrawingPoint | null>(null);
  const startPointRef = useRef<DrawingPoint | null>(null);
  const shapePreviewEndRef = useRef<DrawingPoint | null>(null);
  const freehandQueueRef = useRef<DrawingPoint[]>([]);
  const paintRafRef = useRef<number | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const hoverPendingRef = useRef<HoverPreview | null>(null);
  const lastPenInputAtRef = useRef(0);
  const hasPointerEvents = typeof window !== "undefined" && "PointerEvent" in window;
  const pointerDrawEnv = useMemo(() => readPointerDrawEnvironment(), []);
  const pointerDrawEnvRef = useRef(pointerDrawEnv);
  pointerDrawEnvRef.current = pointerDrawEnv;

  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;
  const mapRef = useRef(map);
  mapRef.current = map;
  const showStrokeAnnotationsRef = useRef(showStrokeAnnotations);
  showStrokeAnnotationsRef.current = showStrokeAnnotations;
  const interactionEnabledRef = useRef(interactionEnabled);
  interactionEnabledRef.current = interactionEnabled;
  const interactionCoarseRef = useRef(interactionCoarse);
  interactionCoarseRef.current = interactionCoarse;
  const onStrokeActivityChangeRef = useRef(onStrokeActivityChange);
  onStrokeActivityChangeRef.current = onStrokeActivityChange;

  const refreshViewportLayoutRef = useRef<(() => void) | null>(null);

  const syncOverlayTouchAction = useCallback(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    const setBoth = (value: string) => {
      if (el) {
        el.style.touchAction = value;
        el.style.overscrollBehavior = "none";
      }
      if (canvas) {
        canvas.style.touchAction = value;
        canvas.style.overscrollBehavior = "none";
      }
    };
    if (!el) return;
    if (!interactionEnabledRef.current || !drawingRef.current.mode) {
      setBoth(MAP_TOUCH_ACTIONS);
      return;
    }
    if (isDrawingRef.current) {
      setBoth("none");
      return;
    }
    if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
      setBoth("none");
      return;
    }
    setBoth(DRAW_TOUCH_ACTIONS);
  }, []);

  const { stylusInfo } = useStylus();
  const stylusInfoRef = useRef(stylusInfo);
  stylusInfoRef.current = stylusInfo;

  const penInContactForPalmGuard = useCallback(() => {
    const info = stylusInfoRef.current;
    return info.type === "pen" && info.inContact;
  }, []);
  const strokeSettings = getOptimalStrokeSettings(stylusInfo, {
    androidDrawing: pointerDrawEnv.androidDrawingOptimizations,
  });
  const strokeSettingsRef = useRef(strokeSettings);
  strokeSettingsRef.current = strokeSettings;

  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [overlayBoundsStyle, setOverlayBoundsStyle] = useState<{
    left: number;
    top: number;
    width: number | string;
    height: number | string;
  }>({ left: 0, top: 0, width: "100%", height: "100%" });

  const projectPoint = useCallback((point: DrawingPoint): DrawingPoint => {
    const m = mapRef.current;
    if (!m || !point.latLng) return point;
    const { insetX, insetY } = drawingLayoutRef.current;
    const projectedPoint = m.latLngToContainerPoint(L.latLng(point.latLng.lat, point.latLng.lng));
    return {
      ...point,
      x: projectedPoint.x - insetX,
      y: projectedPoint.y - insetY,
    };
  }, []);

  const buildRenderOptions = useCallback((): DrawingRenderOptions => {
    const m = mapRef.current;
    return {
      showLabels: false,
      currentZoom: m?.getZoom(),
      projectPoint: m ? projectPoint : undefined,
    };
  }, [projectPoint]);

  /** Full canvas paint: committed strokes + in-progress freehand + live shape preview (single pass per rAF). */
  const paintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCtx(canvas);
    const d = drawingRef.current;
    if (!showStrokeAnnotationsRef.current) {
      clearCanvas(ctx, canvas);
      return;
    }
    
    clearCanvas(ctx, canvas);
    const opts = buildRenderOptions();

    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) {
      (ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: string }).imageSmoothingQuality = "high";
    }

    const clipW = canvas.clientWidth || viewportBoundsRef.current?.width || 0;
    const clipH = canvas.clientHeight || viewportBoundsRef.current?.height || 0;
    if (clipW > 0 && clipH > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, clipW, clipH);
      ctx.clip();
    }
    
    d.redraw(ctx, canvas, opts);

    const preview = shapePreviewEndRef.current;
    const start = startPointRef.current;
    if (preview && isDrawingRef.current && start && isShapeMode(d.mode)) {
      switch (d.mode) {
        case "line":
          drawLine(ctx, start, preview, d.color, d.width, d.opacity);
          break;
        case "arrow":
          drawArrow(ctx, start, preview, d.color, d.width, d.opacity);
          break;
        case "circle":
          drawCircle(ctx, start, getDistance(start, preview), d.color, d.width, false, d.opacity);
          break;
        case "rectangle":
          drawRectangle(ctx, start, preview, d.color, d.width, false, d.opacity);
          break;
      }
    }

    if (clipW > 0 && clipH > 0) {
      ctx.restore();
    }
  }, [buildRenderOptions]);

  const schedulePaint = useCallback(() => {
    if (paintRafRef.current != null) return;
    paintRafRef.current = window.requestAnimationFrame(() => {
      paintRafRef.current = null;
      const d = drawingRef.current;
      const minD = strokeSettingsRef.current.minDistance;
      const last = lastPointRef.current;

      if (isFreehandLikeStroke(d.mode) && isDrawingRef.current && last && freehandQueueRef.current.length > 0) {
        const queue = freehandQueueRef.current;
        freehandQueueRef.current = [];
        const ad = pointerDrawEnvRef.current.androidDrawingOptimizations;
        const maxJump = ad ? androidFreehandMaxJumpPx(drawingLayoutRef.current) : Infinity;
        lastPointRef.current = appendFreehandSamples(last, queue, minD, maxJump, d.addPoint);
      }

      paintCanvas();
    });
  }, [paintCanvas]);

  const cancelPaintRaf = useCallback(() => {
    if (paintRafRef.current != null) {
      window.cancelAnimationFrame(paintRafRef.current);
      paintRafRef.current = null;
    }
  }, []);

  const scheduleHoverCommit = useCallback(() => {
    if (hoverRafRef.current != null) return;
    hoverRafRef.current = window.requestAnimationFrame(() => {
      hoverRafRef.current = null;
      setHoverPreview(hoverPendingRef.current);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || !layerActive) return undefined;

    const container = containerRef.current;
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "1";
    canvas.style.cursor = "inherit";
    canvas.style.pointerEvents = "none";
    canvas.style.touchAction = MAP_TOUCH_ACTIONS;
    canvas.style.willChange = "contents";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const getViewportBounds = () =>
      calculateVisibleMapViewportBounds(mapRef.current?.getContainer() ?? container, DEFAULT_MAP_DRAW_VIEWPORT_OPTIONS);

    const syncOverlayBounds = (bounds: ViewportBounds | null) => {
      if (!bounds) return;
      const placement = computeOverlayPlacementWithinParent(bounds, container);
      if (!placement) return;
      const { left, top, width, height } = placement;

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.right = "auto";
      container.style.bottom = "auto";
      container.style.overflow = "hidden";
      setOverlayBoundsStyle((current) =>
        current.left === left &&
        current.top === top &&
        current.width === width &&
        current.height === height
          ? current
          : { left, top, width, height },
      );
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      syncDrawingLayoutFromDom(container, mapRef.current, drawingLayoutRef);
    };

    viewportBoundsRef.current = getViewportBounds();
    syncOverlayBounds(viewportBoundsRef.current);
    syncDrawingLayoutFromDom(container, mapRef.current, drawingLayoutRef);

    let inUpdateSize = false;
    const updateSize = () => {
      if (inUpdateSize) return;
      if (!containerRef.current || !canvasRef.current) return;
      inUpdateSize = true;
      try {
        mapRef.current?.invalidateSize({ animate: false });

        const newBounds = getViewportBounds();

        if (hasViewportChanged(viewportBoundsRef.current, newBounds, 2)) {
          viewportBoundsRef.current = newBounds;
        }
        syncOverlayBounds(viewportBoundsRef.current);

        const mapInst = mapRef.current;
        const mapEl = mapInst?.getContainer();
        const b = viewportBoundsRef.current;
        if (mapEl && b) {
          const mr = mapEl.getBoundingClientRect();
          drawingLayoutRef.current = {
            insetX: b.left - mr.left,
            insetY: b.top - mr.top,
            width: b.width,
            height: b.height,
          };
        } else {
          syncDrawingLayoutFromDom(containerRef.current, mapRef.current, drawingLayoutRef);
        }

        if (viewportBoundsRef.current) {
          resizeCanvas(canvasRef.current, viewportBoundsRef.current.width, viewportBoundsRef.current.height);
        } else if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          resizeCanvas(canvasRef.current, rect.width, rect.height);
        }

        schedulePaint();
      } finally {
        inUpdateSize = false;
      }
    };

    refreshViewportLayoutRef.current = updateSize;

    updateSize();

    viewportMonitorRef.current?.destroy();
    const boundsMonitor = createViewportBoundsMonitor(mapRef.current?.getContainer() ?? container, {
      ...DEFAULT_MAP_DRAW_VIEWPORT_OPTIONS,
      debounceMs: 50,
      changeThresholdPx: 2,
      onChange: (newBounds) => {
        if (hasViewportChanged(viewportBoundsRef.current, newBounds, 2)) {
          viewportBoundsRef.current = newBounds;
          updateSize();
        }
      },
    });
    viewportMonitorRef.current = boundsMonitor;

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    const mapElement = mapRef.current?.getContainer();
    if (mapElement) resizeObserver.observe(mapElement);
    if (container.parentElement) resizeObserver.observe(container.parentElement);
    window.addEventListener("orientationchange", updateSize);

    const vv = window.visualViewport;
    const onVisualViewportChange = () => updateSize();
    if (vv) {
      vv.addEventListener("resize", onVisualViewportChange);
      vv.addEventListener("scroll", onVisualViewportChange);
    }

    return () => {
      refreshViewportLayoutRef.current = null;
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", updateSize);
      if (vv) {
        vv.removeEventListener("resize", onVisualViewportChange);
        vv.removeEventListener("scroll", onVisualViewportChange);
      }
      viewportMonitorRef.current?.destroy();
      viewportMonitorRef.current = null;
      cancelPaintRaf();
      canvas.remove();
      canvasRef.current = null;
      viewportBoundsRef.current = null;
      isDrawingRef.current = false;
      lastPointRef.current = null;
      startPointRef.current = null;
      shapePreviewEndRef.current = null;
      freehandQueueRef.current = [];
    };
  }, [cancelPaintRaf, layerActive, map, schedulePaint]);

  useEffect(() => {
    if (!layerActive) return undefined;
    schedulePaint();
    return undefined;
  }, [drawing.objects, drawing.currentDrawing, layerActive, map, schedulePaint, showStrokeAnnotations]);

  useEffect(() => {
    if (!layerActive || !map) return undefined;

    const handleMapRedraw = () => {
      schedulePaint();
    };

    const handleMapLayoutSync = () => {
      refreshViewportLayoutRef.current?.();
      schedulePaint();
    };

    map.on("move", handleMapRedraw);
    map.on("zoom", handleMapRedraw);
    map.on("zoomend", handleMapRedraw);
    map.on("resize", handleMapLayoutSync);
    map.on("viewreset", handleMapLayoutSync);

    return () => {
      map.off("move", handleMapRedraw);
      map.off("zoom", handleMapRedraw);
      map.off("zoomend", handleMapRedraw);
      map.off("resize", handleMapLayoutSync);
      map.off("viewreset", handleMapLayoutSync);
    };
  }, [layerActive, map, schedulePaint]);

  const drawingPointFromInteraction = useCallback((event: PointerEvent | MouseEvent | TouchEvent): DrawingPoint | null => {
    if (!mapRef.current || !containerRef.current) return null;
    syncDrawingLayoutFromDom(containerRef.current, mapRef.current, drawingLayoutRef);
    const m = mapRef.current;
    const layout = drawingLayoutRef.current;
    if (layout.width <= 0 || layout.height <= 0) return null;
    return domEventToDrawingPoint(m, layout, event);
  }, []);

  const isInsideCanvas = useCallback((event: PointerEvent | MouseEvent | TouchEvent) => {
    const m = mapRef.current;
    if (!m) return false;
    const cp = domPointerEventToMapContainerPoint(m, event);
    if (!cp) return false;
    return isContainerPointInDrawingLayout(cp, drawingLayoutRef.current);
  }, []);

  const claimEvent = (event: PointerEvent | MouseEvent | TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const releaseDrawingPointerCapture = useCallback((onlyPointerId?: number | null) => {
    const el = containerRef.current;
    const capId = capturedPointerIdRef.current;
    if (capId == null) return;
    if (onlyPointerId != null && onlyPointerId !== capId) return;
    if (el?.hasPointerCapture?.(capId)) {
      try {
        el.releasePointerCapture(capId);
      } catch {
        /* ignore */
      }
    }
    capturedPointerIdRef.current = null;
  }, []);

  const stopDrawingSession = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    shapePreviewEndRef.current = null;
    freehandQueueRef.current = [];
    releaseDrawingPointerCapture();
    if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
      setLeafletDrawGestureSuppression(mapRef.current, false);
    }
    drawingRef.current.cancelCurrentStroke();
    lastPointRef.current = null;
    startPointRef.current = null;
    onStrokeActivityChangeRef.current?.(false);
    schedulePaint();
    syncOverlayTouchAction();
  }, [releaseDrawingPointerCapture, schedulePaint, syncOverlayTouchAction]);

  const shouldUsePointerForDrawing = useCallback((event: PointerEvent, phase: "start" | "move" | "end") => {
    const d = drawingRef.current;
    if (!d.mode) return false;

    if (activePointerIdRef.current != null && phase !== "start") {
      return event.pointerId === activePointerIdRef.current;
    }

    if (!isInsideCanvas(event)) return false;
    if (event.pointerType === "pen") return true;
    if (event.pointerType === "mouse") return true;

    if (event.pointerType === "touch") {
      if (activeTouchPointersRef.current.size > 1) return false;
      if (
        touchRejectedForPalmGuard({
          fingerGuardOn: d.isStylusMode,
          coarsePointer: interactionCoarseRef.current,
          penInContact: penInContactForPalmGuard(),
          lastPenInputAt: lastPenInputAtRef.current,
        })
      ) {
        return false;
      }
      return true;
    }

    return !d.isStylusMode;
  }, [isInsideCanvas, penInContactForPalmGuard]);

  const shouldUseFallbackEventForDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    const d = drawingRef.current;
    if (!d.mode || !isInsideCanvas(event)) return false;
    if (event instanceof MouseEvent) return true;
    if (
      touchRejectedForPalmGuard({
        fingerGuardOn: d.isStylusMode,
        coarsePointer: interactionCoarseRef.current,
        penInContact: penInContactForPalmGuard(),
        lastPenInputAt: lastPenInputAtRef.current,
      })
    ) {
      return false;
    }
    return isUsableTouch(event);
  }, [isInsideCanvas, penInContactForPalmGuard]);

  const updateHoverPreview = useCallback((event: PointerEvent | MouseEvent | TouchEvent, inContact: boolean) => {
    const d = drawingRef.current;
    if (!d.mode) {
      hoverPendingRef.current = null;
      scheduleHoverCommit();
      return;
    }

    const coords = drawingPointFromInteraction(event);
    if (!coords) {
      hoverPendingRef.current = null;
      scheduleHoverCommit();
      return;
    }

    hoverPendingRef.current = {
      x: coords.x,
      y: coords.y,
      pointerType: resolvePointingType(event),
      inContact,
    };
    scheduleHoverCommit();
  }, [drawingPointFromInteraction, scheduleHoverCommit]);

/** Validate that a coordinate change is reasonable for the current viewport. */
function isValidCoordinateChange(
  from: DrawingPoint | null,
  to: DrawingPoint,
  viewport: ViewportBounds | null,
): boolean {
  if (!from || !viewport) return true;

  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  
  // Prevent jumps larger than 40% of viewport diagonal (too large to be natural movement)
  const maxReasonableDistance = Math.hypot(viewport.width, viewport.height) * 0.4;
  
  return distance <= maxReasonableDistance;
}

  const handlePointerDown = useCallback((event: PointerEvent | MouseEvent | TouchEvent) => {
    if (!interactionEnabledRef.current || !drawingRef.current.mode || !canvasRef.current) return;

    if (event instanceof TouchEvent && !isUsableTouch(event)) {
      return;
    }

    const d = drawingRef.current;

    if (event instanceof PointerEvent) {
      if (!event.isPrimary && event.pointerType !== "pen") return;
      if (event.pointerType === "touch" && activeTouchPointersRef.current.size >= 2) {
        stopDrawingSession();
        return;
      }
      if (!shouldUsePointerForDrawing(event, "start")) {
        if (event.pointerType === "pen") updateHoverPreview(event, false);
        return;
      }

      if (event.pointerType === "pen") {
        lastPenInputAtRef.current = Date.now();
      }

      if (event.pointerType === "pen" && !isStylusContact(event)) {
        updateHoverPreview(event, false);
        return;
      }

      if (
        event.pointerType === "touch" &&
        touchRejectedForPalmGuard({
          fingerGuardOn: d.isStylusMode,
          coarsePointer: interactionCoarseRef.current,
          penInContact: penInContactForPalmGuard(),
          lastPenInputAt: lastPenInputAtRef.current,
        })
      ) {
        return;
      }
    } else {
      if (!shouldUseFallbackEventForDrawing(event)) return;
    }

    const coords = drawingPointFromInteraction(event);
    if (!coords) return;

    coords.pressure = extractPressure(event as PointerEvent | MouseEvent);
    updateHoverPreview(event, true);

    if (d.mode === "label") {
      claimEvent(event);
      if (event instanceof PointerEvent) {
        activePointerIdRef.current = event.pointerId;
      }
      const id = generateId();
      d.addObject({
        id,
        type: "label",
        points: [coords],
        color: d.color,
        width: d.width,
        opacity: d.opacity,
        label: "Label",
        referenceZoom: mapRef.current?.getZoom(),
        timestamp: Date.now(),
      });
      d.setSelectedAnnotationId(id);
      d.setMode(null);
      schedulePaint();
      activePointerIdRef.current = null;
      return;
    }

    claimEvent(event);
    const pe = event instanceof PointerEvent ? event : null;
    const androidDraw = pointerDrawEnvRef.current.androidDrawingOptimizations;
    if (pe) {
      activePointerIdRef.current = pe.pointerId;
      if (containerRef.current?.setPointerCapture) {
        try {
          containerRef.current.setPointerCapture(pe.pointerId);
          capturedPointerIdRef.current = pe.pointerId;
        } catch {
          capturedPointerIdRef.current = null;
        }
      }
    }

    if (pe && androidDraw) {
      setLeafletDrawGestureSuppression(mapRef.current, true);
    }

    isDrawingRef.current = true;
    shapePreviewEndRef.current = null;
    freehandQueueRef.current = [];
    lastPointRef.current = coords;
    startPointRef.current = coords;

    onStrokeActivityChangeRef.current?.(true);
    d.startDrawing(d.mode, coords, { referenceZoom: mapRef.current?.getZoom() });

    if (pe && capturedPointerIdRef.current == null && containerRef.current?.setPointerCapture) {
      try {
        containerRef.current.setPointerCapture(pe.pointerId);
        capturedPointerIdRef.current = pe.pointerId;
      } catch {
        capturedPointerIdRef.current = null;
      }
    }

    schedulePaint();
    syncOverlayTouchAction();
  }, [
    drawingPointFromInteraction,
    shouldUseFallbackEventForDrawing,
    shouldUsePointerForDrawing,
    stopDrawingSession,
    syncOverlayTouchAction,
    updateHoverPreview,
    schedulePaint,
  ]);

  const handlePointerMove = useCallback((event: PointerEvent | MouseEvent | TouchEvent) => {
    if (!interactionEnabledRef.current || !drawingRef.current.mode || !canvasRef.current) return;

    if (event instanceof TouchEvent && !isUsableTouch(event)) {
      return;
    }

    const d = drawingRef.current;

    if (event instanceof PointerEvent) {
      if (!event.isPrimary && event.pointerType !== "pen") return;
      if (event.pointerType === "touch" && activeTouchPointersRef.current.size >= 2) {
        stopDrawingSession();
        return;
      }
      if (!shouldUsePointerForDrawing(event, "move")) {
        if (event.pointerType === "pen" && isInsideCanvas(event)) {
          updateHoverPreview(event, false);
        }
        return;
      }

      if (isDrawingRef.current) {
        claimEvent(event);
      }

      if (event.pointerType === "pen") {
        lastPenInputAtRef.current = Date.now();
      }
    } else {
      if (!shouldUseFallbackEventForDrawing(event)) return;
      if (isDrawingRef.current) claimEvent(event);
    }

    const inContact =
      event instanceof PointerEvent
        ? event.pointerType === "pen"
          ? isStylusContact(event) ||
            (isDrawingRef.current && activePointerIdRef.current === event.pointerId)
          : event.pointerType === "touch"
            ? isDrawingRef.current && activePointerIdRef.current === event.pointerId
              ? true
              : event.pressure > 0 || (event.buttons & 1) !== 0
            : (event.buttons & 1) !== 0
        : event instanceof MouseEvent
          ? event.buttons > 0
          : event.touches.length > 0;

    if (!(isDrawingRef.current && isFreehandLikeStroke(d.mode) && inContact)) {
      updateHoverPreview(event, inContact);
    }

    if (!isDrawingRef.current) {
      return;
    }

    if (event instanceof PointerEvent) {
      if (isFreehandLikeStroke(d.mode)) {
        const coalesced =
          (event.pointerType === "touch" || event.pointerType === "pen") &&
          typeof event.getCoalescedEvents === "function"
            ? event.getCoalescedEvents()
            : [];
        const list = coalesced.length > 0 ? coalesced : [event];
        const isTouchPrimary = event.pointerType === "touch";
        const ad = pointerDrawEnvRef.current.androidDrawingOptimizations;
        // Increased effMinCap for Android touch from 1.5 to 2.0 to prevent excessive point accumulation
        const effMinCap = ad && isTouchPrimary ? 2.0 : 2.5;
        const effMin = isTouchPrimary
          ? Math.min(strokeSettingsRef.current.minDistance, effMinCap)
          : strokeSettingsRef.current.minDistance;
        const maxJump = ad ? androidFreehandMaxJumpPx(drawingLayoutRef.current) : Infinity;
        const coordBounds =
          coordBoundsFromLayoutMetrics(drawingLayoutRef.current) ?? viewportBoundsRef.current;
        let prev = lastPointRef.current;
        for (const sample of list) {
          if (sample.pointerId !== event.pointerId) continue;
          const sampleCoords = drawingPointFromInteraction(sample);
          if (!sampleCoords || !prev) continue;
          sampleCoords.pressure = extractPressure(sample);

          if (!isCoordinateWithinViewport(sampleCoords.x, sampleCoords.y, coordBounds, 50)) continue;
          if (!isValidCoordinateChange(prev, sampleCoords, coordBounds)) continue;
          
          const distance = getDistance(prev, sampleCoords);
          if (distance > maxJump) {
            prev = sampleCoords;
            continue;
          }
          if (distance < effMin * 0.65) continue;
          freehandQueueRef.current.push(sampleCoords);
          prev = sampleCoords;
        }
        schedulePaint();
        return;
      }

      const coords = drawingPointFromInteraction(event);
      if (!coords || !lastPointRef.current) return;
      coords.pressure = extractPressure(event);
      if (isShapeMode(d.mode)) {
        if (getDistance(lastPointRef.current, coords) < 0.35) return;
        shapePreviewEndRef.current = coords;
        schedulePaint();
      }
      return;
    }

    const coords = drawingPointFromInteraction(event);
    if (!coords || !lastPointRef.current) return;
    coords.pressure = extractPressure(event as PointerEvent | MouseEvent);
    if (isFreehandLikeStroke(d.mode)) {
      const ad = pointerDrawEnvRef.current.androidDrawingOptimizations;
      const effMin = Math.min(strokeSettingsRef.current.minDistance, ad ? 2.0 : 2.5);
      const maxJump = ad ? androidFreehandMaxJumpPx(drawingLayoutRef.current) : Infinity;
      const coordBounds =
        coordBoundsFromLayoutMetrics(drawingLayoutRef.current) ?? viewportBoundsRef.current;

      if (!isCoordinateWithinViewport(coords.x, coords.y, coordBounds, 50)) return;
      if (!isValidCoordinateChange(lastPointRef.current, coords, coordBounds)) return;
      
      const distance = getDistance(lastPointRef.current, coords);
      if (distance > maxJump) {
        lastPointRef.current = coords;
        return;
      }
      if (distance < effMin * 0.65) return;
      freehandQueueRef.current.push(coords);
      schedulePaint();
      return;
    }
    if (isShapeMode(d.mode)) {
      if (getDistance(lastPointRef.current, coords) < 0.35) return;
      shapePreviewEndRef.current = coords;
      schedulePaint();
    }
  }, [
    drawingPointFromInteraction,
    isInsideCanvas,
    schedulePaint,
    shouldUseFallbackEventForDrawing,
    shouldUsePointerForDrawing,
    stopDrawingSession,
    updateHoverPreview,
  ]);

  const handlePointerUp = useCallback((event?: PointerEvent | MouseEvent | TouchEvent) => {
    const hadSession = isDrawingRef.current;
    try {
      if (event instanceof PointerEvent) {
        if (activePointerIdRef.current != null && event.pointerId !== activePointerIdRef.current) {
          return;
        }
        if (hadSession) claimEvent(event);
        updateHoverPreview(event, false);
      } else if (event) {
        if (hadSession && shouldUseFallbackEventForDrawing(event)) {
          claimEvent(event);
        }
        updateHoverPreview(event, false);
      }

      if (!hadSession || !canvasRef.current) {
        activePointerIdRef.current = null;
        return;
      }

      isDrawingRef.current = false;
      shapePreviewEndRef.current = null;
      if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
        setLeafletDrawGestureSuppression(mapRef.current, false);
      }
      onStrokeActivityChangeRef.current?.(false);
      syncOverlayTouchAction();

      const d = drawingRef.current;
      const startPoint = startPointRef.current;
      const endPoint = event ? drawingPointFromInteraction(event) : lastPointRef.current;

      if (endPoint && event) {
        endPoint.pressure = extractPressure(event as PointerEvent | MouseEvent);
      }

      cancelPaintRaf();

      const minD = strokeSettingsRef.current.minDistance;
      if (isFreehandLikeStroke(d.mode)) {
        const ad = pointerDrawEnvRef.current.androidDrawingOptimizations;
        const maxJump = ad ? androidFreehandMaxJumpPx(drawingLayoutRef.current) : Infinity;
        const pending = freehandQueueRef.current;
        freehandQueueRef.current = [];
        const cursor = lastPointRef.current;
        if (cursor && pending.length > 0) {
          lastPointRef.current = appendFreehandSamples(cursor, pending, minD, maxJump, d.addPoint);
        }
        if (endPoint && lastPointRef.current) {
          const tailDistance = getDistance(lastPointRef.current, endPoint);
          if (tailDistance > maxJump) {
            lastPointRef.current = endPoint;
          } else if (tailDistance >= minD * 0.3) {
            interpolateSegment(lastPointRef.current, endPoint, minD).forEach(d.addPoint);
            lastPointRef.current = endPoint;
          }
        }
        d.endDrawing();
      } else if (startPoint && endPoint && isShapeMode(d.mode) && getDistance(startPoint, endPoint) >= 3) {
        d.addPoint(endPoint);
        d.endDrawing();
      } else {
        freehandQueueRef.current = [];
        d.cancelCurrentStroke();
      }

      lastPointRef.current = null;
      startPointRef.current = null;
      activePointerIdRef.current = null;
      paintCanvas();
      syncOverlayTouchAction();
    } finally {
      if (event instanceof PointerEvent) {
        releaseDrawingPointerCapture(event.pointerId);
      }
    }
  }, [
    cancelPaintRaf,
    drawingPointFromInteraction,
    paintCanvas,
    releaseDrawingPointerCapture,
    shouldUseFallbackEventForDrawing,
    syncOverlayTouchAction,
    updateHoverPreview,
  ]);

  const handlePointerDownRef = useRef(handlePointerDown);
  handlePointerDownRef.current = handlePointerDown;
  const handlePointerMoveRef = useRef(handlePointerMove);
  handlePointerMoveRef.current = handlePointerMove;
  const handlePointerUpRef = useRef(handlePointerUp);
  handlePointerUpRef.current = handlePointerUp;

  useEffect(() => {
    if (!containerRef.current || !interactionEnabled) return undefined;

    const container = containerRef.current;

    if (hasPointerEvents) {
      const trackPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "touch") activeTouchPointersRef.current.add(event.pointerId);
        handlePointerDownRef.current(event);
      };

      const trackPointerMove = (event: PointerEvent) => {
        handlePointerMoveRef.current(event);
      };

      const trackPointerUp = (event: PointerEvent) => {
        handlePointerUpRef.current(event);
        if (event.pointerType === "touch") {
          activeTouchPointersRef.current.delete(event.pointerId);
        }
      };

      const onLostPointerCapture = (ev: Event) => {
        const pe = ev as PointerEvent;
        if (capturedPointerIdRef.current === pe.pointerId) {
          capturedPointerIdRef.current = null;
        }
        if (isDrawingRef.current && activePointerIdRef.current === pe.pointerId) {
          handlePointerUpRef.current(pe);
        }
      };

      container.addEventListener("pointerdown", trackPointerDown as EventListener, { capture: true, passive: false });
      container.addEventListener("pointermove", trackPointerMove as EventListener, { capture: true, passive: false });
      container.addEventListener("pointerup", trackPointerUp as EventListener, { capture: true, passive: false });
      container.addEventListener("pointercancel", trackPointerUp as EventListener, { capture: true, passive: false });
      container.addEventListener("lostpointercapture", onLostPointerCapture as EventListener);

      return () => {
        container.removeEventListener("pointerdown", trackPointerDown as EventListener, { capture: true });
        container.removeEventListener("pointermove", trackPointerMove as EventListener, { capture: true });
        container.removeEventListener("pointerup", trackPointerUp as EventListener, { capture: true });
        container.removeEventListener("pointercancel", trackPointerUp as EventListener, { capture: true });
        container.removeEventListener("lostpointercapture", onLostPointerCapture as EventListener);
        activeTouchPointersRef.current.clear();
        activePointerIdRef.current = null;
        releaseDrawingPointerCapture();
        onStrokeActivityChangeRef.current?.(false);
        if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
          setLeafletDrawGestureSuppression(mapRef.current, false);
        }
        syncOverlayTouchAction();
      };
    }

    if (!hasPointerEvents) {
      const down = (e: Event) => handlePointerDownRef.current(e as MouseEvent | TouchEvent);
      const move = (e: Event) => handlePointerMoveRef.current(e as MouseEvent | TouchEvent);
      const up = (e: Event) => handlePointerUpRef.current(e as MouseEvent | TouchEvent);

      container.addEventListener("mousedown", down, { capture: true });
      container.addEventListener("mousemove", move, { capture: true });
      container.addEventListener("mouseup", up, { capture: true });
      container.addEventListener("touchstart", down, { capture: true, passive: false });
      container.addEventListener("touchmove", move, { capture: true, passive: false });
      container.addEventListener("touchend", up, { capture: true });

      return () => {
        container.removeEventListener("mousedown", down, { capture: true });
        container.removeEventListener("mousemove", move, { capture: true });
        container.removeEventListener("mouseup", up, { capture: true });
        container.removeEventListener("touchstart", down, { capture: true });
        container.removeEventListener("touchmove", move, { capture: true });
        container.removeEventListener("touchend", up, { capture: true });
        activePointerIdRef.current = null;
        releaseDrawingPointerCapture();
        onStrokeActivityChangeRef.current?.(false);
        if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
          setLeafletDrawGestureSuppression(mapRef.current, false);
        }
        syncOverlayTouchAction();
      };
    }
  }, [hasPointerEvents, interactionEnabled, releaseDrawingPointerCapture, syncOverlayTouchAction]);

  useEffect(() => {
    if (!interactionEnabled) {
      hoverPendingRef.current = null;
      if (hoverRafRef.current != null) {
        window.cancelAnimationFrame(hoverRafRef.current);
        hoverRafRef.current = null;
      }
      setHoverPreview(null);
      onStrokeActivityChangeRef.current?.(false);
      releaseDrawingPointerCapture();
      if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
        setLeafletDrawGestureSuppression(mapRef.current, false);
      }
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        shapePreviewEndRef.current = null;
        freehandQueueRef.current = [];
        drawingRef.current.cancelCurrentStroke();
        lastPointRef.current = null;
        startPointRef.current = null;
        activePointerIdRef.current = null;
        cancelPaintRaf();
        paintCanvas();
      }
      syncOverlayTouchAction();
    }
  }, [cancelPaintRaf, interactionEnabled, paintCanvas, releaseDrawingPointerCapture, syncOverlayTouchAction]);

  const drawingModeRef = useRef<typeof drawing.mode | undefined>(undefined);
  useEffect(() => {
    if (drawingModeRef.current === undefined) {
      drawingModeRef.current = drawing.mode;
      return;
    }
    if (drawingModeRef.current === drawing.mode) return;
    drawingModeRef.current = drawing.mode;
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      onStrokeActivityChangeRef.current?.(false);
    }
    if (pointerDrawEnvRef.current.androidDrawingOptimizations) {
      setLeafletDrawGestureSuppression(mapRef.current, false);
    }
    shapePreviewEndRef.current = null;
    freehandQueueRef.current = [];
    drawingRef.current.cancelCurrentStroke();
    lastPointRef.current = null;
    startPointRef.current = null;
    activePointerIdRef.current = null;
    releaseDrawingPointerCapture();
    hoverPendingRef.current = null;
    setHoverPreview(null);
    cancelPaintRaf();
    schedulePaint();
    syncOverlayTouchAction();
  }, [cancelPaintRaf, drawing.mode, releaseDrawingPointerCapture, schedulePaint, syncOverlayTouchAction]);

  useEffect(() => {
    syncOverlayTouchAction();
  }, [drawing.mode, interactionEnabled, layerActive, syncOverlayTouchAction]);

  useEffect(() => () => {
    if (hoverRafRef.current != null) {
      window.cancelAnimationFrame(hoverRafRef.current);
    }
    cancelPaintRaf();
  }, [cancelPaintRaf]);

  if (!layerActive) return null;

  const showPenHoverPreview = Boolean(
    hoverPreview &&
    drawing.mode &&
    (hoverPreview.pointerType === "pen" || drawing.isStylusMode),
  );
  const penHoverPreview = showPenHoverPreview ? hoverPreview : null;

  const overlayCursor = interactionEnabled ? cursorForAnnotationOverlay(interactionPhase) : "inherit";

  return (
    <div
      ref={containerRef}
      onContextMenu={(event) => event.preventDefault()}
      className="absolute z-[1090] select-none"
      style={{
        pointerEvents: interactionEnabled ? "auto" : "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        cursor: overlayCursor,
        left: overlayBoundsStyle.left,
        top: overlayBoundsStyle.top,
        width: overlayBoundsStyle.width,
        height: overlayBoundsStyle.height,
        overflow: "hidden",
      }}
    >
      {penHoverPreview && (
        <div
          className="pointer-events-none rounded-full transition-[width,height,border-color,background] duration-100"
          style={{
            position: "absolute",
            left: penHoverPreview.x,
            top: penHoverPreview.y,
            width: penHoverPreview.inContact ? 10 : 14,
            height: penHoverPreview.inContact ? 10 : 14,
            transform: "translate(-50%, -50%)",
            border: penHoverPreview.inContact ? "1px solid rgba(14,116,144,0.85)" : "1px solid rgba(15,23,42,0.55)",
            background: penHoverPreview.inContact ? "rgba(14,116,144,0.22)" : "rgba(255,255,255,0.36)",
            boxShadow: penHoverPreview.inContact
              ? "0 0 0 3px rgba(14,116,144,0.18), 0 6px 14px -10px rgba(15,23,42,0.72)"
              : "0 0 0 2px rgba(255,255,255,0.55), 0 6px 14px -11px rgba(15,23,42,0.7)",
          }}
        />
      )}
    </div>
  );
};
