import { createRng, err, ok, type Result, type RngState } from '@game/core';
import { dealRound } from './deal';
import { applyRoundAction } from './reducer';
import { opponentOf, type DurakError, type PlayerId, type RoundAction, type RoundState } from './types';

export type FightConfig = { readonly seed: number; readonly playerHp: number; readonly enemyHp: number };

export const DEFAULT_FIGHT_CONFIG = { playerHp: 15, enemyHp: 10 } as const;

export type FightState = {
  readonly round: RoundState;
  readonly hp: Readonly<Record<PlayerId, number>>;
  readonly maxHp: Readonly<Record<PlayerId, number>>;
  readonly rng: RngState;
  readonly roundNumber: number;
  readonly winner: PlayerId | null;
};

export type FightAction = RoundAction | { readonly type: 'nextRound' };

export type FightError = DurakError | 'fightOver' | 'roundInProgress';

export function createFight(config: FightConfig): FightState {
  const [round, rng] = dealRound(createRng(config.seed));
  const hp = { player: config.playerHp, enemy: config.enemyHp };
  return { round, hp, maxHp: hp, rng, roundNumber: 1, winner: null };
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
  return ok(resolveOutcome({ ...state, round: result.value }));
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng);
  return ok({ ...state, round, rng, roundNumber: state.roundNumber + 1 });
}

function resolveOutcome(state: FightState): FightState {
  const outcome = state.round.outcome;
  if (!outcome || outcome.loser === null) return state;
  const loser = outcome.loser;
  const remaining = Math.max(0, state.hp[loser] - outcome.cardsLeft);
  const hp = loser === 'player' ? { ...state.hp, player: remaining } : { ...state.hp, enemy: remaining };
  return { ...state, hp, winner: remaining === 0 ? opponentOf(loser) : null };
}
