import type { Card, Rank, Suit } from '@game/core';
import {
  MAX_ATTACKS_PER_BOUT,
  opponentOf,
  type BossRule,
  type PlayerId,
  type RoundAction,
  type RoundState,
  type TablePair,
} from './types';

const QUEEN: Rank = 12;
const GENERAL_MIN_GAP = 2;

export function isTrumpCard(card: Card, trump: Suit, boss: BossRule | null = null): boolean {
  return card.suit === trump || (boss === 'witch' && card.rank === QUEEN);
}

/** `defender` matters only for the General, whose rule binds the player. Two trumps compare by rank. */
export function beats(
  attack: Card,
  defense: Card,
  trump: Suit,
  boss: BossRule | null = null,
  defender: PlayerId = 'enemy',
): boolean {
  const gap = boss === 'general' && defender === 'player' ? GENERAL_MIN_GAP : 1;
  const attackTrump = isTrumpCard(attack, trump, boss);
  const defenseTrump = isTrumpCard(defense, trump, boss);
  if (attackTrump !== defenseTrump) return defenseTrump;
  if (!attackTrump && defense.suit !== attack.suit) return false;
  return defense.rank - attack.rank >= gap;
}

export function defenderOf(state: RoundState): PlayerId {
  return opponentOf(state.attacker);
}

export function uncoveredPair(state: RoundState): TablePair | undefined {
  return state.table.find((pair) => pair.defense === null);
}

export function currentActor(state: RoundState): PlayerId | null {
  if (state.outcome) return null;
  if (state.defenderTaking) return state.attacker;
  return uncoveredPair(state) ? defenderOf(state) : state.attacker;
}

/** Defender's hand size at bout start = cards in hand now + cards already used to cover. */
export function attackLimit(state: RoundState): number {
  const covered = state.table.filter((pair) => pair.defense !== null).length;
  return Math.min(MAX_ATTACKS_PER_BOUT, state.hands[defenderOf(state)].length + covered);
}

export function canThrowIn(state: RoundState, card: Card): boolean {
  if (state.table.length === 0) return true;
  if (state.table.length >= attackLimit(state)) return false;
  return state.table.some(
    (pair) => pair.attack.rank === card.rank || pair.defense?.rank === card.rank,
  );
}

export function legalActions(state: RoundState, actor: PlayerId): readonly RoundAction[] {
  if (currentActor(state) !== actor) return [];
  const hand = state.hands[actor];
  const pair = uncoveredPair(state);

  if (actor !== state.attacker && pair) {
    const defends = hand
      .filter((card) => beats(pair.attack, card, state.trumpSuit, state.boss, actor))
      .map((card): RoundAction => ({ type: 'defend', cardId: card.id }));
    return [...defends, { type: 'take' }];
  }

  const attacks = hand
    .filter((card) => canThrowIn(state, card))
    .map((card): RoundAction => ({ type: 'attack', cardId: card.id }));
  return state.table.length === 0 ? attacks : [...attacks, { type: 'endAttack' }];
}
