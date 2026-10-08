import type { Card } from '@game/core';
import { cardEnhancements, isTrumpCard, legalActions, type EnhancementSource, type RoundState } from '@game/durak';
import type { CSSProperties } from 'react';
import { CardBack, CardView } from '../../components/CardView';
import { fanAngle, fanDrop, handOverlap } from '../../ui/fan';
import { sortHand, type HandSort } from '../../ui/handSort';

/** Card widths a hand may take: leaves room for the fan's rotation at the screen edges. */
const HAND_FIT = 6;

/** Later cards sit on top; a big hand overlaps so it never leaves the screen. */
function slotStyle(index: number, count: number, fan: boolean): CSSProperties {
  const overlap = handOverlap(count, HAND_FIT);
  return {
    marginLeft: index === 0 ? 0 : `calc(var(--slot-w) * ${-overlap})`,
    transform: fan ? `translateY(${fanDrop(index, count)}px) rotate(${fanAngle(index, count)}deg)` : undefined,
    zIndex: index,
  };
}

export function EnemyHand({ cards }: { readonly cards: readonly Card[] }) {
  return (
    <div className="hand hand--enemy" data-testid="enemy-hand">
      {cards.map((card, index, all) => (
        <div key={card.id} className="hand__slot" style={slotStyle(index, all.length, false)}>
          <CardBack layoutId={card.id} />
        </div>
      ))}
      <span className="hand__count">{cards.length}</span>
    </div>
  );
}

/** A trump this round: the trump suit, boss trumps (witch queens) or a card the player holds as Козырная. */
function isRoundTrump(round: RoundState, card: Card): boolean {
  const { own, foreign } = cardEnhancements(round, 'player', card);
  return isTrumpCard(card, round.trumpSuit, round.boss) || own === 'trump' || foreign === 'trump';
}

type PlayerHandProps = {
  readonly round: RoundState;
  readonly myTurn: boolean;
  readonly sway: boolean;
  readonly sort: HandSort;
  readonly onPlay: (card: Card, use?: EnhancementSource) => void;
};

export function PlayerHand({ round, myTurn, sway, sort, onPlay }: PlayerHandProps) {
  const legal = legalActions(round, 'player');
  const playableIds = new Set(legal.flatMap((action) => ('cardId' in action ? [action.cardId] : [])));
  const legalUses = (cardId: string): readonly EnhancementSource[] =>
    legal.flatMap((action) => ('cardId' in action && action.cardId === cardId && action.use ? [action.use] : []));

  return (
    <div className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand">
      {sortHand(round.hands.player, sort, (card) => isRoundTrump(round, card)).map((card, index, all) => {
        const enhancements = cardEnhancements(round, 'player', card);
        const split = Boolean(enhancements.own && enhancements.foreign);
        return (
          <div key={card.id} className="hand__slot" style={slotStyle(index, all.length, true)}>
            <CardView
              card={card}
              enhancements={enhancements}
              playable={myTurn && playableIds.has(card.id)}
              trump={isRoundTrump(round, card)}
              onTap={myTurn && !split ? () => onPlay(card) : undefined}
              onTapOption={myTurn && split ? (use) => onPlay(card, use) : undefined}
              legalUses={myTurn && split ? legalUses(card.id) : undefined}
              idle={sway}
              swayDelay={index * 0.4}
            />
          </div>
        );
      })}
    </div>
  );
}
