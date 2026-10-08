import { describe, it } from 'vitest';
import { simulateRun, summarize } from './simulate';

const RUNS = 400;

/** `npm run simulate` prints the balance table; skipped in normal test runs. */
describe.runIf(import.meta.env.SIM === '1')('balance report', () => {
  it('prints win rates per stage', () => {
    const runs = Array.from({ length: RUNS }, (_, i) => simulateRun(i * 7919 + 1));
    console.info(`\n${summarize(runs)}`);
  }, 600_000);
});
