import { isRedSuit, rankLabel, type Card } from '@game/core';
import { ENHANCEMENTS, type EnhancementId } from '@game/durak';
import { motion, useSpring } from 'motion/react';
import { useRef, useState, type PointerEvent } from 'react';
import { PixelSuit } from './PixelSuit';

export type CardFeel = {
  /** Max tilt in degrees while the pointer is over the card. */
  readonly tilt: number;
  /** Idle sway amplitude in degrees. */
  readonly sway: number;
  readonly stiffness: number;
  readonly damping: number;
  /** Size of one "pixel" in CSS px for borders and shadows. */
  readonly pixel: number;
  readonly shine: boolean;
};

type PixelCardProps = {
  readonly card: Card;
  readonly feel: CardFeel;
  readonly width: number;
  readonly enhancement?: EnhancementId;
  readonly faceDown?: boolean;
  readonly selected?: boolean;
  readonly swayDelay?: number;
  readonly onTap?: () => void;
  readonly onHover?: () => void;
};

const INK = '#1b1426';
const RED = '#c2292e';

export function PixelCard({ card, feel, width, enhancement, faceDown = false, selected = false, swayDelay = 0, onTap, onHover }: PixelCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const spring = { stiffness: feel.stiffness, damping: feel.damping };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const [squash, setSquash] = useState(0);
  const color = isRedSuit(card.suit) ? RED : INK;
  const label = rankLabel(card.rank);

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-y * feel.tilt);
    rotateY.set(x * feel.tilt);
  };
  const onLeave = (): void => {
    rotateX.set(0);
    rotateY.set(0);
  };
  const tap = (): void => {
    setSquash((n) => n + 1);
    onTap?.();
  };

  return (
    <motion.div
      className="pcard"
      style={{ width, fontSize: width * 0.2, ['--px' as string]: `${feel.pixel}px` }}
      animate={{ y: selected ? -width * 0.28 : 0 }}
      transition={{ type: 'spring', ...spring }}
    >
      <motion.div
        className="pcard__sway"
        animate={{ rotate: [-feel.sway, feel.sway, -feel.sway], y: [0, -feel.sway, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: swayDelay }}
      >
        <motion.div
          ref={ref}
          className="pcard__tilt"
          style={{ rotateX, rotateY }}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onPointerEnter={onHover}
          onClick={tap}
          whileHover={{ scale: 1.06 }}
        >
          <motion.div
            className="pcard__flip"
            animate={{ rotateY: faceDown ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <motion.div
              key={squash}
              className="pcard__squash"
              initial={false}
              animate={squash ? { scaleX: [1, 1.14, 0.94, 1.03, 1], scaleY: [1, 0.86, 1.07, 0.98, 1] } : {}}
              transition={{ duration: 0.38, ease: 'easeOut' }}
            >
              <div className={enhancement ? 'pcard__face pcard__front pcard__front--enhanced' : 'pcard__face pcard__front'}>
                <span className="pcard__corner" style={{ color }}>
                  {label}
                  <PixelSuit suit={card.suit} size={width * 0.16} color={color} />
                </span>
                <span className="pcard__center">
                  <PixelSuit suit={card.suit} size={width * 0.46} color={color} />
                </span>
                <span className="pcard__corner pcard__corner--bottom" style={{ color }}>
                  {label}
                  <PixelSuit suit={card.suit} size={width * 0.16} color={color} />
                </span>
                {enhancement && <span className="pcard__badge">{ENHANCEMENTS[enhancement].name}</span>}
                {enhancement && feel.shine && <span className="pcard__shine" />}
              </div>
              <div className="pcard__face pcard__back" />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
