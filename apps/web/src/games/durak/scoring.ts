import type { RunState, ScoredHit } from '@game/durak';

function takes(run: RunState): number {
  return run.phase.kind === 'fight' ? run.phase.fight.fightTakes.player + run.phase.fight.fightTakes.enemy : 0;
}

/** The take a step just scored, if any: the screen replays it before showing the new state. */
export function scoredTake(prev: RunState, next: RunState): ScoredHit | null {
  if (prev.phase.kind !== 'fight' || next.phase.kind !== 'fight') return null;
  return takes(next) > takes(prev) ? next.phase.fight.lastScore : null;
}
