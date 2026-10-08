import { describe, expect, it } from 'vitest';
import { c } from './fixtures';
import {
  PERK_IDS,
  PERKS,
  perkFightCoins,
  perkHandSizes,
  perkInterestCap,
  perkTakeDamage,
  revealsTopCard,
  type TakeContext,
} from './perks';

const enemyTakes: TakeContext = {
  taker: 'enemy',
  attackCards: [c(7, 'clubs'), c(7, 'hearts')],
  trumpSuit: 'hearts',
  boss: null,
  takerTakesThisRound: 0,
};
const playerTakes: TakeContext = { ...enemyTakes, taker: 'player' };

describe('perk catalogue', () => {
  it('defines all 8 perks with a Russian name, description and positive price', () => {
    expect(PERK_IDS).toHaveLength(8);
    for (const id of PERK_IDS) {
      expect(PERKS[id].id).toBe(id);
      expect(PERKS[id].name.length).toBeGreaterThan(0);
      expect(PERKS[id].description.length).toBeGreaterThan(0);
      expect(PERKS[id].price).toBeGreaterThan(0);
    }
  });
});

describe('perkTakeDamage', () => {
  it('is the number of attack cards without perks', () => {
    expect(perkTakeDamage([], enemyTakes)).toBe(2);
  });
  it('Подкидной мастер adds 1 when the enemy takes, not when the player takes', () => {
    expect(perkTakeDamage(['throwMaster'], enemyTakes)).toBe(3);
    expect(perkTakeDamage(['throwMaster'], playerTakes)).toBe(2);
  });
  it('Толстая кожа softens only the first player take of the round', () => {
    expect(perkTakeDamage(['thickSkin'], playerTakes)).toBe(1);
    expect(perkTakeDamage(['thickSkin'], { ...playerTakes, takerTakesThisRound: 1 })).toBe(2);
    expect(perkTakeDamage(['thickSkin'], enemyTakes)).toBe(2);
  });
  it('Козырной adds 1 per trump attack card taken by the enemy', () => {
    expect(perkTakeDamage(['trumpLover'], enemyTakes)).toBe(3);
    expect(perkTakeDamage(['trumpLover'], playerTakes)).toBe(2);
  });
  it('Козырной counts the Witch queens as trumps', () => {
    const witchTake = { ...enemyTakes, attackCards: [c(12, 'clubs')], boss: 'witch' as const };
    expect(perkTakeDamage(['trumpLover'], witchTake)).toBe(2);
  });
  it('never goes below zero', () => {
    expect(perkTakeDamage(['thickSkin'], { ...playerTakes, attackCards: [] })).toBe(0);
  });
  it('stacks perks', () => {
    expect(perkTakeDamage(['throwMaster', 'trumpLover'], enemyTakes)).toBe(4);
  });
});

describe('other hooks', () => {
  it('Длинные руки gives the player a 7-card hand', () => {
    expect(perkHandSizes([])).toEqual({ player: 6, enemy: 6 });
    expect(perkHandSizes(['longArms'])).toEqual({ player: 7, enemy: 6 });
  });
  it('Копилка raises the interest cap by 3', () => {
    expect(perkInterestCap([], 5)).toBe(5);
    expect(perkInterestCap(['piggyBank'], 5)).toBe(8);
  });
  it('Мародёр pays per enemy take, Чистюля pays 3 for a clean fight', () => {
    expect(perkFightCoins([], { playerTakes: 0, enemyTakes: 4 })).toBe(0);
    expect(perkFightCoins(['looter'], { playerTakes: 2, enemyTakes: 4 })).toBe(4);
    expect(perkFightCoins(['cleanHands'], { playerTakes: 0, enemyTakes: 4 })).toBe(3);
    expect(perkFightCoins(['cleanHands'], { playerTakes: 1, enemyTakes: 4 })).toBe(0);
  });
  it('Шулер reveals the top card', () => {
    expect(revealsTopCard([])).toBe(false);
    expect(revealsTopCard(['cardSharp'])).toBe(true);
  });
});
