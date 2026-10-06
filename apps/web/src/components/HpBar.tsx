import { motion } from 'motion/react';

type HpBarProps = { readonly label: string; readonly hp: number; readonly maxHp: number };

export function HpBar({ label, hp, maxHp }: HpBarProps) {
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
    </div>
  );
}
