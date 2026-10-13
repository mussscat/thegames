import { motion, useAnimate, useSpring } from 'motion/react';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { tiltAngles } from './tilt';
import { useMotionEnabled } from './useMotion';

export type Feel = {
  readonly tilt: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly pixel: number;
};

/** Tuned by the owner in the card lab, 2026-10-08. */
export const FEEL: Feel = { tilt: 16, stiffness: 490, damping: 9, pixel: 4 };

const SQUASH = { scaleX: [1, 1.14, 0.94, 1.03, 1], scaleY: [1, 0.86, 1.07, 0.98, 1] };

type FeelBoxProps = {
  readonly children: ReactNode;
  readonly feel?: Feel;
  readonly onHover?: () => void;
};

export function FeelBox({ children, feel = FEEL, onHover }: FeelBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const spring = { stiffness: feel.stiffness, damping: feel.damping };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const [squashScope, animate] = useAnimate<HTMLDivElement>();
  const motionOn = useMotionEnabled();

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!motionOn) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const angles = tiltAngles(event.clientX, event.clientY, rect, feel.tilt);
    rotateX.set(angles.rotateX);
    rotateY.set(angles.rotateY);
  };
  const onLeave = (): void => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div className="feel" style={{ ['--px' as string]: `${feel.pixel}px` }}>
      <motion.div
        ref={ref}
        className="feel__tilt"
        style={{ rotateX, rotateY }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerUp={onLeave}
        onPointerCancel={onLeave}
        onPointerEnter={onHover}
        onPointerDown={() => {
          if (motionOn) void animate(squashScope.current, SQUASH, { duration: 0.38, ease: 'easeOut' });
        }}
      >
        {/* Animated in place: re-mounting the node under the finger would swallow the click. */}
        <div ref={squashScope} className="feel__squash">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
