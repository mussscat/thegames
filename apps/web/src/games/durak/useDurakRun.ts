import { applyRunAction, chooseAction, currentActor, enemyAt, type RunAction, type RunState } from '@game/durak';
import { useEffect, useState } from 'react';
import { errorMessage } from './messages';
import { browserStore, clearRun, saveRun } from './runStorage';

const ENEMY_DELAY_MS = 700;

export type DurakRun = {
  readonly run: RunState;
  readonly error: string | null;
  readonly act: (action: RunAction) => void;
};

export function useDurakRun(initial: RunState): DurakRun {
  const [run, setRun] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const act = (action: RunAction): void => {
    const result = applyRunAction(run, action);
    if (result.ok) {
      setRun(result.value);
      setError(null);
    } else {
      setError(errorMessage(result.error));
    }
  };

  useEffect(() => {
    const store = browserStore();
    if (!store) return;
    if (run.phase.kind === 'over') clearRun(store);
    else saveRun(store, run);
  }, [run]);

  useEffect(() => {
    if (run.phase.kind !== 'fight') return undefined;
    const { fight } = run.phase;
    if (fight.winner || currentActor(fight.round) !== 'enemy') return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseAction(fight.round, 'enemy', enemyAt(run.stage).style);
      if (!action) {
        console.error('AI returned no action', { stage: run.stage });
        return;
      }
      const result = applyRunAction(run, { type: 'fight', actor: 'enemy', action });
      if (result.ok) setRun(result.value);
      else console.error('AI chose an illegal action', { action, error: result.error });
    }, ENEMY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [run]);

  return { run, error, act };
}
