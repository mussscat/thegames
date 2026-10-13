import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { toArtLength } from './pixelScale';
import { useStage } from './StageContext';

/** The element's width in layout px (= art pixels inside the stage), kept up to date; 0 until it has been measured. */
export function useElementWidth<T extends HTMLElement>(): readonly [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const { cssPerArt } = useStage();
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    // The first read is a screen measurement, the observer's is already in layout px: bring them to one unit.
    setWidth(toArtLength(element.getBoundingClientRect().width, cssPerArt));
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [cssPerArt]);
  return [ref, width];
}
