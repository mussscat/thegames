import { describe, expect, it } from 'vitest';
import { defenderOf, ENTRY_DISTANCE, entryFrom } from './tableEntry';

describe('tableEntry', () => {
  it('player cards fly in from below, enemy cards from above', () => {
    expect(entryFrom('player')).toEqual({ y: ENTRY_DISTANCE, opacity: 0 });
    expect(entryFrom('enemy')).toEqual({ y: -ENTRY_DISTANCE, opacity: 0 });
  });

  it('the defender is the side that does not attack', () => {
    expect(defenderOf('player')).toBe('enemy');
    expect(defenderOf('enemy')).toBe('player');
  });
});
