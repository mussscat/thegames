import { conflictFor, MAX_JOKERS, TAROTS, targetsOk, type DeckProfile, type EnhancementId, type JokerId, type PackCard } from '@game/durak';

/** Durations at x1; the animation speed setting divides them. */
export const TEAR_MS = 600;
export const FLIP_STEP_MS = 250;
export const FLIP_MS = 300;

export type RevealPlan = { readonly cardsAt: number; readonly flips: readonly number[]; readonly done: number };

/** When the torn pack shows its cards and when each one flips face up. */
export function revealSchedule(count: number, speed: number, reduced: boolean): RevealPlan {
  if (reduced) return { cardsAt: 0, flips: Array.from({ length: count }, () => 0), done: 0 };
  const cardsAt = TEAR_MS / speed;
  const flips = Array.from({ length: count }, (_, i) => cardsAt + (i * FLIP_STEP_MS) / speed);
  return { cardsAt, flips, done: (flips.at(-1) ?? cardsAt) + FLIP_MS / speed };
}

export type Replacement = { readonly cardId: string; readonly from: EnhancementId; readonly to: EnhancementId };

function replacement(profile: DeckProfile, cardId: string, to: EnhancementId): readonly Replacement[] {
  const from = conflictFor(profile, cardId, to);
  return from ? [{ cardId, from, to }] : [];
}

/** The enhancements a pick would overwrite — each needs the player's confirmation. */
export function replacementsFor(card: PackCard, targets: readonly string[], profile: DeckProfile): readonly Replacement[] {
  if (card.kind === 'card') return replacement(profile, card.cardId, card.enhancement);
  if (card.kind !== 'tarot') return [];
  const { enhancement } = TAROTS[card.tarotId];
  if (enhancement) return targets.flatMap((cardId) => replacement(profile, cardId, enhancement));
  if (card.tarotId !== 'death') return [];
  const [to, from] = targets;
  const source = from === undefined ? undefined : profile[from];
  return to !== undefined && source ? replacement(profile, to, source) : [];
}

export function canTake(card: PackCard, targets: readonly string[], profile: DeckProfile, jokers: readonly JokerId[]): boolean {
  if (card.kind === 'joker') return jokers.length < MAX_JOKERS;
  if (card.kind === 'tarot') return targetsOk(card.tarotId, targets, profile);
  return true;
}
