import { describe, expect, it } from 'vitest';
import { applyFightAction, createFight, type FightState } from './fight';
import { c, filler, roundState } from './fixtures';

function expectOk(result: ReturnType<typeof applyFightAction>): FightState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const base = createFight({ seed: 1, playerHp: 10, enemyHp: 10 });
const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };
const endingRound = roundState({
  hands: { player: [], enemy: [c(10, 'spades'), c(11, 'spades')] },
  table: [covered],
});

describe('createFight', () => {
  it('starts round 1 with full HP and no winner', () => {
    expect(base.hp).toEqual({ player: 10, enemy: 10 });
    expect(base.maxHp).toEqual({ player: 10, enemy: 10 });
    expect(base.roundNumber).toBe(1);
    expect(base.winner).toBeNull();
    expect(base.round.hands.player).toHaveLength(6);
  });
});

describe('applyFightAction', () => {
  it('the round loser takes damage equal to cards left', () => {
    const next = expectOk(applyFightAction({ ...base, round: endingRound }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 8 });
    expect(next.winner).toBeNull();
  });

  it('HP never goes below zero and the survivor wins', () => {
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round: endingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hp.enemy).toBe(0);
    expect(next.winner).toBe('player');
  });

  it('a drawn round deals no damage', () => {
    const drawRound = roundState({ hands: { player: [], enemy: [] }, table: [covered] });
    const next = expectOk(applyFightAction({ ...base, round: drawRound }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 10 });
  });

  it('passes round errors through unchanged', () => {
    const result = applyFightAction({ ...base, round: roundState() }, 'enemy', { type: 'endAttack' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('nextRound is rejected while the round is in progress', () => {
    expect(applyFightAction(base, 'player', { type: 'nextRound' })).toEqual({ ok: false, error: 'roundInProgress' });
  });

  it('nextRound deals a fresh round after an outcome', () => {
    const ended = expectOk(applyFightAction({ ...base, round: endingRound }, 'player', { type: 'endAttack' }));
    const next = expectOk(applyFightAction(ended, 'player', { type: 'nextRound' }));
    expect(next.roundNumber).toBe(2);
    expect(next.round.outcome).toBeNull();
    expect(next.round.hands.player).toHaveLength(6);
    expect(next.rng).not.toEqual(ended.rng);
  });

  it('rejects everything after the fight is won', () => {
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round: endingRound };
    const won = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(applyFightAction(won, 'player', { type: 'nextRound' })).toEqual({ ok: false, error: 'fightOver' });
  });
});

describe('bout damage in a fight', () => {
  it('forcing the enemy to take hurts the enemy right away', () => {
    const round = roundState({
      hands: { player: filler(5), enemy: filler(5, 'diamonds') },
      table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(7, 'hearts'), defense: null }],
      defenderTaking: true,
      deck: filler(6, 'hearts').slice(2),
    });
    const next = expectOk(applyFightAction({ ...base, round }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 8 });
    expect(next.hits).toEqual([{ target: 'enemy', amount: 2, reason: 'took' }]);
    expect(next.hitSeq).toBe(base.hitSeq + 1);
  });

  it('beaten throw-ins cost the attacker nothing', () => {
    const round = roundState({
      hands: { player: filler(5), enemy: filler(5, 'diamonds') },
      table: [covered, { attack: c(9, 'hearts'), defense: c(10, 'hearts') }],
      deck: filler(6, 'clubs').slice(2),
    });
    const next = expectOk(applyFightAction({ ...base, round }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 10 });
    expect(next.hits).toEqual([]);
  });

  it('a zero-damage bout records no hit and keeps hitSeq', () => {
    const round = roundState({ hands: { player: filler(5), enemy: filler(5, 'diamonds') }, table: [covered], deck: filler(6, 'clubs').slice(2) });
    const next = expectOk(applyFightAction({ ...base, round }, 'player', { type: 'endAttack' }));
    expect(next.hits).toEqual([]);
    expect(next.hitSeq).toBe(base.hitSeq);
  });

  it('the round finisher is recorded as a durak hit', () => {
    const next = expectOk(applyFightAction({ ...base, round: endingRound }, 'player', { type: 'endAttack' }));
    expect(next.hits).toEqual([{ target: 'enemy', amount: 2, reason: 'durak' }]);
  });

  it('a lethal take ends the fight before the finisher applies', () => {
    const round = roundState({
      hands: { player: [], enemy: filler(3, 'diamonds') },
      table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(7, 'hearts'), defense: null }],
      defenderTaking: true,
    });
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.round.outcome).toEqual({ loser: 'enemy', cardsLeft: 5 });
    expect(next.hp).toEqual({ player: 10, enemy: 0 });
    expect(next.winner).toBe('player');
    expect(next.hits).toEqual([{ target: 'enemy', amount: 2, reason: 'took' }]);
  });

  it('non-bout actions clear the previous hits', () => {
    const fight = { ...base, hits: [{ target: 'enemy' as const, amount: 2, reason: 'took' as const }] };
    const actor = base.round.attacker;
    const cardId = base.round.hands[actor][0]!.id;
    const next = expectOk(applyFightAction(fight, actor, { type: 'attack', cardId }));
    expect(next.hits).toEqual([]);
  });
});
