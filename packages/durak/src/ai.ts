import type { Card } from '@game/core';
import { isTrumpCard, legalActions } from './rules';
import type { PlayerId, RoundAction, RoundState } from './types';

export type AiStyle = 'stingy' | 'aggressive';

const TRUMP_COST_PENALTY = 20;
const LATE_GAME_DECK_SIZE = 6;
const STINGY_MAX_THROW_RANK = 11;
const COSTLY_TAKE_TABLE_SIZE = 2;

const TAKE: RoundAction = { type: 'take' };
const END_ATTACK: RoundAction = { type: 'endAttack' };

type CardAction = Extract<RoundAction, { readonly cardId: string }>;
type Candidate = { readonly action: CardAction; readonly card: Card };

export function chooseAction(state: RoundState, me: PlayerId, style: AiStyle): RoundAction | null {
  const legal = legalActions(state, me);
  if (legal.length === 0) return null;
  const cheapest = cheapestCandidate(state, me, legal);
  if (me !== state.attacker) return chooseDefense(state, style, cheapest);
  if (state.table.length === 0) return cheapest ? cheapest.action : null;
  return cheapest && wantsToThrow(state, cheapest.card, style) ? cheapest.action : END_ATTACK;
}

function isTrump(state: RoundState, card: Card): boolean {
  return isTrumpCard(card, state.trumpSuit, state.boss);
}

function cardCost(state: RoundState, card: Card): number {
  return card.rank + (isTrump(state, card) ? TRUMP_COST_PENALTY : 0);
}

function cheapestCandidate(state: RoundState, me: PlayerId, legal: readonly RoundAction[]): Candidate | null {
  const hand = state.hands[me];
  const candidates = legal.flatMap((action): Candidate[] => {
    if (action.type !== 'attack' && action.type !== 'defend') return [];
    const card = hand.find((c) => c.id === action.cardId);
    return card ? [{ action, card }] : [];
  });
  const sorted = [...candidates].sort((a, b) => cardCost(state, a.card) - cardCost(state, b.card));
  return sorted[0] ?? null;
}

function chooseDefense(state: RoundState, style: AiStyle, best: Candidate | null): RoundAction {
  if (!best) return TAKE;
  return isTrump(state, best.card) && !shouldSpendTrump(state, style) ? TAKE : best.action;
}

function shouldSpendTrump(state: RoundState, style: AiStyle): boolean {
  return (
    style === 'aggressive' ||
    state.deck.length <= LATE_GAME_DECK_SIZE ||
    state.table.length >= COSTLY_TAKE_TABLE_SIZE
  );
}

/** Throw-ins are free (a beaten bout costs nothing), so the only cost is giving away good cards. */
function wantsToThrow(state: RoundState, card: Card, style: AiStyle): boolean {
  if (state.deck.length === 0) return true;
  const affordable = !isTrump(state, card) || state.deck.length <= LATE_GAME_DECK_SIZE;
  if (state.defenderTaking || style === 'aggressive') return affordable;
  return !isTrump(state, card) && card.rank <= STINGY_MAX_THROW_RANK;
}
