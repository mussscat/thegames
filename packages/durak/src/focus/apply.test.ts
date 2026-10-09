import { makeCard, type Card } from '@game/core';
import { describe, expect, it } from 'vitest';
import { createFight, NO_CHARGES, NO_REVEAL, type FightState } from '../fight';
import type { RoundState } from '../types';
import { applyFocus, focusReady } from './apply';
import { FOCUS_IDS, FOCUSES } from './catalog';

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const c = (suit: Card['suit'], rank: Card['rank']): Card => makeCard(suit, rank);

/** A fight on the player's attack with a known hand, deck and trump. */
function fightWith(round: Partial<RoundState> = {}): FightState {
  const base = createFight({ seed: 1, playerHp: 40, enemyHp: 15 });
  const trumpCard = c('spades', 6);
  return {
    ...base,
    round: {
      ...base.round,
      hands: { player: [c('hearts', 7), c('clubs', 9), c('spades', 12)], enemy: [c('diamonds', 8), c('hearts', 10)] },
      deck: [c('clubs', 6), c('diamonds', 11), c('hearts', 14), c('clubs', 13), trumpCard],
      trumpCard,
      trumpSuit: 'spades',
      table: [],
      attacker: 'player',
      outcome: null,
      ...round,
    },
  };
}

const cardCount = (f: FightState): number => f.round.hands.player.length + f.round.hands.enemy.length + f.round.deck.length + f.round.discardCount;

describe('focus catalogue', () => {
  it('has the 10 focuses of the spec with their rarities and prices', () => {
    expect(FOCUS_IDS).toHaveLength(10);
    expect(FOCUSES.piggy.price).toBe(2);
    expect(FOCUSES.swap.rarity).toBe('rare');
    expect(FOCUSES.doubler.rarity).toBe('rare');
    expect(FOCUSES.suitShift.rarity).toBe('legendary');
    expect(FOCUSES.suitShift.price).toBe(7);
  });
});

describe('a new fight', () => {
  it('starts with no charges and nothing revealed', () => {
    const fight = createFight({ seed: 1, playerHp: 40, enemyHp: 15 });
    expect(fight.focusCharges).toEqual(NO_CHARGES);
    expect(fight.reveal).toEqual(NO_REVEAL);
  });
});

