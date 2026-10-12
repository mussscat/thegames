import { NO_CHARGES } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { chargeBadges, chargeChips, playLabel, toggleTarget } from './focusView';

describe('chargeBadges', () => {
  it('shows nothing without charges and each charge otherwise', () => {
    expect(chargeBadges(NO_CHARGES)).toEqual([]);
    expect(chargeBadges({ chips: 8, mult: 3, times: 2, shield: 0.5 })).toEqual(['+8 фишек', '+3 множ.', '×2', 'щит ×0.5']);
  });
});

describe('chargeChips', () => {
  it('pairs each charge with the icon of the focus that gave it, in the same order as the badges', () => {
    expect(chargeChips(NO_CHARGES)).toEqual([]);
    expect(chargeChips({ chips: 8, mult: 3, times: 2, shield: 0.5 })).toEqual([
      { text: '+8 фишек', icon: 'pad' },
      { text: '+3 множ.', icon: 'boost' },
      { text: '×2', icon: 'doubler' },
      { text: 'щит ×0.5', icon: 'shield' },
    ]);
  });
});

describe('toggleTarget', () => {
  it('adds up to the limit and removes on a second tap', () => {
    expect(toggleTarget([], 'a', 2)).toEqual(['a']);
    expect(toggleTarget(['a'], 'b', 2)).toEqual(['a', 'b']);
    expect(toggleTarget(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    expect(toggleTarget(['a', 'b'], 'a', 2)).toEqual(['b']);
    expect(toggleTarget(['a'], 'b', 1)).toEqual(['b']);
  });
});

describe('playLabel', () => {
  it('counts the picked cards against the most the focus takes; no count when it takes none', () => {
    expect(playLabel('boost', 0)).toBe('Сыграть');
    expect(playLabel('redeal', 1)).toBe('Сыграть 1/2');
    expect(playLabel('swap', 0)).toBe('Сыграть 0/1');
  });
});
