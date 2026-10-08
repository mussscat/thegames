import { isRedSuit, rankLabel, SUIT_NAMES, SUIT_SYMBOLS, type Card } from '@game/core';
import { ENHANCEMENTS, type CardEnhancements, type EnhancementSource } from '@game/durak';
import { motion } from 'motion/react';

const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 35 } as const;

type CardViewProps = {
  readonly card: Card;
  readonly playable?: boolean;
  readonly trump?: boolean;
  readonly enhancements?: CardEnhancements;
  readonly onTap?: () => void;
  /** When both enhancements are available, each half of the card plays the card with that enhancement. */
  readonly onTapOption?: (use: EnhancementSource) => void;
};

function Badge({ source, short }: { readonly source: EnhancementSource; readonly short: string }) {
  return <span className={`card__badge card__badge--${source}`}>{short}</span>;
}

export function CardView({ card, playable = false, trump = false, enhancements, onTap, onTapOption }: CardViewProps) {
  const classes = [
    'card',
    isRedSuit(card.suit) ? 'card--red' : 'card--black',
    playable ? 'card--playable' : '',
    trump ? 'card--trump' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const label = `${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`;
  const own = enhancements?.own;
  const foreign = enhancements?.foreign;
  const face = (
    <>
      <span className="card__rank">{rankLabel(card.rank)}</span>
      <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </>
  );

  if (own && foreign) {
    return (
      <motion.div layoutId={card.id} transition={CARD_SPRING} className={`${classes} card--split`} aria-label={label}>
        {face}
        <button
          type="button"
          className="card__half card__half--own"
          disabled={!onTapOption}
          onClick={() => onTapOption?.('own')}
          aria-label={`${label}: ${ENHANCEMENTS[own].name} (твоё)`}
        >
          <Badge source="own" short={ENHANCEMENTS[own].short} />
        </button>
        <button
          type="button"
          className="card__half card__half--foreign"
          disabled={!onTapOption}
          onClick={() => onTapOption?.('foreign')}
          aria-label={`${label}: ${ENHANCEMENTS[foreign].name} (соперника)`}
        >
          <Badge source="foreign" short={ENHANCEMENTS[foreign].short} />
        </button>
      </motion.div>
    );
  }

  const single = own ?? foreign;
  return (
    <motion.button
      type="button"
      layoutId={card.id}
      transition={CARD_SPRING}
      className={classes}
      onClick={onTap}
      disabled={!onTap}
      aria-label={single ? `${label}: ${ENHANCEMENTS[single].name}` : label}
    >
      {face}
      {single && <Badge source={own ? 'own' : 'foreign'} short={ENHANCEMENTS[single].short} />}
    </motion.button>
  );
}

type CardBackProps = { readonly layoutId?: string };

export function CardBack({ layoutId }: CardBackProps) {
  return <motion.div layoutId={layoutId} transition={CARD_SPRING} className="card card--back" aria-hidden="true" />;
}
