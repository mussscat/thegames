import { jokerFightCoins, jokerInterestCap, type JokerId } from '../jokers/catalog';

export type EnemyTier = 'normal' | 'strong' | 'boss';

export const FIGHT_BASE_COINS: Readonly<Record<EnemyTier, number>> = { normal: 3, strong: 4, boss: 5 };
/** Coins for finishing a fight at full HP; less in proportion to HP lost. */
export const HP_BONUS_MAX = 5;
export const COINS_PER_INTEREST = 5;
export const BASE_INTEREST_CAP = 5;

export type FightReward = {
  readonly base: number;
  readonly hpBonus: number;
  readonly interest: number;
  readonly jokerBonus: number;
  readonly cardBonus: number;
  readonly total: number;
};

export type RewardInput = {
  readonly tier: EnemyTier;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  /** Coins held before this reward; interest is paid on them (like Balatro). */
  readonly coinsBefore: number;
  readonly jokers: readonly JokerId[];
  readonly enemyTakes: number;
  /** Coins earned by Монетная defenses during the fight. */
  readonly cardCoins: number;
};

export function fightReward(input: RewardInput): FightReward {
  const base = FIGHT_BASE_COINS[input.tier];
  const share = input.playerMaxHp > 0 ? Math.max(0, input.playerHp) / input.playerMaxHp : 0;
  const hpBonus = Math.floor(HP_BONUS_MAX * share);
  const cap = jokerInterestCap(input.jokers, BASE_INTEREST_CAP);
  const interest = Math.min(Math.floor(Math.max(0, input.coinsBefore) / COINS_PER_INTEREST), cap);
  const jokerBonus = jokerFightCoins(input.jokers, input.enemyTakes);
  const cardBonus = Math.max(0, input.cardCoins);
  return { base, hpBonus, interest, jokerBonus, cardBonus, total: base + hpBonus + interest + jokerBonus + cardBonus };
}
