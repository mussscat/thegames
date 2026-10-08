import type { Card } from '@game/core';
import { ENHANCEMENTS, type EnhancementId } from '@game/durak';
import { motion } from 'motion/react';
import { CardFace } from './CardFace';
import { FEEL, FeelBox, type Feel } from './FeelBox';
import { backUrl } from './pixel/cardSprite';

type PixelCardProps = {
  readonly card: Card;
  /** CSS px; the rank font scales with it. */
  readonly width: number;
  readonly enhancement?: EnhancementId;
  readonly faceDown?: boolean;
  readonly selected?: boolean;
  readonly swayDelay?: number;
  readonly idle?: boolean;
  readonly showLabel?: boolean;
  readonly feel?: Feel;
  readonly onTap?: () => void;
  readonly onHover?: () => void;
};

/** A free-standing card (lab, shop): feel, flip and an optional enhancement label underneath. */
export function PixelCard({
  card,
  width,
  enhancement,
  faceDown = false,
  selected = false,
  swayDelay = 0,
  idle = true,
  showLabel = false,
  feel = FEEL,
  onTap,
  onHover,
}: PixelCardProps) {
  const spring = { type: 'spring', stiffness: feel.stiffness, damping: feel.damping } as const;
  return (
    <motion.div
      className="pcard"
      style={{ width, fontSize: width * 0.2 }}
      animate={{ y: selected ? -width * 0.28 : 0 }}
      transition={spring}
      onClick={onTap}
    >
      <FeelBox idle={idle} swayDelay={swayDelay} feel={feel} onHover={onHover}>
        <motion.div className="pcard__flip" animate={{ rotateY: faceDown ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
          <div className="pcard__side">
            <CardFace card={card} enhancement={enhancement} />
          </div>
          <div className="pcard__side pcard__side--back">
            <img className="sprite" src={backUrl()} alt="" draggable={false} />
          </div>
        </motion.div>
      </FeelBox>
      {showLabel && enhancement && <span className="pcard__label">{ENHANCEMENTS[enhancement].name}</span>}
    </motion.div>
  );
}
