import { isRedSuit, rankLabel, SUIT_NAMES, SUIT_SYMBOLS, type Card } from '@game/core';
import { motion } from 'motion/react';

const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 35 } as const;

type CardViewProps = {
  readonly card: Card;
  readonly playable?: boolean;
  readonly trump?: boolean;
  readonly onTap?: () => void;
};

export function CardView({ card, playable = false, trump = false, onTap }: CardViewProps) {
  const classes = [
    'card',
    isRedSuit(card.suit) ? 'card--red' : 'card--black',
    playable ? 'card--playable' : '',
    trump ? 'card--trump' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      type="button"
      layoutId={card.id}
      transition={CARD_SPRING}
      className={classes}
      onClick={onTap}
      disabled={!onTap}
      aria-label={`${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`}
    >
      <span className="card__rank">{rankLabel(card.rank)}</span>
      <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </motion.button>
  );
}

type CardBackProps = { readonly layoutId?: string };

export function CardBack({ layoutId }: CardBackProps) {
  return <motion.div layoutId={layoutId} transition={CARD_SPRING} className="card card--back" aria-hidden="true" />;
}
