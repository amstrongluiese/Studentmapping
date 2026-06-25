import { useEffect, useRef, useState, useCallback } from 'react';

export interface StylusInfo {
  available: boolean;
  type: 'mouse' | 'touch' | 'pen' | 'unknown';
  pressure: number;
  inContact: boolean;
  buttons: number;
  angle?: number;
  tiltX?: number;
  tiltY?: number;
}

export interface UseStylus {
  stylusInfo: StylusInfo;
  isStylusDetected: boolean;
  supportsPointEvents: boolean;
  supportsTouchEvents: boolean;
  supportsPointerEvents: boolean;
  enablePalmRejection: boolean;
  setEnablePalmRejection: (enable: boolean) => void;
}

export const useStylus = (): UseStylus => {
  const [stylusInfo, setStylusInfo] = useState<StylusInfo>({
    available: false,
    type: 'unknown',
    pressure: 0,
    inContact: false,
    buttons: 0,
  });

  const [isStylusDetected, setIsStylusDetected] = useState(false);
  const [enablePalmRejection, setEnablePalmRejection] = useState(true);
  const frameRef = useRef<number | null>(null);
  const lastInfoRef = useRef<StylusInfo>(stylusInfo);

  // Feature detection
  const supportsPointerEvents = typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined';
  const supportsPointEvents = supportsPointerEvents;
  const supportsTouchEvents = false;

  const publishStylusInfo = useCallback((info: StylusInfo) => {
    const last = lastInfoRef.current;
    const materiallyChanged =
      last.type !== info.type ||
      last.inContact !== info.inContact ||
      last.buttons !== info.buttons ||
      Math.abs(last.pressure - info.pressure) > 0.04 ||
      Math.abs((last.tiltX || 0) - (info.tiltX || 0)) > 4 ||
      Math.abs((last.tiltY || 0) - (info.tiltY || 0)) > 4;

    if (!materiallyChanged) return;

    lastInfoRef.current = info;

    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      setStylusInfo(info);
      frameRef.current = null;
    });
  }, []);

  const handlePointerEvent = useCallback((event: PointerEvent) => {
    const pointerType = event.pointerType === 'pen'
      ? 'pen'
      : event.pointerType === 'touch'
        ? 'touch'
        : event.pointerType === 'mouse'
          ? 'mouse'
          : 'unknown';
    const pressure = typeof event.pressure === 'number'
      ? event.pressure
      : event.buttons > 0
        ? 0.5
        : 0;
    // Android / WebView often reports buttons === 0 while the pen is still dragging; keep hover honest via pressure + tilt.
    const inContact =
      pointerType === 'pen'
        ? (event.buttons & 1) !== 0 ||
          (typeof event.pressure === 'number' && !Number.isNaN(event.pressure) && event.pressure > 0.0001)
        : event.buttons > 0 || pressure > 0;

    const info: StylusInfo = {
      available: true,
      type: pointerType,
      pressure,
      inContact,
      buttons: event.buttons ?? 0,
      angle: (event as any).azimuthAngle,
      tiltX: event.tiltX || 0,
      tiltY: event.tiltY || 0,
    };

    if (pointerType === 'pen') {
      setIsStylusDetected(true);
    }

    publishStylusInfo(info);
  }, [publishStylusInfo]);

  useEffect(() => {
    if (!supportsPointEvents) return undefined;

    document.addEventListener('pointermove', handlePointerEvent);
    document.addEventListener('pointerdown', handlePointerEvent);
    document.addEventListener('pointerup', handlePointerEvent);
    document.addEventListener('pointercancel', handlePointerEvent);

    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      document.removeEventListener('pointermove', handlePointerEvent);
      document.removeEventListener('pointerdown', handlePointerEvent);
      document.removeEventListener('pointerup', handlePointerEvent);
      document.removeEventListener('pointercancel', handlePointerEvent);
    };
  }, [supportsPointEvents, handlePointerEvent]);

  return {
    stylusInfo,
    isStylusDetected,
    supportsPointEvents,
    supportsTouchEvents,
    supportsPointerEvents,
    enablePalmRejection,
    setEnablePalmRejection,
  };
};

// Helper function to align the drawing surface with Pointer Events palm policy.
export const configurePalmRejection = (canvas: HTMLCanvasElement, enabled: boolean) => {
  canvas.style.touchAction = enabled ? 'none' : 'auto';
};

// Get optimal stroke settings for device type
export type StrokeSettingsOptions = {
  /** Tighter sampling + smoothing for Android touch / pen WebViews (POCO, Samsung, etc.). */
  androidDrawing?: boolean;
};

export const getOptimalStrokeSettings = (stylusInfo: StylusInfo, options?: StrokeSettingsOptions) => {
  const ad = options?.androidDrawing === true;
  switch (stylusInfo.type) {
    case 'pen':
      return {
        minWidth: 0.5,
        maxWidth: 4,
        smoothing: ad ? 0.28 : 0.3,
        minDistance: ad ? 1.2 : 1.25,
      };
    case 'touch':
      return {
        minWidth: 1,
        maxWidth: 8,
        // Increased minDistance from 2 to 2.5 for Android touch to prevent excessive point accumulation
        smoothing: ad ? 0.42 : 0.5,
        minDistance: ad ? 2.5 : 5,
      };
    case 'mouse':
      return {
        minWidth: 1,
        maxWidth: 6,
        smoothing: 0.2,
        minDistance: 1,
      };
    default:
      return {
        minWidth: 1,
        maxWidth: 6,
        smoothing: ad ? 0.38 : 0.3,
        // Increased minDistance from 2 to 2.2 for Android defaults
        minDistance: ad ? 2.2 : 2,
      };
  }
};
