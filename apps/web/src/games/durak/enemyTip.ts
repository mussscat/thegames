import { BOSSES, JOKERS, TIER_MULT, type BossRule, type EnemyTier, type JokerId } from '@game/durak';
import type { TipLine } from '../../components/tipLines';

/** The part of `StageEnemy` the tip reads. */
export type EnemyView = { readonly name: string; readonly tier: EnemyTier; readonly boss: BossRule | null; readonly jokers: readonly JokerId[] };

const TIER_LABELS: Readonly<Record<EnemyTier, string>> = { normal: 'соперник', strong: 'сильный соперник', boss: 'босс' };

/** What the enemy badge tells: who it is, what makes it dangerous, its jokers. The badge itself shows no counters. */
export function enemyTipLines(enemy: EnemyView): readonly TipLine[] {
  const mult = TIER_MULT[enemy.tier];
  const head: TipLine = {
    name: enemy.name,
    owner: TIER_LABELS[enemy.tier],
    description: enemy.boss ? BOSSES[enemy.boss].description : mult > 1 ? `Бьёт сильнее: урон ×${mult}` : 'Без особенностей',
  };
  const multLine: readonly TipLine[] = enemy.boss && mult > 1 ? [{ name: `Урон ×${mult}`, owner: null, description: 'Удары босса по тебе умножаются' }] : [];
  const jokers = enemy.jokers.map((id): TipLine => ({ name: JOKERS[id].name, owner: 'джокер', description: JOKERS[id].description }));
  return [head, ...multLine, ...jokers];
}
