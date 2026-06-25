export type DrawingMode = 'free' | 'line' | 'arrow' | 'rectangle' | 'polygon' | 'circle' | 'highlight' | 'label' | 'eraser' | null;

export interface DrawingLatLng {
  lat: number;
  lng: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
  latLng?: DrawingLatLng;
}

export type DrawingLabelAlign = 'left' | 'center' | 'right';

export interface DrawingLabelStyle {
  align?: DrawingLabelAlign;
  bold?: boolean;
  italic?: boolean;
  list?: 'bullet' | 'numbered' | null;
}

export interface DrawingObject {
  id: string;
  type: DrawingMode;
  points: DrawingPoint[];
  color: string;
  width: number;
  opacity?: number;
  filled?: boolean;
  label?: string;
  labelSize?: { width: number; height: number };
  labelStyle?: DrawingLabelStyle;
  latLng?: DrawingLatLng[];
  referenceZoom?: number;
  timestamp: number;
}

export interface DrawingHistory {
  objects: DrawingObject[];
  currentIndex: number;
}

export interface DrawingRenderOptions {
  showLabels?: boolean;
  currentZoom?: number;
  projectPoint?: (point: DrawingPoint) => DrawingPoint;
  selectedId?: string | null;
}

const LABEL_FONT = '"DM Sans", Arial, sans-serif';
const MIN_DRAW_SCALE = 0.78;
const MAX_DRAW_SCALE = 2.4;
const ZOOM_SCALE_FACTOR = 0.26;

export const createDrawingCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.cursor = 'crosshair';
  canvas.style.zIndex = '100';
  return canvas;
};

export const resizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
  const ratio = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1);
  const cssWidth = Math.max(1, width);
  const cssHeight = Math.max(1, height);
  const nextWidth = Math.max(1, Math.floor(cssWidth * ratio));
  const nextHeight = Math.max(1, Math.floor(cssHeight * ratio));

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  const ctx = canvas.getContext('2d');
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
};

export const getCtx = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  return ctx;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getDrawingScale = (referenceZoom?: number, currentZoom?: number) => {
  if (referenceZoom == null || currentZoom == null) return 1;
  const delta = currentZoom - referenceZoom;
  return clamp(Math.pow(2, delta * ZOOM_SCALE_FACTOR), MIN_DRAW_SCALE, MAX_DRAW_SCALE);
};

const resolvePoint = (point: DrawingPoint, projectPoint?: DrawingRenderOptions['projectPoint']) =>
  projectPoint ? projectPoint(point) : point;

const resolveObjectPoints = (object: DrawingObject, options?: DrawingRenderOptions) =>
  object.points.map((point) => resolvePoint(point, options?.projectPoint));

const getScaledWidth = (object: DrawingObject, options?: DrawingRenderOptions) =>
  Math.max(1, object.width * getDrawingScale(object.referenceZoom, options?.currentZoom));

const distanceBetween = (start: DrawingPoint, end: DrawingPoint) =>
  Math.hypot(end.x - start.x, end.y - start.y);

export const drawStroke = (
  ctx: CanvasRenderingContext2D,
  points: DrawingPoint[],
  color: string,
  width: number,
  opacity = 1,
) => {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = opacity;

  if (points.length === 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, Math.max(1.2, width * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
  const avgPressure =
    points.reduce((sum, point) => sum + (point.pressure || 1), 0) / Math.max(1, points.length);
  ctx.lineWidth = Math.max(0.8, width * avgPressure);
  ctx.stroke();

  ctx.globalAlpha = 1;
};

export const drawLine = (
  ctx: CanvasRenderingContext2D,
  start: DrawingPoint,
  end: DrawingPoint,
  color: string,
  width: number,
  opacity = 1,
) => {
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  start: DrawingPoint,
  end: DrawingPoint,
  color: string,
  width: number,
  opacity = 1,
) => {
  const headLength = Math.max(12, width * 3.4);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
};

export const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  points: DrawingPoint[],
  color: string,
  width: number,
  filled = false,
  opacity = 1,
) => {
  if (points.length < 3) return;

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.closePath();

  if (filled) {
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
};

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  center: DrawingPoint,
  radius: number,
  color: string,
  width: number,
  filled = false,
  opacity = 1,
) => {
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);

  if (filled) {
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
};

export const drawRectangle = (
  ctx: CanvasRenderingContext2D,
  start: DrawingPoint,
  end: DrawingPoint,
  color: string,
  width: number,
  filled = false,
  opacity = 1,
) => {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const rectWidth = Math.abs(end.x - start.x);
  const rectHeight = Math.abs(end.y - start.y);
  if (rectWidth < 1 || rectHeight < 1) return;

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.rect(left, top, rectWidth, rectHeight);

  if (filled) {
    ctx.globalAlpha = Math.max(0.12, opacity * 0.24);
    ctx.fill();
    ctx.globalAlpha = opacity;
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
};

export const drawLabel = (
  ctx: CanvasRenderingContext2D,
  position: DrawingPoint,
  text: string,
  color: string,
  fontSize = 14,
) => {
  const textColor = color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white'
    ? '#111827'
    : color;
  const padding = Math.max(4, Math.round(fontSize * 0.32));

  ctx.font = `700 ${fontSize}px ${LABEL_FONT}`;
  ctx.textBaseline = 'top';

  const metrics = ctx.measureText(text);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.92)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(
    position.x - padding,
    position.y - padding,
    metrics.width + padding * 2,
    fontSize + padding * 2,
    8,
  );
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.fillText(text, position.x, position.y);
};

export const isStylusEvent = (event: PointerEvent | TouchEvent): boolean => {
  if (event instanceof PointerEvent) {
    return (
      event.pointerType === 'pen' ||
      (event as PointerEvent & { isPrimary?: boolean }).isPrimary === false ||
      event.pressure > 0
    );
  }
  return false;
};

export const extractPressure = (event: PointerEvent | Touch | MouseEvent): number => {
  if (event instanceof PointerEvent) {
    return event.pressure || 0.5;
  }
  if (event instanceof Touch) {
    return (event as Touch & { force?: number }).force || 0.5;
  }
  return 0.5;
};

export const generateId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const clearCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
};

