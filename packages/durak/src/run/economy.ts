import { perkFightCoins, perkInterestCap, type PerkId } from '../perks';

export type EnemyTier = 'normal' | 'strong' | 'boss';

export const FIGHT_BASE_COINS: Readonly<Record<EnemyTier, number>> = { normal: 3, strong: 4, boss: 5 };
export const HP_PER_BONUS_COIN = 2;
export const COINS_PER_INTEREST = 5;
export const BASE_INTEREST_CAP = 5;

export type FightReward = {
  readonly base: number;
  readonly hpBonus: number;
  readonly interest: number;
  readonly perkBonus: number;
  readonly total: number;
};

export type RewardInput = {
  readonly tier: EnemyTier;
  readonly playerHp: number;
  /** Coins held before this reward; interest is paid on them (like Balatro). */
  readonly coinsBefore: number;
  readonly perks: readonly PerkId[];
  readonly playerTakes: number;
  readonly enemyTakes: number;
};

export function fightReward(input: RewardInput): FightReward {
  const base = FIGHT_BASE_COINS[input.tier];
  const hpBonus = Math.floor(Math.max(0, input.playerHp) / HP_PER_BONUS_COIN);
  const cap = perkInterestCap(input.perks, BASE_INTEREST_CAP);
  const interest = Math.min(Math.floor(Math.max(0, input.coinsBefore) / COINS_PER_INTEREST), cap);
  const perkBonus = perkFightCoins(input.perks, { playerTakes: input.playerTakes, enemyTakes: input.enemyTakes });
  return { base, hpBonus, interest, perkBonus, total: base + hpBonus + interest + perkBonus };
}
