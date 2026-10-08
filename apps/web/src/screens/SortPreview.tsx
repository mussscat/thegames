import { makeCard, rankLabel, SUIT_NAMES, SUIT_SYMBOLS, type Card } from '@game/core';
import { LayoutGroup, motion } from 'motion/react';
import { sortHand, type HandSort } from '../ui/handSort';
import { PixelCard } from '../ui/PixelCard';

const TRUMP = 'hearts';
const SAMPLE: readonly Card[] = [
  makeCard('spades', 7),
  makeCard('hearts', 13),
  makeCard('diamonds', 9),
  makeCard('clubs', 14),
  makeCard('hearts', 6),
  makeCard('spades', 12),
  makeCard('diamonds', 10),
];
const CARD_WIDTH = 38;
const isTrump = (card: Card): boolean => card.suit === TRUMP;

/** A sample hand that re-sorts live as the sort settings change; trumps glow gold. */
export function SortPreview({ sort }: { readonly sort: HandSort }) {
  return (
    <div className="sort-preview">
      <span className="sort-preview__trump">
        Козырь <span className="deck__suit deck__suit--red">{SUIT_SYMBOLS[TRUMP]}</span>
      </span>
      <LayoutGroup id="sort-preview">
        <div className="sort-preview__hand" data-testid="sort-preview">
          {sortHand(SAMPLE, sort, isTrump).map((card) => (
            <motion.div
              key={card.id}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className={isTrump(card) ? 'sort-preview__card sort-preview__card--trump' : 'sort-preview__card'}
              role="img"
              aria-label={`${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}${isTrump(card) ? ', козырь' : ''}`}
            >
              <PixelCard card={card} width={CARD_WIDTH} idle={false} />
            </motion.div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
