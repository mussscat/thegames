import type { RoundState } from '@game/durak';

export type RoundButtonView = { readonly label: string; readonly kind: 'take' | 'end'; readonly disabled: boolean };

/**
 * The round button of the action row (owner, 2026-10-13): always on screen, greyed out while it cannot be pressed.
 * Its label follows who attacks: Беру when the enemy does, Бито — or Готово once the enemy takes — when the player does.
 */
export function roundButton(round: RoundState, myTurn: boolean): RoundButtonView {
  if (round.attacker === 'enemy') return { label: 'Беру', kind: 'take', disabled: !myTurn };
  return { label: round.defenderTaking ? 'Готово' : 'Бито', kind: 'end', disabled: !myTurn || round.table.length === 0 };
}