describe('when a focus can be played', () => {
  it('only on the player turn, in a live deal and fight', () => {
    expect(focusReady(fightWith(), 'boost')).toBe(true);
    expect(applyFocus(fightWith({ attacker: 'enemy' }), 'boost', [])).toEqual({ ok: false, error: 'notYourTurn' });
    expect(applyFocus(fightWith({ outcome: { loser: 'enemy', cardsLeft: 2 } }), 'boost', [])).toEqual({ ok: false, error: 'roundOver' });
    expect(applyFocus({ ...fightWith(), winner: 'player' }, 'boost', [])).toEqual({ ok: false, error: 'fightOver' });
  });

  it('refuses targets of the wrong count, repeated, or not in the hand', () => {
    expect(applyFocus(fightWith(), 'redeal', [])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'redeal', ['hearts-7', 'clubs-9', 'spades-12'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'redeal', ['hearts-7', 'hearts-7'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'swap', ['diamonds-8'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'boost', ['hearts-7'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('information focuses', () => {
  it('Подглядывание opens the enemy hand, Прорицание the top 3 cards', () => {
    expect(expectOk(applyFocus(fightWith(), 'peek', [])).fight.reveal).toEqual({ enemyHand: true, topCards: 0 });
    expect(expectOk(applyFocus(fightWith(), 'foresight', [])).fight.reveal).toEqual({ enemyHand: false, topCards: 3 });
  });
});

describe('Пересдача', () => {
  it('discards the chosen cards and draws as many from the top', () => {
    const { fight } = expectOk(applyFocus(fightWith(), 'redeal', ['hearts-7', 'clubs-9']));
    expect(fight.round.hands.player.map((card) => card.id)).toEqual(['spades-12', 'clubs-6', 'diamonds-11']);
    expect(fight.round.deck.map((card) => card.id)).toEqual(['hearts-14', 'clubs-13', 'spades-6']);
    expect(fight.round.discardCount).toBe(2);
    expect(cardCount(fight)).toBe(cardCount(fightWith()));
  });

  it('draws fewer when the deck is short, taking the trump card last', () => {
    const short = fightWith({ deck: [c('spades', 6)] });
    const { fight } = expectOk(applyFocus(short, 'redeal', ['hearts-7', 'clubs-9']));
    expect(fight.round.hands.player.map((card) => card.id)).toEqual(['spades-12', 'spades-6']);
    expect(fight.round.deck).toEqual([]);
    expect(cardCount(fight)).toBe(cardCount(short));
  });

  it('is unavailable with an empty deck', () => {
    expect(focusReady(fightWith({ deck: [] }), 'redeal')).toBe(false);
    expect(applyFocus(fightWith({ deck: [] }), 'redeal', ['hearts-7'])).toEqual({ ok: false, error: 'focusUnavailable' });
  });
});

describe('Подмена', () => {
  it('swaps a hand card with the card under the deck, keeping the trump suit', () => {
    const { fight } = expectOk(applyFocus(fightWith(), 'swap', ['hearts-7']));
    expect(fight.round.hands.player.map((card) => card.id)).toEqual(['spades-6', 'clubs-9', 'spades-12']);
    expect(fight.round.deck.at(-1)?.id).toBe('hearts-7');
    expect(fight.round.trumpCard.id).toBe('hearts-7');
    expect(fight.round.trumpSuit).toBe('spades');
    expect(cardCount(fight)).toBe(cardCount(fightWith()));
  });

  it('is unavailable with no card under the deck, or for a trump', () => {
    expect(applyFocus(fightWith({ deck: [] }), 'swap', ['hearts-7'])).toEqual({ ok: false, error: 'focusUnavailable' });
    expect(applyFocus(fightWith(), 'swap', ['spades-12'])).toEqual({ ok: false, error: 'focusUnavailable' });
  });
});

describe('Смена масти', () => {
  it('makes the chosen card suit the trump until the deal ends', () => {
    expect(expectOk(applyFocus(fightWith(), 'suitShift', ['hearts-7'])).fight.round.trumpSuit).toBe('hearts');
  });

  it('is unavailable for a card already of the trump suit', () => {
    expect(applyFocus(fightWith(), 'suitShift', ['spades-12'])).toEqual({ ok: false, error: 'focusUnavailable' });
  });
});

describe('charges and coins', () => {
  it('Разгон, Набивка, Удвоитель and Щит charge the next hits and stack', () => {
    const once = expectOk(applyFocus(fightWith(), 'boost', [])).fight;
    const twice = expectOk(applyFocus(once, 'boost', [])).fight;
    expect(twice.focusCharges.mult).toBe(6);
    expect(expectOk(applyFocus(fightWith(), 'pad', [])).fight.focusCharges.chips).toBe(8);
    const doubled = expectOk(applyFocus(expectOk(applyFocus(fightWith(), 'doubler', [])).fight, 'doubler', [])).fight;
    expect(doubled.focusCharges.times).toBe(4);
    expect(expectOk(applyFocus(fightWith(), 'shield', [])).fight.focusCharges.shield).toBe(0.5);
  });

  it('Копилочка gives 4 coins and leaves the fight as it was', () => {
    const before = fightWith();
    const out = expectOk(applyFocus(before, 'piggy', []));
    expect(out.coins).toBe(4);
    expect(out.fight).toEqual(before);
  });

  it('a played focus costs no turn', () => {
    expect(expectOk(applyFocus(fightWith(), 'peek', [])).fight.round.attacker).toBe('player');
  });
});
