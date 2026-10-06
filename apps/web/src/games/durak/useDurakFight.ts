import {
  applyFightAction,
  chooseAction,
  createFight,
  currentActor,
  DEFAULT_FIGHT_CONFIG,
  type AiStyle,
  type FightAction,
  type FightState,
} from '@game/durak';
import { useEffect, useState } from 'react';
import { errorMessage } from './messages';

const ENEMY_DELAY_MS = 700;
const ENEMY_STYLE: AiStyle = 'stingy';

export type DurakFight = {
  readonly state: FightState;
  readonly error: string | null;
  readonly act: (action: FightAction) => void;
};

export function useDurakFight(seed: number): DurakFight {
  const [state, setState] = useState(() => createFight({ seed, ...DEFAULT_FIGHT_CONFIG }));
  const [error, setError] = useState<string | null>(null);

  const act = (action: FightAction): void => {
    const result = applyFightAction(state, 'player', action);
    if (result.ok) {
      setState(result.value);
      setError(null);
    } else {
      setError(errorMessage(result.error));
    }
  };

  useEffect(() => {
    if (state.winner || currentActor(state.round) !== 'enemy') return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseAction(state.round, 'enemy', ENEMY_STYLE);
      if (!action) return;
      const result = applyFightAction(state, 'enemy', action);
      if (result.ok) setState(result.value);
      else console.error('AI chose an illegal action', { action, error: result.error });
    }, ENEMY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  return { state, error, act };
}
