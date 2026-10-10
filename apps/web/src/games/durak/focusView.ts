import { FOCUSES, type FocusCharges, type FocusId } from '@game/durak';
import type { IconId } from '../../ui/pixel/sheet';
import { formatMult } from './hits';

export type ChargeChip = { readonly text: string; readonly icon: IconId };

/** The charges waiting for the next hit, each with the icon of the focus that gave it. */
export function chargeChips(charges: FocusCharges): readonly ChargeChip[] {
  const chips: readonly (ChargeChip | null)[] = [
    charges.chips > 0 ? { text: `+${charges.chips} фишек`, icon: 'pad' } : null,
    charges.mult > 0 ? { text: `+${formatMult(charges.mult)} множ.`, icon: 'boost' } : null,
    charges.times !== 1 ? { text: `×${formatMult(charges.times)}`, icon: 'doubler' } : null,
    charges.shield !== 1 ? { text: `щит ×${formatMult(charges.shield)}`, icon: 'shield' } : null,
  ];
  return chips.filter((chip): chip is ChargeChip => chip !== null);
}

export function chargeBadges(charges: FocusCharges): readonly string[] {
  return chargeChips(charges).map((chip) => chip.text);
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
