import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { PixelBar } from '../../../components/pixel/PixelBar';
import { PixelText } from '../../../components/pixel/PixelText';

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };

type PixelHpRowProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Changes on every hit to this bar to replay the shake; 0 — no hit. */
  readonly shakeKey?: number;
  /** `data-score-hp` value: where the scoring final pops its damage. */
  readonly scoreTarget: string;
  /** Before the bar: the enemy badge or the heart. */
  readonly lead: ReactNode;
};

/** One HP row: a lead (badge or heart), the bar and the numbers; shakes on a hit. */
export function PixelHpRow({ label, hp, maxHp, shakeKey = 0, scoreTarget, lead }: PixelHpRowProps) {
  return (
    <div className="pfight__hp" data-score-hp={scoreTarget}>
      {lead}
      <motion.div key={shakeKey} className="pfight__bar" animate={shakeKey ? SHAKE : {}} transition={{ duration: 0.35 }}>
        <PixelBar label={label} hp={hp} maxHp={maxHp} />
      </motion.div>
      <PixelText className="pfight__hp-value">
        {hp}/{maxHp}
      </PixelText>
    </div>
  );
}
