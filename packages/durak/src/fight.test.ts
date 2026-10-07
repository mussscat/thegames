import { describe, expect, it } from 'vitest';
import { applyFightAction, createFight, type FightState } from './fight';
import { c, filler, roundState } from './fixtures';

function expectOk(result: ReturnType<typeof applyFightAction>): FightState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const base = createFight({ seed: 1, playerHp: 10, enemyHp: 10 });
const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };
/** Player covers out with 0 cards and an empty deck; the enemy is left holding 2 cards. */
const endingRound = roundState({
  hands: { player: [], enemy: [c(10, 'spades'), c(11, 'spades')] },
  table: [covered],
});
/** The enemy is taking two attack cards. */
const takingRound = roundState({
  hands: { player: filler(5), enemy: filler(5, 'diamonds') },
  table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(7, 'hearts'), defense: null }],
  defenderTaking: true,
  deck: filler(6, 'hearts').slice(2),
});

describe('createFight', () => {
  it('starts round 1 with full HP and no winner', () => {
    expect(base.hp).toEqual({ player: 10, enemy: 10 });
    expect(base.maxHp).toEqual({ player: 10, enemy: 10 });
    expect(base.roundNumber).toBe(1);
    expect(base.winner).toBeNull();
    expect(base.hits).toEqual([]);
    expect(base.round.hands.player).toHaveLength(6);
  });
});

describe('damage', () => {
  it('forcing the enemy to take hurts the enemy by each attack card', () => {
    const next = expectOk(applyFightAction({ ...base, round: takingRound }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 8 });
    expect(next.hits).toEqual([{ target: 'enemy', amount: 2 }]);
    expect(next.hitSeq).toBe(base.hitSeq + 1);
  });

  it('beaten throw-ins cost nobody anything', () => {
    const round = roundState({
      hands: { player: filler(5), enemy: filler(5, 'diamonds') },
      table: [covered, { attack: c(9, 'hearts'), defense: c(10, 'hearts') }],
      deck: filler(6, 'clubs').slice(2),
    });
    const next = expectOk(applyFightAction({ ...base, round }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 10 });
    expect(next.hits).toEqual([]);
    expect(next.hitSeq).toBe(base.hitSeq);
  });

  it('ending a round deals no damage to the player left holding cards', () => {
    const next = expectOk(applyFightAction({ ...base, round: endingRound }, 'player', { type: 'endAttack' }));
    expect(next.round.outcome).toEqual({ loser: 'enemy', cardsLeft: 2 });
    expect(next.hp).toEqual({ player: 10, enemy: 10 });
    expect(next.hits).toEqual([]);
  });

  it('HP never goes below zero and the survivor wins', () => {
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round: takingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hp.enemy).toBe(0);
    expect(next.winner).toBe('player');
  });

  it('non-bout actions clear the previous hits', () => {
    const fight = { ...base, hits: [{ target: 'enemy' as const, amount: 2 }] };
    const actor = base.round.attacker;
    const cardId = base.round.hands[actor][0]!.id;
    const next = expectOk(applyFightAction(fight, actor, { type: 'attack', cardId }));
    expect(next.hits).toEqual([]);
  });
});

describe('rounds and errors', () => {
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
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round: takingRound };
    const won = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(applyFightAction(won, 'player', { type: 'nextRound' })).toEqual({ ok: false, error: 'fightOver' });
  });
});
