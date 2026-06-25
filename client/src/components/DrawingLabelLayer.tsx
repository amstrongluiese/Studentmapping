import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import L from "leaflet";
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, Italic, List, ListOrdered, X } from "lucide-react";
import type { DrawingLabelAlign, DrawingLabelStyle, DrawingObject } from "@/lib/drawingUtils";
import { domPointerEventToMapContainerPoint } from "@/lib/leafletAnnotationCoordinates";
import { setLeafletDrawGestureSuppression } from "@/lib/leafletDrawGestureSuppression";
import { cn } from "@/lib/utils";
import {
  calculateFullMapViewportBounds,
  computeOverlayPlacementWithinParent,
  getViewportInsetInMapContainer,
} from "@/lib/responsiveViewportCalculations";

interface DrawingLabelLayerProps {
  map: L.Map | null;
  labels: DrawingObject[];
  visible: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onUpdateSize: (id: string, size: { width: number; height: number }) => void;
  onUpdateStyle: (id: string, style: DrawingLabelStyle) => void;
  onDelete: (id: string) => void;
  onMovePoint: (id: string, lat: number, lng: number, options?: { refresh?: boolean }) => void;
  /** When false, labels are display-only (no edit / drag). */
  interactive: boolean;
}

const STICKY_NOTE_COLORS = [
  { name: "Yellow", value: "#fff7c2", border: "#eadf8f", text: "#3f3a1a" },
  { name: "Blue", value: "#dbeafe", border: "#b7cdf8", text: "#172554" },
  { name: "Green", value: "#dcfce7", border: "#addfbd", text: "#123524" },
  { name: "Pink", value: "#fce7f3", border: "#efbfd8", text: "#4a1831" },
  { name: "Orange", value: "#ffedd5", border: "#f4c996", text: "#4a2a12" },
  { name: "Purple", value: "#ede9fe", border: "#cfc4f6", text: "#2e235f" },
  { name: "White", value: "#ffffff", border: "#e2e8f0", text: "#1f2937" },
];

function resolveStickyNoteColor(color: string | undefined) {
  const normalized = (color || "").toLowerCase();
  return STICKY_NOTE_COLORS.find((preset) => preset.value.toLowerCase() === normalized) ?? STICKY_NOTE_COLORS[0];
}

type OverlayPoint = { x: number; y: number };

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatLng(latLng: unknown): latLng is { lat: number; lng: number } {
  if (!latLng || typeof latLng !== "object") return false;
  const candidate = latLng as { lat?: unknown; lng?: unknown };
  return (
    isFiniteCoordinate(candidate.lat) &&
    isFiniteCoordinate(candidate.lng) &&
    Math.abs(candidate.lat) <= 90 &&
    Math.abs(candidate.lng) <= 180
  );
}

type ActiveLabelInteraction =
  | {
      kind: "move";
      id: string;
      pointerId: number;
      target: HTMLElement;
      shell: HTMLElement | null;
      origin: OverlayPoint;
      startPoint: OverlayPoint;
      grabOffsetX: number;
      grabOffsetY: number;
      width: number;
      height: number;
      scale: number;
      moved: boolean;
      mapSuppressed: boolean;
      currentPosition: OverlayPoint;
      lastLatLng: L.LatLng | null;
    }
  | {
      kind: "resize";
      id: string;
      pointerId: number;
      target: HTMLElement;
      startPoint: OverlayPoint;
      startWidth: number;
      startHeight: number;
      scale: number;
    };

