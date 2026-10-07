import type { AiStyle } from '../ai';
import type { EnemyTier } from '../run/economy';

export type EnemySpec = {
  readonly name: string;
  readonly tier: EnemyTier;
  readonly hp: number;
  readonly style: AiStyle;
};

/** 2 circles × (normal → strong → boss). Boss rules arrive in Plan 2b; for now bosses are just tougher. */
export const RUN_SCHEDULE: readonly EnemySpec[] = [
  { name: 'Скупой', tier: 'normal', hp: 6, style: 'stingy' },
  { name: 'Задира', tier: 'strong', hp: 8, style: 'aggressive' },
  { name: 'Ведьма', tier: 'boss', hp: 10, style: 'aggressive' },
  { name: 'Скряга', tier: 'normal', hp: 8, style: 'stingy' },
  { name: 'Громила', tier: 'strong', hp: 10, style: 'aggressive' },
  { name: 'Генерал', tier: 'boss', hp: 12, style: 'aggressive' },
];
