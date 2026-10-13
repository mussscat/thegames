import { BOSSES, JOKERS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { enemyLine, enemyTipLines } from './enemyTip';

describe('enemyTipLines', () => {
  it('a plain enemy: only its name and tier', () => {
    expect(enemyTipLines({ name: 'Скупой', tier: 'normal', boss: null, jokers: [] })).toEqual([
      { name: 'Скупой', owner: 'соперник', description: 'Без особенностей' },
    ]);
  });

  it('a strong enemy: the hit multiplier and each joker with its rule', () => {
    const lines = enemyTipLines({ name: 'Задира', tier: 'strong', boss: null, jokers: ['clubs'] });
    expect(lines[0]).toEqual({ name: 'Задира', owner: 'сильный соперник', description: 'Бьёт сильнее: урон ×1.25' });
    expect(lines[1]).toEqual({ name: JOKERS.clubs.name, owner: 'джокер', description: JOKERS.clubs.description });
  });

  it('a boss: its rule comes first, then the multiplier', () => {
    const lines = enemyTipLines({ name: BOSSES.general.name, tier: 'boss', boss: 'general', jokers: [] });
    expect(lines[0]).toEqual({ name: BOSSES.general.name, owner: 'босс', description: BOSSES.general.description });
    expect(lines[1]).toEqual({ name: 'Урон ×1.5', owner: null, description: 'Удары босса по тебе умножаются' });
  });
});

describe('enemyLine', () => {
  it('a plain enemy: only its kind', () => {
    expect(enemyLine({ name: 'Скупой', tier: 'normal', boss: null, jokers: [] })).toEqual({ kind: 'Обычный соперник', rule: null });
  });

  it('a strong enemy: its hit multiplier too', () => {
    expect(enemyLine({ name: 'Задира', tier: 'strong', boss: null, jokers: ['clubs'] })).toEqual({ kind: 'Сильный соперник · урон ×1.25', rule: null });
  });

  it('a boss: the multiplier and its rule', () => {
    expect(enemyLine({ name: BOSSES.general.name, tier: 'boss', boss: 'general', jokers: [] })).toEqual({ kind: 'Босс · урон ×1.5', rule: BOSSES.general.description });
  });
});
