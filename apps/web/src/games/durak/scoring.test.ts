import { createRun, type FightState, type RunState, type ScoredHit } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { scoredTake } from './scoring';

const start = createRun(1);

function withFight(run: RunState, patch: Partial<FightState>): RunState {
  if (run.phase.kind !== 'fight') throw new Error('fixture must be a fight');
  return { ...run, phase: { ...run.phase, fight: { ...run.phase.fight, ...patch } } };
}

const score: ScoredHit = { chips: 4, mult: 1, damage: 4, steps: [], target: 'player' };

describe('scoredTake', () => {
  it('returns the new score when a take was counted', () => {
    const next = withFight(start, { lastScore: score, fightTakes: { player: 1, enemy: 0 } });
    expect(scoredTake(start, next)).toBe(score);
  });

  it('still holds a take that ends the fight, so the overlay waits for the board', () => {
    const next = withFight(start, { lastScore: score, fightTakes: { player: 1, enemy: 0 }, winner: 'enemy' });
    expect(scoredTake(start, next)).toBe(score);
  });

  it('ignores actions that count no take', () => {
    const before = withFight(start, { lastScore: score, fightTakes: { player: 1, enemy: 0 } });
    const after = withFight(before, { roundNumber: 2 });
    expect(scoredTake(before, after)).toBeNull();
  });

  it('ignores leaving the fight phase', () => {
    const over = { ...start, phase: { kind: 'over', won: false } } as RunState;
    expect(scoredTake(start, over)).toBeNull();
  });
});
