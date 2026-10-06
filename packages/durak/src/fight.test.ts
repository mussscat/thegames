import { describe, expect, it } from 'vitest';
import { applyFightAction, createFight, type FightState } from './fight';
import { c, roundState } from './fixtures';

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
