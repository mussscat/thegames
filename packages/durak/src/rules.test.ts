import { createDeck } from '@game/core';
import { describe, expect, it } from 'vitest';
import { c, filler, roundState } from './fixtures';
import { attackLimit, beats, canBeatWith, canThrowIn, currentActor, isTrumpCard, legalActions } from './rules';

describe('beats', () => {
  it('higher card of the same suit beats lower', () => {
    expect(beats(c(7, 'clubs'), c(9, 'clubs'), 'hearts')).toBe(true);
  });
  it('lower card of the same suit does not beat', () => {
    expect(beats(c(9, 'clubs'), c(7, 'clubs'), 'hearts')).toBe(false);
  });
  it('any trump beats a non-trump', () => {
    expect(beats(c(14, 'clubs'), c(6, 'hearts'), 'hearts')).toBe(true);
  });
  it('a non-trump never beats a trump', () => {
    expect(beats(c(6, 'hearts'), c(14, 'clubs'), 'hearts')).toBe(false);
  });
  it('a different non-trump suit does not beat', () => {
    expect(beats(c(6, 'clubs'), c(14, 'spades'), 'hearts')).toBe(false);
  });
  it('higher trump beats lower trump', () => {
    expect(beats(c(7, 'hearts'), c(8, 'hearts'), 'hearts')).toBe(true);
  });
});

describe('currentActor', () => {
  it('attacker acts on an empty table', () => {
    expect(currentActor(roundState())).toBe('player');
  });
  it('defender acts when a card is uncovered', () => {
    const state = roundState({ table: [{ attack: c(7, 'clubs'), defense: null }] });
    expect(currentActor(state)).toBe('enemy');
  });
  it('attacker acts when everything is covered', () => {
    const state = roundState({ table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }] });
    expect(currentActor(state)).toBe('player');
  });
  it('attacker acts while the defender is taking', () => {
    const state = roundState({
      table: [{ attack: c(7, 'clubs'), defense: null }],
      defenderTaking: true,
    });
    expect(currentActor(state)).toBe('player');
  });
  it('nobody acts after the round is over', () => {
    expect(currentActor(roundState({ outcome: { loser: 'enemy', cardsLeft: 2 } }))).toBeNull();
  });
});

describe('attackLimit', () => {
  it('is capped at 6', () => {
    const state = roundState({ hands: { player: [], enemy: createDeck(6).slice(0, 10) } });
    expect(attackLimit(state)).toBe(6);
  });
  it('counts cards the defender had at the start of the bout', () => {
    const state = roundState({
      hands: { player: [], enemy: filler(2) },
      table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }],
    });
    expect(attackLimit(state)).toBe(3);
  });
});

describe('canThrowIn', () => {
  const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };

  it('any card can lead on an empty table', () => {
    expect(canThrowIn(roundState(), c(14, 'diamonds'))).toBe(true);
  });
  it('allows ranks that are already on the table', () => {
    const state = roundState({ hands: { player: [], enemy: filler(5) }, table: [covered] });
    expect(canThrowIn(state, c(7, 'diamonds'))).toBe(true);
    expect(canThrowIn(state, c(9, 'diamonds'))).toBe(true);
  });
  it('rejects ranks that are not on the table', () => {
    const state = roundState({ hands: { player: [], enemy: filler(5) }, table: [covered] });
    expect(canThrowIn(state, c(8, 'diamonds'))).toBe(false);
  });
  it('rejects throw-in when the defender has no cards left', () => {
    const state = roundState({ hands: { player: [], enemy: [] }, table: [covered] });
    expect(canThrowIn(state, c(7, 'diamonds'))).toBe(false);
  });
});

describe('legalActions', () => {
  it('defender may beat with suitable cards or take', () => {
    const state = roundState({
      hands: { player: [], enemy: [c(9, 'clubs'), c(6, 'diamonds'), c(6, 'hearts')] },
      table: [{ attack: c(7, 'clubs'), defense: null }],
    });
    expect(legalActions(state, 'enemy')).toEqual([
      { type: 'defend', cardId: 'clubs-9' },
      { type: 'defend', cardId: 'hearts-6' },
      { type: 'take' },
    ]);
  });
  it('leading attacker may play any card and cannot end', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs'), c(8, 'diamonds')], enemy: filler(6) } });
    expect(legalActions(state, 'player')).toEqual([
      { type: 'attack', cardId: 'clubs-7' },
      { type: 'attack', cardId: 'diamonds-8' },
    ]);
  });
  it('attacker after a cover may throw in matching ranks or end', () => {
    const state = roundState({
      hands: { player: [c(7, 'diamonds'), c(8, 'diamonds')], enemy: filler(5) },
      table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }],
    });
    expect(legalActions(state, 'player')).toEqual([
      { type: 'attack', cardId: 'diamonds-7' },
      { type: 'endAttack' },
    ]);
  });
  it('the player who is not acting has no actions', () => {
    expect(legalActions(roundState(), 'enemy')).toEqual([]);
  });
});

