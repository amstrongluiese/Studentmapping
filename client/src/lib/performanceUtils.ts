/**
 * Performance optimization utilities for the GIS dashboard
 */

import React from 'react';

/**
 * Debounce function to prevent excessive function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit function call frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memoize object comparison for React.memo
 */
export const arePropsEqual = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keysToCompare?: Array<keyof T>
): boolean => {
  const keys = keysToCompare || Object.keys(prevProps);
  return keys.every((key) => prevProps[key] === nextProps[key]);
};

/**
 * Lazy load a component with fallback
 */
export const withLazyLoad = <P extends object>(
  Component: React.ComponentType<P>,
  delay: number = 0
) => {
  return (props: P) => {
    const [shouldLoad, setShouldLoad] = React.useState(delay === 0);

    React.useEffect(() => {
      if (delay > 0) {
        const timer = setTimeout(() => setShouldLoad(true), delay);
        return () => clearTimeout(timer);
      }
    }, [delay]);

    return shouldLoad ? React.createElement(Component, props) : null;
  };
};

/**
 * Optimize image rendering with lazy loading
 */
export const getOptimizedImageUrl = (url: string, width?: number, height?: number): string => {
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', '80'); // Quality optimization
  return url.includes('?') ? `${url}&${params.toString()}` : `${url}?${params.toString()}`;
};

/**
 * Request idle callback with fallback
 */
export const requestIdleCallback = (callback: () => void, options?: { timeout?: number }) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback, options);
  }
  return setTimeout(callback, 1);
};

/**
 * Cancel idle callback with fallback
 */
export const cancelIdleCallback = (id: number) => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    return (window as any).cancelIdleCallback(id);
  }
  return clearTimeout(id);
};

/**
 * Virtual scrolling support detection
 */
export const supportsVirtualScrolling = (): boolean => {
  return 'IntersectionObserver' in window;
};

/**
 * Check if browser supports WebGL for better graphics
 */
export const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
};

/**
 * Optimize animation frame updates
 */
export const requestAnimationFrame = (callback: FrameRequestCallback): number => {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16); // ~60fps fallback
};

/**
 * Cancel animation frame with fallback
 */
export const cancelAnimationFrame = (id: number): void => {
  if (typeof window !== 'undefined' && 'cancelAnimationFrame' in window) {
    window.cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
};
