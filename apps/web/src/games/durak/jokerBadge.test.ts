import { describe, expect, it } from 'vitest';
import { jokerBadge } from './jokerBadge';

const state = { rage: 8, cleanStreak: 2, collected: 3 };

describe('jokerBadge', () => {
  it('shows live counters for charging and growing jokers', () => {
    expect(jokerBadge('rage', state, 0)).toBe('заряд +8');
    expect(jokerBadge('cleanHands', state, 0)).toBe('+2 множ.');
    expect(jokerBadge('collector', state, 0)).toBe('+3 множ.');
    expect(jokerBadge('serial', state, 3)).toBe('+1.5 множ.');
  });

  it('shows nothing for static jokers or empty counters', () => {
    expect(jokerBadge('clubs', state, 3)).toBeNull();
    expect(jokerBadge('rage', { ...state, rage: 0 }, 0)).toBeNull();
  });
});
