import { describe, expect, it } from 'vitest';
import { c, filler, roundState } from './fixtures';
import { applyRoundAction } from './reducer';
import { currentActor } from './rules';
import type { RoundState } from './types';

function expectOk(result: ReturnType<typeof applyRoundAction>): RoundState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };
const uncovered = { attack: c(7, 'clubs'), defense: null };

describe('attack', () => {
  it('leads a card from hand onto the empty table', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' }));
    expect(next.table).toEqual([uncovered]);
    expect(next.hands.player).toEqual([]);
  });

  it('does not mutate the previous state', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    const snapshot = structuredClone(state);
    applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' });
    expect(state).toEqual(snapshot);
  });

  it('rejects a card that is not in hand', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    const result = applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-14' });
    expect(result).toEqual({ ok: false, error: 'cardNotInHand' });
  });

  it('rejects any action from the player whose turn it is not', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: [c(8, 'clubs')] } });
    const result = applyRoundAction(state, 'enemy', { type: 'attack', cardId: 'clubs-8' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('rejects a throw-in whose rank is not on the table', () => {
    const state = roundState({ hands: { player: [c(8, 'diamonds')], enemy: filler(5) }, table: [covered] });
    const result = applyRoundAction(state, 'player', { type: 'attack', cardId: 'diamonds-8' });
    expect(result).toEqual({ ok: false, error: 'cannotThrowIn' });
  });

  it('rejects a throw-in beyond the defender hand size', () => {
    const state = roundState({ hands: { player: [c(7, 'diamonds')], enemy: [] }, table: [covered] });
    const result = applyRoundAction(state, 'player', { type: 'attack', cardId: 'diamonds-7' });
    expect(result).toEqual({ ok: false, error: 'cannotThrowIn' });
  });

  it('the defender cannot attack while a card is uncovered', () => {
    const state = roundState({ hands: { player: filler(5), enemy: [c(8, 'clubs')] }, table: [uncovered] });
    const result = applyRoundAction(state, 'enemy', { type: 'attack', cardId: 'clubs-8' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });
});

describe('defend', () => {
  const state = roundState({
    hands: { player: filler(5), enemy: [c(9, 'clubs'), c(8, 'diamonds')] },
    table: [uncovered],
  });

  it('covers the uncovered card with a beating card', () => {
    const next = expectOk(applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'clubs-9' }));
    expect(next.table).toEqual([covered]);
    expect(next.hands.enemy).toEqual([c(8, 'diamonds')]);
  });

  it('rejects a card that does not beat', () => {
    const result = applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'diamonds-8' });
    expect(result).toEqual({ ok: false, error: 'cannotBeat' });
  });

  it('rejects a card that is not in hand', () => {
    const result = applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'clubs-14' });
    expect(result).toEqual({ ok: false, error: 'cardNotInHand' });
  });

  it('the attacker cannot defend', () => {
    const result = applyRoundAction(state, 'player', { type: 'defend', cardId: 'spades-6' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('the defender cannot end the attack', () => {
    const result = applyRoundAction(state, 'enemy', { type: 'endAttack' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });
});

describe('take', () => {
  it('lets the attacker throw in more, then gives everything to the defender', () => {
    const start = roundState({
      hands: { player: [c(7, 'spades'), c(14, 'clubs')], enemy: filler(5, 'diamonds') },
      table: [uncovered],
    });
    const taking = expectOk(applyRoundAction(start, 'enemy', { type: 'take' }));
    expect(taking.defenderTaking).toBe(true);
    expect(currentActor(taking)).toBe('player');

    const thrown = expectOk(applyRoundAction(taking, 'player', { type: 'attack', cardId: 'spades-7' }));
    const done = expectOk(applyRoundAction(thrown, 'player', { type: 'endAttack' }));

    expect(done.hands.enemy).toHaveLength(7);
    expect(done.hands.enemy).toEqual(expect.arrayContaining([c(7, 'clubs'), c(7, 'spades')]));
    expect(done.hands.player).toEqual([c(14, 'clubs')]);
    expect(done.attacker).toBe('player');
    expect(done.table).toEqual([]);
    expect(done.defenderTaking).toBe(false);
    expect(done.discardCount).toBe(0);
    expect(done.outcome).toBeNull();
  });

  it('a second take is rejected', () => {
    const taking = roundState({ hands: { player: filler(3), enemy: filler(3, 'diamonds') }, table: [uncovered], defenderTaking: true });
    expect(applyRoundAction(taking, 'enemy', { type: 'take' })).toEqual({ ok: false, error: 'notYourTurn' });
  });
});

describe('endAttack', () => {
  it('rejects ending with an empty table', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(3) } });
    expect(applyRoundAction(state, 'player', { type: 'endAttack' })).toEqual({ ok: false, error: 'cannotEndAttack' });
  });

  it('discards a fully covered table, swaps roles, attacker draws first', () => {
    const state = roundState({
      hands: { player: filler(5, 'spades'), enemy: filler(5, 'diamonds') },
      table: [covered],
      deck: [c(11, 'clubs'), c(12, 'clubs'), c(13, 'clubs')],
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.table).toEqual([]);
    expect(next.discardCount).toBe(2);
    expect(next.attacker).toBe('enemy');
    expect(next.hands.player).toHaveLength(6);
    expect(next.hands.player).toContainEqual(c(11, 'clubs'));
    expect(next.hands.enemy).toContainEqual(c(12, 'clubs'));
    expect(next.deck).toEqual([c(13, 'clubs')]);
  });

  it('when the deck runs short the attacker draws and the defender may get nothing', () => {
    const state = roundState({
      hands: { player: filler(5, 'spades'), enemy: filler(5, 'diamonds') },
      table: [covered],
      deck: [c(11, 'clubs')],
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.hands.player).toContainEqual(c(11, 'clubs'));
    expect(next.hands.enemy).toHaveLength(5);
    expect(next.deck).toEqual([]);
    expect(next.outcome).toBeNull();
  });
});

describe('round end', () => {
  it('the player out of cards wins; the other loses with the cards left', () => {
    const state = roundState({
      hands: { player: [], enemy: [c(10, 'spades'), c(11, 'spades')] },
      table: [covered],
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.outcome).toEqual({ loser: 'enemy', cardsLeft: 2 });
    expect(currentActor(next)).toBeNull();
  });

  it('both out of cards at once is a draw', () => {
    const state = roundState({ hands: { player: [], enemy: [] }, table: [covered] });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.outcome).toEqual({ loser: null, cardsLeft: 0 });
  });

  it('no outcome while the deck still has cards', () => {
    const state = roundState({ hands: { player: [], enemy: filler(2) }, table: [covered], deck: [c(11, 'clubs')] });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.outcome).toBeNull();
  });

  it('rejects any action after the round is over', () => {
    const state = roundState({ outcome: { loser: 'enemy', cardsLeft: 2 } });
    expect(applyRoundAction(state, 'player', { type: 'endAttack' })).toEqual({ ok: false, error: 'roundOver' });
  });
});

describe('bout damage', () => {
  it('taking hurts the defender by every attack card taken, including late throw-ins', () => {
    const start = roundState({
      hands: { player: [c(7, 'spades'), c(14, 'clubs')], enemy: filler(5, 'diamonds') },
      table: [uncovered],
      deck: filler(6, 'hearts'),
    });
    const taking = expectOk(applyRoundAction(start, 'enemy', { type: 'take' }));
    const thrown = expectOk(applyRoundAction(taking, 'player', { type: 'attack', cardId: 'spades-7' }));
    const done = expectOk(applyRoundAction(thrown, 'player', { type: 'endAttack' }));
    expect(done.lastBout).toEqual({ damaged: 'enemy', amount: 2 });
  });

  it('a fully beaten bout costs nobody anything, even with throw-ins', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: filler(5, 'diamonds') },
      table: [covered, { attack: c(7, 'hearts'), defense: c(8, 'hearts') }, { attack: c(9, 'hearts'), defense: c(10, 'hearts') }],
      deck: filler(6, 'clubs'),
      lastBout: { damaged: 'enemy', amount: 1 },
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.lastBout).toBeNull();
  });

  it('non-bout actions keep the previous bout result untouched', () => {
    const previous = { damaged: 'enemy' as const, amount: 3 };
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) }, lastBout: previous });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' }));
    expect(next.lastBout).toBe(previous);
  });
});

describe('hand sizes', () => {
  it('draws up to each player own hand size', () => {
    const state = roundState({
      hands: { player: filler(5, 'spades'), enemy: filler(5, 'diamonds') },
      table: [covered],
      deck: [c(11, 'clubs'), c(12, 'clubs'), c(13, 'clubs'), c(14, 'clubs')],
      handSizes: { player: 7, enemy: 6 },
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.hands.player).toHaveLength(7);
    expect(next.hands.enemy).toHaveLength(6);
    expect(next.deck).toEqual([c(14, 'clubs')]);
  });
});