export const redrawAll = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  objects: DrawingObject[],
  shouldClear = true,
  options: DrawingRenderOptions = {},
) => {
  if (shouldClear) clearCanvas(ctx, canvas);

  for (const object of objects) {
    const points = resolveObjectPoints(object, options);
    const scale = getDrawingScale(object.referenceZoom, options.currentZoom);
    const width = getScaledWidth(object, options);

    switch (object.type) {
      case 'free':
        drawStroke(ctx, points, object.color, width, object.opacity ?? 1);
        break;
      case 'highlight':
        drawStroke(ctx, points, object.color, Math.max(width * 3.8, 8 * scale), Math.max(0.12, (object.opacity ?? 1) * 0.24));
        break;
      case 'line':
        if (points.length >= 2) {
          drawLine(ctx, points[0], points[points.length - 1], object.color, width, object.opacity ?? 1);
        }
        break;
      case 'arrow':
        if (points.length >= 2) {
          drawArrow(ctx, points[0], points[points.length - 1], object.color, width, object.opacity ?? 1);
        }
        break;
      case 'rectangle':
        if (points.length >= 2) {
          drawRectangle(ctx, points[0], points[points.length - 1], object.color, width, object.filled, object.opacity ?? 1);
        }
        break;
      case 'polygon':
        drawPolygon(ctx, points, object.color, width, object.filled, object.opacity ?? 1);
        break;
      case 'circle':
        if (points.length >= 2) {
          drawCircle(ctx, points[0], distanceBetween(points[0], points[points.length - 1]), object.color, width, object.filled, object.opacity ?? 1);
        }
        break;
      case 'label':
        if (options.showLabels !== false && points.length > 0 && object.label) {
          drawLabel(ctx, points[0], object.label, object.color, Math.max(12, 14 * scale));
        }
        break;
      case 'eraser': {
        if (points.length === 0) break;
        const eraserRadius = Math.max(10, width * 3.2 * scale);
        for (const p of points) {
          eraserStroke(ctx, p, eraserRadius);
        }
        break;
      }
    }
  }
};

const getObjectHitBounds = (object: DrawingObject, options: DrawingRenderOptions = {}) => {
  const points = resolveObjectPoints(object, options);
  if (points.length === 0) return null;

  const scale = getDrawingScale(object.referenceZoom, options.currentZoom);
  const padding = getScaledWidth(object, options) + 6;

  if (object.type === 'circle' && points.length >= 2) {
    const radius = distanceBetween(points[0], points[points.length - 1]);
    return {
      minX: points[0].x - radius - padding,
      maxX: points[0].x + radius + padding,
      minY: points[0].y - radius - padding,
      maxY: points[0].y + radius + padding,
    };
  }

  if (object.type === 'label' && object.label) {
    const fontSize = Math.max(12, 14 * scale);
    const width = object.labelSize?.width ?? object.label.length * fontSize * 0.62;
    const height = object.labelSize?.height ?? fontSize;
    const boxPadding = Math.max(4, Math.round(fontSize * 0.32));
    return {
      minX: points[0].x - boxPadding,
      maxX: points[0].x + width + boxPadding,
      minY: points[0].y - boxPadding,
      maxY: points[0].y + height + boxPadding,
    };
  }

  return {
    minX: Math.min(...points.map((point) => point.x)) - padding,
    maxX: Math.max(...points.map((point) => point.x)) + padding,
    minY: Math.min(...points.map((point) => point.y)) - padding,
    maxY: Math.max(...points.map((point) => point.y)) + padding,
  };
};

export const findObjectAtPoint = (
  objects: DrawingObject[],
  point: DrawingPoint,
  options: DrawingRenderOptions = {},
): DrawingObject | null => {
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const object = objects[i];
    const bounds = getObjectHitBounds(object, options);

    if (
      bounds &&
      point.x >= bounds.minX &&
      point.x <= bounds.maxX &&
      point.y >= bounds.minY &&
      point.y <= bounds.maxY
    ) {
      return object;
    }
  }

  return null;
};

export const eraserStroke = (
  ctx: CanvasRenderingContext2D,
  point: DrawingPoint,
  eraserSize: number,
) => {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(point.x, point.y, eraserSize, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
};
