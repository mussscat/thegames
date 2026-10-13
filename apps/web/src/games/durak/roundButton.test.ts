import { createFight, type RoundState } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { roundButton } from './roundButton';

const base = createFight({ seed: 1, playerHp: 10, enemyHp: 10 }).round;
const withTable = (over: Partial<RoundState>): RoundState => ({ ...base, ...over });
const pair = { attack: base.hands.player[0]!, defense: null };

describe('roundButton', () => {
  it('the enemy attacks: Беру, pressable only on the player turn', () => {
    const round = withTable({ attacker: 'enemy', table: [pair] });
    expect(roundButton(round, true)).toEqual({ label: 'Беру', kind: 'take', disabled: false });
    expect(roundButton(round, false)).toEqual({ label: 'Беру', kind: 'take', disabled: true });
  });

  it('the enemy attacks but has not played yet: Беру is there, greyed out', () => {
    expect(roundButton(withTable({ attacker: 'enemy', table: [] }), false).disabled).toBe(true);
  });

  it('the player attacks on an empty table: Бито is there, greyed out, even on the player turn', () => {
    expect(roundButton(withTable({ attacker: 'player', table: [] }), true)).toEqual({ label: 'Бито', kind: 'end', disabled: true });
  });

  it('the player attacks with cards on the table: Бито, pressable on the player turn only', () => {
    const round = withTable({ attacker: 'player', table: [pair] });
    expect(roundButton(round, true)).toEqual({ label: 'Бито', kind: 'end', disabled: false });
    expect(roundButton(round, false).disabled).toBe(true);
  });

  it('the enemy is taking the table: the same button reads Готово', () => {
    const round = withTable({ attacker: 'player', table: [pair], defenderTaking: true });
    expect(roundButton(round, true)).toEqual({ label: 'Готово', kind: 'end', disabled: false });
  });
});
