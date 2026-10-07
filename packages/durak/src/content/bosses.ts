import type { BossRule } from '../types';

export type BossDef = { readonly name: string; readonly description: string };

export const BOSSES: Readonly<Record<BossRule, BossDef>> = {
  witch: { name: 'Ведьма', description: 'Все дамы — козыри' },
  general: { name: 'Генерал', description: 'Отбиться можно только картой на 2+ ранга старше' },
  shuffler: { name: 'Фокусник', description: 'Козырь меняется после каждого «Бито»' },
};
