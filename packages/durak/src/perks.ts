import type { Card, Suit } from '@game/core';
import { isTrumpCard } from './rules';
import { DEFAULT_HAND_SIZES, type BossRule, type HandSizes, type PlayerId } from './types';

export const PERK_IDS = [
  'throwMaster',
  'thickSkin',
  'longArms',
  'cardSharp',
  'looter',
  'piggyBank',
  'trumpLover',
  'cleanHands',
] as const;

export type PerkId = (typeof PERK_IDS)[number];

/** A take about to be charged; `takerTakesThisRound` counts earlier takes by the same side in this round. */
export type TakeContext = {
  readonly taker: PlayerId;
  readonly attackCards: readonly Card[];
  readonly trumpSuit: Suit;
  readonly boss: BossRule | null;
  readonly takerTakesThisRound: number;
};

export type FightSummary = { readonly playerTakes: number; readonly enemyTakes: number };

/** Each hook transforms a value; the player's perks apply in the order they were bought. */
export type PerkHooks = {
  readonly takeDamage?: (damage: number, ctx: TakeContext) => number;
  readonly handSizes?: (sizes: HandSizes) => HandSizes;
  readonly interestCap?: (cap: number) => number;
  readonly fightCoins?: (coins: number, summary: FightSummary) => number;
  readonly revealsTopCard?: boolean;
};

export type PerkDef = {
  readonly id: PerkId;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly hooks: PerkHooks;
};

const THICK_SKIN_REDUCTION = 1;
const PIGGY_BANK_EXTRA_CAP = 3;
const CLEAN_HANDS_BONUS = 3;

export const PERKS: Readonly<Record<PerkId, PerkDef>> = {
  throwMaster: {
    id: 'throwMaster',
    name: 'Подкидной мастер',
    description: 'Каждый «Беру» соперника стоит ему +1 HP',
    price: 6,
    hooks: { takeDamage: (damage, ctx) => (ctx.taker === 'enemy' ? damage + 1 : damage) },
  },
  thickSkin: {
    id: 'thickSkin',
    name: 'Толстая кожа',
    description: 'Твой первый «Беру» в каждой раздаче стоит на 1 HP меньше',
    price: 5,
    hooks: {
      takeDamage: (damage, ctx) =>
        ctx.taker === 'player' && ctx.takerTakesThisRound === 0 ? damage - THICK_SKIN_REDUCTION : damage,
    },
  },
  longArms: {
    id: 'longArms',
    name: 'Длинные руки',
    description: 'Добираешь до 7 карт',
    price: 7,
    hooks: { handSizes: (sizes) => ({ ...sizes, player: sizes.player + 1 }) },
  },
  cardSharp: {
    id: 'cardSharp',
    name: 'Шулер',
    description: 'Верхняя карта колоды открыта',
    price: 4,
    hooks: { revealsTopCard: true },
  },
  looter: {
    id: 'looter',
    name: 'Мародёр',
    description: '+1 монета каждый раз, когда соперник берёт',
    price: 5,
    hooks: { fightCoins: (coins, summary) => coins + summary.enemyTakes },
  },
  piggyBank: {
    id: 'piggyBank',
    name: 'Копилка',
    description: 'Предел процентов +3 (до 8 монет)',
    price: 4,
    hooks: { interestCap: (cap) => cap + PIGGY_BANK_EXTRA_CAP },
  },
  trumpLover: {
    id: 'trumpLover',
    name: 'Козырной',
    description: 'Твои козыри, взятые соперником, стоят ему +1 HP каждый',
    price: 6,
    hooks: {
      takeDamage: (damage, ctx) =>
        ctx.taker === 'enemy' ? damage + ctx.attackCards.filter((card) => isTrumpCard(card, ctx.trumpSuit, ctx.boss)).length : damage,
    },
  },
  cleanHands: {
    id: 'cleanHands',
    name: 'Чистюля',
    description: '+3 монеты за бой, в котором ты ни разу не взял',
    price: 5,
    hooks: { fightCoins: (coins, summary) => (summary.playerTakes === 0 ? coins + CLEAN_HANDS_BONUS : coins) },
  },
};

export function perkTakeDamage(perks: readonly PerkId[], ctx: TakeContext): number {
  const damage = perks.reduce((total, id) => PERKS[id].hooks.takeDamage?.(total, ctx) ?? total, ctx.attackCards.length);
  return Math.max(0, damage);
}

export function perkHandSizes(perks: readonly PerkId[]): HandSizes {
  return perks.reduce((sizes, id) => PERKS[id].hooks.handSizes?.(sizes) ?? sizes, DEFAULT_HAND_SIZES);
}

export function perkInterestCap(perks: readonly PerkId[], baseCap: number): number {
  return perks.reduce((cap, id) => PERKS[id].hooks.interestCap?.(cap) ?? cap, baseCap);
}

export function perkFightCoins(perks: readonly PerkId[], summary: FightSummary): number {
  return perks.reduce((coins, id) => PERKS[id].hooks.fightCoins?.(coins, summary) ?? coins, 0);
}

export function revealsTopCard(perks: readonly PerkId[]): boolean {
  return perks.some((id) => PERKS[id].hooks.revealsTopCard === true);
}
