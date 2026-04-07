/**
 * Set the body background color for the iframe
 */
import { useEffect } from 'react';

export function useBodyBackground(color: string) {
  useEffect(() => {
    document.body.style.backgroundColor = color;
    document.documentElement.style.backgroundColor = color;
  }, [color]);
}

