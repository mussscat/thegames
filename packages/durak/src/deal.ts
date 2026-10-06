import { createDeck, shuffle, type Card, type RngState, type Suit } from '@game/core';
import { HAND_SIZE, type Hands, type PlayerId, type RoundState } from './types';

const DURAK_MIN_RANK = 6;

export function firstAttacker(hands: Hands, trump: Suit): PlayerId {
  const lowestTrump = (cards: readonly Card[]): number =>
    Math.min(Infinity, ...cards.filter((card) => card.suit === trump).map((card) => card.rank));
  return lowestTrump(hands.enemy) < lowestTrump(hands.player) ? 'enemy' : 'player';
}

export function dealRound(rng: RngState): readonly [RoundState, RngState] {
  const [deck, nextRng] = shuffle(createDeck(DURAK_MIN_RANK), rng);
  const dealt = deck.slice(0, HAND_SIZE * 2);
  const rest = deck.slice(HAND_SIZE * 2);
  const hands: Hands = {
    player: dealt.filter((_, index) => index % 2 === 0),
    enemy: dealt.filter((_, index) => index % 2 === 1),
  };
  const trumpCard = rest[rest.length - 1] as Card;
  const round: RoundState = {
    deck: rest,
    trumpSuit: trumpCard.suit,
    trumpCard,
    hands,
    table: [],
    attacker: firstAttacker(hands, trumpCard.suit),
    defenderTaking: false,
    discardCount: 0,
    outcome: null,
  };
  return [round, nextRng];
}
