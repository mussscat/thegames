import { motion } from 'motion/react';
import { hpSegments } from './hpSegments';

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };

type HpBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Changes on every hit to this bar to replay the shake; 0 — no hit. */
  readonly shakeKey?: number;
  /** `data-score-hp` value: where the scoring final pops its damage. */
  readonly scoreTarget?: string;
  /** Extra class for screen layout (grid placement). */
  readonly className?: string;
};

export function HpBar({ label, hp, maxHp, shakeKey = 0, scoreTarget, className = '' }: HpBarProps) {
  return (
    <div
      className={`hp panel ${className}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maxHp}
      aria-valuenow={hp}
      data-score-hp={scoreTarget}
    >
      <span className="hp__label">{label}</span>
      <motion.div key={shakeKey} className="hp__track" animate={shakeKey ? SHAKE : {}} transition={{ duration: 0.35 }}>
        {hpSegments(hp, maxHp).map((fill, i) => (
          <span key={i} className="hp__seg">
            {fill > 0 && <span className="hp__seg-fill" style={{ width: `${fill * 100}%` }} />}
          </span>
        ))}
      </motion.div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
    </div>
  );
}
