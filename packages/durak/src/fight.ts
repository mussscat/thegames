import { createRng, err, nextInt, ok, SUITS, type Card, type Result, type RngState, type Suit } from '@game/core';
import { dealRound } from './deal';
import { EMPTY_PROFILES, type EnhancementId, type Profiles } from './enhancements';
import { jokerHandSizes, type SideJokers } from './jokers/catalog';
import { scoreTake, type TakeScore, type TakenCard } from './jokers/score';
import { afterBeaten, afterHitDealt, afterOwnTake, afterRound, EMPTY_JOKER_STATE, type JokerState } from './jokers/state';
import { applyRoundAction } from './reducer';
import {
  opponentOf,
  type BossRule,
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
  readonly jokers?: Partial<SideJokers>;
  /** Tier multiplier of each side's hits (enemy 1/2/3 by tier). */
  readonly baseMult?: Partial<PerPlayer>;
  /** Коллекционер growth carried in from the run. */
  readonly collected?: number;
  readonly boss?: BossRule | null;
  readonly profiles?: Profiles;
};

export type ScoredHit = TakeScore & { readonly target: PlayerId };
export type SideJokerState = Readonly<Record<PlayerId, JokerState>>;

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
  /** Each side's jokers in slot order. */
  readonly jokers: SideJokers;
  readonly baseMult: PerPlayer;
  readonly jokerState: SideJokerState;
  /** The last scored take (score label now; animation in 3b). */
  readonly lastScore: ScoredHit | null;
  /** Takes per side in the current round (reset on a new round). */
  readonly roundTakes: PerPlayer;
  /** Takes per side over the whole fight (used for rewards). */
  readonly fightTakes: PerPlayer;
  /** The boss rule of this fight, if any. */
  readonly boss: BossRule | null;
  /** Coins earned by Монетная defenses. */
  readonly cardCoins: PerPlayer;
};

export type FightAction = RoundAction | { readonly type: 'nextRound' };

export type FightError = DurakError | 'fightOver' | 'roundInProgress';

const NO_TAKES: PerPlayer = { player: 0, enemy: 0 };

export function createFight(config: FightConfig): FightState {
  const jokers: SideJokers = { player: config.jokers?.player ?? [], enemy: config.jokers?.enemy ?? [] };
  const boss = config.boss ?? null;
  const [round, rng] = dealRound(createRng(config.seed), jokerHandSizes(jokers), boss, config.profiles ?? EMPTY_PROFILES);
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
    jokers,
    baseMult: { player: 1, enemy: 1, ...config.baseMult },
    jokerState: { player: { ...EMPTY_JOKER_STATE, collected: config.collected ?? 0 }, enemy: EMPTY_JOKER_STATE },
    lastScore: null,
    roundTakes: NO_TAKES,
    fightTakes: NO_TAKES,
    boss,
    cardCoins: NO_TAKES,
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
  const charged = bout ? chargeTake(next, bout, state.round) : next;
  if (!endedBeaten(state.round, result.value)) return ok(charged);
  const credited = creditBeatenDefenses(charged, state.round);
  const roundGoesOn = result.value.outcome === null;
  return ok(state.boss === 'shuffler' && roundGoesOn ? shuffleTrump(credited) : credited);
}

/** A bout that ended in «Бито»: the table was cleared and no take was recorded (a take always sets lastBout). */
function endedBeaten(previous: RoundState, next: RoundState): boolean {
  return previous.table.length > 0 && next.table.length === 0 && next.lastBout === null;
}

/** Фокусник: the trump moves to a random different suit, drawn from the fight RNG. */
function shuffleTrump(state: FightState): FightState {
  const others = SUITS.filter((suit) => suit !== state.round.trumpSuit);
  const [index, rng] = nextInt(state.rng, others.length);
  return { ...state, rng, round: { ...state.round, trumpSuit: others[index] as Suit } };
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng, jokerHandSizes(state.jokers), state.boss, state.round.profiles);
  const jokerState: SideJokerState = {
    player: afterRound(state.jokerState.player, state.jokers.player, state.roundTakes.player > 0),
    enemy: afterRound(state.jokerState.enemy, state.jokers.enemy, state.roundTakes.enemy > 0),
  };
  return ok({ ...state, round, rng, jokerState, roundNumber: state.roundNumber + 1, hits: [], roundTakes: NO_TAKES });
}

function newBout(previous: RoundState, next: RoundState): BoutResult | null {
  const bout = next.lastBout;
  return bout && bout !== previous.lastBout ? bout : null;
}

/** The face-up top card, shown only while more than the trump is left (same rule as the deck view). */
function topCardOf(round: RoundState): Card | null {
  return round.deck.length > 1 ? (round.deck[0] ?? null) : null;
}

function withSide<T>(record: Readonly<Record<PlayerId, T>>, id: PlayerId, value: T): Readonly<Record<PlayerId, T>> {
  return id === 'player' ? { ...record, player: value } : { ...record, enemy: value };
}

/** Only taking the table hurts: the attacker's jokers score the take, the taker's defensive jokers apply last. */
function chargeTake(state: FightState, bout: BoutResult, before: RoundState): FightState {
  const taker = bout.damaged;
  const attacker = opponentOf(taker);
  const taken: readonly TakenCard[] = bout.attackCards.map((card, i) => ({ card, enhancement: bout.takenEnhancements[i] ?? null }));
  const score = scoreTake({
    taken,
    trumpSuit: before.trumpSuit,
    boss: state.boss,
    topCard: topCardOf(before),
    takerPriorTakes: state.fightTakes[taker],
    baseMult: state.baseMult[attacker],
    attacker: { jokers: state.jokers[attacker], state: state.jokerState[attacker] },
    defender: { jokers: state.jokers[taker], state: state.jokerState[taker] },
  });
  const afterAttacker = withSide(state.jokerState, attacker, afterHitDealt(state.jokerState[attacker], state.jokers[attacker], taken));
  const counted: FightState = {
    ...state,
    jokerState: withSide(afterAttacker, taker, afterOwnTake(afterAttacker[taker])),
    lastScore: { ...score, target: taker },
    roundTakes: increment(state.roundTakes, taker),
    fightTakes: increment(state.fightTakes, taker),
  };
  return score.damage > 0 ? applyHit(counted, { target: taker, amount: score.damage }) : counted;
}

/** «Отбился ею» pays only when the bout really ends in «Бито»: covering and then taking earns nothing. */
function creditBeatenDefenses(state: FightState, beatenRound: RoundState): FightState {
  const defender = opponentOf(beatenRound.attacker);
  const charged: FightState = {
    ...state,
    jokerState: withSide(state.jokerState, defender, afterBeaten(state.jokerState[defender], state.jokers[defender])),
  };
  return beatenRound.table.reduce<FightState>(
    (current, pair) => (pair.defenseEnh ? creditDefense(current, defender, pair.defenseEnh) : current),
    charged,
  );
}

function creditDefense(state: FightState, defender: PlayerId, enhancement: EnhancementId): FightState {
  if (enhancement === 'coin') return { ...state, cardCoins: increment(state.cardCoins, defender) };
  return state;
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
