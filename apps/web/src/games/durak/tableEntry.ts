import type { PlayerId } from '@game/durak';

/** How far (CSS px) a card flies in from the hand that played it. */
export const ENTRY_DISTANCE = 96;

export const ENTRY_SPRING = { type: 'spring', stiffness: 420, damping: 30 } as const;

export type TableEntry = { readonly y: number; readonly opacity: number };

/** Where a card starts when it lands on the table: below for the player's hand, above for the enemy's. */
export function entryFrom(player: PlayerId): TableEntry {
  return { y: player === 'player' ? ENTRY_DISTANCE : -ENTRY_DISTANCE, opacity: 0 };
}

/** The attack is played by the attacker, the defense by the other side. */
export function defenderOf(attacker: PlayerId): PlayerId {
  return attacker === 'player' ? 'enemy' : 'player';
}
