import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { JOKERS } from '../jokers/catalog';
import {
  buyItem,
  buyPack,
  castShopTarot,
  createShop,
  moveJoker,
  pickFromPack,
  priceOf,
  rerollShop,
  sellJoker,
  sellPrice,
  skipPack,
  skipTarot,
  type OpenedPack,
  type Purse,
  type ShopState,
} from './shop';

const purse = (patch: Partial<Purse> = {}): Purse => ({ coins: 20, jokers: [], profile: {}, rng: createRng(7), ...patch });
const FULL = ['clubs', 'hearts', 'spades', 'diamonds', 'small'] as const;
const HAND = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];

const shop: ShopState = {
  items: [
    { card: { kind: 'joker', jokerId: 'looter' }, price: 5 },
    { card: { kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, price: 5 },
  ],
  packs: [
    { kind: 'jokers', size: 'normal', price: 4 },
    { kind: 'arcana', size: 'mega', price: 8 },
  ],
  rerollCost: 2,
  opened: null,
  casting: null,
};

const opened = (patch: Partial<OpenedPack>): ShopState => ({ ...shop, opened: { kind: 'jokers', cards: [], picksLeft: 1, hand: [], ...patch } });
const casting: ShopState = { ...shop, casting: { tarotId: 'sun', hand: HAND } };

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe('createShop', () => {
  it('stocks 2 items and 2 packs, no pack open, reroll at 2', () => {
    const [created] = createShop(createRng(3), ['looter'], {});
    expect(created.items).toHaveLength(2);
    expect(created.items.every((item) => item !== null)).toBe(true);
    expect(created.packs).toHaveLength(2);
    expect(created.packs.every((pack) => pack !== null)).toBe(true);
    expect(created.opened).toBeNull();
    expect(created.casting).toBeNull();
    expect(created.rerollCost).toBe(2);
  });

  it('never offers an owned joker or the same joker twice', () => {
    for (let seed = 0; seed < 60; seed++) {
      const [created] = createShop(createRng(seed), ['looter'], {});
      const jokers = created.items.flatMap((item) => (item?.card.kind === 'joker' ? [item.card.jokerId] : []));
      expect(jokers).not.toContain('looter');
      expect(new Set(jokers).size).toBe(jokers.length);
    }
  });

  it('is deterministic for a seed', () => {
    expect(createShop(createRng(9), [], {})).toEqual(createShop(createRng(9), [], {}));
  });
});

describe('priceOf', () => {
  it('prices jokers by the catalogue, tarots at 3 and cards at the enhancement price + 1', () => {
    expect(priceOf({ kind: 'joker', jokerId: 'looter' })).toBe(JOKERS.looter.price);
    expect(priceOf({ kind: 'tarot', tarotId: 'sun' })).toBe(3);
    expect(priceOf({ kind: 'card', cardId: 'clubs-6', enhancement: 'golden' })).toBe(5);
  });
});

describe('buyItem', () => {
  it('buys a joker', () => {
    const { shop: after, purse: paid } = expectOk(buyItem(shop, purse(), 0));
    expect(paid.jokers).toEqual(['looter']);
    expect(paid.coins).toBe(15);
    expect(after.items[0]).toBeNull();
  });

  it('buys an enhanced card into the profile, replacing another enhancement', () => {
    const { purse: paid } = expectOk(buyItem(shop, purse({ profile: { 'hearts-14': 'sharp' } }), 1));
    expect(paid.profile).toEqual({ 'hearts-14': 'golden' });
  });

  it('a tarot with targets is paid and sold at once, then waits in `casting` with a hand of 5 — no pack opens', () => {
    const tarotShop: ShopState = { ...shop, items: [{ card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }, null] };
    const { shop: after, purse: paid } = expectOk(buyItem(tarotShop, purse(), 0));
    expect(after.opened).toBeNull();
    expect(after.items[0]).toBeNull();
    expect(after.casting?.tarotId).toBe('sun');
    expect(after.casting?.hand).toHaveLength(5);
    expect(paid.coins).toBe(17);
  });

  it('Отшельник from the shelf works at once, with nothing left waiting', () => {
    const hermitShop: ShopState = { ...shop, items: [{ card: { kind: 'tarot', tarotId: 'hermit' }, price: 3 }, null] };
    const { shop: after, purse: paid } = expectOk(buyItem(hermitShop, purse(), 0));
    expect(after.casting).toBeNull();
    expect(paid.coins).toBe(17 + 10);
  });

  it('refuses a sold slot, a short purse, full joker slots, an open pack and a waiting tarot', () => {
    expect(buyItem({ ...shop, items: [null, null] }, purse(), 0)).toEqual({ ok: false, error: 'noOffer' });
    expect(buyItem(shop, purse({ coins: 1 }), 0)).toEqual({ ok: false, error: 'notEnoughCoins' });
    expect(buyItem(shop, purse({ jokers: FULL }), 0)).toEqual({ ok: false, error: 'jokerSlotsFull' });
    expect(buyItem(opened({}), purse(), 0)).toEqual({ ok: false, error: 'packOpen' });
    expect(buyItem(casting, purse(), 0)).toEqual({ ok: false, error: 'tarotPending' });
  });
});

describe('a shelf tarot waiting for targets', () => {
  it('is cast on targets from its hand and stops waiting', () => {
    const { shop: after, purse: next } = expectOk(castShopTarot(casting, purse(), ['clubs-7', 'clubs-10']));
    expect(next.profile).toEqual({ 'clubs-7': 'golden', 'clubs-10': 'golden' });
    expect(after.casting).toBeNull();
  });

  it('refuses targets outside the hand or of the wrong count, and keeps waiting', () => {
    expect(castShopTarot(casting, purse(), ['hearts-14'])).toEqual({ ok: false, error: 'cardNotOffered' });
    expect(castShopTarot(casting, purse(), [])).toEqual({ ok: false, error: 'badTargets' });
  });

  it('can be skipped — the money stays spent', () => {
    expect(expectOk(skipTarot(casting)).casting).toBeNull();
  });

  it('refuses cast and skip when nothing waits', () => {
    expect(castShopTarot(shop, purse(), ['clubs-7'])).toEqual({ ok: false, error: 'noTarotPending' });
    expect(skipTarot(shop)).toEqual({ ok: false, error: 'noTarotPending' });
  });

  it('blocks packs and rerolls while waiting', () => {
    expect(buyPack(casting, purse(), 0)).toEqual({ ok: false, error: 'tarotPending' });
    expect(rerollShop(casting, purse())).toEqual({ ok: false, error: 'tarotPending' });
  });
});

describe('buyPack', () => {
  it('opens a joker pack of 3 unowned jokers, pick 1, no hand', () => {
    const { shop: after, purse: paid } = expectOk(buyPack(shop, purse({ jokers: ['clubs'] }), 0));
    expect(after.packs[0]).toBeNull();
    expect(paid.coins).toBe(16);
    expect(after.opened?.kind).toBe('jokers');
    expect(after.opened?.cards).toHaveLength(3);
    expect(after.opened?.picksLeft).toBe(1);
    expect(after.opened?.hand).toEqual([]);
    expect(after.opened?.cards.some((card) => card?.kind === 'joker' && card.jokerId === 'clubs')).toBe(false);
  });

  it('opens a mega arcana of 5 tarots, pick 2, with a hand', () => {
    const { shop: after } = expectOk(buyPack(shop, purse(), 1));
    expect(after.opened?.cards).toHaveLength(5);
    expect(after.opened?.picksLeft).toBe(2);
    expect(after.opened?.hand).toHaveLength(5);
  });

  it('refuses while another pack is open, and when short of coins', () => {
    expect(buyPack(opened({}), purse(), 0)).toEqual({ ok: false, error: 'packOpen' });
    expect(buyPack(shop, purse({ coins: 3 }), 0)).toEqual({ ok: false, error: 'notEnoughCoins' });
  });
});

describe('pickFromPack', () => {
  const jokerPack = opened({ cards: [{ kind: 'joker', jokerId: 'gloat' }, { kind: 'joker', jokerId: 'rage' }] });

  it('takes a joker and closes the pack', () => {
    const { shop: after, purse: next } = expectOk(pickFromPack(jokerPack, purse(), 1, []));
    expect(next.jokers).toEqual(['rage']);
    expect(after.opened).toBeNull();
  });

  it('a full joker row refuses the pick until a joker is sold', () => {
    expect(pickFromPack(jokerPack, purse({ jokers: FULL }), 0, [])).toEqual({ ok: false, error: 'jokerSlotsFull' });
    const sold = expectOk(sellJoker({ coins: 20, jokers: FULL }, 'clubs'));
    const { purse: next } = expectOk(pickFromPack(jokerPack, purse(sold), 0, []));
    expect(next.jokers).toEqual(['hearts', 'spades', 'diamonds', 'small', 'gloat']);
  });

  it('a mega pack takes two picks, marking the taken card', () => {
    const mega = opened({ cards: [{ kind: 'joker', jokerId: 'gloat' }, { kind: 'joker', jokerId: 'rage' }, { kind: 'joker', jokerId: 'mirror' }], picksLeft: 2 });
    const first = expectOk(pickFromPack(mega, purse(), 0, []));
    expect(first.shop.opened).toMatchObject({ picksLeft: 1, cards: [null, { jokerId: 'rage' }, { jokerId: 'mirror' }] });
    expect(pickFromPack(first.shop, first.purse, 0, [])).toEqual({ ok: false, error: 'noOffer' });
    const second = expectOk(pickFromPack(first.shop, first.purse, 2, []));
    expect(second.shop.opened).toBeNull();
    expect(second.purse.jokers).toEqual(['gloat', 'mirror']);
  });

  it('a deck card lands in the profile', () => {
    const deck = opened({ kind: 'deck', cards: [{ kind: 'card', cardId: 'spades-9', enhancement: 'trump' }] });
    expect(expectOk(pickFromPack(deck, purse(), 0, [])).purse.profile).toEqual({ 'spades-9': 'trump' });
  });

  it('a tarot is cast on targets from the hand only', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'sun' }], hand: HAND });
    expect(expectOk(pickFromPack(arcana, purse(), 0, ['clubs-6', 'clubs-9'])).purse.profile).toEqual({ 'clubs-6': 'golden', 'clubs-9': 'golden' });
    expect(pickFromPack(arcana, purse(), 0, ['hearts-14'])).toEqual({ ok: false, error: 'cardNotOffered' });
    expect(pickFromPack(arcana, purse(), 0, ['clubs-6', 'clubs-7', 'clubs-8'])).toEqual({ ok: false, error: 'badTargets' });
  });

  it('Смерть with an unenhanced source is refused', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'death' }], hand: HAND });
    expect(pickFromPack(arcana, purse(), 0, ['clubs-6', 'clubs-7'])).toEqual({ ok: false, error: 'badTargets' });
  });

  it('a tarot result keeps the purse shape (no extra fields)', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'hermit' }], hand: HAND });
    expect(Object.keys(expectOk(pickFromPack(arcana, purse(), 0, [])).purse).sort()).toEqual(['coins', 'jokers', 'profile', 'rng']);
  });

  it('refuses when no pack is open', () => {
    expect(pickFromPack(shop, purse(), 0, [])).toEqual({ ok: false, error: 'noPackOpen' });
  });
});