describe('boss rules', () => {
  it('Ведьма: a queen of any suit is a trump', () => {
    expect(isTrumpCard(c(12, 'clubs'), 'hearts', 'witch')).toBe(true);
    expect(isTrumpCard(c(12, 'clubs'), 'hearts', null)).toBe(false);
    expect(beats(c(14, 'spades'), c(12, 'clubs'), 'hearts', 'witch')).toBe(true);
    expect(beats(c(12, 'clubs'), c(13, 'clubs'), 'hearts', 'witch')).toBe(false);
    expect(beats(c(12, 'clubs'), c(14, 'hearts'), 'hearts', 'witch')).toBe(true);
    expect(beats(c(14, 'hearts'), c(12, 'clubs'), 'hearts', 'witch')).toBe(false);
  });

  it('Генерал: the player must beat by 2+ ranks, the enemy is unaffected', () => {
    expect(beats(c(8, 'clubs'), c(9, 'clubs'), 'hearts', 'general', 'player')).toBe(false);
    expect(beats(c(8, 'clubs'), c(10, 'clubs'), 'hearts', 'general', 'player')).toBe(true);
    expect(beats(c(8, 'clubs'), c(9, 'clubs'), 'hearts', 'general', 'enemy')).toBe(true);
    expect(beats(c(14, 'clubs'), c(6, 'hearts'), 'hearts', 'general', 'player')).toBe(true);
    expect(beats(c(7, 'hearts'), c(8, 'hearts'), 'hearts', 'general', 'player')).toBe(false);
  });

  it('legal defenses follow the boss rule', () => {
    const state = roundState({
      attacker: 'enemy',
      boss: 'general',
      hands: { player: [c(9, 'clubs'), c(10, 'clubs')], enemy: filler(5) },
      table: [{ attack: c(8, 'clubs'), defense: null }],
    });
    expect(legalActions(state, 'player')).toEqual([{ type: 'defend', cardId: 'clubs-10' }, { type: 'take' }]);
  });
});

describe('enhancement rules', () => {
  it('Острая beats any suit when higher, also a trump, and respects the General gap', () => {
    expect(canBeatWith(c(8, 'clubs'), c(10, 'diamonds'), 'sharp', 'hearts', null, 'enemy')).toBe(true);
    expect(canBeatWith(c(8, 'hearts'), c(10, 'diamonds'), 'sharp', 'hearts', null, 'enemy')).toBe(true);
    expect(canBeatWith(c(10, 'clubs'), c(8, 'diamonds'), 'sharp', 'hearts', null, 'enemy')).toBe(false);
    expect(canBeatWith(c(8, 'clubs'), c(10, 'diamonds'), undefined, 'hearts', null, 'enemy')).toBe(false);
    expect(canBeatWith(c(8, 'clubs'), c(9, 'diamonds'), 'sharp', 'hearts', 'general', 'player')).toBe(false);
  });

  it('Тяжёлая defense blocks throw-ins of its rank', () => {
    const heavy = { attack: c(7, 'clubs'), defense: c(9, 'clubs'), defenseEnh: 'heavy' as const };
    const state = roundState({ hands: { player: [], enemy: filler(5) }, table: [heavy] });
    expect(canThrowIn(state, c(9, 'diamonds'))).toBe(false);
    expect(canThrowIn(state, c(7, 'diamonds'))).toBe(true);
  });

  it('legal defenses include a Острая card of another suit and split variants when two enhancements exist', () => {
    const state = roundState({
      attacker: 'enemy',
      hands: { player: [c(10, 'diamonds')], enemy: filler(5) },
      table: [{ attack: c(8, 'clubs'), defense: null }],
      foreign: { 'diamonds-10': 'enemy' },
      profiles: { player: { 'diamonds-10': 'coin' }, enemy: { 'diamonds-10': 'sharp' } },
    });
    expect(legalActions(state, 'player')).toEqual([
      { type: 'defend', cardId: 'diamonds-10', use: 'foreign' },
      { type: 'take' },
    ]);
  });
});
