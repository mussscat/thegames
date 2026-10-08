import { ENHANCEMENTS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { tipLines } from './tipLines';

describe('tipLines', () => {
  it('is empty for a plain card', () => {
    expect(tipLines(undefined)).toEqual([]);
    expect(tipLines({})).toEqual([]);
  });

  it('describes a single enhancement without an owner note', () => {
    expect(tipLines({ own: 'golden' })).toEqual([{ name: 'Золотая', description: ENHANCEMENTS.golden.description, owner: null }]);
    expect(tipLines({ foreign: 'coin' })).toEqual([{ name: 'Монетная', description: ENHANCEMENTS.coin.description, owner: null }]);
  });

  it('marks both halves of a split card', () => {
    expect(tipLines({ own: 'heavy', foreign: 'sharp' })).toEqual([
      { name: 'Тяжёлая', description: ENHANCEMENTS.heavy.description, owner: 'твоё' },
      { name: 'Острая', description: ENHANCEMENTS.sharp.description, owner: 'соперника' },
    ]);
  });
});
