import { isRedSuit, rankLabel, SUIT_NAMES, type Card } from '@game/core';
import { ENHANCEMENTS, type CardEnhancements, type EnhancementId, type EnhancementSource } from '@game/durak';
import { motion } from 'motion/react';
import { CardFace } from '../ui/CardFace';
import { tipLines } from './tipLines';
import { CardTip, useCardTip } from './CardTip';
import { FeelBox } from '../ui/FeelBox';
import { backUrl } from '../ui/pixel/cardSprite';

const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 35 } as const;

type CardViewProps = {
  readonly card: Card;
  readonly playable?: boolean;
  readonly trump?: boolean;
  readonly enhancements?: CardEnhancements;
  readonly onTap?: () => void;
  /** When both enhancements are available, each half of the card plays the card with that enhancement. */
  readonly onTapOption?: (use: EnhancementSource) => void;
  /** Halves that are a legal move right now; the others are disabled and dimmed. */
  readonly legalUses?: readonly EnhancementSource[];
  /** Idle sway — only for the player's hand. */
  readonly idle?: boolean;
  readonly swayDelay?: number;
};

function cardClasses(card: Card, playable: boolean, trump: boolean, extra = ''): string {
  return ['card', isRedSuit(card.suit) ? 'card--red' : 'card--black', playable ? 'card--playable' : '', trump ? 'card--trump' : '', extra]
    .filter(Boolean)
    .join(' ');
}

export function CardView({ card, playable = false, trump = false, enhancements, onTap, onTapOption, legalUses, idle = false, swayDelay = 0 }: CardViewProps) {
  const label = `${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`;
  const own = enhancements?.own;
  const foreign = enhancements?.foreign;
  const lines = tipLines(enhancements);
  const tip = useCardTip(lines.length > 0, !onTap && !onTapOption);
  const bubble = tip.anchor && <CardTip anchor={tip.anchor} lines={lines} />;

  if (own && foreign) {
    const halfEnabled = (source: EnhancementSource): boolean => Boolean(onTapOption) && (!legalUses || legalUses.includes(source));
    const half = (source: EnhancementSource, id: EnhancementId) => (
      <button
        type="button"
        className={halfEnabled(source) ? `card__half card__half--${source}` : `card__half card__half--${source} card__half--illegal`}
        aria-disabled={!halfEnabled(source)}
        onClick={() => {
          if (halfEnabled(source)) onTapOption?.(source);
        }}
        aria-label={`${label}: ${ENHANCEMENTS[id].name} (${source === 'own' ? 'твоё' : 'соперника'})`}
      />
    );
    return (
      <motion.div
        layoutId={card.id}
        transition={CARD_SPRING}
        className={cardClasses(card, playable, trump, 'card--split')}
        aria-label={label}
        {...tip.handlers}
      >
        <FeelBox idle={idle} swayDelay={swayDelay}>
          <CardFace card={card} split={{ own, foreign }} />
          {half('own', own)}
          {half('foreign', foreign)}
        </FeelBox>
        {bubble}
      </motion.div>
    );
  }

  const single = own ?? foreign;
  return (
    <motion.button
      type="button"
      layoutId={card.id}
      transition={CARD_SPRING}
      className={cardClasses(card, playable, trump)}
      onClick={onTap}
      aria-disabled={!onTap}
      aria-label={single ? `${label}: ${ENHANCEMENTS[single].name}` : label}
      {...tip.handlers}
    >
      <FeelBox idle={idle} swayDelay={swayDelay}>
        <CardFace card={card} enhancement={single} />
      </FeelBox>
      {bubble}
    </motion.button>
  );
}

type CardBackProps = { readonly layoutId?: string };

export function CardBack({ layoutId }: CardBackProps) {
  return (
    <motion.div layoutId={layoutId} transition={CARD_SPRING} className="card card--back" aria-hidden="true">
      <img className="sprite" src={backUrl()} alt="" draggable={false} />
    </motion.div>
  );
}
