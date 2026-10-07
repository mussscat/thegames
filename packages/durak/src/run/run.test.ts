import { describe, expect, it } from 'vitest';
import { RUN_SCHEDULE } from '../content/enemies';
import { applyRunAction, createRun, enemyAt, PLAYER_HP, stageLabel, type RunState } from './run';

function expectOk(result: ReturnType<typeof applyRunAction>): RunState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

function withFightWinner(run: RunState, winner: 'player' | 'enemy', playerHp = PLAYER_HP): RunState {
  if (run.phase.kind !== 'fight') throw new Error('not in a fight');
  const fight = { ...run.phase.fight, winner, hp: { ...run.phase.fight.hp, player: playerHp } };
  return { ...run, phase: { kind: 'fight', fight } };
}

function inShop(run: RunState): RunState {
  return expectOk(applyRunAction(withFightWinner(run, 'player'), { type: 'leaveFight' }));
}

describe('schedule', () => {
  it('has 2 circles of normal → strong → boss', () => {
    expect(RUN_SCHEDULE.map((enemy) => enemy.tier)).toEqual(['normal', 'strong', 'boss', 'normal', 'strong', 'boss']);
    expect(stageLabel(0)).toEqual({ circle: 1, fight: 1 });
    expect(stageLabel(5)).toEqual({ circle: 2, fight: 3 });
    expect(() => enemyAt(6)).toThrow(RangeError);
  });
});

describe('createRun', () => {
  it('starts the first fight with full player HP and no coins or perks', () => {
    const run = createRun(1);
    expect(run.stage).toBe(0);
    expect(run.coins).toBe(0);
    expect(run.perks).toEqual([]);
    expect(run.phase.kind).toBe('fight');
    if (run.phase.kind !== 'fight') return;
    expect(run.phase.fight.hp).toEqual({ player: PLAYER_HP, enemy: enemyAt(0).hp });
  });

  it('is deterministic per seed', () => {
    expect(createRun(5)).toEqual(createRun(5));
  });
});

describe('fight phase', () => {
  it('passes fight actions through', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const actor = run.phase.fight.round.attacker;
    const cardId = run.phase.fight.round.hands[actor][0]!.id;
    const next = expectOk(applyRunAction(run, { type: 'fight', actor, action: { type: 'attack', cardId } }));
    expect(next.phase.kind === 'fight' && next.phase.fight.round.table).toHaveLength(1);
  });

  it('rejects shop actions during a fight', () => {
    const run = createRun(1);
    expect(applyRunAction(run, { type: 'reroll' })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(run, { type: 'sellPerk', perkId: 'looter' })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(run, { type: 'leaveShop' })).toEqual({ ok: false, error: 'wrongPhase' });
  });

  it('cannot leave a fight that is not over', () => {
    expect(applyRunAction(createRun(1), { type: 'leaveFight' })).toEqual({ ok: false, error: 'fightNotOver' });
  });

  it('a won fight pays the reward and opens the shop', () => {
    const shop = inShop(createRun(1));
    expect(shop.coins).toBe(8);
    expect(shop.phase.kind).toBe('shop');
    if (shop.phase.kind !== 'shop') return;
    expect(shop.phase.reward.total).toBe(8);
    expect(shop.phase.shop.offers).toHaveLength(2);
  });

  it('a lost fight ends the run', () => {
    const over = expectOk(applyRunAction(withFightWinner(createRun(1), 'enemy'), { type: 'leaveFight' }));
    expect(over.phase).toEqual({ kind: 'over', won: false });
  });

  it('winning the last fight wins the run without a shop', () => {
    const last = { ...withFightWinner(createRun(1), 'player'), stage: RUN_SCHEDULE.length - 1 };
    const over = expectOk(applyRunAction(last, { type: 'leaveFight' }));
    expect(over.phase).toEqual({ kind: 'over', won: true });
  });
});

describe('shop phase', () => {
  it('buying a perk spends coins and carries the perk into the next fight', () => {
    const shop = inShop(createRun(1));
    if (shop.phase.kind !== 'shop') throw new Error('not in shop');
    const offer = shop.phase.shop.offers[0]!;
    const bought = expectOk(applyRunAction(shop, { type: 'buyPerk', index: 0 }));
    expect(bought.perks).toEqual([offer.perkId]);
    expect(bought.coins).toBe(shop.coins - offer.price);
    const next = expectOk(applyRunAction(bought, { type: 'leaveShop' }));
    expect(next.stage).toBe(1);
    expect(next.phase.kind === 'fight' && next.phase.fight.perks).toEqual([offer.perkId]);
    expect(next.phase.kind === 'fight' && next.phase.fight.hp).toEqual({ player: PLAYER_HP, enemy: enemyAt(1).hp });
  });

  it('selling and rerolling update coins', () => {
    const shop = { ...inShop(createRun(1)), perks: ['looter' as const] };
    const sold = expectOk(applyRunAction(shop, { type: 'sellPerk', perkId: 'looter' }));
    expect(sold.perks).toEqual([]);
    expect(sold.coins).toBe(shop.coins + 2);
    const rerolled = expectOk(applyRunAction(sold, { type: 'reroll' }));
    expect(rerolled.coins).toBe(sold.coins - 2);
  });

  it('passes shop errors through', () => {
    const broke = { ...inShop(createRun(1)), coins: 0 };
    expect(applyRunAction(broke, { type: 'buyPerk', index: 0 })).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('rejects fight actions in the shop', () => {
    const shop = inShop(createRun(1));
    expect(applyRunAction(shop, { type: 'fight', actor: 'enemy', action: { type: 'take' } })).toEqual({
      ok: false,
      error: 'wrongPhase',
    });
    expect(applyRunAction(shop, { type: 'leaveFight' })).toEqual({ ok: false, error: 'wrongPhase' });
  });
});