describe('skipPack', () => {
  it('closes the open pack with no refund', () => {
    expect(expectOk(skipPack(opened({}))).opened).toBeNull();
    expect(skipPack(shop)).toEqual({ ok: false, error: 'noPackOpen' });
  });
});

describe('rerollShop', () => {
  it('rerolls only the items, keeps the packs, and costs one more next time', () => {
    const { shop: after, purse: paid } = expectOk(rerollShop({ ...shop, packs: [shop.packs[0] ?? null, null] }, purse()));
    expect(after.packs).toEqual([shop.packs[0], null]);
    expect(after.items).toHaveLength(2);
    expect(after.rerollCost).toBe(3);
    expect(paid.coins).toBe(18);
    expect(paid.rng).not.toEqual(purse().rng);
  });

  it('refuses while a pack is open or when short of coins', () => {
    expect(rerollShop(opened({}), purse())).toEqual({ ok: false, error: 'packOpen' });
    expect(rerollShop(shop, purse({ coins: 1 }))).toEqual({ ok: false, error: 'notEnoughCoins' });
  });
});

describe('selling and moving jokers', () => {
  it('sells for half the price', () => {
    expect(sellPrice('looter')).toBe(Math.floor(JOKERS.looter.price / 2));
    expect(expectOk(sellJoker({ coins: 1, jokers: ['looter'] }, 'looter'))).toEqual({ coins: 1 + sellPrice('looter'), jokers: [] });
    expect(sellJoker({ coins: 1, jokers: [] }, 'looter')).toEqual({ ok: false, error: 'jokerNotOwned' });
  });

  it('moves a joker to another slot', () => {
    expect(expectOk(moveJoker(['clubs', 'gloat', 'rage'], 0, 2))).toEqual(['gloat', 'rage', 'clubs']);
    expect(moveJoker(['clubs'], 0, 3)).toEqual({ ok: false, error: 'jokerNotOwned' });
  });
});
