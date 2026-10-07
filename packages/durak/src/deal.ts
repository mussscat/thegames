import { createDeck, shuffle, type Card, type RngState, type Suit } from '@game/core';
import { DEFAULT_HAND_SIZES, type HandSizes, type Hands, type PlayerId, type RoundState } from './types';

const DURAK_MIN_RANK = 6;

export function firstAttacker(hands: Hands, trump: Suit): PlayerId {
  const lowestTrump = (cards: readonly Card[]): number =>
    Math.min(Infinity, ...cards.filter((card) => card.suit === trump).map((card) => card.rank));
  return lowestTrump(hands.enemy) < lowestTrump(hands.player) ? 'enemy' : 'player';
}

export function dealRound(rng: RngState, handSizes: HandSizes = DEFAULT_HAND_SIZES): readonly [RoundState, RngState] {
  const [deck, nextRng] = shuffle(createDeck(DURAK_MIN_RANK), rng);
  const dealtCount = handSizes.player + handSizes.enemy;
  const hands: Hands = {
    player: deck.slice(0, handSizes.player),
    enemy: deck.slice(handSizes.player, dealtCount),
  };
  const rest = deck.slice(dealtCount);
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
    lastBout: null,
    handSizes,
  };
  return [round, nextRng];
}
