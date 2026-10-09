import { applyRunAction, chooseAction, currentActor, enemyAt, type RunAction, type RunState, type ScoredHit } from '@game/durak';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './messages';
import { browserStore, clearRun, saveRun } from './runStorage';
import { scoredTake } from './scoring';

const ENEMY_DELAY_MS = 700;

export type DurakRun = {
  /** The state to show: while a take is being scored, the one before it. */
  readonly run: RunState;
  readonly error: string | null;
  /** Increments on every failed action, so the same error twice still gives feedback. */
  readonly errorSeq: number;
  /** The take being replayed on screen, or null. */
  readonly scoring: ScoredHit | null;
  readonly finishScoring: () => void;
  readonly act: (action: RunAction) => void;
};

type Held = { readonly before: RunState; readonly score: ScoredHit };

export function useDurakRun(initial: RunState): DurakRun {
  const [run, setRun] = useState(initial);
  const [held, setHeld] = useState<Held | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSeq, setErrorSeq] = useState(0);

  const advance = (prev: RunState, next: RunState): void => {
    const score = scoredTake(prev, next);
    if (score) setHeld({ before: prev, score });
    setRun(next);
  };

  const act = (action: RunAction): void => {
    if (held) return;
    const result = applyRunAction(run, action);
    if (result.ok) {
      advance(run, result.value);
      setError(null);
    } else {
      setError(errorMessage(result.error));
      setErrorSeq((n) => n + 1);
    }
  };

  const finishScoring = useCallback(() => setHeld(null), []);

  useEffect(() => {
    const store = browserStore();
    if (!store) return;
    if (run.phase.kind === 'over') clearRun(store);
    else saveRun(store, run);
  }, [run]);

  useEffect(() => {
    if (held || run.phase.kind !== 'fight') return undefined;
    const { fight } = run.phase;
    if (fight.winner || currentActor(fight.round) !== 'enemy') return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseAction(fight.round, 'enemy', enemyAt(run.stage).style);
      if (!action) {
        console.error('AI returned no action', { stage: run.stage });
        return;
      }
      const result = applyRunAction(run, { type: 'fight', actor: 'enemy', action });
      if (result.ok) advance(run, result.value);
      else console.error('AI chose an illegal action', { action, error: result.error });
    }, ENEMY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [run, held]);

  return { run: held ? held.before : run, error, errorSeq, scoring: held?.score ?? null, finishScoring, act };
}
