import { createDeck } from '@game/core';
import { describe, expect, it } from 'vitest';
import { c, filler, roundState } from './fixtures';
import { attackLimit, beats, canThrowIn, currentActor, legalActions } from './rules';

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
