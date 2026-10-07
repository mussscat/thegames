import { createRng, err, ok, type Result, type RngState, type Suit } from '@game/core';
import { dealRound } from './deal';
import { perkHandSizes, perkTakeDamage, type PerkId } from './perks';
import { applyRoundAction } from './reducer';
import {
  opponentOf,
  type BoutResult,
  type DurakError,
  type PlayerId,
  type RoundAction,
  type RoundState,
} from './types';

export type FightConfig = {
  readonly seed: number;
  readonly playerHp: number;
  readonly enemyHp: number;
  readonly perks?: readonly PerkId[];
};

export const DEFAULT_FIGHT_CONFIG = { playerHp: 10, enemyHp: 7 } as const;

/** HP lost by the side that took the table in the last action. */
export type Hit = {
  readonly target: PlayerId;
  readonly amount: number;
};

export type PerPlayer = Readonly<Record<PlayerId, number>>;

export type FightState = {
  readonly round: RoundState;
  readonly hp: PerPlayer;
  readonly maxHp: PerPlayer;
  readonly rng: RngState;
  readonly roundNumber: number;
  readonly winner: PlayerId | null;
  /** Hits caused by the most recent action (empty if it dealt no damage). */
  readonly hits: readonly Hit[];
  /** Increments whenever an action deals damage; lets the UI replay hit animations. */
  readonly hitSeq: number;
  /** The player's perks for this fight, in purchase order. */
  readonly perks: readonly PerkId[];
  /** Takes per side in the current round (reset on a new round). */
  readonly roundTakes: PerPlayer;
  /** Takes per side over the whole fight (used for rewards). */
  readonly fightTakes: PerPlayer;
};

export type FightAction = RoundAction | { readonly type: 'nextRound' };

export type FightError = DurakError | 'fightOver' | 'roundInProgress';

const NO_TAKES: PerPlayer = { player: 0, enemy: 0 };

export function createFight(config: FightConfig): FightState {
  const perks = config.perks ?? [];
  const [round, rng] = dealRound(createRng(config.seed), perkHandSizes(perks));
  const hp = { player: config.playerHp, enemy: config.enemyHp };
  return {
    round,
    hp,
    maxHp: hp,
    rng,
    roundNumber: 1,
    winner: null,
    hits: [],
    hitSeq: 0,
    perks,
    roundTakes: NO_TAKES,
    fightTakes: NO_TAKES,
  };
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
  const bout = newBout(state.round, result.value);
  return ok(bout ? chargeTake(next, bout, state.round.trumpSuit) : next);
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng, perkHandSizes(state.perks));
  return ok({ ...state, round, rng, roundNumber: state.roundNumber + 1, hits: [], roundTakes: NO_TAKES });
}

function newBout(previous: RoundState, next: RoundState): BoutResult | null {
  const bout = next.lastBout;
  return bout && bout !== previous.lastBout ? bout : null;
}

/** Only taking the table hurts; perks adjust the amount, and every take is counted even at 0 damage. */
function chargeTake(state: FightState, bout: BoutResult, trumpSuit: Suit): FightState {
  const taker = bout.damaged;
  const amount = perkTakeDamage(state.perks, {
    taker,
    attackCards: bout.attackCards,
    trumpSuit,
    takerTakesThisRound: state.roundTakes[taker],
  });
  const counted: FightState = {
    ...state,
    roundTakes: increment(state.roundTakes, taker),
    fightTakes: increment(state.fightTakes, taker),
  };
  return amount > 0 ? applyHit(counted, { target: taker, amount }) : counted;
}

function increment(counts: PerPlayer, id: PlayerId): PerPlayer {
  return id === 'player' ? { ...counts, player: counts.player + 1 } : { ...counts, enemy: counts.enemy + 1 };
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
