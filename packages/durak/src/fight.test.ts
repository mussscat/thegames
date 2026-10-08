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
    expect(base.perks).toEqual([]);
    expect(base.roundTakes).toEqual({ player: 0, enemy: 0 });
    expect(base.fightTakes).toEqual({ player: 0, enemy: 0 });
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

describe('perks in a fight', () => {
  const playerTaking = roundState({
    attacker: 'enemy',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(8, 'clubs'), defense: null }],
    defenderTaking: true,
    deck: filler(6, 'hearts').slice(2),
  });

  it('counts takes per round and per fight', () => {
    const next = expectOk(applyFightAction({ ...base, round: takingRound }, 'player', { type: 'endAttack' }));
    expect(next.roundTakes).toEqual({ player: 0, enemy: 1 });
    expect(next.fightTakes).toEqual({ player: 0, enemy: 1 });
  });

  it('a new round resets round takes but keeps fight takes', () => {
    const fight = { ...base, round: endingRound, roundTakes: { player: 2, enemy: 1 }, fightTakes: { player: 2, enemy: 1 } };
    const ended = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    const next = expectOk(applyFightAction(ended, 'player', { type: 'nextRound' }));
    expect(next.roundTakes).toEqual({ player: 0, enemy: 0 });
    expect(next.fightTakes).toEqual({ player: 2, enemy: 1 });
  });

  it('Подкидной мастер makes enemy takes cost 1 more', () => {
    const fight = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['throwMaster'] }), round: takingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hp.enemy).toBe(7);
    expect(next.hits).toEqual([{ target: 'enemy', amount: 3 }]);
  });

  it('Толстая кожа softens only the first player take in a round', () => {
    const start = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['thickSkin'] }), round: playerTaking };
    const first = expectOk(applyFightAction(start, 'enemy', { type: 'endAttack' }));
    expect(first.hp.player).toBe(9);
    const second = expectOk(applyFightAction({ ...first, round: playerTaking }, 'enemy', { type: 'endAttack' }));
    expect(second.hp.player).toBe(7);
  });

  it('a zero-damage take still counts as a take', () => {
    const single = { ...playerTaking, table: [{ attack: c(7, 'clubs'), defense: null }] };
    const start = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['thickSkin'] }), round: single };
    const next = expectOk(applyFightAction(start, 'enemy', { type: 'endAttack' }));
    expect(next.hp.player).toBe(10);
    expect(next.hits).toEqual([]);
    expect(next.roundTakes.player).toBe(1);
  });

  it('Длинные руки deals and keeps a 7-card player hand', () => {
    const fight = createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['longArms'] });
    expect(fight.round.hands.player).toHaveLength(7);
    expect(fight.round.handSizes).toEqual({ player: 7, enemy: 6 });
    expect(fight.perks).toEqual(['longArms']);
  });

  it('Козырной charges the enemy for every trump it takes', () => {
    const fight = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['trumpLover'] }), round: takingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hits).toEqual([{ target: 'enemy', amount: 3 }]);
  });
});