export function DrawingLabelLayer({
  map,
  labels,
  visible,
  selectedId,
  onSelect,
  onUpdateText,
  onUpdateColor,
  onUpdateSize,
  onUpdateStyle,
  onDelete,
  onMovePoint,
  interactive,
}: DrawingLabelLayerProps) {
  const [tick, setTick] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ left: number; top: number; width: number | string; height: number | string }>({
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoomTransitioning, setZoomTransitioning] = useState(false);
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const autoEditedLabelRef = useRef<string | null>(null);
  const zoomAnimationRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const tickRafRef = useRef<number | null>(null);
  const activeInteractionRef = useRef<ActiveLabelInteraction | null>(null);
  const lastValidPositionsRef = useRef<Map<string, OverlayPoint>>(new Map());
  const editingIdRef = useRef<string | null>(null);
  editingIdRef.current = editingId;

  const bump = useCallback(() => {
    if (tickRafRef.current != null) return;
    tickRafRef.current = window.requestAnimationFrame(() => {
      tickRafRef.current = null;
      setTick((t) => t + 1);
    });
  }, []);

  const syncClipFrame = useCallback(() => {
    if (!map || !visible) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const bounds = calculateFullMapViewportBounds(map.getContainer());
    const placement = bounds && computeOverlayPlacementWithinParent(bounds, wrapper);
    if (placement) {
      setFrame((current) => {
        if (
          current.left === placement.left &&
          current.top === placement.top &&
          current.width === placement.width &&
          current.height === placement.height
        ) {
          return current;
        }

        return {
          left: placement.left,
          top: placement.top,
          width: placement.width,
          height: placement.height,
        };
      });
    }
  }, [map, visible]);

  useEffect(() => () => {
    if (tickRafRef.current != null) {
      window.cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    activeInteractionRef.current = null;
    setLeafletDrawGestureSuppression(map, false);
  }, [map]);

  useEffect(() => {
    bump();
  }, [labels, map, visible, bump]);

  useEffect(() => {
    if (!selectedId) {
      setEditingId(null);
      autoEditedLabelRef.current = null;
      return;
    }
    const selected = labels.find((label) => label.id === selectedId);
    if (selected?.type === "label" && !selected.label && autoEditedLabelRef.current !== selectedId) {
      autoEditedLabelRef.current = selectedId;
      setEditingId(selectedId);
    }
  }, [labels, selectedId]);

  useLayoutEffect(() => {
    syncClipFrame();
  }, [syncClipFrame]);

  useEffect(() => {
    if (!map || !visible) return undefined;

    const sync = () => {
      if (zoomAnimationRef.current) return;
      bump();
    };
    const onZoomAnim = (event: L.ZoomAnimEvent) => {
      zoomAnimationRef.current = { center: event.center, zoom: event.zoom };
      setZoomTransitioning(true);
      bump();
    };
    const onZoomSettled = () => {
      zoomAnimationRef.current = null;
      setZoomTransitioning(false);
      bump();
    };
    map.on("move", sync);
    map.on("moveend", sync);
    map.on("zoom", sync);
    map.on("zoomanim", onZoomAnim);
    map.on("zoomend", onZoomSettled);
    map.on("resize", sync);
    map.on("viewreset", onZoomSettled);

    return () => {
      map.off("move", sync);
      map.off("moveend", sync);
      map.off("zoom", sync);
      map.off("zoomanim", onZoomAnim);
      map.off("zoomend", onZoomSettled);
      map.off("resize", sync);
      map.off("viewreset", onZoomSettled);
      zoomAnimationRef.current = null;
      setZoomTransitioning(false);
    };
  }, [map, visible, bump]);

  useEffect(() => {
    if (!map || !visible) return undefined;

    const el = map.getContainer();
    const shouldIgnoreKeyboardViewportResize = () => {
      const activeElement = document.activeElement as HTMLElement | null;
      const vv = window.visualViewport;
      return Boolean(
        editingIdRef.current &&
        activeElement?.closest("[data-sticky-note-editor='true']") &&
        vv &&
        window.innerHeight - vv.height > 80,
      );
    };
    const syncFromLayoutResize = () => {
      if (shouldIgnoreKeyboardViewportResize()) return;
      syncClipFrame();
      bump();
    };

    const ro = new ResizeObserver(syncFromLayoutResize);
    ro.observe(el);
    const parent = wrapperRef.current?.parentElement;
    if (parent) ro.observe(parent);

    window.addEventListener("resize", syncFromLayoutResize);
    window.addEventListener("orientationchange", syncFromLayoutResize);
    document.addEventListener("fullscreenchange", syncFromLayoutResize);
    document.addEventListener("webkitfullscreenchange", syncFromLayoutResize as EventListener);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncFromLayoutResize);
      window.removeEventListener("orientationchange", syncFromLayoutResize);
      document.removeEventListener("fullscreenchange", syncFromLayoutResize);
      document.removeEventListener("webkitfullscreenchange", syncFromLayoutResize as EventListener);
    };
  }, [map, visible, bump, syncClipFrame]);

  const getOverlayInset = useCallback(() => {
    if (!map) return { x: 0, y: 0 };
    const bounds = calculateFullMapViewportBounds(map.getContainer());
    const mapRect = map.getContainer().getBoundingClientRect();
    return bounds ? getViewportInsetInMapContainer(bounds, mapRect) : { x: 0, y: 0 };
  }, [map]);

  const projectLatLngToContainerPoint = useCallback((latLng: L.LatLng) => {
    if (!map) return L.point(0, 0);

    const anim = zoomAnimationRef.current;
    const animatedProjector = map as L.Map & {
      _getNewPixelOrigin?: (center: L.LatLng, zoom: number) => L.Point;
    };

    if (anim && typeof animatedProjector._getNewPixelOrigin === "function") {
      const pixelOrigin = animatedProjector._getNewPixelOrigin(anim.center, anim.zoom);
      return map.project(latLng, anim.zoom).subtract(pixelOrigin);
    }

    return map.latLngToContainerPoint(latLng);
  }, [map]);

  const positions = useMemo(() => {
    if (!map || !visible) return new Map<string, { x: number; y: number }>();
    const inset = getOverlayInset();

    const next = new Map<string, { x: number; y: number }>();
    const seen = new Set<string>();
    for (const obj of labels) {
      if (obj.type !== "label") continue;
      seen.add(obj.id);
      const anchor = obj.points[0];
      if (isValidLatLng(anchor?.latLng)) {
        const p = projectLatLngToContainerPoint(L.latLng(anchor.latLng.lat, anchor.latLng.lng));
        const position = { x: p.x - inset.x, y: p.y - inset.y };
        if (isFiniteCoordinate(position.x) && isFiniteCoordinate(position.y)) {
          next.set(obj.id, position);
          lastValidPositionsRef.current.set(obj.id, position);
          continue;
        }
      }

      const lastValid = lastValidPositionsRef.current.get(obj.id);
      if (lastValid) next.set(obj.id, lastValid);
    }
    for (const id of Array.from(lastValidPositionsRef.current.keys())) {
      if (!seen.has(id)) lastValidPositionsRef.current.delete(id);
    }
    return next;
  }, [labels, map, visible, tick, getOverlayInset, projectLatLngToContainerPoint]);

  if (!map || !visible || labels.length === 0) return null;

  const overlayPointToLatLng = (x: number, y: number) => {
    const inset = getOverlayInset();
    if (!isFiniteCoordinate(x) || !isFiniteCoordinate(y)) return null;
    const latLng = map.containerPointToLatLng(L.point(x + inset.x, y + inset.y));
    return isValidLatLng(latLng) ? latLng : null;
  };

  const eventToOverlayPoint = (event: PointerEvent | ReactPointerEvent) => {
    const pointerEvent = "nativeEvent" in event ? event.nativeEvent : event;
    const cp = domPointerEventToMapContainerPoint(map, pointerEvent);
    if (!cp) return null;
    const inset = getOverlayInset();
    const point = { x: cp.x - inset.x, y: cp.y - inset.y };
    return isFiniteCoordinate(point.x) && isFiniteCoordinate(point.y) ? point : null;
  };

  const getEffectiveZoom = () => {
    const zoom = zoomAnimationRef.current?.zoom ?? map.getZoom();
    return isFiniteCoordinate(zoom) ? zoom : undefined;
  };

  const getStickyNoteScale = (referenceZoom: number | undefined) => {
    const currentZoom = getEffectiveZoom();
    if (!isFiniteCoordinate(referenceZoom) || !isFiniteCoordinate(currentZoom)) return 1;
    const scale = Math.pow(2, currentZoom - referenceZoom);
    return isFiniteCoordinate(scale) && scale > 0 ? scale : 1;
  };

  const noteTransform = (position: OverlayPoint, scale: number) =>
    `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`;

  const resolveSafeNotePosition = (x: number, y: number, width: number, height: number) => {
    const mapEl = map.getContainer();
    const frameWidth = typeof frame.width === "number" ? frame.width : mapEl.clientWidth;
    const frameHeight = typeof frame.height === "number" ? frame.height : mapEl.clientHeight;
    return {
      x: Math.max(0, Math.min(x, Math.max(0, frameWidth - width))),
      y: Math.max(0, Math.min(y, Math.max(0, frameHeight - height))),
      width,
      height,
    };
  };

  const normalizeLabelStyle = (style: DrawingLabelStyle | undefined): Required<DrawingLabelStyle> => ({
    align: style?.align === "center" || style?.align === "right" ? style.align : "left",
    bold: Boolean(style?.bold),
    italic: Boolean(style?.italic),
    list: style?.list === "bullet" || style?.list === "numbered" ? style.list : null,
  });

  const stripListPrefix = (line: string) => line.replace(/^\s*(?:[-*]\s+|\d+[.)]\s+)/, "");

  const applyListFormatToText = (value: string, list: DrawingLabelStyle["list"]) => {
    if (!list) {
      return value
        .split("\n")
        .map(stripListPrefix)
        .join("\n");
    }

    return value
      .split("\n")
      .map((line, index) => {
        const body = stripListPrefix(line);
        if (!body.trim()) return body;
        return list === "bullet" ? `- ${body}` : `${index + 1}. ${body}`;
      })
      .join("\n");
  };

  const noteControlClass = "grid h-7 w-7 place-items-center rounded-md bg-white/70 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-950 data-[active=true]:bg-white data-[active=true]:text-teal-700 data-[active=true]:ring-1 data-[active=true]:ring-teal-500/30";

  const stopControlPointer = (event: ReactPointerEvent) => {
    event.stopPropagation();
  };

  const finishInteraction = (event: PointerEvent | ReactPointerEvent, commit = true) => {
    const active = activeInteractionRef.current;
    const pointerId = "nativeEvent" in event ? event.nativeEvent.pointerId : event.pointerId;
    if (!active || active.pointerId !== pointerId) return;

    try {
      active.target.releasePointerCapture(pointerId);
    } catch {}

    setLeafletDrawGestureSuppression(map, false);

    if (active.kind === "move") {
      if (!active.moved) {
        onSelect(active.id);
      } else if (commit && isValidLatLng(active.lastLatLng)) {
        onMovePoint(active.id, active.lastLatLng.lat, active.lastLatLng.lng, { refresh: true });
        if (active.shell) {
          active.shell.style.transform = noteTransform(active.currentPosition, active.scale);
        }
      } else if (active.shell) {
        active.shell.style.transform = noteTransform(active.origin, active.scale);
      }
    }

    activeInteractionRef.current = null;
  };

  const updateMoveInteraction = (event: ReactPointerEvent) => {
    const active = activeInteractionRef.current;
    if (!active || active.kind !== "move" || active.pointerId !== event.pointerId) return;
    if (editingIdRef.current === active.id) return;

    event.preventDefault();
    event.stopPropagation();

    const nextOverlayPoint = eventToOverlayPoint(event);
    if (!nextOverlayPoint) return;
    const distanceFromStart = Math.hypot(nextOverlayPoint.x - active.startPoint.x, nextOverlayPoint.y - active.startPoint.y);
    if (!active.moved && distanceFromStart < 6) return;

    const nextX = nextOverlayPoint.x - active.grabOffsetX;
    const nextY = nextOverlayPoint.y - active.grabOffsetY;
    const safe = resolveSafeNotePosition(nextX, nextY, active.width, active.height);
    const latLng = overlayPointToLatLng(safe.x, safe.y);
    if (!latLng) return;

    active.moved = true;
    if (!active.mapSuppressed) {
      setLeafletDrawGestureSuppression(map, true);
      active.mapSuppressed = true;
    }
    active.lastLatLng = latLng;
    active.currentPosition = { x: safe.x, y: safe.y };
    if (active.shell) {
      active.shell.style.transform = noteTransform(active.currentPosition, active.scale);
    }
    onMovePoint(active.id, latLng.lat, latLng.lng, { refresh: false });
  };

  const updateResizeInteraction = (event: ReactPointerEvent) => {
    const active = activeInteractionRef.current;
    if (!active || active.kind !== "resize" || active.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const nextPoint = eventToOverlayPoint(event);
    if (!nextPoint) return;

    const nextSize = {
      width: Math.max(120, Math.min(320, active.startWidth + (nextPoint.x - active.startPoint.x) / active.scale)),
      height: Math.max(64, Math.min(240, active.startHeight + (nextPoint.y - active.startPoint.y) / active.scale)),
    };
    onUpdateSize(active.id, nextSize);
  };

  const selectedLabel = selectedId ? labels.find((label) => label.id === selectedId && label.type === "label") : undefined;
  const selectedStyle = normalizeLabelStyle(selectedLabel?.labelStyle);
  const selectedColor = resolveStickyNoteColor(selectedLabel?.color);
  const selectedText = selectedLabel?.label ?? "";
  const showFormattingDock = Boolean(interactive && selectedLabel);

  const updateSelectedStyle = (patch: Partial<DrawingLabelStyle>) => {
    if (!selectedLabel) return;
    onUpdateStyle(selectedLabel.id, { ...selectedStyle, ...patch });
  };

  const toggleSelectedList = (list: NonNullable<DrawingLabelStyle["list"]>) => {
    if (!selectedLabel) return;
    const nextList = selectedStyle.list === list ? null : list;
    onUpdateText(selectedLabel.id, applyListFormatToText(selectedText, nextList));
    updateSelectedStyle({ list: nextList });
  };

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute z-[30] overflow-hidden"
      style={{
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        contain: "layout paint style",
        willChange: "transform",
      }}
      aria-hidden={interactive ? undefined : true}
    >
      {showFormattingDock && selectedLabel && (
        <div
          data-label-control="true"
          className="pointer-events-auto absolute left-1/2 top-3 z-[40] flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/65 bg-white/75 px-2.5 py-2 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl"
          onPointerDown={stopControlPointer}
        >
          <div className="flex items-center gap-1 border-r border-slate-200/70 pr-1.5">
            {STICKY_NOTE_COLORS.map((preset) => {
              const active = preset.value.toLowerCase() === selectedColor.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  aria-label={`${preset.name} note color`}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-md border transition hover:scale-105",
                    active && "ring-2 ring-teal-500/35 ring-offset-1 ring-offset-white/70",
                  )}
                  style={{ backgroundColor: preset.value, borderColor: preset.border }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onUpdateColor(selectedLabel.id, preset.value);
                  }}
                >
                  {active && <Check className="h-3.5 w-3.5 text-slate-700" strokeWidth={2} />}
                </button>
              );
            })}
          </div>

          <button type="button" className={noteControlClass} data-active={selectedStyle.bold} aria-label="Bold" onClick={(event) => { event.stopPropagation(); updateSelectedStyle({ bold: !selectedStyle.bold }); }}>
            <Bold className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
          <button type="button" className={noteControlClass} data-active={selectedStyle.italic} aria-label="Italic" onClick={(event) => { event.stopPropagation(); updateSelectedStyle({ italic: !selectedStyle.italic }); }}>
            <Italic className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>

          {(["left", "center", "right"] as DrawingLabelAlign[]).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (
              <button
                key={align}
                type="button"
                className={noteControlClass}
                data-active={selectedStyle.align === align}
                aria-label={`Align ${align}`}
                onClick={(event) => {
                  event.stopPropagation();
                  updateSelectedStyle({ align });
                }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            );
          })}

          <button type="button" className={noteControlClass} data-active={selectedStyle.list === "bullet"} aria-label="Bullet list" onClick={(event) => { event.stopPropagation(); toggleSelectedList("bullet"); }}>
            <List className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
          <button type="button" className={noteControlClass} data-active={selectedStyle.list === "numbered"} aria-label="Numbered list" onClick={(event) => { event.stopPropagation(); toggleSelectedList("numbered"); }}>
            <ListOrdered className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={cn(noteControlClass, "text-rose-600 hover:text-rose-700")}
            aria-label="Delete note"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(selectedLabel.id);
              setEditingId(null);
              (document.activeElement as HTMLElement | null)?.blur?.();
            }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </div>
      )}

      {labels.map((obj) => {
        if (obj.type !== "label") return null;
        const pos = positions.get(obj.id);
        if (!pos) return null;
        const isSelected = selectedId === obj.id;
        const isEditing = editingId === obj.id;
        const text = obj.label ?? "";
        const labelWidth = obj.labelSize?.width ?? 176;
        const labelHeight = obj.labelSize?.height ?? 92;
        const noteScale = getStickyNoteScale(obj.referenceZoom);
        const noteColor = resolveStickyNoteColor(obj.color);
        const noteStyle = normalizeLabelStyle(obj.labelStyle);

        return (
          <div
            key={obj.id}
            className={cn("pointer-events-auto absolute select-none", isSelected && "z-[2]")}
            style={{
              left: 0,
              top: 0,
              transform: noteTransform(pos, noteScale),
              transformOrigin: "top left",
              transition: zoomTransitioning ? "transform 250ms cubic-bezier(0, 0, 0.25, 1)" : undefined,
              willChange: zoomTransitioning || isSelected ? "transform" : undefined,
            }}
          >
            <div
              className={cn(
                "group relative rounded-lg border shadow-[0_16px_34px_-22px_rgba(15,23,42,0.42)] backdrop-blur-md transition-[box-shadow,transform,border-color] duration-150",
                interactive && !isEditing && "cursor-grab active:cursor-grabbing",
                isSelected && "border-teal-300/80 ring-2 ring-teal-500/20",
              )}
              style={{
                width: labelWidth,
                height: labelHeight,
                backgroundColor: `${noteColor.value}ee`,
                borderColor: isSelected ? undefined : noteColor.border,
                color: noteColor.text,
                touchAction: "none",
                WebkitUserSelect: isEditing ? undefined : "none",
              }}
              onPointerDown={(event) => {
                if (!interactive) return;
                if (!event.isPrimary && event.pointerType !== "mouse") return;
                if ((event.target as HTMLElement).closest("[data-label-control='true']")) return;
                event.preventDefault();
                event.stopPropagation();
                onSelect(obj.id);

                const now = Date.now();
                const last = lastTapRef.current;
                if (last?.id === obj.id && now - last.at < 420) {
                  setEditingId(obj.id);
                  lastTapRef.current = null;
                  return;
                }
                lastTapRef.current = { id: obj.id, at: now };

                const target = event.currentTarget as HTMLElement;
                const startOverlayPoint = eventToOverlayPoint(event);
                const startPosition = positions.get(obj.id);
                if (!startOverlayPoint || !startPosition) return;
                const shell = target.parentElement as HTMLElement | null;

                try {
                  target.setPointerCapture(event.pointerId);
                } catch {}

                activeInteractionRef.current = {
                  kind: "move",
                  id: obj.id,
                  pointerId: event.pointerId,
                  target,
                  shell,
                  origin: startPosition,
                  startPoint: startOverlayPoint,
                  grabOffsetX: startOverlayPoint.x - startPosition.x,
                  grabOffsetY: startOverlayPoint.y - startPosition.y,
                  width: labelWidth * noteScale,
                  height: labelHeight * noteScale,
                  scale: noteScale,
                  moved: false,
                  mapSuppressed: false,
                  currentPosition: startPosition,
                  lastLatLng: null,
                };
              }}
              onPointerMove={updateMoveInteraction}
              onPointerUp={(event) => finishInteraction(event)}
              onPointerCancel={(event) => finishInteraction(event, false)}
              onDoubleClick={(event) => {
                if (!interactive) return;
                event.stopPropagation();
                onSelect(obj.id);
                setEditingId(obj.id);
              }}
              tabIndex={interactive ? 0 : -1}
            >
              {isSelected && interactive && (
                <button
                  type="button"
                  data-label-control="true"
                  className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-md bg-white/65 text-slate-500 shadow-sm transition hover:bg-white hover:text-rose-600"
                  aria-label="Delete note"
                  onPointerDown={stopControlPointer}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(obj.id);
                    setEditingId(null);
                    (document.activeElement as HTMLElement | null)?.blur?.();
                  }}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              )}

              {isEditing ? (
                <textarea
                  data-label-control="true"
                  data-sticky-note-editor="true"
                  ref={(element) => {
                    if (!element || document.activeElement === element) return;
                    window.requestAnimationFrame(() => {
                      try {
                        element.focus({ preventScroll: true });
                      } catch {
                        element.focus();
                      }
                    });
                  }}
                  value={text}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onFocus={() => {
                    setLeafletDrawGestureSuppression(map, true);
                  }}
                  onChange={(event) => onUpdateText(obj.id, event.target.value)}
                  onBlur={() => {
                    setEditingId(null);
                    setLeafletDrawGestureSuppression(map, false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setEditingId(null);
                      (event.currentTarget as HTMLTextAreaElement).blur();
                    }
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      (event.currentTarget as HTMLTextAreaElement).blur();
                    }
                  }}
                  className="h-full w-full resize-none rounded-lg border-0 bg-transparent px-3 pb-4 pr-8 pt-3 text-[13px] leading-snug outline-none placeholder:text-slate-400"
                  style={{
                    color: noteColor.text,
                    textAlign: noteStyle.align,
                    fontWeight: noteStyle.bold ? 700 : 500,
                    fontStyle: noteStyle.italic ? "italic" : undefined,
                  }}
                  placeholder="Add note"
                />
              ) : (
                <p
                  className="h-full w-full overflow-hidden whitespace-pre-wrap break-words px-3 pb-4 pr-8 pt-3 text-[13px] leading-snug"
                  style={{
                    color: noteColor.text,
                    textAlign: noteStyle.align,
                    fontWeight: noteStyle.bold ? 700 : 600,
                    fontStyle: noteStyle.italic ? "italic" : undefined,
                  }}
                >
                  {text.trim() || "New note"}
                </p>
              )}

              {isSelected && interactive && (
                <div
                  data-label-control="true"
                  className="absolute bottom-1.5 right-1.5 z-20 h-8 w-8 cursor-nwse-resize touch-none rounded-md border border-teal-500/35 bg-white/80 shadow-sm before:absolute before:bottom-2 before:right-2 before:h-3 before:w-3 before:rounded-[3px] before:border-b-2 before:border-r-2 before:border-teal-600/55 sm:h-6 sm:w-6"
                  onPointerDown={(event) => {
                    if (!event.isPrimary && event.pointerType !== "mouse") return;
                    event.preventDefault();
                    event.stopPropagation();
                    const startPoint = eventToOverlayPoint(event);
                    if (!startPoint) return;
                    const startWidth = labelWidth;
                    const startHeight = labelHeight;
                    const target = event.currentTarget as HTMLElement;
                    try {
                      target.setPointerCapture(event.pointerId);
                    } catch {}
                    setLeafletDrawGestureSuppression(map, true);

                    activeInteractionRef.current = {
                      kind: "resize",
                      id: obj.id,
                      pointerId: event.pointerId,
                      target,
                      startPoint,
                      startWidth,
                      startHeight,
                      scale: noteScale,
                    };
                  }}
                  onPointerMove={updateResizeInteraction}
                  onPointerUp={(event) => finishInteraction(event)}
                  onPointerCancel={(event) => finishInteraction(event, false)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
