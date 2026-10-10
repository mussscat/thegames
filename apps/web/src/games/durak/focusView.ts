import { FOCUSES, type FocusCharges, type FocusId } from '@game/durak';
import { formatMult } from './hits';

export function chargeBadges(charges: FocusCharges): readonly string[] {
  return [
    charges.chips > 0 ? `+${charges.chips} фишек` : null,
    charges.mult > 0 ? `+${formatMult(charges.mult)} множ.` : null,
    charges.times !== 1 ? `×${formatMult(charges.times)}` : null,
    charges.shield !== 1 ? `щит ×${formatMult(charges.shield)}` : null,
  ].filter((badge): badge is string => badge !== null);
}

/** One tap adds a card (a single-target focus swaps it), a second tap removes it. */
export function toggleTarget(picked: readonly string[], cardId: string, max: number): readonly string[] {
  if (picked.includes(cardId)) return picked.filter((id) => id !== cardId);
  if (max === 1) return [cardId];
  return picked.length < max ? [...picked, cardId] : picked;
}

export function targetHint(id: FocusId): string | null {
  const { minTargets, maxTargets } = FOCUSES[id];
  if (maxTargets === 0) return null;
  return minTargets === maxTargets ? 'Выбери карту в руке' : `Выбери ${minTargets}–${maxTargets} карты в руке`;
}
