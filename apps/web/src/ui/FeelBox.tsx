import { motion, useSpring } from 'motion/react';
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

export type Feel = {
  readonly tilt: number;
  readonly sway: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly pixel: number;
};

/** Tuned by the owner in the card lab, 2026-10-08. */
export const FEEL: Feel = { tilt: 16, sway: 2, stiffness: 490, damping: 9, pixel: 4 };

const SWAY_SECONDS = 3.4;
const SQUASH = { scaleX: [1, 1.14, 0.94, 1.03, 1], scaleY: [1, 0.86, 1.07, 0.98, 1] };

type FeelBoxProps = {
  readonly children: ReactNode;
  /** Idle sway; off for table, deck and enemy cards to keep the screen calm and cheap. */
  readonly idle?: boolean;
  readonly swayDelay?: number;
  readonly feel?: Feel;
  readonly onHover?: () => void;
};

export function FeelBox({ children, idle = false, swayDelay = 0, feel = FEEL, onHover }: FeelBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const spring = { stiffness: feel.stiffness, damping: feel.damping };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const [squash, setSquash] = useState(0);

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * feel.tilt);
    rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * feel.tilt);
  };
  const onLeave = (): void => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      className="feel"
      style={{ ['--px' as string]: `${feel.pixel}px` }}
      animate={idle ? { rotate: [-feel.sway, feel.sway, -feel.sway], y: [0, -feel.sway, 0] } : { rotate: 0, y: 0 }}
      transition={idle ? { duration: SWAY_SECONDS, repeat: Infinity, ease: 'easeInOut', delay: swayDelay } : { duration: 0.2 }}
    >
      <motion.div
        ref={ref}
        className="feel__tilt"
        style={{ rotateX, rotateY }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerEnter={onHover}
        onPointerDown={() => setSquash((n) => n + 1)}
      >
        <motion.div
          key={squash}
          className="feel__squash"
          initial={false}
          animate={squash ? SQUASH : {}}
          transition={{ duration: 0.38, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
