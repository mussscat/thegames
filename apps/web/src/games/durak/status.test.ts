import { createFight } from '@game/durak';
import { c, filler, roundState } from '@game/durak/fixtures';
import { describe, expect, it } from 'vitest';
import { statusText } from './status';

const base = createFight({ seed: 1, playerHp: 10, enemyHp: 10 });

describe('statusText', () => {
  it('asks the player to attack on an empty table', () => {
    const round = roundState({ hands: { player: filler(6), enemy: filler(6, 'diamonds') } });
    expect(statusText({ ...base, round })).toBe('Твой ход — атакуй');
  });

  it('asks the player to defend', () => {
    const round = roundState({ attacker: 'enemy', table: [{ attack: c(7, 'clubs'), defense: null }] });
    expect(statusText({ ...base, round })).toBe('Отбивайся или бери');
  });

  it('shows the enemy turn', () => {
    const round = roundState({ attacker: 'enemy' });
    expect(statusText({ ...base, round })).toBe('Ход соперника…');
  });

  it('prompts to throw in while the enemy is taking', () => {
    const round = roundState({ table: [{ attack: c(7, 'clubs'), defense: null }], defenderTaking: true });
    expect(statusText({ ...base, round })).toBe('Соперник берёт — подкинь ещё или нажми «Готово»');
  });

  it('prompts to throw in or finish after a cover', () => {
    const round = roundState({ table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }] });
    expect(statusText({ ...base, round })).toBe('Подкинь или нажми «Бито»');
  });

  it('reports the end of the fight', () => {
    expect(statusText({ ...base, winner: 'player' })).toBe('Бой окончен');
  });
});
