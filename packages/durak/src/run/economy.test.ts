import { describe, expect, it } from 'vitest';
import { fightReward, type RewardInput } from './economy';

const input: RewardInput = { tier: 'normal', playerHp: 10, coinsBefore: 0, perks: [], playerTakes: 1, enemyTakes: 3, cardCoins: 0 };

describe('fightReward', () => {
  it('pays base + 1 per 2 HP left', () => {
    expect(fightReward(input)).toEqual({ base: 3, hpBonus: 5, interest: 0, perkBonus: 0, cardBonus: 0, total: 8 });
  });

  it('pays more for stronger enemies and rounds HP bonus down', () => {
    expect(fightReward({ ...input, tier: 'strong', playerHp: 7 }).total).toBe(4 + 3);
    expect(fightReward({ ...input, tier: 'boss', playerHp: 1 }).total).toBe(5 + 0);
  });

  it('pays 1 interest per 5 coins held before the reward, capped at 5', () => {
    expect(fightReward({ ...input, coinsBefore: 23 }).interest).toBe(4);
    expect(fightReward({ ...input, coinsBefore: 40 }).interest).toBe(5);
  });

  it('Копилка lifts the interest cap to 8', () => {
    expect(fightReward({ ...input, coinsBefore: 40, perks: ['piggyBank'] }).interest).toBe(8);
  });

  it('adds perk coins', () => {
    expect(fightReward({ ...input, perks: ['looter'] }).perkBonus).toBe(3);
    expect(fightReward({ ...input, perks: ['cleanHands'], playerTakes: 0 }).perkBonus).toBe(3);
    expect(fightReward({ ...input, perks: ['cleanHands'] }).perkBonus).toBe(0);
  });

  it('never pays negative amounts for broken inputs', () => {
    const reward = fightReward({ ...input, playerHp: -3, coinsBefore: -10 });
    expect(reward.hpBonus).toBe(0);
    expect(reward.interest).toBe(0);
  });
  it('pays Монетная coins earned in the fight', () => {
    const reward = fightReward({ ...input, cardCoins: 2 });
    expect(reward.cardBonus).toBe(2);
    expect(reward.total).toBe(10);
  });
});
