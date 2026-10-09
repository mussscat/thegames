import { err, ok, type Card, type Result } from '@game/core';
import type { FightState } from '../fight';
import { currentActor } from '../rules';
import { BOOST_MULT, DOUBLER_TIMES, FOCUSES, FORESIGHT_CARDS, PAD_CHIPS, PIGGY_COINS, SHIELD_TIMES, type FocusId } from './catalog';

export type FocusError = 'notYourTurn' | 'fightOver' | 'roundOver' | 'badTargets' | 'focusUnavailable';
export type FocusOutcome = { readonly fight: FightState; readonly coins: number };

const NEEDS_DECK: ReadonlySet<FocusId> = new Set(['redeal', 'swap']);

function turnError(fight: FightState): FocusError | null {
  if (fight.winner) return 'fightOver';
  if (fight.round.outcome) return 'roundOver';
  return currentActor(fight.round) === 'player' ? null : 'notYourTurn';
}

/** Whether the focus can be played now, before any target is chosen. */
export function focusReady(fight: FightState, id: FocusId): boolean {
  return turnError(fight) === null && (!NEEDS_DECK.has(id) || fight.round.deck.length > 0);
}

function pickTargets(fight: FightState, id: FocusId, targets: readonly string[]): readonly Card[] | null {
  const { minTargets, maxTargets } = FOCUSES[id];
  if (targets.length < minTargets || targets.length > maxTargets || new Set(targets).size !== targets.length) return null;
  const hand = fight.round.hands.player;
  const cards = targets.map((cardId) => hand.find((card) => card.id === cardId));
  return cards.every((card): card is Card => card !== undefined) ? cards : null;
}

const done = (fight: FightState, coins = 0): Result<FocusOutcome, FocusError> => ok({ fight, coins });

function redeal(fight: FightState, cards: readonly Card[]): Result<FocusOutcome, FocusError> {
  const { round } = fight;
  const ids = new Set(cards.map((card) => card.id));
  const drawn = round.deck.slice(0, cards.length);
  const hand = [...round.hands.player.filter((card) => !ids.has(card.id)), ...drawn];
  return done({
    ...fight,
    round: { ...round, hands: { ...round.hands, player: hand }, deck: round.deck.slice(drawn.length), discardCount: round.discardCount + cards.length },
  });
}

function swap(fight: FightState, card: Card): Result<FocusOutcome, FocusError> {
  const { round } = fight;
  const bottom = round.deck.at(-1);
  if (!bottom || card.suit === round.trumpSuit) return err('focusUnavailable');
  const hand = round.hands.player.map((own) => (own.id === card.id ? bottom : own));
  const deck = [...round.deck.slice(0, -1), card];
  return done({ ...fight, round: { ...round, hands: { ...round.hands, player: hand }, deck, trumpCard: card } });
}

/** Plays a focus for the player on their own turn; `coins` — coins it earns for the run (Копилочка). */
export function applyFocus(fight: FightState, id: FocusId, targets: readonly string[]): Result<FocusOutcome, FocusError> {
  const blocked = turnError(fight);
  if (blocked) return err(blocked);
  const cards = pickTargets(fight, id, targets);
  if (!cards) return err('badTargets');
  if (NEEDS_DECK.has(id) && fight.round.deck.length === 0) return err('focusUnavailable');
  const charges = fight.focusCharges;
  switch (id) {
    case 'peek':
      return done({ ...fight, reveal: { ...fight.reveal, enemyHand: true } });
    case 'foresight':
      return done({ ...fight, reveal: { ...fight.reveal, topCards: FORESIGHT_CARDS } });
    case 'redeal':
      return redeal(fight, cards);
    case 'boost':
      return done({ ...fight, focusCharges: { ...charges, mult: charges.mult + BOOST_MULT } });
    case 'pad':
      return done({ ...fight, focusCharges: { ...charges, chips: charges.chips + PAD_CHIPS } });
    case 'shield':
      return done({ ...fight, focusCharges: { ...charges, shield: charges.shield * SHIELD_TIMES } });
    case 'piggy':
      return done(fight, PIGGY_COINS);
    case 'doubler':
      return done({ ...fight, focusCharges: { ...charges, times: charges.times * DOUBLER_TIMES } });
    case 'swap':
      return swap(fight, cards[0] as Card);
    case 'suitShift': {
      const card = cards[0] as Card;
      if (card.suit === fight.round.trumpSuit) return err('focusUnavailable');
      return done({ ...fight, round: { ...fight.round, trumpSuit: card.suit } });
    }
  }
}
