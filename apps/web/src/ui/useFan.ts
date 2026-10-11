import type { CSSProperties, RefObject } from 'react';
import { handLayout } from './fan';
import { useElementWidth } from './useElementWidth';
import { useMotionEnabled } from './useMotion';

export type Fan = {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** An invisible element as wide as a card (`--card-w`), so the layout knows the real card width in px. */
  readonly probeRef: RefObject<HTMLSpanElement | null>;
  readonly motion: boolean;
  readonly slotStyle: (index: number) => CSSProperties;
};

/** Per-slot styles for a hand: positions come from `handLayout` and move only through `transform`. */
export function useFan(count: number, rotate: boolean): Fan {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [probeRef, cardWidth] = useElementWidth<HTMLSpanElement>();
  const motion = useMotionEnabled();
  const slots = handLayout(count, width, cardWidth);
  const measured = width > 0 && cardWidth > 0;
  const slotStyle = (index: number): CSSProperties => {
    const slot = slots[index];
    const x = Math.round(slot?.x ?? 0);
    const y = rotate ? (slot?.y ?? 0) : 0;
    const angle = rotate ? (slot?.angle ?? 0) : 0;
    return { transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, visibility: measured ? undefined : 'hidden', ['--z' as string]: index };
  };
  return { containerRef, probeRef, motion, slotStyle };
}
