import { isRedSuit, rankLabel, SUIT_NAMES, type Card } from '@game/core';
import { ENHANCEMENTS, type CardEnhancements, type EnhancementId, type EnhancementSource } from '@game/durak';
import { motion } from 'motion/react';
import { CardFace } from '../ui/CardFace';
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

/** Blue tag — the enhancement is yours, red — it came from the opponent. */
function Tag({ source, short }: { readonly source: EnhancementSource; readonly short: string }) {
  return <span className={`card__tag card__tag--${source}`}>{short}</span>;
}

function cardClasses(card: Card, playable: boolean, trump: boolean, extra = ''): string {
  return ['card', isRedSuit(card.suit) ? 'card--red' : 'card--black', playable ? 'card--playable' : '', trump ? 'card--trump' : '', extra]
    .filter(Boolean)
    .join(' ');
}

export function CardView({ card, playable = false, trump = false, enhancements, onTap, onTapOption, legalUses, idle = false, swayDelay = 0 }: CardViewProps) {
  const label = `${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`;
  const own = enhancements?.own;
  const foreign = enhancements?.foreign;

  if (own && foreign) {
    const halfEnabled = (source: EnhancementSource): boolean => Boolean(onTapOption) && (!legalUses || legalUses.includes(source));
    const half = (source: EnhancementSource, id: EnhancementId) => (
      <button
        type="button"
        className={halfEnabled(source) ? `card__half card__half--${source}` : `card__half card__half--${source} card__half--illegal`}
        disabled={!halfEnabled(source)}
        onClick={() => onTapOption?.(source)}
        aria-label={`${label}: ${ENHANCEMENTS[id].name} (${source === 'own' ? 'твоё' : 'соперника'})`}
      >
        <Tag source={source} short={ENHANCEMENTS[id].short} />
      </button>
    );
    return (
      <motion.div layoutId={card.id} transition={CARD_SPRING} className={cardClasses(card, playable, trump, 'card--split')} aria-label={label}>
        <FeelBox idle={idle} swayDelay={swayDelay}>
          <CardFace card={card} split={{ own, foreign }} />
          {half('own', own)}
          {half('foreign', foreign)}
        </FeelBox>
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
      disabled={!onTap}
      aria-label={single ? `${label}: ${ENHANCEMENTS[single].name}` : label}
    >
      <FeelBox idle={idle} swayDelay={swayDelay}>
        <CardFace card={card} enhancement={single} />
        {single && <Tag source={own ? 'own' : 'foreign'} short={ENHANCEMENTS[single].short} />}
      </FeelBox>
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
