import { createFight, type FightState } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { coinSound, fightSound, isNewError } from './sounds';

const base = createFight({ seed: 7, playerHp: 10, enemyHp: 7 });
const attack = base.round.hands[base.round.attacker][0]!;
const defense = base.round.hands.player[1]!;

function withTable(state: FightState, table: FightState['round']['table']): FightState {
  return { ...state, round: { ...state.round, table } };
}

describe('fightSound', () => {
  it('is silent when nothing changed', () => {
    expect(fightSound(base, base)).toBeNull();
  });

  it('plays a card when a card lands on the table', () => {
    const attacked = withTable(base, [{ attack, defense: null }]);
    expect(fightSound(base, attacked)).toBe('play');
    expect(fightSound(attacked, withTable(base, [{ attack, defense }]))).toBe('play');
  });

  it('sweeps the table on «Бито» and thuds on a take', () => {
    const attacked = withTable(base, [{ attack, defense: null }]);
    expect(fightSound(attacked, base)).toBe('flip');
    expect(fightSound(attacked, { ...base, hitSeq: base.hitSeq + 1 })).toBe('hit');
  });

  it('celebrates a win and thuds on a loss', () => {
    expect(fightSound(base, { ...base, winner: 'player' })).toBe('win');
    expect(fightSound(base, { ...base, winner: 'enemy' })).toBe('hit');
  });

  it('shuffles on a new deal', () => {
    expect(fightSound(base, { ...base, roundNumber: base.roundNumber + 1 })).toBe('flip');
  });
});

describe('coinSound', () => {
  it('rings whenever the coin count changes', () => {
    expect(coinSound(5, 5)).toBeNull();
    expect(coinSound(5, 2)).toBe('coin');
    expect(coinSound(2, 4)).toBe('coin');
  });
});

describe('isNewError', () => {
  it('fires only when the error counter grows after the first render', () => {
    expect(isNewError(undefined, 3)).toBe(false);
    expect(isNewError(3, 3)).toBe(false);
    expect(isNewError(3, 4)).toBe(true);
    expect(isNewError(0, 1)).toBe(true);
  });
});
