/**
 * Mouse drag resize hook for sidebar/panel resizing
 */
import { useState, useCallback, useEffect, useRef } from 'react';

interface UseMouseDragResizeOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  getNextWidth?: (e: MouseEvent) => number;
  getMinWidth?: () => number;
  getMaxWidth?: () => number;
}

export function useMouseDragResize(options: UseMouseDragResizeOptions) {
  const {
    initialWidth,
    minWidth = 180,
    maxWidth = 400,
    getNextWidth,
    getMinWidth,
    getMaxWidth,
  } = options;

  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const nextWidth = getNextWidth ? getNextWidth(e) : e.clientX;
      const min = getMinWidth ? getMinWidth() : minWidth;
      const max = getMaxWidth ? getMaxWidth() : maxWidth;
      const clamped = Math.max(min, Math.min(max, nextWidth));
      setWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getNextWidth, getMinWidth, getMaxWidth, minWidth, maxWidth]);

  return { width, isResizing, startResize };
}

