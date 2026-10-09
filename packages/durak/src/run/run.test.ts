import { describe, expect, it } from 'vitest';
import { RUN_SCHEDULE } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { applyRunAction, createRun, enemyAt, PLAYER_HP, stageEnemy, stageLabel, type RunState } from './run';
import type { ShopState } from './shop';

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
  it('starts the first fight with full player HP and no coins or jokers', () => {
    const run = createRun(1);
    expect(run.stage).toBe(0);
    expect(run.coins).toBe(0);
    expect(run.jokers).toEqual([]);
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
    expect(applyRunAction(run, { type: 'sellJoker', jokerId: 'looter' })).toEqual({ ok: false, error: 'wrongPhase' });
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
    expect(shop.phase.shop.items).toHaveLength(2);
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

function withShop(run: RunState, patch: Partial<ShopState>): RunState {
  if (run.phase.kind !== 'shop') throw new Error('not in shop');
  return { ...run, phase: { ...run.phase, shop: { ...run.phase.shop, ...patch } } };
}

describe('shop phase', () => {
  it('buying a joker item spends coins and carries the joker into the next fight', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 50 }, { items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, null] });
    const bought = expectOk(applyRunAction(shop, { type: 'buyItem', index: 0 }));
    expect(bought.jokers).toEqual(['clubs']);
    expect(bought.coins).toBe(46);
    const next = expectOk(applyRunAction(bought, { type: 'leaveShop' }));
    expect(next.stage).toBe(1);
    expect(next.phase.kind === 'fight' && next.phase.fight.jokers.player).toEqual(['clubs']);
    expect(next.phase.kind === 'fight' && next.phase.fight.hp).toEqual({ player: PLAYER_HP, enemy: enemyAt(1).hp });
  });

  it('selling and rerolling update coins', () => {
    const shop = { ...inShop(createRun(1)), jokers: ['looter' as const] };
    const sold = expectOk(applyRunAction(shop, { type: 'sellJoker', jokerId: 'looter' }));
    expect(sold.jokers).toEqual([]);
    expect(sold.coins).toBe(shop.coins + 2);
    const rerolled = expectOk(applyRunAction(sold, { type: 'reroll' }));
    expect(rerolled.coins).toBe(sold.coins - 2);
  });

  it('passes shop errors through', () => {
    const broke = { ...inShop(createRun(1)), coins: 0 };
    expect(applyRunAction(broke, { type: 'buyItem', index: 0 })).toEqual({ ok: false, error: 'notEnoughCoins' });
    expect(applyRunAction(broke, { type: 'buyPack', index: 0 })).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('an open pack blocks leaving and rerolling until it is picked from or skipped', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 50 }, { packs: [{ kind: 'jokers', size: 'normal', price: 4 }, null] });
    const opened = expectOk(applyRunAction(shop, { type: 'buyPack', index: 0 }));
    expect(applyRunAction(opened, { type: 'leaveShop' })).toEqual({ ok: false, error: 'packOpen' });
    expect(applyRunAction(opened, { type: 'reroll' })).toEqual({ ok: false, error: 'packOpen' });
    const skipped = expectOk(applyRunAction(opened, { type: 'skipPack' }));
    expect(skipped.coins).toBe(46);
    expect(expectOk(applyRunAction(skipped, { type: 'leaveShop' })).stage).toBe(1);
  });

  it('a shelf tarot waits for targets, blocks leaving, and is cast or skipped', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 50 }, { items: [{ card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }, null] });
    const bought = expectOk(applyRunAction(shop, { type: 'buyItem', index: 0 }));
    if (bought.phase.kind !== 'shop' || !bought.phase.shop.casting) throw new Error('no tarot waiting');
    expect(bought.coins).toBe(47);
    expect(applyRunAction(bought, { type: 'leaveShop' })).toEqual({ ok: false, error: 'tarotPending' });
    const [first] = bought.phase.shop.casting.hand;
    const cast = expectOk(applyRunAction(bought, { type: 'castTarot', targets: [first!] }));
    expect(cast.profile).toEqual({ [first!]: 'golden' });
    const skipped = expectOk(applyRunAction(bought, { type: 'skipTarot' }));
    expect(skipped.coins).toBe(47);
    expect(skipped.profile).toEqual({});
    expect(expectOk(applyRunAction(skipped, { type: 'leaveShop' })).stage).toBe(1);
  });

  it('rejects fight actions in the shop and shop actions in a fight', () => {
    const shop = inShop(createRun(1));
    expect(applyRunAction(shop, { type: 'fight', actor: 'enemy', action: { type: 'take' } })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(shop, { type: 'leaveFight' })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(createRun(1), { type: 'buyItem', index: 0 })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(createRun(1), { type: 'skipPack' })).toEqual({ ok: false, error: 'wrongPhase' });
  });
});

