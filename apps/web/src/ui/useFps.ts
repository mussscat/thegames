import { useEffect, useState } from 'react';
import { summarizeFrames } from './fpsMeter';

const WINDOW = 60;
const REFRESH_MS = 500;

/** Average frames per second over the last second, for the lab's badge. */
export function useFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    let shownAt = last;
    const deltas: number[] = [];
    const tick = (now: number): void => {
      deltas.push(now - last);
      if (deltas.length > WINDOW) deltas.shift();
      last = now;
      if (now - shownAt >= REFRESH_MS) {
        shownAt = now;
        setFps(Math.round(summarizeFrames(deltas).avg));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return fps;
}
