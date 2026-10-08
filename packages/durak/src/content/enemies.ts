import type { AiStyle } from '../ai';
import type { DeckProfile } from '../enhancements';
import type { JokerId } from '../jokers/catalog';
import type { EnemyTier } from '../run/economy';

export type EnemySpec = {
  readonly name: string;
  readonly tier: EnemyTier;
  readonly hp: number;
  readonly style: AiStyle;
  /** The enemy's version of the shared deck. */
  readonly profile: DeckProfile;
  /** The enemy's jokers (strong 1, boss 2), scoring the player's takes. */
  readonly jokers: readonly JokerId[];
};

/** Multiplier of the enemy's hits on the player, by tier. */
export const TIER_MULT: Readonly<Record<EnemyTier, number>> = { normal: 1, strong: 1.25, boss: 1.5 };

/** 2 circles × (normal → strong → boss). HP is tuned by the balance simulation. */
export const RUN_SCHEDULE: readonly EnemySpec[] = [
  { name: 'Скупой', tier: 'normal', hp: 30, style: 'stingy', profile: { 'diamonds-6': 'trump' }, jokers: [] },
  { name: 'Задира', tier: 'strong', hp: 40, style: 'aggressive', profile: { 'clubs-13': 'golden', 'spades-12': 'sharp' }, jokers: ['clubs'] },
  {
    name: 'Босс круга 1',
    tier: 'boss',
    hp: 45,
    style: 'aggressive',
    profile: { 'hearts-14': 'golden', 'spades-14': 'sharp', 'clubs-11': 'heavy' },
    jokers: ['small', 'hearts'],
  },
  {
    name: 'Скряга',
    tier: 'normal',
    hp: 120,
    style: 'stingy',
    profile: { 'diamonds-13': 'coin', 'spades-7': 'trump', 'clubs-10': 'sharp' },
    jokers: [],
  },
  {
    name: 'Громила',
    tier: 'strong',
    hp: 180,
    style: 'aggressive',
    profile: { 'spades-13': 'golden', 'spades-11': 'golden', 'diamonds-12': 'sharp', 'hearts-10': 'heavy' },
    jokers: ['rage'],
  },
  {
    name: 'Босс круга 2',
    tier: 'boss',
    hp: 300,
    style: 'aggressive',
    profile: { 'hearts-13': 'golden', 'diamonds-14': 'sharp', 'clubs-14': 'sharp', 'spades-10': 'heavy', 'clubs-8': 'trump' },
    jokers: ['gloat', 'usurer'],
  },
];
