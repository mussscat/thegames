import { FOCUSES, MAX_FOCUSES, type FocusId } from '@game/durak';
import { motion } from 'motion/react';
import { focusArtUrl } from '../../ui/pixel/cardArt';
import { useMotionEnabled } from '../../ui/useMotion';
import { FocusFace } from './FocusFace';
import { FOCUS_GLYPHS } from './shop/PackCardFace';
import './focusStack.css';

const STEP_PX = 3;
const LIFT_PX = 10;

/** Shared with the sheet: the card flies between the pile and the fan. */
export const focusLayoutId = (id: FocusId, slot: number): string => `focus-${id}-${slot}`;

type FocusStackProps = {
  readonly focuses: readonly FocusId[];
  /** Slot of the focus picked to be played (it stands lifted), or null. */
  readonly pickedSlot: number | null;
  readonly onOpen: () => void;
};

/** The player's focuses as one pile under the jokers: the first slot on top, a «1/2» tag, a tap opens the sheet. An empty pile shows the hole. */
export function FocusStack({ focuses, pickedSlot, onOpen }: FocusStackProps) {
  const motionOn = useMotionEnabled();
  return (
    <button type="button" className="fstack" data-testid="focus-stack" aria-label={`Фокусы: ${focuses.length} из ${MAX_FOCUSES}`} disabled={focuses.length === 0} onClick={onOpen}>
      <span className="fstack__pile">
        {focuses.length === 0 && <span className="fstack__hole" aria-hidden="true" />}
        {focuses.map((id, slot) => {
          const depth = focuses.length - 1 - slot;
          const lifted = slot === pickedSlot;
          return (
            <motion.span
              key={`${id}-${slot}`}
              layoutId={focusLayoutId(id, slot)}
              className={lifted ? 'fstack__card fstack__card--picked' : 'fstack__card'}
              style={{ zIndex: MAX_FOCUSES - slot }}
              initial={false}
              animate={{ x: -depth * STEP_PX, y: lifted ? -LIFT_PX : -depth * STEP_PX }}
              transition={motionOn ? { type: 'spring', stiffness: 420, damping: 24 } : { duration: 0 }}
            >
              {focusArtUrl(id) ? <FocusFace id={id} /> : <span className="fstack__glyph" title={FOCUSES[id].name}>{FOCUS_GLYPHS[id]}</span>}
            </motion.span>
          );
        })}
      </span>
      <span className="fstack__count">
        {focuses.length}/{MAX_FOCUSES}
      </span>
    </button>
  );
}
