import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  clearCanvas,
  extractPressure,
  getCtx,
  resizeCanvas,
  type DrawingObject,
  type DrawingPoint,
} from "@/lib/drawingUtils";
import type { UseDrawingReturn } from "@/hooks/useDrawing";
import { cursorForAnnotationOverlay, type AnnotationInteractionPhase } from "@/lib/annotationInteraction";
import { resetLeafletDrawGestureSuppression, setLeafletDrawGestureSuppression } from "@/lib/leafletDrawGestureSuppression";
import {
  containerPointToDrawingPoint,
  domPointerEventToMapContainerPoint,
  isContainerPointInDrawingLayout,
  type DrawingLayoutMetrics,
} from "@/lib/leafletAnnotationCoordinates";
import {
  calculateFullMapViewportBounds,
  computeOverlayPlacementWithinParent,
  createViewportBoundsMonitor,
  hasViewportChanged,
  resolveRectAgainstProtectedOverlays,
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

/**
 * Minimal, stable single-canvas Draw engine.
 * - Pointer Events only (pointerdown/pointermove/pointerup/pointercancel)
 * - requestAnimationFrame rendering
 * - Leaflet viewport sync
 * - setPointerCapture on pointerdown
 * - Uses `useDrawing` state manager for stroke storage
 */
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const layoutRef = useRef<DrawingLayoutMetrics>({ insetX: 0, insetY: 0, width: 1, height: 1 });
  const viewportBoundsRef = useRef<ViewportBounds | null>(null);
  const viewportMonitorRef = useRef<ReturnType<typeof createViewportBoundsMonitor> | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const capturedPointerTargetRef = useRef<HTMLElement | null>(null);
  const activeTouchPointersRef = useRef<Set<number>>(new Set());
  const activeWindowListenersRef = useRef<{
    move?: (event: PointerEvent) => void;
    up?: (event: PointerEvent) => void;
    cancel?: (event: PointerEvent) => void;
  }>({});
  const activePointerHandlersRef = useRef<{
    move?: (event: PointerEvent) => void;
    up?: (event: PointerEvent) => void;
    release?: (event: PointerEvent) => void;
    detach?: () => void;
  }>({});
  const migratedObjectIdsRef = useRef<Set<string>>(new Set());
  const zoomAnimationRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const pendingPointBufferRef = useRef<DrawingPoint[]>([]);
  const lastBufferedPointRef = useRef<DrawingPoint | null>(null);

  // Object interaction state
  const activeDragRef = useRef<{
    type: "move" | "resize";
    objectId: string;
    handle?: "start" | "end" | "nw" | "ne" | "sw" | "se" | "radius";
    startPoint?: DrawingPoint;
    lastPoint: DrawingPoint;
  } | null>(null);

  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;
  const mapRef = useRef(map);
  mapRef.current = map;

  const [overlayBoundsStyle, setOverlayBoundsStyle] = useState<{
    left: number;
    top: number;
    width: number | string;
    height: number | string;
  }>({ left: 0, top: 0, width: "100%", height: "100%" });

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      if (!dirtyRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (pendingPointBufferRef.current.length > 0) {
        const pending = pendingPointBufferRef.current;
        pendingPointBufferRef.current = [];
        for (const point of pending) {
          drawingRef.current.addPoint(point);
        }
      }
      const ctx = getCtx(canvas);
      if (!showStrokeAnnotations) {
        clearCanvas(ctx, canvas);
        dirtyRef.current = false;
        return;
      }

      clearCanvas(ctx, canvas);

      drawingRef.current.redraw(ctx, canvas, {
        showLabels: false,
        currentZoom: mapRef.current?.getZoom(),
        projectPoint: mapRef.current
          ? (p) => {
              if (!p.latLng) return p;
              const projected = projectLatLngToContainerPoint(L.latLng(p.latLng.lat, p.latLng.lng));
              return { ...p, x: projected.x - layoutRef.current.insetX, y: projected.y - layoutRef.current.insetY } as DrawingPoint;
            }
          : undefined,
      });
      drawSelectedObjectOverlay(ctx);

      dirtyRef.current = false;
    });
  }, [showStrokeAnnotations]);

  const markDirtyAndRedraw = useCallback(() => {
    dirtyRef.current = true;
    scheduleRedraw();
  }, [scheduleRedraw]);

  const projectLatLngToContainerPoint = useCallback((latLng: L.LatLng) => {
    const m = mapRef.current;
    if (!m) return L.point(0, 0);

    const anim = zoomAnimationRef.current;
    const animatedProjector = m as L.Map & {
      _getNewPixelOrigin?: (center: L.LatLng, zoom: number) => L.Point;
    };

    if (anim && typeof animatedProjector._getNewPixelOrigin === "function") {
      try {
        const pixelOrigin = animatedProjector._getNewPixelOrigin(anim.center, anim.zoom);
        return m.project(latLng, anim.zoom).subtract(pixelOrigin);
      } catch (e) {
        // Fallback if internal DOM state is invalid (e.g. during HMR)
      }
    }

    return m.latLngToContainerPoint(latLng);
  }, []);

  const projectPointToOverlay = useCallback((point: DrawingPoint): DrawingPoint => {
    const m = mapRef.current;
    if (!m || !point.latLng) return point;
    const projected = projectLatLngToContainerPoint(L.latLng(point.latLng.lat, point.latLng.lng));
    return {
      ...point,
      x: projected.x - layoutRef.current.insetX,
      y: projected.y - layoutRef.current.insetY,
    };
  }, [projectLatLngToContainerPoint]);

  const unprojectOverlayPoint = useCallback((point: DrawingPoint): DrawingPoint => {
    const m = mapRef.current;
    if (!m) return point;
    const latLng = m.containerPointToLatLng(L.point(point.x + layoutRef.current.insetX, point.y + layoutRef.current.insetY));
    return { ...point, latLng: { lat: latLng.lat, lng: latLng.lng } };
  }, []);

  const getProjectedObjectPoints = useCallback((object: DrawingObject) => {
    return object.points.map((point) => projectPointToOverlay(point));
  }, [projectPointToOverlay]);

  const shapeEndpoint = (points: DrawingPoint[]) => points[points.length - 1];

  const clampContainerPointToLayout = useCallback((point: L.Point, layout: DrawingLayoutMetrics) => {
    return L.point(
      Math.max(layout.insetX, Math.min(layout.insetX + layout.width, point.x)),
      Math.max(layout.insetY, Math.min(layout.insetY + layout.height, point.y)),
    );
  }, []);

  useEffect(() => {
    if (!layerActive || !mapRef.current || layoutRef.current.width <= 1 || layoutRef.current.height <= 1) return;

    for (const object of drawing.objects) {
      if (migratedObjectIdsRef.current.has(object.id)) continue;
      if (object.points.every((point) => point.latLng)) {
        migratedObjectIdsRef.current.add(object.id);
        continue;
      }

      migratedObjectIdsRef.current.add(object.id);
      drawing.updateObjectPoints(
        object.id,
        object.points.map((point) => point.latLng ? point : unprojectOverlayPoint(point)),
      );
    }
  }, [drawing, drawing.objects, layerActive, unprojectOverlayPoint]);

  const moveObjectByOverlayDelta = useCallback((objectId: string, deltaX: number, deltaY: number) => {
    const object = drawingRef.current.objects.find((item) => item.id === objectId);
    if (!object) return;
    const currentPoints = getProjectedObjectPoints(object);
    if (currentPoints.length === 0) return;
    let nextPoints = currentPoints.map((point) => ({ ...point, x: point.x + deltaX, y: point.y + deltaY }));
    const minX = Math.min(...nextPoints.map((point) => point.x));
    const maxX = Math.max(...nextPoints.map((point) => point.x));
    const minY = Math.min(...nextPoints.map((point) => point.y));
    const maxY = Math.max(...nextPoints.map((point) => point.y));
    const padding = Math.max(8, object.width + 8);
    const proposedRect = {
      x: minX - padding,
      y: minY - padding,
      width: Math.max(1, maxX - minX + padding * 2),
      height: Math.max(1, maxY - minY + padding * 2),
    };
    const adjustedRect = resolveRectAgainstProtectedOverlays(
      proposedRect,
      [],
      { width: layoutRef.current.width, height: layoutRef.current.height },
    );
    const adjustX = adjustedRect.x - proposedRect.x;
    const adjustY = adjustedRect.y - proposedRect.y;
    if (adjustX || adjustY) {
      nextPoints = nextPoints.map((point) => ({ ...point, x: point.x + adjustX, y: point.y + adjustY }));
    }
      drawingRef.current.updateObjectPoints(objectId, nextPoints.map((point) => unprojectOverlayPoint(point)), { refresh: false });
  }, [getProjectedObjectPoints, unprojectOverlayPoint]);

  const resizeObjectToPoint = useCallback((
    objectId: string,
    handle: NonNullable<typeof activeDragRef.current>["handle"],
    pointer: DrawingPoint,
  ) => {
    if (!handle) return;
    const object = drawingRef.current.objects.find((item) => item.id === objectId);
    if (!object) return;
    const points = getProjectedObjectPoints(object);
    if (points.length === 0) return;
    let next = points;

    if ((object.type === "line" || object.type === "arrow") && points.length >= 2) {
      next = handle === "start"
        ? [pointer, ...points.slice(1)]
        : [points[0], ...points.slice(1, -1), pointer];
    } else if (object.type === "circle" && points.length >= 2) {
      next = [points[0], pointer];
    } else if (object.type === "rectangle" && points.length >= 2) {
      const a = points[0];
      const b = points[points.length - 1];
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(a.y, b.y);
      const corners = {
        nw: { x: pointer.x, y: pointer.y },
        ne: { x: pointer.x, y: pointer.y },
        sw: { x: pointer.x, y: pointer.y },
        se: { x: pointer.x, y: pointer.y },
      };
      const fixed = {
        nw: { x: right, y: bottom },
        ne: { x: left, y: bottom },
        sw: { x: right, y: top },
        se: { x: left, y: top },
      };
      const h = handle as "nw" | "ne" | "sw" | "se";
      next = [
        { ...a, ...corners[h] },
        { ...b, ...fixed[h] },
      ];
    }

    drawingRef.current.updateObjectPoints(objectId, next.map((point) => unprojectOverlayPoint(point)), { refresh: false });
  }, [getProjectedObjectPoints, unprojectOverlayPoint]);

  const getHandleAtPoint = useCallback((point: DrawingPoint) => {
    const selectedId = drawingRef.current.selectedAnnotationId;
    if (!selectedId) return null;
    const object = drawingRef.current.objects.find((item) => item.id === selectedId);
    if (!object || object.type === "label") return null;
    const points = getProjectedObjectPoints(object);
    if (points.length === 0) return null;
    const hitRadius = interactionCoarse ? 18 : 11;
    const hit = (p: DrawingPoint) => Math.hypot(point.x - p.x, point.y - p.y) <= hitRadius;

    if ((object.type === "line" || object.type === "arrow") && points.length >= 2) {
      if (hit(points[0])) return { object, handle: "start" as const };
      if (hit(points[points.length - 1])) return { object, handle: "end" as const };
    }

    if (object.type === "circle" && points.length >= 2 && hit(shapeEndpoint(points))) {
      return { object, handle: "radius" as const };
    }

    if (object.type === "rectangle" && points.length >= 2) {
      const a = points[0];
      const b = points[points.length - 1];
      const corners = [
        { handle: "nw" as const, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
        { handle: "ne" as const, x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
        { handle: "sw" as const, x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
        { handle: "se" as const, x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
      ];
      const found = corners.find((corner) => hit({ x: corner.x, y: corner.y }));
      if (found) return { object, handle: found.handle };
    }

    return null;
  }, [getProjectedObjectPoints, interactionCoarse]);

  const drawSelectedObjectOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    const selectedId = drawingRef.current.selectedAnnotationId;
    if (!selectedId) return;
    const object = drawingRef.current.objects.find((item) => item.id === selectedId);
    if (!object || object.type === "label") return;
    const points = getProjectedObjectPoints(object);
    if (points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = "rgba(15, 118, 110, 0.78)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);

    if (object.type === "circle" && points.length >= 2) {
      const endpoint = shapeEndpoint(points);
      const radius = Math.hypot(endpoint.x - points[0].x, endpoint.y - points[0].y);
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (object.type === "rectangle" && points.length >= 2) {
      const left = Math.min(points[0].x, points[1].x);
      const top = Math.min(points[0].y, points[1].y);
      ctx.strokeRect(left, top, Math.abs(points[1].x - points[0].x), Math.abs(points[1].y - points[0].y));
    }

    ctx.setLineDash([]);
    const handlePoints: DrawingPoint[] = [];
    if ((object.type === "line" || object.type === "arrow") && points.length >= 2) {
      handlePoints.push(points[0], points[points.length - 1]);
    } else if (object.type === "circle" && points.length >= 2) {
      handlePoints.push(shapeEndpoint(points));
    } else if (object.type === "rectangle" && points.length >= 2) {
      const left = Math.min(points[0].x, points[1].x);
      const right = Math.max(points[0].x, points[1].x);
      const top = Math.min(points[0].y, points[1].y);
      const bottom = Math.max(points[0].y, points[1].y);
      handlePoints.push({ x: left, y: top }, { x: right, y: top }, { x: left, y: bottom }, { x: right, y: bottom });
    }

    for (const handle of handlePoints) {
      ctx.beginPath();
      ctx.roundRect(handle.x - 5, handle.y - 5, 10, 10, 3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }, [getProjectedObjectPoints]);

  const cancelRedraw = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
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
    canvas.style.touchAction = "none";
    canvas.style.willChange = "contents";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const getViewportBounds = () =>
      calculateFullMapViewportBounds(mapRef.current?.getContainer() ?? container);

    const syncOverlayBounds = (bounds: ViewportBounds | null) => {
      if (!bounds) return;
      const placement = computeOverlayPlacementWithinParent(bounds, container);
      if (!placement) return;
      const { left, top, width, height } = placement;

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.overflow = "hidden";
      setOverlayBoundsStyle({ left, top, width, height });

      layoutRef.current = {
        insetX: bounds.left - (mapRef.current?.getContainer().getBoundingClientRect().left ?? 0),
        insetY: bounds.top - (mapRef.current?.getContainer().getBoundingClientRect().top ?? 0),
        width,
        height,
      };

      resizeCanvas(canvas, width, height);
      dirtyRef.current = true;
      scheduleRedraw();
    };

    viewportBoundsRef.current = getViewportBounds();
    syncOverlayBounds(viewportBoundsRef.current);

    const shouldIgnoreStickyNoteKeyboardResize = () => {
      const activeElement = document.activeElement as HTMLElement | null;
      const vv = window.visualViewport;
      return Boolean(
        activeElement?.closest("[data-sticky-note-editor='true']") &&
        vv &&
        window.innerHeight - vv.height > 80,
      );
    };

    let inUpdate = false;
    const updateSize = () => {
      if (shouldIgnoreStickyNoteKeyboardResize()) return;
      if (inUpdate) return;
      inUpdate = true;
      try {
        mapRef.current?.invalidateSize({ animate: false, pan: false });
        const newBounds = getViewportBounds();
        if (hasViewportChanged(viewportBoundsRef.current, newBounds, 2)) viewportBoundsRef.current = newBounds;
        syncOverlayBounds(viewportBoundsRef.current);
      } finally {
        inUpdate = false;
      }
    };

    viewportMonitorRef.current?.destroy?.();
    viewportMonitorRef.current = createViewportBoundsMonitor(mapRef.current?.getContainer() ?? container, {
      sidebarSelector: false,
      navbarSelector: undefined,
      useDeclarativeOccluders: false,
      debounceMs: 50,
      changeThresholdPx: 2,
      onChange: (newBounds) => {
        if (hasViewportChanged(viewportBoundsRef.current, newBounds, 2)) {
          viewportBoundsRef.current = newBounds;
          updateSize();
        }
      },
    });

    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    const mapEl = mapRef.current?.getContainer();
    if (mapEl) ro.observe(mapEl);
    if (container.parentElement) ro.observe(container.parentElement);
    window.addEventListener("orientationchange", updateSize);
    window.addEventListener("resize", updateSize);
    const vv = window.visualViewport;
    const onVV = () => updateSize();
    if (vv) {
      vv.addEventListener("resize", onVV);
      vv.addEventListener("scroll", onVV);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", updateSize);
      window.removeEventListener("resize", updateSize);
      if (vv) {
        vv.removeEventListener("resize", onVV);
        vv.removeEventListener("scroll", onVV);
      }
      viewportMonitorRef.current?.destroy?.();
      cancelRedraw();
      canvas.remove();
      canvasRef.current = null;
      viewportBoundsRef.current = null;
    };
  }, [cancelRedraw, layerActive, map, scheduleRedraw]);

  const drawingPointFromInteraction = useCallback((event: PointerEvent): DrawingPoint | null => {
    if (!mapRef.current || !containerRef.current || !canvasRef.current) return null;
    const m = mapRef.current;
    const layout = layoutRef.current;
    if (layout.width <= 0 || layout.height <= 0) return null;
    const cp = domPointerEventToMapContainerPoint(m, event);
    if (!cp) return null;
    const drawingActive = activePointerIdRef.current === event.pointerId || activeDragRef.current != null;
    if (!drawingActive && !isContainerPointInDrawingLayout(cp, layout)) return null;
    return containerPointToDrawingPoint(m, layout, drawingActive ? clampContainerPointToLayout(cp, layout) : cp);
  }, [clampContainerPointToLayout]);

  const isInsideCanvas = useCallback((event: PointerEvent) => {
    const m = mapRef.current;
    if (!m || !layoutRef.current) return false;
    const cp = domPointerEventToMapContainerPoint(m, event);
    if (!cp) return false;
    return isContainerPointInDrawingLayout(cp, layoutRef.current);
  }, []);

  const shouldUsePointerForDrawing = useCallback((event: PointerEvent) => {
    const d = drawingRef.current;
    if (!d.mode) return false;
    if (!isInsideCanvas(event)) return false;
    if (event.pointerType === "pen" || event.pointerType === "mouse") return true;
    if (event.pointerType === "touch" && activeTouchPointersRef.current.size > 1) return false;
    if (event.pointerType === "touch") return true; // single-touch drawing allowed
    return false;
  }, [isInsideCanvas]);

  const getPointSpacing = useCallback((event: PointerEvent) => {
    const longestSide = Math.max(layoutRef.current.width, layoutRef.current.height);
    const compactViewport = longestSide < 900;
    if (event.pointerType === "pen") return compactViewport ? 0.75 : 0.5;
    if (event.pointerType === "touch") return compactViewport ? 2.4 : 1.6;
    return 1;
  }, []);

  const queueDrawingPoint = useCallback((point: DrawingPoint, event: PointerEvent) => {
    const last = lastBufferedPointRef.current;
    const spacing = getPointSpacing(event);
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < spacing) return;
    lastBufferedPointRef.current = point;
    pendingPointBufferRef.current.push(point);
    dirtyRef.current = true;
    scheduleRedraw();
  }, [getPointSpacing, scheduleRedraw]);

  const attachActiveWindowPointerListeners = useCallback(() => {
    if (activeWindowListenersRef.current.move) return;

    const onMove = (event: PointerEvent) => activePointerHandlersRef.current.move?.(event);
    const onUp = (event: PointerEvent) => activePointerHandlersRef.current.up?.(event);
    const onCancel = (event: PointerEvent) => {
      activePointerHandlersRef.current.release?.(event);
      if (event.pointerType === "touch") activeTouchPointersRef.current.delete(event.pointerId);
      activePointerIdRef.current = null;
      activeDragRef.current = null;
      pendingPointBufferRef.current = [];
      lastBufferedPointRef.current = null;
      drawingRef.current.cancelCurrentStroke();
      setLeafletDrawGestureSuppression(mapRef.current, false);
      activePointerHandlersRef.current.detach?.();
      onStrokeActivityChange?.(false);
      dirtyRef.current = true;
      scheduleRedraw();
    };

    window.addEventListener("pointermove", onMove as EventListener, { passive: false });
    window.addEventListener("pointerup", onUp as EventListener);
    window.addEventListener("pointercancel", onCancel as EventListener);

    activeWindowListenersRef.current.move = onMove;
    activeWindowListenersRef.current.up = onUp;
    activeWindowListenersRef.current.cancel = onCancel;
  }, [scheduleRedraw, onStrokeActivityChange]);

  const detachActiveWindowPointerListeners = useCallback(() => {
    const listeners = activeWindowListenersRef.current;
    if (listeners.move) window.removeEventListener("pointermove", listeners.move as EventListener, { passive: false } as AddEventListenerOptions);
    if (listeners.up) window.removeEventListener("pointerup", listeners.up as EventListener);
    if (listeners.cancel) window.removeEventListener("pointercancel", listeners.cancel as EventListener);
    activeWindowListenersRef.current = {};
  }, []);

  const capturePointer = useCallback((event: PointerEvent) => {
    const target = mapRef.current?.getContainer() ?? canvasRef.current ?? (event.currentTarget as HTMLElement | null);
    try {
      target?.setPointerCapture?.(event.pointerId);
      capturedPointerTargetRef.current = target ?? null;
    } catch {}
  }, []);

  const releaseCapturedPointer = useCallback((pointerId: number | null) => {
    if (pointerId == null) return;
    const target = capturedPointerTargetRef.current ?? mapRef.current?.getContainer() ?? canvasRef.current;
    try {
      target?.releasePointerCapture?.(pointerId);
    } catch {}
    if (capturedPointerTargetRef.current === target) {
      capturedPointerTargetRef.current = null;
    }
  }, []);

  const releasePointer = useCallback((event: PointerEvent) => {
    releaseCapturedPointer(event.pointerId);
  }, [releaseCapturedPointer]);

  const getObjectAtProjectedPoint = useCallback((point: DrawingPoint) =>
    drawingRef.current.getObjectAt(point, {
      currentZoom: mapRef.current?.getZoom(),
      projectPoint: projectPointToOverlay,
    }), [projectPointToOverlay]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!interactionEnabled || !canvasRef.current) return;

    if (event.pointerType === "touch") {
      if (activePointerIdRef.current == null) {
        activeTouchPointersRef.current.clear();
      }
      activeTouchPointersRef.current.add(event.pointerId);
      if (activeTouchPointersRef.current.size > 1) {
        if (activePointerIdRef.current != null) {
          releaseCapturedPointer(activePointerIdRef.current);
          pendingPointBufferRef.current = [];
          lastBufferedPointRef.current = null;
          drawingRef.current.cancelCurrentStroke();
          activePointerIdRef.current = null;
          activeDragRef.current = null;
          setLeafletDrawGestureSuppression(mapRef.current, false);
          onStrokeActivityChange?.(false);
          markDirtyAndRedraw();
        }
        return;
      }
    }

    if (activePointerIdRef.current != null) return;
    
    const coords = drawingPointFromInteraction(event);
    if (!coords) return;

    // If we have a drawing mode, draw
    if (drawingRef.current.mode) {
      if (!shouldUsePointerForDrawing(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      coords.pressure = extractPressure(event);
      activePointerIdRef.current = event.pointerId;
      pendingPointBufferRef.current = [];
      lastBufferedPointRef.current = coords;
      capturePointer(event);
      setLeafletDrawGestureSuppression(mapRef.current, true);

      if (drawingRef.current.mode === "label") {
        const stickyNoteColor = ["#fff7c2", "#dbeafe", "#dcfce7", "#fce7f3", "#ffedd5", "#ede9fe", "#ffffff"]
          .includes(drawingRef.current.color.toLowerCase())
            ? drawingRef.current.color
            : "#fff7c2";
        const label = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          type: "label" as const,
          points: [coords],
          color: stickyNoteColor,
          width: drawingRef.current.width,
          opacity: drawingRef.current.opacity,
          label: "",
          labelSize: { width: 176, height: 92 },
          referenceZoom: mapRef.current?.getZoom(),
          timestamp: Date.now(),
        };
        drawingRef.current.addObject(label);
        drawingRef.current.setSelectedAnnotationId(label.id);
        drawingRef.current.setMode(null);
        dirtyRef.current = true;
        scheduleRedraw();
        setLeafletDrawGestureSuppression(mapRef.current, false);
        detachActiveWindowPointerListeners();
        releasePointer(event);
        activePointerIdRef.current = null;
        return;
      }

      onStrokeActivityChange?.(true);
      drawingRef.current.startDrawing(drawingRef.current.mode, coords, { referenceZoom: mapRef.current?.getZoom() });
      attachActiveWindowPointerListeners();
      dirtyRef.current = true;
      scheduleRedraw();
      return;
    }

    // No drawing mode: leave strokes/shapes fixed. Sticky Notes own their interactions in DrawingLabelLayer.
    if (!drawingRef.current.mode) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      
      const handleHit = getHandleAtPoint(coords);
      if (handleHit) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        activeDragRef.current = {
          objectId: handleHit.object.id,
          handle: handleHit.handle,
          type: "resize",
          lastPoint: coords,
        };
        activePointerIdRef.current = event.pointerId;
        capturePointer(event);
        setLeafletDrawGestureSuppression(mapRef.current, true);
        return;
      }

      const objectHit = getObjectAtProjectedPoint(coords);
      if (objectHit) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        drawingRef.current.setSelectedAnnotationId(objectHit.id);
        activeDragRef.current = {
          objectId: objectHit.id,
          handle: "se" as any,
          type: "move",
          lastPoint: coords,
        };
        activePointerIdRef.current = event.pointerId;
        capturePointer(event);
        setLeafletDrawGestureSuppression(mapRef.current, true);
        dirtyRef.current = true;
        scheduleRedraw();
        return;
      }

      drawingRef.current.setSelectedAnnotationId(null);
      dirtyRef.current = true;
      scheduleRedraw();
    }
  }, [interactionEnabled, drawingPointFromInteraction, shouldUsePointerForDrawing, capturePointer, releasePointer, releaseCapturedPointer, attachActiveWindowPointerListeners, onStrokeActivityChange, scheduleRedraw, markDirtyAndRedraw, getHandleAtPoint, getObjectAtProjectedPoint]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!interactionEnabled || !canvasRef.current) return;
    if (event.pointerType === "touch" && activeTouchPointersRef.current.size > 1) return;
    if (activePointerIdRef.current != null && activePointerIdRef.current !== event.pointerId) return;

    const coords = drawingPointFromInteraction(event);
    if (!coords) return;

    // Handle object dragging
    if (activeDragRef.current) {
      const drag = activeDragRef.current;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (drag.type === "move") {
        const deltaX = coords.x - drag.lastPoint.x;
        const deltaY = coords.y - drag.lastPoint.y;
        moveObjectByOverlayDelta(drag.objectId, deltaX, deltaY);
      } else {
        resizeObjectToPoint(drag.objectId, drag.handle, coords);
      }
      drag.lastPoint = coords;
      dirtyRef.current = true;
      scheduleRedraw();
      return;
    }

    // Handle free drawing
    if (activePointerIdRef.current === event.pointerId && drawingRef.current.mode && shouldUsePointerForDrawing(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
      for (const ev of coalesced) {
        const c = drawingPointFromInteraction(ev as PointerEvent);
        if (!c) continue;
        c.pressure = extractPressure(ev as PointerEvent);
        queueDrawingPoint(c, ev as PointerEvent);
      }
    }
  }, [interactionEnabled, drawingPointFromInteraction, shouldUsePointerForDrawing, moveObjectByOverlayDelta, resizeObjectToPoint, queueDrawingPoint]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (!canvasRef.current) return;
    if (event.pointerType === "touch") {
      activeTouchPointersRef.current.delete(event.pointerId);
    }
    if (activePointerIdRef.current != null && activePointerIdRef.current !== event.pointerId) return;

    releasePointer(event);
    activePointerIdRef.current = null;

    // End object drag
    if (activeDragRef.current) {
      activeDragRef.current = null;
      drawingRef.current.commitInteractionUpdate();
      setLeafletDrawGestureSuppression(mapRef.current, false);
      detachActiveWindowPointerListeners();
      onStrokeActivityChange?.(false);
      dirtyRef.current = true;
      scheduleRedraw();
      return;
    }

    // End drawing stroke
    if (drawingRef.current.mode) {
      if (pendingPointBufferRef.current.length > 0) {
        const pending = pendingPointBufferRef.current;
        pendingPointBufferRef.current = [];
        for (const point of pending) {
          drawingRef.current.addPoint(point);
        }
      }
      drawingRef.current.endDrawing();
      pendingPointBufferRef.current = [];
      lastBufferedPointRef.current = null;
      setLeafletDrawGestureSuppression(mapRef.current, false);
      detachActiveWindowPointerListeners();
      onStrokeActivityChange?.(false);
      dirtyRef.current = true;
      scheduleRedraw();
    }
  }, [releasePointer, onStrokeActivityChange, scheduleRedraw, detachActiveWindowPointerListeners]);

  activePointerHandlersRef.current.move = handlePointerMove;
  activePointerHandlersRef.current.up = handlePointerUp;
  activePointerHandlersRef.current.release = releasePointer;
  activePointerHandlersRef.current.detach = detachActiveWindowPointerListeners;

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !layerActive) return undefined;

    const onMapFrame = () => {
      if (zoomAnimationRef.current) return;
      markDirtyAndRedraw();
    };
    const onZoomAnim = (event: L.ZoomAnimEvent) => {
      zoomAnimationRef.current = { center: event.center, zoom: event.zoom };
      markDirtyAndRedraw();
    };
    const onZoomSettled = () => {
      zoomAnimationRef.current = null;
      markDirtyAndRedraw();
    };
    const onMapResize = () => {
      const newBounds = calculateFullMapViewportBounds(m.getContainer());
      if (hasViewportChanged(viewportBoundsRef.current, newBounds, 1)) {
        viewportBoundsRef.current = newBounds;
      }
      markDirtyAndRedraw();
    };

    m.on("move", onMapFrame);
    m.on("moveend", onMapFrame);
    m.on("zoom", onMapFrame);
    m.on("zoomanim", onZoomAnim);
    m.on("zoomend", onZoomSettled);
    m.on("viewreset", onZoomSettled);
    m.on("resize", onMapResize);

    return () => {
      m.off("move", onMapFrame);
      m.off("moveend", onMapFrame);
      m.off("zoom", onMapFrame);
      m.off("zoomanim", onZoomAnim);
      m.off("zoomend", onZoomSettled);
      m.off("viewreset", onZoomSettled);
      m.off("resize", onMapResize);
      zoomAnimationRef.current = null;
    };
  }, [layerActive, markDirtyAndRedraw]);

  useEffect(() => {
    const eventTarget = mapRef.current?.getContainer() ?? containerRef.current;
    if (!eventTarget || !interactionEnabled) return undefined;

    const onDown = (e: PointerEvent) => handlePointerDown(e);
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = (e: PointerEvent) => handlePointerUp(e);
    const onCancel = (e: PointerEvent) => {
      releasePointer(e);
      if (e.pointerType === "touch") activeTouchPointersRef.current.delete(e.pointerId);
      activePointerIdRef.current = null;
      activeDragRef.current = null;
      pendingPointBufferRef.current = [];
      lastBufferedPointRef.current = null;
      drawingRef.current.cancelCurrentStroke();
      setLeafletDrawGestureSuppression(mapRef.current, false);
      detachActiveWindowPointerListeners();
      onStrokeActivityChange?.(false);
      dirtyRef.current = true;
      scheduleRedraw();
    };

    eventTarget.addEventListener("pointerdown", onDown as EventListener, { passive: false, capture: true });
    eventTarget.addEventListener("pointermove", onMove as EventListener, { passive: false, capture: true });
    eventTarget.addEventListener("pointerup", onUp as EventListener, { passive: false, capture: true });
    eventTarget.addEventListener("pointercancel", onCancel as EventListener, { passive: false, capture: true });

    return () => {
      eventTarget.removeEventListener("pointerdown", onDown as EventListener, { capture: true } as AddEventListenerOptions);
      eventTarget.removeEventListener("pointermove", onMove as EventListener, { capture: true } as AddEventListenerOptions);
      eventTarget.removeEventListener("pointerup", onUp as EventListener, { capture: true } as AddEventListenerOptions);
      eventTarget.removeEventListener("pointercancel", onCancel as EventListener, { capture: true } as AddEventListenerOptions);
      onStrokeActivityChange?.(false);
      resetLeafletDrawGestureSuppression(mapRef.current);
      detachActiveWindowPointerListeners();
      activePointerIdRef.current = null;
      activeTouchPointersRef.current.clear();
      capturedPointerTargetRef.current = null;
      activeDragRef.current = null;
      dirtyRef.current = true;
      cancelRedraw();
    };
  }, [interactionEnabled, handlePointerDown, handlePointerMove, handlePointerUp, releasePointer, cancelRedraw, scheduleRedraw, onStrokeActivityChange, map]);

  useEffect(() => {
    // redraw when mode/objects change
    dirtyRef.current = true;
    scheduleRedraw();
  }, [drawing.mode, drawing.objects, scheduleRedraw]);

  useEffect(() => {
    if (!interactionEnabled) {
      onStrokeActivityChange?.(false);
      dirtyRef.current = true;
      scheduleRedraw();
    }
  }, [interactionEnabled, onStrokeActivityChange, scheduleRedraw]);

  if (!layerActive) return null;

  const overlayCursor = interactionEnabled ? cursorForAnnotationOverlay(interactionPhase) : "inherit";

  return (
    <div
      ref={containerRef}
      onContextMenu={(event) => event.preventDefault()}
      className="absolute z-[20] select-none"
      style={{
        pointerEvents: "none",
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
    />
  );
};
