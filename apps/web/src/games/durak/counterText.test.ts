import { describe, expect, it } from 'vitest';
import { counterView } from './counterText';

describe('counterView', () => {
  it('names who would take the hit', () => {
    expect(counterView({ taker: 'enemy', chips: 7, mult: 1, damage: 7 }).label).toBe('Удар по сопернику');
    expect(counterView({ taker: 'player', chips: 7, mult: 1, damage: 7 }).label).toBe('Удар по тебе');
  });

  it('shows whole numbers as they are and fractions without trailing zeros', () => {
    const view = counterView({ taker: 'player', chips: 12, mult: 1.25, damage: 15 });
    expect(view).toMatchObject({ chips: '12', mult: '1.25', damage: '15' });
    expect(counterView({ taker: 'player', chips: 3, mult: 1.5, damage: 4 }).mult).toBe('1.5');
    expect(counterView({ taker: 'player', chips: 3, mult: 3, damage: 9 }).mult).toBe('3');
  });

  it('cuts binary noise (2 × 1.5 must read 3, not 2.9999999)', () => {
    expect(counterView({ taker: 'enemy', chips: 4, mult: 2.9999999999, damage: 11 }).mult).toBe('3');
    expect(counterView({ taker: 'enemy', chips: 4.0000000001, mult: 1, damage: 4 }).chips).toBe('4');
  });

  it('an empty preview (no fight) reads as zeros', () => {
    expect(counterView(null)).toEqual({ taker: null, label: '', chips: '0', mult: '1', damage: '0' });
  });
});
