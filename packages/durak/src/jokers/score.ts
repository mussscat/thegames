import type { Card, Rank, Suit } from '@game/core';
import type { EnhancementId } from '../enhancements';
import { isTrumpCard } from '../rules';
import type { BossRule } from '../types';
import {
  CARD_SHARP_MULT,
  effectiveJokers,
  GLOAT_MIN_CARDS,
  GLOAT_MULT,
  SERIAL_STEP,
  SMALL_CHIPS,
  SMALL_MAX_RANK,
  SUIT_CHIPS,
  THICK_SKIN_DEALT,
  THICK_SKIN_TAKEN,
  TRUMP_ACE_TIMES,
  USURER_TIMES,
  type JokerId,
} from './catalog';
import type { JokerState } from './state';

export type TakenCard = { readonly card: Card; readonly enhancement: EnhancementId | null };

export type StepSource =
  | { readonly kind: 'tier' }
  | { readonly kind: 'card'; readonly card: Card }
  | { readonly kind: 'enhancement'; readonly card: Card; readonly enhancement: EnhancementId }
  | { readonly kind: 'joker'; readonly side: 'attacker' | 'defender'; readonly slot: number; readonly joker: JokerId; readonly acting: JokerId };

export type Effect = { readonly kind: 'chips' | 'mult' | 'times'; readonly value: number };

/** One visible scoring step with the running chips and mult after it (drives the 3b animation). */
export type ScoreStep = { readonly source: StepSource; readonly effect: Effect; readonly chips: number; readonly mult: number };

export type TakeScore = { readonly chips: number; readonly mult: number; readonly damage: number; readonly steps: readonly ScoreStep[] };

export type ScoreSide = { readonly jokers: readonly JokerId[]; readonly state: JokerState };

export type ScoreInput = {
  readonly taken: readonly TakenCard[];
  readonly trumpSuit: Suit;
  readonly boss: BossRule | null;
  /** The face-up top card of the deck (Шулер), if shown. */
  readonly topCard: Card | null;
  /** Takes by the same taker earlier in this fight (Серийный). */
  readonly takerPriorTakes: number;
  /** The attacker's tier multiplier (enemies 1/2/3 by tier; the player 1). */
  readonly baseMult: number;
  readonly attacker: ScoreSide;
  /** The taker: only its defensive jokers act. */
  readonly defender: ScoreSide;
};

type Tally = { readonly chips: number; readonly mult: number; readonly steps: readonly ScoreStep[] };

/** Guards floor() against binary rounding (2 × 1.5 must be 3, not 2.999…). */
const EPSILON = 1e-9;

const chips = (value: number): Effect => ({ kind: 'chips', value });
const mult = (value: number): Effect => ({ kind: 'mult', value });
const times = (value: number): Effect => ({ kind: 'times', value });

export function rankChips(rank: Rank): number {
  if (rank === 14) return 3;
  return rank >= 11 ? 2 : 1;
}

function apply(tally: Tally, source: StepSource, effect: Effect): Tally {
  const neutral = effect.kind === 'times' ? effect.value === 1 : effect.value === 0;
  if (neutral) return tally;
  const nextChips = effect.kind === 'chips' ? tally.chips + effect.value : tally.chips;
  const nextMult = effect.kind === 'mult' ? tally.mult + effect.value : effect.kind === 'times' ? tally.mult * effect.value : tally.mult;
  return { chips: nextChips, mult: nextMult, steps: [...tally.steps, { source, effect, chips: nextChips, mult: nextMult }] };
}

const SUIT_JOKERS: Partial<Record<JokerId, Suit>> = { hearts: 'hearts', diamonds: 'diamonds', clubs: 'clubs', spades: 'spades' };

function cardEffect(acting: JokerId, card: Card): Effect | null {
  const suit = SUIT_JOKERS[acting];
  if (suit) return card.suit === suit ? chips(SUIT_CHIPS) : null;
  if (acting === 'small') return card.rank <= SMALL_MAX_RANK ? chips(SMALL_CHIPS) : null;
  return null;
}

function enhancementEffect(enhancement: EnhancementId): Effect | null {
  if (enhancement === 'golden') return chips(3);
  if (enhancement === 'sharp') return mult(1);
  return null;
}

function hasTrump(input: ScoreInput): boolean {
  return input.taken.some(({ card, enhancement }) => enhancement === 'trump' || isTrumpCard(card, input.trumpSuit, input.boss));
}

function takeEffect(acting: JokerId, input: ScoreInput): Effect | null {
  const { state } = input.attacker;
  switch (acting) {
    case 'gloat':
      return input.taken.length >= GLOAT_MIN_CARDS ? mult(GLOAT_MULT) : null;
    case 'rage':
      return chips(state.rage);
    case 'trumpAce':
      return hasTrump(input) ? times(TRUMP_ACE_TIMES) : null;
    case 'serial':
      return mult(SERIAL_STEP * input.takerPriorTakes);
    case 'cardSharp': {
      const top = input.topCard;
      return top && input.taken.some(({ card }) => card.rank === top.rank) ? mult(CARD_SHARP_MULT) : null;
    }
    case 'usurer':
      return times(USURER_TIMES);
    case 'cleanHands':
      return mult(state.cleanStreak);
    case 'collector':
      return mult(state.collected);
    case 'thickSkin':
      return times(THICK_SKIN_DEALT);
    default:
      return null;
  }
}

function defenseEffect(acting: JokerId): Effect | null {
  if (acting === 'usurer') return times(USURER_TIMES);
  if (acting === 'thickSkin') return times(THICK_SKIN_TAKEN);
  return null;
}

function jokerPass(tally: Tally, jokers: readonly JokerId[], side: 'attacker' | 'defender', effectOf: (acting: JokerId) => Effect | null): Tally {
  return effectiveJokers(jokers).reduce<Tally>((current, acting, slot) => {
    const effect = acting ? effectOf(acting) : null;
    const joker = jokers[slot];
    return effect && acting && joker ? apply(current, { kind: 'joker', side, slot, joker, acting }, effect) : current;
  }, tally);
}

function scoreCard(tally: Tally, taken: TakenCard, input: ScoreInput): Tally {
  const { card, enhancement } = taken;
  const afterRank = apply(tally, { kind: 'card', card }, chips(rankChips(card.rank)));
  const boost = enhancement ? enhancementEffect(enhancement) : null;
  const afterEnhancement = enhancement && boost ? apply(afterRank, { kind: 'enhancement', card, enhancement }, boost) : afterRank;
  return jokerPass(afterEnhancement, input.attacker.jokers, 'attacker', (acting) => cardEffect(acting, card));
}

/** «Фишки × Множитель» for one take, in Balatro order; every effective step is logged. */
export function scoreTake(input: ScoreInput): TakeScore {
  const start = apply({ chips: 0, mult: 1, steps: [] }, { kind: 'tier' }, times(input.baseMult));
  const afterCards = input.taken.reduce((tally, taken) => scoreCard(tally, taken, input), start);
  const afterAttack = jokerPass(afterCards, input.attacker.jokers, 'attacker', (acting) => takeEffect(acting, input));
  const final = jokerPass(afterAttack, input.defender.jokers, 'defender', defenseEffect);
  const damage = Math.max(0, Math.floor(final.chips * final.mult + EPSILON));
  return { chips: final.chips, mult: final.mult, damage, steps: final.steps };
}
