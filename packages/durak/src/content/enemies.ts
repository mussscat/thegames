import type { AiStyle } from '../ai';
import type { DeckProfile } from '../enhancements';
import type { EnemyTier } from '../run/economy';

export type EnemySpec = {
  readonly name: string;
  readonly tier: EnemyTier;
  readonly hp: number;
  readonly style: AiStyle;
  /** The enemy's version of the shared deck. */
  readonly profile: DeckProfile;
};

/** 2 circles × (normal → strong → boss). Boss rules arrive in Plan 2b; for now bosses are just tougher. */
export const RUN_SCHEDULE: readonly EnemySpec[] = [
  { name: 'Скупой', tier: 'normal', hp: 6, style: 'stingy', profile: { 'diamonds-14': 'sturdy' } },
  { name: 'Задира', tier: 'strong', hp: 8, style: 'aggressive', profile: { 'clubs-13': 'golden', 'spades-12': 'sharp' } },
  {
    name: 'Босс круга 1',
    tier: 'boss',
    hp: 10,
    style: 'aggressive',
    profile: { 'hearts-14': 'golden', 'spades-14': 'sharp', 'clubs-11': 'heavy' },
  },
  {
    name: 'Скряга',
    tier: 'normal',
    hp: 8,
    style: 'stingy',
    profile: { 'diamonds-13': 'coin', 'hearts-12': 'sturdy', 'clubs-10': 'sharp' },
  },
  {
    name: 'Громила',
    tier: 'strong',
    hp: 10,
    style: 'aggressive',
    profile: { 'spades-13': 'golden', 'spades-11': 'golden', 'diamonds-12': 'sharp', 'hearts-10': 'heavy' },
  },
  {
    name: 'Босс круга 2',
    tier: 'boss',
    hp: 12,
    style: 'aggressive',
    profile: { 'hearts-13': 'golden', 'diamonds-14': 'sharp', 'clubs-14': 'sharp', 'spades-10': 'heavy', 'hearts-11': 'sturdy' },
  },
];