describe('bosses in a fight', () => {
  const shuffler = createFight({ seed: 1, playerHp: 10, enemyHp: 10, boss: 'shuffler' });
  const beatenRound = roundState({
    boss: 'shuffler',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [covered],
    deck: filler(6, 'clubs').slice(2),
  });

  it('passes the boss into every round', () => {
    expect(shuffler.boss).toBe('shuffler');
    expect(shuffler.round.boss).toBe('shuffler');
    const ended = expectOk(applyFightAction({ ...shuffler, round: { ...endingRound, boss: 'shuffler' } }, 'player', { type: 'endAttack' }));
    expect(expectOk(applyFightAction(ended, 'player', { type: 'nextRound' })).round.boss).toBe('shuffler');
  });

  it('Фокусник changes the trump to another suit after «Бито»', () => {
    const next = expectOk(applyFightAction({ ...shuffler, round: beatenRound }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).not.toBe('hearts');
    expect(next.rng).not.toEqual(shuffler.rng);
  });

  it('Фокусник also shuffles on the first «Бито» right after a take', () => {
    const afterTake = { ...beatenRound, lastBout: { damaged: 'enemy' as const, attackCards: [c(6, 'clubs')], goldenHits: 0 } };
    const next = expectOk(applyFightAction({ ...shuffler, round: afterTake }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).not.toBe('hearts');
  });

  it('Фокусник keeps the trump when the round ends', () => {
    const ending = { ...endingRound, boss: 'shuffler' as const };
    const next = expectOk(applyFightAction({ ...shuffler, round: ending }, 'player', { type: 'endAttack' }));
    expect(next.round.outcome).not.toBeNull();
    expect(next.round.trumpSuit).toBe('hearts');
  });

  it('Фокусник keeps the trump after a take', () => {
    const taking = { ...takingRound, boss: 'shuffler' as const };
    const next = expectOk(applyFightAction({ ...shuffler, round: taking }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).toBe('hearts');
  });

  it('without the Фокусник the trump never changes', () => {
    const plain = { ...beatenRound, boss: null };
    const next = expectOk(applyFightAction({ ...base, round: plain }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).toBe('hearts');
  });
});

describe('enhancements in a fight', () => {
  const playerDefends = (enhancement: 'coin') =>
    roundState({
      attacker: 'enemy',
      hands: { player: [c(9, 'clubs'), ...filler(4)], enemy: filler(5, 'diamonds') },
      table: [{ attack: c(7, 'clubs'), defense: null }],
      profiles: { player: { 'clubs-9': enhancement }, enemy: {} },
      deck: filler(6, 'hearts').slice(2),
    });

  it('Золотая attack cards cost the taker 1 more each', () => {
    const golden = {
      ...takingRound,
      table: [{ attack: c(7, 'clubs'), defense: null, attackEnh: 'golden' as const }, { attack: c(7, 'hearts'), defense: null }],
    };
    const next = expectOk(applyFightAction({ ...base, round: golden }, 'player', { type: 'endAttack' }));
    expect(next.hits).toEqual([{ target: 'enemy', amount: 3 }]);
  });

  it('Монетная pays nothing when the defender covers and then takes the table', () => {
    const coveredThenTaking = roundState({
      attacker: 'enemy',
      hands: { player: filler(4), enemy: filler(5, 'diamonds') },
      table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs'), defenseEnh: 'coin' }, { attack: c(7, 'hearts'), defense: null }],
      deck: filler(6, 'hearts').slice(2),
    });
    const taking = expectOk(applyFightAction({ ...base, round: coveredThenTaking }, 'player', { type: 'take' }));
    const took = expectOk(applyFightAction(taking, 'enemy', { type: 'endAttack' }));
    expect(took.cardCoins).toEqual({ player: 0, enemy: 0 });
    expect(took.hp.player).toBe(8);
  });

  it('Монетная pays even when that «Бито» ends the round', () => {
    const lastBout = roundState({
      hands: { player: [], enemy: [c(10, 'spades')] },
      table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs'), defenseEnh: 'coin' }],
    });
    const next = expectOk(applyFightAction({ ...base, round: lastBout }, 'player', { type: 'endAttack' }));
    expect(next.round.outcome).not.toBeNull();
    expect(next.cardCoins).toEqual({ player: 0, enemy: 1 });
  });

  it('Монетная defense earns a card coin after «Бито», not on the cover itself', () => {
    const defended = expectOk(applyFightAction({ ...base, round: playerDefends('coin') }, 'player', { type: 'defend', cardId: 'clubs-9' }));
    expect(defended.cardCoins).toEqual({ player: 0, enemy: 0 });
    const beaten = expectOk(applyFightAction(defended, 'enemy', { type: 'endAttack' }));
    expect(beaten.cardCoins).toEqual({ player: 1, enemy: 0 });
  });

  it('createFight passes profiles into every round', () => {
    const profiles = { player: { 'clubs-7': 'golden' as const }, enemy: {} };
    const fight = createFight({ seed: 1, playerHp: 10, enemyHp: 10, profiles });
    expect(fight.round.profiles).toEqual(profiles);
    expect(fight.cardCoins).toEqual({ player: 0, enemy: 0 });
    expect(fight).not.toHaveProperty('sturdy');
  });
});
