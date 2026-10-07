import { createRng, err, ok, type Result, type RngState } from '@game/core';
import { dealRound } from './deal';
import { applyRoundAction } from './reducer';
import { opponentOf, type DurakError, type PlayerId, type RoundAction, type RoundState } from './types';

export type FightConfig = { readonly seed: number; readonly playerHp: number; readonly enemyHp: number };

export const DEFAULT_FIGHT_CONFIG = { playerHp: 10, enemyHp: 7 } as const;

/** HP lost by the side that took the table in the last action. */
export type Hit = {
  readonly target: PlayerId;
  readonly amount: number;
};

export type FightState = {
  readonly round: RoundState;
  readonly hp: Readonly<Record<PlayerId, number>>;
  readonly maxHp: Readonly<Record<PlayerId, number>>;
  readonly rng: RngState;
  readonly roundNumber: number;
  readonly winner: PlayerId | null;
  /** Hits caused by the most recent action (empty if it dealt no damage). */
  readonly hits: readonly Hit[];
  /** Increments whenever an action deals damage; lets the UI replay hit animations. */
  readonly hitSeq: number;
};

export type FightAction = RoundAction | { readonly type: 'nextRound' };

export type FightError = DurakError | 'fightOver' | 'roundInProgress';

export function createFight(config: FightConfig): FightState {
  const [round, rng] = dealRound(createRng(config.seed));
  const hp = { player: config.playerHp, enemy: config.enemyHp };
  return { round, hp, maxHp: hp, rng, roundNumber: 1, winner: null, hits: [], hitSeq: 0 };
}

export function applyFightAction(
  state: FightState,
  actor: PlayerId,
  action: FightAction,
): Result<FightState, FightError> {
  if (state.winner) return err('fightOver');
  if (action.type === 'nextRound') return nextRound(state);
  const result = applyRoundAction(state.round, actor, action);
  if (!result.ok) return result;
  const next: FightState = { ...state, round: result.value, hits: [] };
  const hit = takenHit(state.round, result.value);
  return ok(hit ? applyHit(next, hit) : next);
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng);
  return ok({ ...state, round, rng, roundNumber: state.roundNumber + 1, hits: [] });
}

/** Only taking the table hurts: a new non-zero bout result is the one and only source of damage. */
function takenHit(previous: RoundState, next: RoundState): Hit | null {
  const bout = next.lastBout;
  if (!bout || bout === previous.lastBout || bout.amount === 0) return null;
  return { target: bout.damaged, amount: bout.amount };
}

function applyHit(state: FightState, hit: Hit): FightState {
  const remaining = Math.max(0, state.hp[hit.target] - hit.amount);
  const hp = hit.target === 'player' ? { ...state.hp, player: remaining } : { ...state.hp, enemy: remaining };
  return {
    ...state,
    hp,
    hits: [hit],
    hitSeq: state.hitSeq + 1,
    winner: remaining === 0 ? opponentOf(hit.target) : null,
  };
}