describe('bosses', () => {
  it('picks a different boss for each circle', () => {
    const run = createRun(1);
    expect(run.bosses).toHaveLength(2);
    expect(new Set(run.bosses).size).toBe(2);
  });

  it('boss stages fight under the circle boss rule and use its name', () => {
    const run = createRun(1);
    const boss = run.bosses[0]!;
    expect(stageEnemy(run, 2)).toMatchObject({ name: BOSSES[boss].name, tier: 'boss', boss });
    expect(stageEnemy(run, 0).boss).toBeNull();
    const atBoss = expectOk(applyRunAction({ ...inShop(createRun(1)), stage: 1 }, { type: 'leaveShop' }));
    expect(atBoss.phase.kind === 'fight' && atBoss.phase.fight.boss).toBe(boss);
  });

  it('regular stages fight without a boss rule', () => {
    const run = createRun(1);
    expect(run.phase.kind === 'fight' && run.phase.fight.boss).toBeNull();
  });
});

describe('deck profiles in a run', () => {
  it('starts with an empty player profile and gives every enemy its own profile', () => {
    const run = createRun(1);
    expect(run.profile).toEqual({});
    expect(run.phase.kind === 'fight' && run.phase.fight.round.profiles).toEqual({ player: {}, enemy: enemyAt(0).profile });
    expect(Object.keys(enemyAt(5).profile).length).toBeGreaterThan(Object.keys(enemyAt(0).profile).length);
  });

  it('a card picked from a deck pack lands in the profile and in the next fight', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 20 }, { packs: [{ kind: 'deck', size: 'normal', price: 4 }, null] });
    const opened = expectOk(applyRunAction(shop, { type: 'buyPack', index: 0 }));
    if (opened.phase.kind !== 'shop' || !opened.phase.shop.opened) throw new Error('no pack open');
    const card = opened.phase.shop.opened.cards[0];
    if (card?.kind !== 'card') throw new Error('not a deck card');
    const picked = expectOk(applyRunAction(opened, { type: 'pickFromPack', index: 0, targets: [] }));
    expect(picked.profile).toEqual({ [card.cardId]: card.enhancement });
    expect(picked.phase.kind === 'shop' && picked.phase.shop.opened).toBeNull();
    const next = expectOk(applyRunAction(picked, { type: 'leaveShop' }));
    expect(next.phase.kind === 'fight' && next.phase.fight.round.profiles.player).toEqual({ [card.cardId]: card.enhancement });
  });
});

describe('jokers in the run', () => {
  it('moveJoker reorders the run jokers and the current fight uses the new order', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const jokers = ['clubs', 'gloat'] as const;
    const fighting: RunState = { ...run, jokers, phase: { kind: 'fight', fight: { ...run.phase.fight, jokers: { player: jokers, enemy: [] } } } };
    const moved = expectOk(applyRunAction(fighting, { type: 'moveJoker', from: 0, to: 1 }));
    expect(moved.jokers).toEqual(['gloat', 'clubs']);
    expect(moved.phase.kind === 'fight' && moved.phase.fight.jokers.player).toEqual(['gloat', 'clubs']);
  });

  it('carries Коллекционер growth from a won fight into the run', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const fight = { ...run.phase.fight, winner: 'player' as const, jokerState: { ...run.phase.fight.jokerState, player: { rage: 0, cleanStreak: 0, collected: 4 } } };
    const left = expectOk(applyRunAction({ ...run, phase: { kind: 'fight', fight } }, { type: 'leaveFight' }));
    expect(left.collected).toBe(4);
  });
});
