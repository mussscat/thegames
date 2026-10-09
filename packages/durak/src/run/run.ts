import { createRng, err, nextInt, ok, shuffle, type Result, type RngState } from '@game/core';
import { BOSSES } from '../content/bosses';
import { RUN_SCHEDULE, TIER_MULT, type EnemySpec } from '../content/enemies';
import { applyFightAction, createFight, type FightAction, type FightError, type FightState } from '../fight';
import type { DeckProfile } from '../enhancements';
import type { JokerId } from '../jokers/catalog';
import { BOSS_RULES, type BossRule, type PlayerId } from '../types';
import { fightReward, type FightReward } from './economy';
import {
  buyItem,
  buyPack,
  castShopTarot,
  createShop,
  moveJoker,
  pickFromPack,
  rerollShop,
  sellJoker,
  skipPack,
  skipTarot,
  type Purse,
  type ShopError,
  type ShopState,
  type ShopStep,
  type Wallet,
} from './shop';

export const PLAYER_HP = 40;
export const FIGHTS_PER_CIRCLE = 3;
const FIGHT_SEED_RANGE = 0x100000000;
const CIRCLES = RUN_SCHEDULE.length / FIGHTS_PER_CIRCLE;

export type RunPhase =
  | { readonly kind: 'fight'; readonly fight: FightState }
  | { readonly kind: 'shop'; readonly shop: ShopState; readonly reward: FightReward }
  | { readonly kind: 'over'; readonly won: boolean };

export type RunState = {
  readonly seed: number;
  readonly rng: RngState;
  /** Index into RUN_SCHEDULE of the current (or just finished) fight. */
  readonly stage: number;
  readonly coins: number;
  readonly jokers: readonly JokerId[];
  /** Коллекционер growth over the whole run. */
  readonly collected: number;
  /** The player's version of the shared deck. */
  readonly profile: DeckProfile;
  /** One boss rule per circle, all different. */
  readonly bosses: readonly BossRule[];
  readonly phase: RunPhase;
};

export type RunAction =
  | { readonly type: 'fight'; readonly actor: PlayerId; readonly action: FightAction }
  | { readonly type: 'leaveFight' }
  | { readonly type: 'buyItem'; readonly index: number }
  | { readonly type: 'buyPack'; readonly index: number }
  | { readonly type: 'pickFromPack'; readonly index: number; readonly targets: readonly string[] }
  | { readonly type: 'skipPack' }
  | { readonly type: 'castTarot'; readonly targets: readonly string[] }
  | { readonly type: 'skipTarot' }
  | { readonly type: 'sellJoker'; readonly jokerId: JokerId }
  | { readonly type: 'moveJoker'; readonly from: number; readonly to: number }
  | { readonly type: 'reroll' }
  | { readonly type: 'leaveShop' };

export type RunError = FightError | ShopError | 'wrongPhase' | 'fightNotOver';

type RunResult = Result<RunState, RunError>;
type ShopPhase = Extract<RunPhase, { kind: 'shop' }>;

export function enemyAt(stage: number): EnemySpec {
  const enemy = RUN_SCHEDULE[stage];
  if (!enemy) throw new RangeError(`No enemy scheduled at stage ${stage}`);
  return enemy;
}

export function stageLabel(stage: number): { readonly circle: number; readonly fight: number } {
  return { circle: Math.floor(stage / FIGHTS_PER_CIRCLE) + 1, fight: (stage % FIGHTS_PER_CIRCLE) + 1 };
}

export function createRun(seed: number): RunState {
  const start = createRng(seed);
  const [order, rng] = shuffle(BOSS_RULES, start);
  const bosses = order.slice(0, CIRCLES);
  return startFight({ seed: start.seed, rng, stage: 0, coins: 0, jokers: [], collected: 0, profile: {}, bosses, phase: { kind: 'over', won: false } });
}

export type StageEnemy = EnemySpec & { readonly boss: BossRule | null };

export function stageEnemy(run: RunState, stage: number): StageEnemy {
  const spec = enemyAt(stage);
  if (spec.tier !== 'boss') return { ...spec, boss: null };
  const boss = run.bosses[stageLabel(stage).circle - 1] ?? null;
  return { ...spec, name: boss ? BOSSES[boss].name : spec.name, boss };
}

