import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hpSegments } from './hpSegments';

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };
const POP = { scale: [0.3, 1.35, 1], opacity: 1, y: -6 };
/** How long a hit stays readable — the opponent's next move must not wipe it at once. */
const HIT_SHOW_MS = 1600;

type Shown = { readonly node: ReactNode; readonly key: number };

/** Keeps the latest hit on screen for HIT_SHOW_MS even after the fight moves on (a new hit replaces it). */
function useLingeringHit(hit: ReactNode, hitKey: number): Shown | null {
  const [shown, setShown] = useState<Shown | null>(null);
  const latest = useRef<ReactNode>(hit);
  latest.current = hit;
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!latest.current) return;
    setShown({ node: latest.current, key: hitKey });
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(null), HIT_SHOW_MS);
  }, [hitKey]);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  return shown;
}

type HpBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Damage label to pop near the bar; `hitKey` changes on every new hit to replay the animation. */
  readonly hit?: ReactNode;
  readonly hitKey?: number;
  /** Extra class for screen layout (grid placement). */
  readonly className?: string;
};

export function HpBar({ label, hp, maxHp, hit = null, hitKey = 0, className = '' }: HpBarProps) {
  const shown = useLingeringHit(hit, hitKey);
  return (
    <div className={`hp panel ${className}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
      <span className="hp__label">{label}</span>
      <motion.div key={hit ? hitKey : 'still'} className="hp__track" animate={hit ? SHAKE : {}} transition={{ duration: 0.35 }}>
        {hpSegments(hp, maxHp).map((fill, i) => (
          <span key={i} className="hp__seg">
            {fill > 0 && <span className="hp__seg-fill" style={{ width: `${fill * 100}%` }} />}
          </span>
        ))}
      </motion.div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
      <AnimatePresence>
        {shown && (
          <motion.span
            key={shown.key}
            className="hp__hit"
            data-testid={`hit-${label}`}
            initial={{ scale: 0.3, opacity: 0, y: 0 }}
            animate={POP}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {shown.node}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
