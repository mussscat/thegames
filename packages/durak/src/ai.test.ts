import { createDeck } from '@game/core';
import { describe, expect, it } from 'vitest';
import { chooseAction } from './ai';
import { c, filler, roundState } from './fixtures';

const spadesDeck = createDeck(6).filter((card) => card.suit === 'spades');
const attackOn7 = [{ attack: c(7, 'clubs'), defense: null }];
const covered = [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }];

describe('chooseAction — defending', () => {
  it('beats with the cheapest non-trump card', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(9, 'clubs'), c(8, 'clubs'), c(6, 'hearts')] },
      table: attackOn7,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'defend', cardId: 'clubs-8' });
  });

  it('takes when nothing beats', () => {
    const state = roundState({ hands: { player: filler(5), enemy: [c(6, 'diamonds')] }, table: attackOn7, deck: spadesDeck });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'take' });
  });

  it('stingy keeps its trump early in the round', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(6, 'hearts'), c(8, 'diamonds')] },
      table: attackOn7,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'take' });
  });

  it('aggressive spends its trump', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(6, 'hearts'), c(8, 'diamonds')] },
      table: attackOn7,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'enemy', 'aggressive')).toEqual({ type: 'defend', cardId: 'hearts-6' });
  });

  it('stingy spends a trump late in the round', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(6, 'hearts'), c(8, 'diamonds')] },
      table: attackOn7,
      deck: [c(14, 'spades')],
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'defend', cardId: 'hearts-6' });
  });
});

describe('chooseAction — attacking', () => {
  it('leads with the cheapest non-trump card', () => {
    const state = roundState({ hands: { player: [c(10, 'clubs'), c(7, 'spades'), c(6, 'hearts')], enemy: filler(6, 'diamonds') } });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'spades-7' });
  });

  it('ends the attack when nothing can be thrown in', () => {
    const state = roundState({ hands: { player: [c(13, 'diamonds')], enemy: filler(5) }, table: covered, deck: spadesDeck });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'endAttack' });
  });

  it('stingy throws in a cheap matching card', () => {
    const state = roundState({ hands: { player: [c(9, 'diamonds')], enemy: filler(5) }, table: covered, deck: spadesDeck });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'diamonds-9' });
  });

  it('stingy throws in for free while the defender is taking', () => {
    const state = roundState({
      hands: { player: [c(7, 'diamonds')], enemy: filler(5) },
      table: attackOn7,
      defenderTaking: true,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'diamonds-7' });
  });

  it('stingy does not throw in a trump while the deck has cards', () => {
    const state = roundState({ hands: { player: [c(7, 'hearts')], enemy: filler(5) }, table: covered, deck: spadesDeck });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'endAttack' });
  });

  it('throws in everything once the deck is empty', () => {
    const state = roundState({ hands: { player: [c(7, 'hearts')], enemy: filler(5) }, table: covered, deck: [] });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'hearts-7' });
  });

  it('returns null when it is not my turn', () => {
    expect(chooseAction(roundState(), 'enemy', 'stingy')).toBeNull();
  });
});
