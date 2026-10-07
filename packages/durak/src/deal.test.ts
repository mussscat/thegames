import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { dealRound, firstAttacker } from './deal';
import { c } from './fixtures';

describe('dealRound', () => {
  const [round] = dealRound(createRng(7));

  it('deals six cards to each player and leaves 24 in the deck', () => {
    expect(round.hands.player).toHaveLength(6);
    expect(round.hands.enemy).toHaveLength(6);
    expect(round.deck).toHaveLength(24);
  });

  it('uses 36 unique cards', () => {
    const all = [...round.deck, ...round.hands.player, ...round.hands.enemy];
    expect(new Set(all.map((card) => card.id)).size).toBe(36);
  });

  it('takes the trump from the bottom card of the deck', () => {
    expect(round.trumpCard).toEqual(round.deck[round.deck.length - 1]);
    expect(round.trumpSuit).toBe(round.trumpCard.suit);
  });

  it('starts with an empty table and no outcome', () => {
    expect(round.table).toEqual([]);
    expect(round.defenderTaking).toBe(false);
    expect(round.discardCount).toBe(0);
    expect(round.outcome).toBeNull();
  });

  it('lets the holder of the lowest trump attack first', () => {
    expect(round.attacker).toBe(firstAttacker(round.hands, round.trumpSuit));
  });

  it('is deterministic per seed', () => {
    expect(dealRound(createRng(7))[0]).toEqual(round);
    expect(dealRound(createRng(8))[0]).not.toEqual(round);
  });
});

describe('firstAttacker', () => {
  it('picks the player with the lowest trump', () => {
    expect(firstAttacker({ player: [c(6, 'hearts')], enemy: [c(10, 'hearts')] }, 'hearts')).toBe('player');
    expect(firstAttacker({ player: [c(10, 'hearts')], enemy: [c(6, 'hearts')] }, 'hearts')).toBe('enemy');
  });
  it('picks the only player that has a trump', () => {
    expect(firstAttacker({ player: [c(14, 'clubs')], enemy: [c(13, 'hearts')] }, 'hearts')).toBe('enemy');
  });
  it('defaults to the player when nobody has a trump', () => {
    expect(firstAttacker({ player: [c(14, 'clubs')], enemy: [c(13, 'clubs')] }, 'hearts')).toBe('player');
  });
});

describe('dealRound with custom hand sizes', () => {
  it('deals each side its own hand size and remembers it', () => {
    const [round] = dealRound(createRng(7), { player: 7, enemy: 6 });
    expect(round.hands.player).toHaveLength(7);
    expect(round.hands.enemy).toHaveLength(6);
    expect(round.deck).toHaveLength(23);
    expect(round.handSizes).toEqual({ player: 7, enemy: 6 });
  });

  it('defaults to six cards each', () => {
    const [round] = dealRound(createRng(7));
    expect(round.handSizes).toEqual({ player: 6, enemy: 6 });
  });
});

describe('dealRound with a boss', () => {
  it('remembers the boss rule and defaults to none', () => {
    expect(dealRound(createRng(7))[0].boss).toBeNull();
    expect(dealRound(createRng(7), undefined, 'witch')[0].boss).toBe('witch');
  });
});
