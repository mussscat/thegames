import { describe, expect, it } from 'vitest';
import { botTargets, simulateRun, summarize } from './simulate';

describe('simulateRun', () => {
  it('plays a whole run deterministically and records every fight', () => {
    const a = simulateRun(42);
    expect(simulateRun(42)).toEqual(a);
    expect(a.fights.length).toBe(a.won ? 6 : a.stagesWon + 1);
    expect(summarize([a])).toContain('stage 1');
  });
});

describe('botTargets', () => {
  const hand = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];
  it('fills an enhancement tarot up to its limit', () => {
    expect(botTargets('sun', hand, {})).toEqual(['clubs-6', 'clubs-7']);
    expect(botTargets('chariot', hand, {})).toEqual(['clubs-6']);
    expect(botTargets('hermit', hand, {})).toEqual([]);
  });
  it('Смерть copies from an enhanced hand card, or is skipped', () => {
    expect(botTargets('death', hand, { 'clubs-8': 'trump' })).toEqual(['clubs-6', 'clubs-8']);
    expect(botTargets('death', hand, {})).toBeNull();
  });
});
