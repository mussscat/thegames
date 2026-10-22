import type { Card } from '@game/core';
import { cardEnhancements, isTrumpCard, type CardEnhancements, legalActions, type EnhancementSource, type RoundState } from '@game/durak';
import { motion, useAnimate } from 'motion/react';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { usePrevious } from '../../ui/usePrevious';
import { isNewError } from './sounds';
import { CardBack, CardView } from '../../components/CardView';
import { useFan } from '../../ui/useFan';
import { useHandSlot } from '../../ui/useFlightIn';
import { useSharedLayout } from '../../ui/SharedLayoutContext';
import { useMotionEnabled } from '../../ui/useMotion';
import { sortHand, type HandSort } from '../../ui/handSort';
import type { TipLine } from '../../components/tipLines';

/** A hand slot; remembers where its card stood so the table can fly the card from there. */
function HandSlot({ id, index, className, style, children }: { readonly id: string; readonly index: number; readonly className: string; readonly style: CSSProperties; readonly children: ReactNode }) {
  const ref = useHandSlot<HTMLDivElement>(id, index, !useSharedLayout() && useMotionEnabled(), style.visibility !== 'hidden');
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

const FLIP_STAGGER_S = 0.12;

/** One enemy card: it turns on its vertical axis between the back and the face, each card a beat after the one to its left. */
function EnemyCard({ card, index, revealed }: { readonly card: Card; readonly index: number; readonly revealed: boolean }) {
  const motionOn = useMotionEnabled();
  return (
    <motion.div
      className="hand__flip"
      initial={{ rotateY: 180 }}
      animate={{ rotateY: revealed ? 0 : 180 }}
      transition={motionOn ? { type: 'spring', stiffness: 220, damping: 18, delay: index * FLIP_STAGGER_S } : { duration: 0 }}
    >
      <div className="hand__flip-face">
        <CardView card={card} />
      </div>
      <div className="hand__flip-back">
        <CardBack layoutId={revealed ? undefined : card.id} />
      </div>
    </motion.div>
  );
}

/** The enemy's hand: card backs, which turn face up from left to right while Подглядывание is on. */
export function EnemyHand({ cards, revealed = false }: { readonly cards: readonly Card[]; readonly revealed?: boolean }) {
  const fan = useFan(cards.length, false);
  return (
    <div ref={fan.containerRef} className="hand hand--enemy" data-testid="enemy-hand" data-motion={fan.motion ? 'on' : 'off'} data-revealed={revealed ? 'true' : undefined}>
      <span ref={fan.probeRef} className="hand__probe" aria-hidden="true" />
      {cards.map((card, index) => (
        <HandSlot key={card.id} id={card.id} index={index} className="hand__slot" style={fan.slotStyle(index)}>
          <EnemyCard card={card} index={index} revealed={revealed} />
        </HandSlot>
      ))}
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
  /** Changes on every rejected move: the hand gives a short shake (0 — nothing yet). */
  readonly shakeKey?: number;
  readonly sort: HandSort;
  readonly onPlay: (card: Card, use?: EnhancementSource) => void;
  /** A focus choosing its target cards: every card is tappable and a tap picks it instead of playing it. */
  readonly targeting?: { readonly picked: readonly string[]; readonly onPick: (card: Card) => void } | null;
  /** What a card held down deals, as tooltip lines. */
  readonly strikeOf?: (card: Card, enhancements: CardEnhancements) => readonly TipLine[];
};

export function PlayerHand({ round, myTurn, shakeKey = 0, sort, onPlay, targeting = null, strikeOf }: PlayerHandProps) {
  const legal = legalActions(round, 'player');
  const playableIds = new Set(legal.flatMap((action) => ('cardId' in action ? [action.cardId] : [])));
  const legalUses = (cardId: string): readonly EnhancementSource[] =>
    legal.flatMap((action) => ('cardId' in action && action.cardId === cardId && action.use ? [action.use] : []));

  const cards = sortHand(round.hands.player, sort, (card) => isRoundTrump(round, card));
  const fan = useFan(cards.length, true);
  const [shakeScope, animate] = useAnimate<HTMLDivElement>();
  // `shakeKey` is run-wide: an error made in the shop must not shake the hand of the next fight, nor a settings change.
  const previousShakeKey = usePrevious(shakeKey);
  useEffect(() => {
    if (!isNewError(previousShakeKey, shakeKey) || !fan.motion || !shakeScope.current) return;
    void animate(shakeScope.current, { x: [0, -6, 6, -3, 3, 0] }, { duration: 0.3 });
  }, [shakeKey, previousShakeKey, fan.motion, animate, shakeScope]);

  return (
    <div ref={fan.containerRef} className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand" data-motion={fan.motion ? 'on' : 'off'}>
      <div ref={shakeScope} className="hand__shake">
      <span ref={fan.probeRef} className="hand__probe" aria-hidden="true" />
      {cards.map((card, index) => {
        const enhancements = cardEnhancements(round, 'player', card);
        const split = Boolean(enhancements.own && enhancements.foreign);
        return (
          <HandSlot key={card.id} id={card.id} index={index} className={targeting?.picked.includes(card.id) ? 'hand__slot hand__slot--picked' : 'hand__slot'} style={fan.slotStyle(index)}>
            <CardView
              card={card}
              enhancements={enhancements}
              playable={targeting ? true : myTurn && playableIds.has(card.id)}
              trump={isRoundTrump(round, card)}
              onTap={targeting ? () => targeting.onPick(card) : myTurn && !split ? () => onPlay(card) : undefined}
              onTapOption={!targeting && myTurn && split ? (use) => onPlay(card, use) : undefined}
              legalUses={!targeting && myTurn && split ? legalUses(card.id) : undefined}
              strikes={strikeOf?.(card, enhancements)}
            />
          </HandSlot>
        );
      })}
      </div>
    </div>
  );
}
