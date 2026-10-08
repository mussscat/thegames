import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MAX_JOKERS } from '../jokers/catalog';
import { botAction } from '../sim/simulate';
import { applyRunAction, createRun } from './run';

const MAX_STEPS = 300_000;

describe('run simulation', () => {
  it('every run ends; coins stay non-negative; jokers stay unique and within 5 slots', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        let run = createRun(seed);
        for (let step = 0; step < MAX_STEPS && run.phase.kind !== 'over'; step++) {
          const result = applyRunAction(run, botAction(run));
          if (!result.ok) throw new Error(`illegal bot move: ${result.error}`);
          run = result.value;
          expect(run.coins).toBeGreaterThanOrEqual(0);
          expect(run.jokers.length).toBeLessThanOrEqual(MAX_JOKERS);
          expect(new Set(run.jokers).size).toBe(run.jokers.length);
        }
        expect(run.phase.kind).toBe('over');
      }),
      { numRuns: 30 },
    );
  });
});
