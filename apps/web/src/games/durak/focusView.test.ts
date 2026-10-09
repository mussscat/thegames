import { NO_CHARGES } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { chargeBadges, targetHint, toggleTarget } from './focusView';

describe('chargeBadges', () => {
  it('shows nothing without charges and each charge otherwise', () => {
    expect(chargeBadges(NO_CHARGES)).toEqual([]);
    expect(chargeBadges({ chips: 8, mult: 3, times: 2, shield: 0.5 })).toEqual(['+8 фишек', '+3 множ.', '×2', 'щит ×0.5']);
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

describe('targetHint', () => {
  it('asks for cards only when the focus needs them', () => {
    expect(targetHint('boost')).toBeNull();
    expect(targetHint('redeal')).toBe('Выбери 1–2 карты в руке');
    expect(targetHint('swap')).toBe('Выбери карту в руке');
  });
});
