import { useLayoutEffect, useRef, useState } from 'react';
import { barFill } from './classes';

type PixelBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly className?: string;
};

/**
 * The HP bar: a kit frame (`px-hp-frame`, 3 px border) with a flat fill whose width is a whole number of art pixels,
 * so the edge of the fill always sits on the grid. The inner width is measured from layout, not guessed.
 */
export function PixelBar({ label, hp, maxHp, className = '' }: PixelBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inner, setInner] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = (): void => setInner(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`px-hp-frame pixel-bar ${className}`.trim()} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp} data-sprite="hp-frame">
      <div className="pixel-bar__fill" style={{ width: barFill(hp, maxHp, inner) }} />
    </div>
  );
}
