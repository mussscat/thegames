import { AnimatePresence, motion } from 'motion/react';
import { hpSegments } from './hpSegments';

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };
const POP = { scale: [0.3, 1.35, 1], opacity: 1, y: -6 };

type HpBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Damage label to pop near the bar; `hitKey` changes on every new hit to replay the animation. */
  readonly hitLabel?: string | null;
  readonly hitKey?: number;
};

export function HpBar({ label, hp, maxHp, hitLabel = null, hitKey = 0 }: HpBarProps) {
  return (
    <div className="hp panel" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
      <span className="hp__label">{label}</span>
      <motion.div key={hitLabel ? hitKey : 'still'} className="hp__track" animate={hitLabel ? SHAKE : {}} transition={{ duration: 0.35 }}>
        {hpSegments(hp, maxHp).map((full, i) => (
          <span key={i} className={full ? 'hp__seg hp__seg--full' : 'hp__seg'} />
        ))}
      </motion.div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
      <AnimatePresence>
        {hitLabel && (
          <motion.span
            key={hitKey}
            className="hp__hit"
            data-testid={`hit-${label}`}
            initial={{ scale: 0.3, opacity: 0, y: 0 }}
            animate={POP}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {hitLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
