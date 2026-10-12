import { MAX_JOKERS, type JokerId, type JokerState } from '@game/durak';
import { motion } from 'motion/react';
import { useMotionEnabled } from '../../ui/useMotion';
import { jokerBadge } from './jokerBadge';
import { JokerFace } from './JokerFace';
import './jokerStack.css';

const STEP_PX = 3;
const LIFT_PX = 24;

type JokerStackProps = {
  readonly jokers: readonly JokerId[];
  readonly state: JokerState;
  readonly enemyTakes: number;
  /** Slot of the joker the scoring show is on, or null. */
  readonly firing: number | null;
  /** True while scoring plays: the stack cannot be opened. */
  readonly disabled: boolean;
  readonly onOpen: () => void;
};

/** The player's jokers as one pile (owner, 2026-10-12): the first slot on top, a «3/5» tag, a tap opens the sheet. */
export function JokerStack({ jokers, state, enemyTakes, firing, disabled, onOpen }: JokerStackProps) {
  const motionOn = useMotionEnabled();
  return (
    <button
      type="button"
      className="jstack"
      data-testid="joker-stack"
      aria-label={`Джокеры: ${jokers.length} из ${MAX_JOKERS}`}
      disabled={disabled || jokers.length === 0}
      onClick={onOpen}
    >
      <span className="jstack__pile">
        {jokers.length === 0 && <span className="jstack__hole" aria-hidden="true" />}
        {jokers.map((id, slot) => {
          const depth = jokers.length - 1 - slot;
          const lifted = motionOn && firing === slot;
          return (
            <motion.span
              key={id}
              layoutId={`joker-${id}`}
              className="jstack__card"
              style={{ zIndex: lifted ? MAX_JOKERS + 1 : MAX_JOKERS - slot }}
              initial={false}
              animate={{ x: -depth * STEP_PX, y: lifted ? -LIFT_PX : -depth * STEP_PX, scale: lifted ? 1.08 : 1 }}
              transition={motionOn ? { type: 'spring', stiffness: 420, damping: 24 } : { duration: 0 }}
            >
              {/* The scoring bounce animates this inner element: motion owns the outer one (stack offset and lift). */}
              <span className="jstack__anchor" data-score-joker={`player-${slot}`}>
                <JokerFace id={id} badge={slot === 0 || lifted ? jokerBadge(id, state, enemyTakes) : null} />
              </span>
            </motion.span>
          );
        })}
      </span>
      <span className="jstack__count">
        {jokers.length}/{MAX_JOKERS}
      </span>
    </button>
  );
}