export function applyRunAction(state: RunState, action: RunAction): RunResult {
  switch (action.type) {
    case 'fight':
      return fightAction(state, action.actor, action.action);
    case 'leaveFight':
      return leaveFight(state);
    case 'buyItem':
      return inShop(state, (phase) => withStep(state, phase, buyItem(phase.shop, purse(state), action.index)));
    case 'buyPack':
      return inShop(state, (phase) => withStep(state, phase, buyPack(phase.shop, purse(state), action.index)));
    case 'pickFromPack':
      return inShop(state, (phase) => withStep(state, phase, pickFromPack(phase.shop, purse(state), action.index, action.targets)));
    case 'skipPack':
      return inShop(state, (phase) => {
        const result = skipPack(phase.shop);
        return result.ok ? ok({ ...state, phase: { ...phase, shop: result.value } }) : result;
      });
    case 'castTarot':
      return inShop(state, (phase) => withStep(state, phase, castShopTarot(phase.shop, purse(state), action.targets)));
    case 'skipTarot':
      return inShop(state, (phase) => {
        const result = skipTarot(phase.shop);
        return result.ok ? ok({ ...state, phase: { ...phase, shop: result.value } }) : result;
      });
    case 'reroll':
      return inShop(state, (phase) => withStep(state, phase, rerollShop(phase.shop, purse(state))));
    case 'leaveShop':
      return inShop(state, (phase) => {
        if (phase.shop.opened) return err('packOpen');
        if (phase.shop.casting) return err('tarotPending');
        return ok(startFight({ ...state, stage: state.stage + 1 }));
      });
    case 'sellJoker':
      return inShop(state, () => {
        const result = sellJoker(wallet(state), action.jokerId);
        return result.ok ? ok({ ...state, ...result.value }) : result;
      });
    case 'moveJoker':
      return reorderJokers(state, action.from, action.to);
  }
}

function purse(state: RunState): Purse {
  return { coins: state.coins, jokers: state.jokers, profile: state.profile, rng: state.rng };
}

function withStep(state: RunState, phase: ShopPhase, result: Result<ShopStep, ShopError>): RunResult {
  if (!result.ok) return result;
  const { shop, purse: changed } = result.value;
  return ok({ ...state, ...changed, phase: { ...phase, shop } });
}

function wallet(state: RunState): Wallet {
  return { coins: state.coins, jokers: state.jokers };
}

function inShop(state: RunState, run: (phase: ShopPhase) => RunResult): RunResult {
  return state.phase.kind === 'shop' ? run(state.phase) : err('wrongPhase');
}

function startFight(state: RunState): RunState {
  const [fightSeed, rng] = nextInt(state.rng, FIGHT_SEED_RANGE);
  const spec = enemyAt(state.stage);
  const fight = createFight({
    seed: fightSeed,
    playerHp: PLAYER_HP,
    enemyHp: spec.hp,
    jokers: { player: state.jokers, enemy: spec.jokers },
    baseMult: { enemy: TIER_MULT[spec.tier] },
    collected: state.collected,
    boss: stageEnemy(state, state.stage).boss,
    profiles: { player: state.profile, enemy: spec.profile },
  });
  return { ...state, rng, phase: { kind: 'fight', fight } };
}

function fightAction(state: RunState, actor: PlayerId, action: FightAction): RunResult {
  if (state.phase.kind !== 'fight') return err('wrongPhase');
  const result = applyFightAction(state.phase.fight, actor, action);
  return result.ok ? ok({ ...state, phase: { kind: 'fight', fight: result.value } }) : result;
}

function leaveFight(state: RunState): RunResult {
  if (state.phase.kind !== 'fight') return err('wrongPhase');
  const { fight } = state.phase;
  if (!fight.winner) return err('fightNotOver');
  const collected = fight.jokerState.player.collected;
  if (fight.winner === 'enemy') return ok({ ...state, collected, phase: { kind: 'over', won: false } });
  const reward = fightReward({
    tier: enemyAt(state.stage).tier,
    playerHp: fight.hp.player,
    playerMaxHp: fight.maxHp.player,
    coinsBefore: state.coins,
    jokers: state.jokers,
    enemyTakes: fight.fightTakes.enemy,
    cardCoins: fight.cardCoins.player,
  });
  const coins = state.coins + reward.total;
  if (state.stage >= RUN_SCHEDULE.length - 1) return ok({ ...state, coins, collected, phase: { kind: 'over', won: true } });
  const [shop, rng] = createShop(state.rng, state.jokers, state.profile);
  return ok({ ...state, coins, collected, rng, phase: { kind: 'shop', shop, reward } });
}

function reorderJokers(state: RunState, from: number, to: number): RunResult {
  if (state.phase.kind === 'over') return err('wrongPhase');
  const result = moveJoker(state.jokers, from, to);
  if (!result.ok) return result;
  const jokers = result.value;
  if (state.phase.kind !== 'fight') return ok({ ...state, jokers });
  const fight = { ...state.phase.fight, jokers: { ...state.phase.fight.jokers, player: jokers } };
  return ok({ ...state, jokers, phase: { kind: 'fight', fight } });
}
