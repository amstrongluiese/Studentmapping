import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type DrawingHistory,
  type DrawingLabelStyle,
  type DrawingMode,
  type DrawingObject,
  type DrawingPoint,
  type DrawingRenderOptions,
  findObjectAtPoint,
  generateId,
  redrawAll,
} from '@/lib/drawingUtils';

export interface UseDrawingReturn {
  mode: DrawingMode;
  setMode: (mode: DrawingMode) => void;
  color: string;
  setColor: (color: string) => void;
  width: number;
  setWidth: (width: number) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  objects: DrawingObject[];
  currentDrawing: DrawingObject | null;
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;
  updateLabelText: (id: string, text: string) => void;
  updateLabelColor: (id: string, color: string) => void;
  updateLabelSize: (id: string, size: { width: number; height: number }) => void;
  updateLabelStyle: (id: string, style: DrawingLabelStyle) => void;
  moveLabelToLatLng: (id: string, lat: number, lng: number, options?: { refresh?: boolean }) => void;
  moveObjectPoints: (id: string, deltaX: number, deltaY: number) => void;
  moveObjectToPoint: (id: string, point: DrawingPoint) => void;
  updateObjectPoints: (id: string, points: DrawingPoint[], options?: { refresh?: boolean }) => void;
  commitInteractionUpdate: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addPoint: (point: DrawingPoint) => void;
  endDrawing: () => void;
  /** Drop the in-progress stroke without mutating undo history (aborted drag, tool switch, overlay disabled). */
  cancelCurrentStroke: () => void;
  startDrawing: (type: DrawingMode, startPoint: DrawingPoint, options?: { referenceZoom?: number }) => void;
  addObject: (obj: DrawingObject) => void;
  deleteObject: (id: string) => void;
  clear: () => void;
  redraw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, options?: DrawingRenderOptions) => void;
  getObjectAt: (point: DrawingPoint, options?: DrawingRenderOptions) => DrawingObject | null;
  isStylusMode: boolean;
  setIsStylusMode: (mode: boolean) => void;
}

