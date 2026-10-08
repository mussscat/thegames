import { createRng, err, nextInt, ok, shuffle, type Result, type RngState } from '@game/core';
import { BOSSES } from '../content/bosses';
import { RUN_SCHEDULE, type EnemySpec } from '../content/enemies';
import { applyFightAction, createFight, type FightAction, type FightError, type FightState } from '../fight';
import type { PerkId } from '../perks';
import { BOSS_RULES, type BossRule, type PlayerId } from '../types';
import { fightReward, type FightReward } from './economy';
import { buyPerk, createShop, rerollShop, sellPerk, type ShopError, type ShopState, type Wallet } from './shop';

export const PLAYER_HP = 10;
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
  readonly perks: readonly PerkId[];
  /** One boss rule per circle, all different. */
  readonly bosses: readonly BossRule[];
  readonly phase: RunPhase;
};

export type RunAction =
  | { readonly type: 'fight'; readonly actor: PlayerId; readonly action: FightAction }
  | { readonly type: 'leaveFight' }
  | { readonly type: 'buyPerk'; readonly index: number }
  | { readonly type: 'sellPerk'; readonly perkId: PerkId }
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
  return startFight({ seed: start.seed, rng, stage: 0, coins: 0, perks: [], bosses, phase: { kind: 'over', won: false } });
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
    case 'buyPerk':
      return inShop(state, (phase) => {
        const result = buyPerk(phase.shop, wallet(state), action.index);
        if (!result.ok) return result;
        return ok({ ...state, ...result.value.wallet, phase: { ...phase, shop: result.value.shop } });
      });
    case 'sellPerk':
      return inShop(state, () => {
        const result = sellPerk(wallet(state), action.perkId);
        return result.ok ? ok({ ...state, ...result.value }) : result;
      });
    case 'reroll':
      return inShop(state, (phase) => {
        const result = rerollShop(phase.shop, wallet(state), state.rng);
        if (!result.ok) return result;
        const { shop, wallet: paid, rng } = result.value;
        return ok({ ...state, ...paid, rng, phase: { ...phase, shop } });
      });
    case 'leaveShop':
      return inShop(state, () => ok(startFight({ ...state, stage: state.stage + 1 })));
  }
}

function wallet(state: RunState): Wallet {
  return { coins: state.coins, perks: state.perks };
}

function inShop(state: RunState, run: (phase: ShopPhase) => RunResult): RunResult {
  return state.phase.kind === 'shop' ? run(state.phase) : err('wrongPhase');
}

function startFight(state: RunState): RunState {
  const [fightSeed, rng] = nextInt(state.rng, FIGHT_SEED_RANGE);
  const fight = createFight({
    seed: fightSeed,
    playerHp: PLAYER_HP,
    enemyHp: enemyAt(state.stage).hp,
    perks: state.perks,
    boss: stageEnemy(state, state.stage).boss,
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
  if (fight.winner === 'enemy') return ok({ ...state, phase: { kind: 'over', won: false } });
  const reward = fightReward({
    tier: enemyAt(state.stage).tier,
    playerHp: fight.hp.player,
    coinsBefore: state.coins,
    perks: state.perks,
    playerTakes: fight.fightTakes.player,
    enemyTakes: fight.fightTakes.enemy,
    cardCoins: fight.cardCoins.player,
  });
  const coins = state.coins + reward.total;
  if (state.stage >= RUN_SCHEDULE.length - 1) return ok({ ...state, coins, phase: { kind: 'over', won: true } });
  const [shop, rng] = createShop(state.rng, state.perks);
  return ok({ ...state, coins, rng, phase: { kind: 'shop', shop, reward } });
}
