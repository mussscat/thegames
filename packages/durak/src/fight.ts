import { createRng, err, ok, type Result, type RngState } from '@game/core';
import { dealRound } from './deal';
import { applyRoundAction } from './reducer';
import { opponentOf, type DurakError, type PlayerId, type RoundAction, type RoundState } from './types';

export type FightConfig = { readonly seed: number; readonly playerHp: number; readonly enemyHp: number };

export const DEFAULT_FIGHT_CONFIG = { playerHp: 15, enemyHp: 10 } as const;

/** One HP loss caused by the last action: taking the table, or being left the durak. */
export type Hit = {
  readonly target: PlayerId;
  readonly amount: number;
  readonly reason: 'took' | 'durak';
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
  return ok(applyHits({ ...state, round: result.value, hits: [] }, pendingHits(state.round, result.value)));
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng);
  return ok({ ...state, round, rng, roundNumber: state.roundNumber + 1, hits: [] });
}

/** Bout damage first, then the end-of-round finisher; zero-damage entries are dropped. */
function pendingHits(previous: RoundState, next: RoundState): readonly Hit[] {
  const bout = next.lastBout !== previous.lastBout ? next.lastBout : null;
  const finisher = next.outcome && !previous.outcome ? next.outcome : null;
  const hits: readonly (Hit | null)[] = [
    bout && { target: bout.damaged, amount: bout.amount, reason: 'took' },
    finisher && finisher.loser !== null ? { target: finisher.loser, amount: finisher.cardsLeft, reason: 'durak' } : null,
  ];
  return hits.filter((hit): hit is Hit => hit !== null && hit.amount > 0);
}

/** Applies hits in order and stops at the first lethal one, so both sides can never die at once. */
function applyHits(state: FightState, hits: readonly Hit[]): FightState {
  return hits.reduce<FightState>((current, hit) => {
    if (current.winner) return current;
    const remaining = Math.max(0, current.hp[hit.target] - hit.amount);
    const hp = hit.target === 'player' ? { ...current.hp, player: remaining } : { ...current.hp, enemy: remaining };
    return {
      ...current,
      hp,
      hits: [...current.hits, hit],
      hitSeq: current.hits.length === 0 ? current.hitSeq + 1 : current.hitSeq,
      winner: remaining === 0 ? opponentOf(hit.target) : null,
    };
  }, state);
}
