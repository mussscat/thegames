import { err, ok, shuffle, type Result, type RngState } from '@game/core';
import { PERK_IDS, PERKS, type PerkId } from '../perks';

export const SHOP_OFFER_COUNT = 2;
export const BASE_REROLL_COST = 2;
export const MAX_PERKS = 3;

export type ShopOffer = { readonly perkId: PerkId; readonly price: number };

/** A `null` offer has been bought this visit. */
export type ShopState = { readonly offers: readonly (ShopOffer | null)[]; readonly rerollCost: number };

export type Wallet = { readonly coins: number; readonly perks: readonly PerkId[] };

export type ShopError = 'noOffer' | 'notEnoughCoins' | 'perkSlotsFull' | 'perkNotOwned';

function rollOffers(rng: RngState, owned: readonly PerkId[]): readonly [readonly ShopOffer[], RngState] {
  const pool = PERK_IDS.filter((id) => !owned.includes(id));
  const [shuffled, next] = shuffle(pool, rng);
  const offers = shuffled.slice(0, SHOP_OFFER_COUNT).map((perkId) => ({ perkId, price: PERKS[perkId].price }));
  return [offers, next];
}

export function createShop(rng: RngState, owned: readonly PerkId[]): readonly [ShopState, RngState] {
  const [offers, next] = rollOffers(rng, owned);
  return [{ offers, rerollCost: BASE_REROLL_COST }, next];
}

export function sellPrice(perkId: PerkId): number {
  return Math.floor(PERKS[perkId].price / 2);
}

export function buyPerk(
  shop: ShopState,
  wallet: Wallet,
  index: number,
): Result<{ readonly shop: ShopState; readonly wallet: Wallet }, ShopError> {
  const offer = shop.offers[index];
  if (!offer) return err('noOffer');
  if (wallet.perks.length >= MAX_PERKS) return err('perkSlotsFull');
  if (wallet.coins < offer.price) return err('notEnoughCoins');
  return ok({
    shop: { ...shop, offers: shop.offers.map((current, i) => (i === index ? null : current)) },
    wallet: { coins: wallet.coins - offer.price, perks: [...wallet.perks, offer.perkId] },
  });
}

export function sellPerk(wallet: Wallet, perkId: PerkId): Result<Wallet, ShopError> {
  if (!wallet.perks.includes(perkId)) return err('perkNotOwned');
  return ok({ coins: wallet.coins + sellPrice(perkId), perks: wallet.perks.filter((id) => id !== perkId) });
}

export function rerollShop(
  shop: ShopState,
  wallet: Wallet,
  rng: RngState,
): Result<{ readonly shop: ShopState; readonly wallet: Wallet; readonly rng: RngState }, ShopError> {
  if (wallet.coins < shop.rerollCost) return err('notEnoughCoins');
  const [offers, next] = rollOffers(rng, wallet.perks);
  return ok({
    shop: { offers, rerollCost: shop.rerollCost + 1 },
    wallet: { ...wallet, coins: wallet.coins - shop.rerollCost },
    rng: next,
  });
}