const DEFAULT_COLOR = '#ef4444';
const DEFAULT_WIDTH = 2;
const DEFAULT_OPACITY = 1;
const DRAWING_SETTINGS_KEY = 'trimex-gis-drawing-settings-v1';
const DRAWING_OBJECTS_KEY = 'trimex-gis-drawing-objects-v2';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLatLngValue(lat: unknown, lng: unknown): boolean {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function sanitizeDrawingPoint(point: unknown): DrawingPoint | null {
  if (!point || typeof point !== 'object') return null;
  const candidate = point as Partial<DrawingPoint>;
  const latLng = candidate.latLng;
  const hasLatLng =
    latLng &&
    isFiniteNumber(latLng.lat) &&
    isFiniteNumber(latLng.lng);

  if (!hasLatLng && (!isFiniteNumber(candidate.x) || !isFiniteNumber(candidate.y))) return null;

  return {
    x: isFiniteNumber(candidate.x) ? candidate.x : 0,
    y: isFiniteNumber(candidate.y) ? candidate.y : 0,
    pressure: isFiniteNumber(candidate.pressure) ? candidate.pressure : undefined,
    timestamp: isFiniteNumber(candidate.timestamp) ? candidate.timestamp : Date.now(),
    latLng: hasLatLng ? { lat: latLng.lat, lng: latLng.lng } : undefined,
  };
}

function sanitizeDrawingObject(object: unknown): DrawingObject | null {
  if (!object || typeof object !== 'object') return null;
  const candidate = object as Partial<DrawingObject>;
  if (!candidate.id || typeof candidate.id !== 'string') return null;
  if (!candidate.type) return null;
  if (!Array.isArray(candidate.points)) return null;

  const points = candidate.points
    .map(sanitizeDrawingPoint)
    .filter((point): point is DrawingPoint => Boolean(point));

  if (points.length === 0) return null;

  const normalizedPoints =
    (candidate.type === 'line' ||
      candidate.type === 'arrow' ||
      candidate.type === 'rectangle' ||
      candidate.type === 'circle') &&
    points.length > 2
      ? [points[0], points[points.length - 1]]
      : points;
  const labelStyle = candidate.labelStyle && typeof candidate.labelStyle === 'object'
    ? candidate.labelStyle as Partial<DrawingLabelStyle>
    : undefined;
  const normalizedLabelStyle = labelStyle
    ? {
        align: labelStyle.align === 'center' || labelStyle.align === 'right' ? labelStyle.align : 'left',
        bold: Boolean(labelStyle.bold),
        italic: Boolean(labelStyle.italic),
        list: labelStyle.list === 'bullet' || labelStyle.list === 'numbered' ? labelStyle.list : null,
      } satisfies DrawingLabelStyle
    : undefined;

  return {
    id: candidate.id,
    type: candidate.type,
    points: normalizedPoints,
    color: typeof candidate.color === 'string' ? candidate.color : DEFAULT_COLOR,
    width: isFiniteNumber(candidate.width) ? candidate.width : DEFAULT_WIDTH,
    opacity: isFiniteNumber(candidate.opacity) ? Math.min(1, Math.max(0.1, candidate.opacity)) : DEFAULT_OPACITY,
    filled: Boolean(candidate.filled),
    label: typeof candidate.label === 'string' ? candidate.label : undefined,
    labelSize: candidate.labelSize &&
      isFiniteNumber(candidate.labelSize.width) &&
      isFiniteNumber(candidate.labelSize.height)
        ? { width: candidate.labelSize.width, height: candidate.labelSize.height }
        : undefined,
    labelStyle: normalizedLabelStyle,
    referenceZoom: isFiniteNumber(candidate.referenceZoom) ? candidate.referenceZoom : undefined,
    timestamp: isFiniteNumber(candidate.timestamp) ? candidate.timestamp : Date.now(),
  };
}

function isTwoAnchorDrawingMode(mode: DrawingMode) {
  return mode === 'line' || mode === 'arrow' || mode === 'rectangle' || mode === 'circle';
}

function loadDrawingObjects(): DrawingObject[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAWING_OBJECTS_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeDrawingObject)
      .filter((object): object is DrawingObject => Boolean(object));
  } catch {
    return [];
  }
}

function loadDrawingSettings() {
  if (typeof window === 'undefined') {
    return { color: DEFAULT_COLOR, width: DEFAULT_WIDTH, opacity: DEFAULT_OPACITY, isStylusMode: true };
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(DRAWING_SETTINGS_KEY) || '{}') as Partial<{
      color: string;
      width: number;
      opacity: number;
      isStylusMode: boolean;
    }>;

    return {
      color: typeof stored.color === 'string' && stored.color.toLowerCase() !== '#ffffff' ? stored.color : DEFAULT_COLOR,
      width: typeof stored.width === 'number' ? stored.width : DEFAULT_WIDTH,
      opacity: typeof stored.opacity === 'number' ? Math.min(1, Math.max(0.1, stored.opacity)) : DEFAULT_OPACITY,
      isStylusMode: stored.isStylusMode ?? true,
    };
  } catch {
    return { color: DEFAULT_COLOR, width: DEFAULT_WIDTH, opacity: DEFAULT_OPACITY, isStylusMode: true };
  }
}

