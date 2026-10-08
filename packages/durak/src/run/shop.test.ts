import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { PERKS } from '../perks';
import { buyEnhancement, buyPerk, createShop, MAX_PERKS, rerollShop, sellPerk, sellPrice, type ShopState, type Wallet } from './shop';

const shop: ShopState = {
  offers: [
    { perkId: 'looter', price: 5 },
    { perkId: 'cardSharp', price: 4 },
  ],
  enhancementOffers: [{ enhancementId: 'golden', price: 4, cardIds: ['clubs-7', 'hearts-8', 'spades-9'] }, null],
  rerollCost: 2,
};
const rich: Wallet = { coins: 20, perks: [] };

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe('createShop', () => {
  it('offers two different perks the player does not own, at catalogue prices', () => {
    const [created] = createShop(createRng(3), ['looter', 'thickSkin']);
    expect(created.offers).toHaveLength(2);
    expect(created.rerollCost).toBe(2);
    const ids = created.offers.map((offer) => offer?.perkId);
    expect(new Set(ids).size).toBe(2);
    for (const offer of created.offers) {
      expect(offer).not.toBeNull();
      expect(['looter', 'thickSkin']).not.toContain(offer!.perkId);
      expect(offer!.price).toBe(PERKS[offer!.perkId].price);
    }
  });

  it('is deterministic per seed', () => {
    expect(createShop(createRng(3), [])[0]).toEqual(createShop(createRng(3), [])[0]);
  });
});

describe('buyPerk', () => {
  it('moves the perk into the wallet, takes the price and empties the slot', () => {
    const { shop: after, wallet } = expectOk(buyPerk(shop, rich, 0));
    expect(wallet).toEqual({ coins: 15, perks: ['looter'] });
    expect(after.offers).toEqual([null, { perkId: 'cardSharp', price: 4 }]);
  });

  it('works with exactly enough coins', () => {
    expect(expectOk(buyPerk(shop, { coins: 5, perks: [] }, 0)).wallet.coins).toBe(0);
  });

  it('rejects a missing or sold offer', () => {
    expect(buyPerk(shop, rich, 5)).toEqual({ ok: false, error: 'noOffer' });
    const { shop: after } = expectOk(buyPerk(shop, rich, 0));
    expect(buyPerk(after, rich, 0)).toEqual({ ok: false, error: 'noOffer' });
  });

  it('rejects when coins are short', () => {
    expect(buyPerk(shop, { coins: 4, perks: [] }, 0)).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('reports full slots before missing coins', () => {
    const full: Wallet = { coins: 0, perks: ['thickSkin', 'longArms', 'piggyBank'] };
    expect(full.perks).toHaveLength(MAX_PERKS);
    expect(buyPerk(shop, full, 0)).toEqual({ ok: false, error: 'perkSlotsFull' });
  });
});

describe('sellPerk', () => {
  it('removes the perk and pays half its price rounded down', () => {
    expect(sellPrice('looter')).toBe(2);
    expect(expectOk(sellPerk({ coins: 1, perks: ['looter', 'cardSharp'] }, 'looter'))).toEqual({
      coins: 3,
      perks: ['cardSharp'],
    });
  });

  it('rejects a perk the player does not own', () => {
    expect(sellPerk(rich, 'looter')).toEqual({ ok: false, error: 'perkNotOwned' });
  });
});

describe('rerollShop', () => {
  it('charges the reroll cost, raises it by 1 and offers perks the player does not own', () => {
    const wallet: Wallet = { coins: 5, perks: ['looter'] };
    const { shop: after, wallet: paid } = expectOk(rerollShop(shop, wallet, createRng(9)));
    expect(paid.coins).toBe(3);
    expect(after.rerollCost).toBe(3);
    expect(after.offers.map((offer) => offer?.perkId)).not.toContain('looter');
  });

  it('rejects when coins are short', () => {
    expect(rerollShop(shop, { coins: 1, perks: [] }, createRng(9))).toEqual({ ok: false, error: 'notEnoughCoins' });
  });
});

describe('enhancement offers', () => {
  it('createShop offers two different enhancements, each on 3 different cards', () => {
    const [created] = createShop(createRng(3), []);
    expect(created.enhancementOffers).toHaveLength(2);
    const ids = created.enhancementOffers.map((offer) => offer?.enhancementId);
    expect(new Set(ids).size).toBe(2);
    for (const offer of created.enhancementOffers) {
      expect(new Set(offer!.cardIds).size).toBe(3);
    }
  });

  it('buyEnhancement puts it on the chosen offered card and charges the price', () => {
    const bought = expectOk(buyEnhancement(shop, 10, { 'hearts-8': 'coin' }, 0, 'hearts-8'));
    expect(bought.coins).toBe(6);
    expect(bought.profile).toEqual({ 'hearts-8': 'golden' });
    expect(bought.shop.enhancementOffers[0]).toBeNull();
  });

  it('rejects a card that is not offered, a sold offer and short coins', () => {
    expect(buyEnhancement(shop, 10, {}, 0, 'diamonds-14')).toEqual({ ok: false, error: 'cardNotOffered' });
    expect(buyEnhancement(shop, 10, {}, 1, 'clubs-7')).toEqual({ ok: false, error: 'noOffer' });
    expect(buyEnhancement(shop, 3, {}, 0, 'clubs-7')).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('reroll also renews enhancement offers', () => {
    const { shop: after } = expectOk(rerollShop(shop, { coins: 5, perks: [] }, createRng(9)));
    expect(after.enhancementOffers).toHaveLength(2);
    expect(after.enhancementOffers.every((offer) => offer !== null)).toBe(true);
  });
});
