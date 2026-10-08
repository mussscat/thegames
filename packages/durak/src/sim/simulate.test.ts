import { describe, expect, it } from 'vitest';
import { simulateRun, summarize } from './simulate';

describe('simulateRun', () => {
  it('plays a whole run deterministically and records every fight', () => {
    const a = simulateRun(42);
    expect(simulateRun(42)).toEqual(a);
    expect(a.fights.length).toBe(a.won ? 6 : a.stagesWon + 1);
    expect(summarize([a])).toContain('stage 1');
  });
});