export const useDrawing = (): UseDrawingReturn => {
  const [mode, setMode] = useState<DrawingMode>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const initialSettingsRef = useRef(loadDrawingSettings());
  const [color, setColor] = useState(initialSettingsRef.current.color);
  const [width, setWidth] = useState(initialSettingsRef.current.width);
  const [opacity, setOpacity] = useState(initialSettingsRef.current.opacity);
  const [isStylusMode, setIsStylusMode] = useState(initialSettingsRef.current.isStylusMode);

  const initialObjectsRef = useRef<DrawingObject[]>(loadDrawingObjects());
  const historyRef = useRef<DrawingHistory>({
    objects: initialObjectsRef.current,
    currentIndex: initialObjectsRef.current.length - 1,
  });
  const currentDrawingRef = useRef<DrawingObject | null>(null);

  const [, setRefresh] = useState(0);
  const refresh = () => setRefresh((value) => value + 1);

  const objects = historyRef.current.objects.slice(0, historyRef.current.currentIndex + 1);
  const canUndo = historyRef.current.currentIndex > -1;
  const canRedo = historyRef.current.currentIndex < historyRef.current.objects.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    historyRef.current.currentIndex -= 1;
    const active = historyRef.current.objects.slice(0, historyRef.current.currentIndex + 1);
    setSelectedAnnotationId((sel) => (sel && active.some((o) => o.id === sel) ? sel : null));
    refresh();
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    historyRef.current.currentIndex += 1;
    const active = historyRef.current.objects.slice(0, historyRef.current.currentIndex + 1);
    setSelectedAnnotationId((sel) => (sel && active.some((o) => o.id === sel) ? sel : null));
    refresh();
  }, [canRedo]);

  const addPoint = useCallback((point: DrawingPoint) => {
    if (currentDrawingRef.current) {
      if (isTwoAnchorDrawingMode(currentDrawingRef.current.type)) {
        currentDrawingRef.current.points = [currentDrawingRef.current.points[0], point];
        return;
      }
      currentDrawingRef.current.points.push(point);
    }
  }, []);

  const startDrawing = useCallback((
    type: DrawingMode,
    startPoint: DrawingPoint,
    options?: { referenceZoom?: number },
  ) => {
    currentDrawingRef.current = {
      id: generateId(),
      type: type || mode,
      points: [startPoint],
      color,
      width,
      opacity,
      referenceZoom: options?.referenceZoom,
      timestamp: Date.now(),
    };
  }, [color, mode, opacity, width]);

  const endDrawing = useCallback(() => {
    const current = currentDrawingRef.current;
    if (!current || current.points.length === 0) {
      currentDrawingRef.current = null;
      return;
    }

    historyRef.current.objects = historyRef.current.objects.slice(0, historyRef.current.currentIndex + 1);
    let committedId: string | null = null;

    if ((current.type === 'free' || current.type === 'highlight') && current.points.length > 1) {
      historyRef.current.objects.push(current);
      committedId = current.id;
    } else if (current.type === 'eraser' && current.points.length >= 1) {
      historyRef.current.objects.push(current);
    } else if (current.type !== 'free' && current.type !== 'highlight' && current.type !== 'eraser') {
      const needsTwoAnchors =
        current.type === 'line' ||
        current.type === 'arrow' ||
        current.type === 'rectangle' ||
        current.type === 'circle';
      if (!needsTwoAnchors || current.points.length >= 2) {
        historyRef.current.objects.push(current);
        committedId = current.id;
      }
    }

    historyRef.current.currentIndex = historyRef.current.objects.length - 1;
    setSelectedAnnotationId(committedId);
    currentDrawingRef.current = null;
    refresh();
  }, []);

  const cancelCurrentStroke = useCallback(() => {
    if (!currentDrawingRef.current) return;
    currentDrawingRef.current = null;
    refresh();
  }, []);

  const addObject = useCallback((object: DrawingObject) => {
    historyRef.current.objects = historyRef.current.objects.slice(0, historyRef.current.currentIndex + 1);
    historyRef.current.objects.push(object);
    historyRef.current.currentIndex = historyRef.current.objects.length - 1;
    refresh();
  }, []);

  const deleteObject = useCallback((id: string) => {
    historyRef.current.objects = historyRef.current.objects.filter((object) => object.id !== id);
    historyRef.current.currentIndex = Math.min(historyRef.current.currentIndex, historyRef.current.objects.length - 1);
    setSelectedAnnotationId((current) => (current === id ? null : current));
    refresh();
  }, []);

  const updateLabelText = useCallback((id: string, text: string) => {
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object || object.type !== "label") return;
    object.label = text;
    refresh();
  }, []);

  const updateLabelColor = useCallback((id: string, nextColor: string) => {
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object || object.type !== "label") return;
    object.color = nextColor;
    refresh();
  }, []);

  const updateLabelSize = useCallback((id: string, size: { width: number; height: number }) => {
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object || object.type !== "label") return;
    object.labelSize = {
      width: Math.max(120, Math.min(320, size.width)),
      height: Math.max(64, Math.min(240, size.height)),
    };
    refresh();
  }, []);

  const updateLabelStyle = useCallback((id: string, style: DrawingLabelStyle) => {
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object || object.type !== "label") return;
    object.labelStyle = {
      align: style.align === "center" || style.align === "right" ? style.align : "left",
      bold: Boolean(style.bold),
      italic: Boolean(style.italic),
      list: style.list === "bullet" || style.list === "numbered" ? style.list : null,
    };
    refresh();
  }, []);

  const moveLabelToLatLng = useCallback((id: string, lat: number, lng: number, options?: { refresh?: boolean }) => {
    if (!isValidLatLngValue(lat, lng)) return;
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object || object.type !== "label" || !object.points[0]) return;
    object.points[0] = {
      ...object.points[0],
      latLng: { lat, lng },
    };
    if (options?.refresh !== false) refresh();
  }, []);

  const moveObjectPoints = useCallback((id: string, deltaX: number, deltaY: number) => {
    if (!isFiniteNumber(deltaX) || !isFiniteNumber(deltaY)) return;
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object) return;
    object.points = object.points.map((p) => ({
      ...p,
      x: isFiniteNumber(p.x) ? p.x + deltaX : p.x,
      y: isFiniteNumber(p.y) ? p.y + deltaY : p.y,
    }));
    refresh();
  }, []);

  const updateObjectPoints = useCallback((id: string, points: DrawingPoint[], options?: { refresh?: boolean }) => {
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object) return;
    object.points = points;
    if (options?.refresh !== false) refresh();
  }, []);

  const commitInteractionUpdate = useCallback(() => {
    refresh();
  }, []);

  const moveObjectToPoint = useCallback((id: string, point: DrawingPoint) => {
    const object = historyRef.current.objects.find((item) => item.id === id);
    if (!object || object.points.length === 0) return;
    const firstPoint = object.points[0];
    if (!firstPoint || !isFiniteNumber(point.x) || !isFiniteNumber(point.y) || !isFiniteNumber(firstPoint.x) || !isFiniteNumber(firstPoint.y)) return;
    const deltaX = point.x - firstPoint.x;
    const deltaY = point.y - firstPoint.y;
    moveObjectPoints(id, deltaX, deltaY);
  }, [moveObjectPoints]);

  const clear = useCallback(() => {
    historyRef.current.objects = [];
    historyRef.current.currentIndex = -1;
    currentDrawingRef.current = null;
    setSelectedAnnotationId(null);
    refresh();
  }, []);

  const redraw = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    options?: DrawingRenderOptions,
  ) => {
    redrawAll(ctx, canvas, objects, true, options);

    if (currentDrawingRef.current && currentDrawingRef.current.points.length > 0) {
      redrawAll(ctx, canvas, [currentDrawingRef.current], false, options);
    }
  }, [objects]);

  const getObjectAt = useCallback((point: DrawingPoint, options?: DrawingRenderOptions) =>
    findObjectAtPoint(objects, point, options), [objects]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(DRAWING_SETTINGS_KEY, JSON.stringify({
      color,
      width,
      opacity,
      isStylusMode,
    }));
  }, [color, width, opacity, isStylusMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(DRAWING_OBJECTS_KEY, JSON.stringify(objects));
  }, [objects]);

  return {
    mode,
    setMode,
    color,
    setColor,
    width,
    setWidth,
    opacity,
    setOpacity,
    objects,
    currentDrawing: currentDrawingRef.current,
    selectedAnnotationId,
    setSelectedAnnotationId,
    updateLabelText,
    updateLabelColor,
    updateLabelSize,
    updateLabelStyle,
    moveLabelToLatLng,
    moveObjectPoints,
    moveObjectToPoint,
    updateObjectPoints,
    commitInteractionUpdate,
    canUndo,
    canRedo,
    undo,
    redo,
    addPoint,
    endDrawing,
    cancelCurrentStroke,
    startDrawing,
    addObject,
    deleteObject,
    clear,
    redraw,
    getObjectAt,
    isStylusMode,
    setIsStylusMode,
  };
};
