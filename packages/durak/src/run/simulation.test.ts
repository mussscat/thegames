import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { chooseAction } from '../ai';
import { currentActor } from '../rules';
import { MAX_PERKS } from './shop';
import { applyRunAction, createRun, enemyAt, type RunAction, type RunState } from './run';

const MAX_STEPS = 300_000;

/** Bot policy: aggressive AI in fights, buys the first affordable offer, then moves on. */
function nextAction(run: RunState): RunAction {
  const { phase } = run;
  if (phase.kind === 'fight') {
    const { fight } = phase;
    if (fight.winner) return { type: 'leaveFight' };
    const actor = currentActor(fight.round);
    if (!actor) return { type: 'fight', actor: 'player', action: { type: 'nextRound' } };
    const style = actor === 'player' ? 'aggressive' : enemyAt(run.stage).style;
    const action = chooseAction(fight.round, actor, style);
    if (!action) throw new Error('AI returned no action');
    return { type: 'fight', actor, action };
  }
  if (phase.kind === 'shop') {
    const index = phase.shop.offers.findIndex((offer) => offer !== null && offer.price <= run.coins);
    return index >= 0 && run.perks.length < MAX_PERKS ? { type: 'buyPerk', index } : { type: 'leaveShop' };
  }
  throw new Error('run is over');
}

describe('run simulation', () => {
  it('every run ends; coins stay non-negative; perks stay unique and within 3 slots', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        let run = createRun(seed);
        for (let step = 0; step < MAX_STEPS && run.phase.kind !== 'over'; step++) {
          const result = applyRunAction(run, nextAction(run));
          if (!result.ok) throw new Error(`illegal bot move: ${result.error}`);
          run = result.value;
          expect(run.coins).toBeGreaterThanOrEqual(0);
          expect(run.perks.length).toBeLessThanOrEqual(MAX_PERKS);
          expect(new Set(run.perks).size).toBe(run.perks.length);
        }
        expect(run.phase.kind).toBe('over');
      }),
      { numRuns: 30 },
    );
  });
});
