import { AnimatePresence, motion } from 'motion/react';

const HIT_FLOAT_PX = -4;

type HpBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Damage label to float above the bar; `hitKey` changes on every new hit to replay the animation. */
  readonly hitLabel?: string | null;
  readonly hitKey?: number;
};

export function HpBar({ label, hp, maxHp, hitLabel = null, hitKey = 0 }: HpBarProps) {
  const percent = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  return (
    <div className="hp" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
      <span className="hp__label">{label}</span>
      <div className="hp__track">
        <motion.div className="hp__fill" initial={false} animate={{ width: `${percent}%` }} />
      </div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
      <AnimatePresence>
        {hitLabel && (
          <motion.span
            key={hitKey}
            className="hp__hit"
            data-testid={`hit-${label}`}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: HIT_FLOAT_PX }}
            exit={{ opacity: 0 }}
          >
            {hitLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
