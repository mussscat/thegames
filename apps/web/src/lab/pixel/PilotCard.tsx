import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';

export type PilotMotion = {
  readonly stiffness: number;
  readonly damping: number;
  /** Jump height in art pixels. */
  readonly height: number;
  /** Time between sway kicks, ms. */
  readonly period: number;
  /** Sway amplitude, degrees. */
  readonly amplitude: number;
};

/** The card feel the owner tuned in the card lab (FEEL), with a taller jump and a livelier sway. */
export const PILOT_MOTION: PilotMotion = { stiffness: 490, damping: 9, height: 20, period: 600, amplitude: 8 };

type PilotCardProps = {
  /** CSS size of one art pixel inside the stage (1 in zoomed/scaled modes). */
  readonly unit: number;
  /** Snap the vertical offset to whole art pixels (hypothesis 6). */
  readonly snap: boolean;
  /** Static tilt in degrees (hypothesis 5: a rotated sprite must stay sharp). */
  readonly angle: number;
  readonly feel: PilotMotion;
  readonly sway: boolean;
  /** Changes on every «jump» press. */
  readonly jumpKey: number;
  /** Tapping the card jumps it, so the test works in the full-screen stage where the lab controls are covered. */
  readonly onTap: () => void;
};

/** A 40×56 plate that jumps on a spring and tilts: the two motion hypotheses of the pixel UI. */
export function PilotCard({ unit, snap, angle, feel, sway, jumpKey, onTap }: PilotCardProps) {
  const y = useMotionValue(0);
  const rotate = useMotionValue(angle);
  const yCss = useTransform(y, (v) => (snap ? Math.round(v) : v) * unit);

  useEffect(() => {
    if (jumpKey === 0) return undefined;
    const spring = { type: 'spring', stiffness: feel.stiffness, damping: feel.damping } as const;
    const up = animate(y, -feel.height, { ...spring, onComplete: () => void animate(y, 0, spring) });
    return () => up.stop();
  }, [jumpKey, y, feel.stiffness, feel.damping, feel.height]);

  useEffect(() => {
    if (!sway) {
      rotate.set(angle);
      return undefined;
    }
    const spring = { type: 'spring', stiffness: feel.stiffness, damping: feel.damping } as const;
    let side = 1;
    let controls = animate(rotate, angle + feel.amplitude, spring);
    const timer = window.setInterval(() => {
      side = -side;
      controls = animate(rotate, angle + side * feel.amplitude, spring);
    }, feel.period);
    return () => {
      window.clearInterval(timer);
      controls.stop();
    };
  }, [sway, angle, rotate, feel.stiffness, feel.damping, feel.amplitude, feel.period]);

  return <motion.div className="pp-card" data-sprite="card" style={{ y: yCss, rotate }} onClick={onTap}><span>Т</span></motion.div>;
}
