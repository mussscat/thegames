import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

const POP = { opacity: 0, scale: 0.8 };
const POP_DURATION_S = 0.18;

type OwnedSlotProps = {
  readonly className: string;
  /** undefined — the slot is empty and shows only its dashed frame. */
  readonly itemKey: string | undefined;
  /** Shared between slots, so a card glides to its new slot when a card before it is sold. */
  readonly layoutId: string;
  readonly children: ReactNode;
};

/** One fixed-size slot: the dashed frame always sits underneath, the card pops in on a buy and out on a sale. */
export function OwnedSlot({ className, itemKey, layoutId, children }: OwnedSlotProps) {
  return (
    <li className={className}>
      <span className="owned__empty" aria-hidden="true" />
      <AnimatePresence initial={false}>
        {itemKey !== undefined && (
          <motion.div
            key={itemKey}
            layoutId={layoutId}
            className="owned__item"
            initial={POP}
            animate={{ opacity: 1, scale: 1 }}
            exit={POP}
            transition={{ duration: POP_DURATION_S, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
