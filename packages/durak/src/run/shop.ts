import { createDeck, err, ok, shuffle, type Result, type RngState } from '@game/core';
import { ENHANCEMENT_IDS, ENHANCEMENTS, withEnhancement, type DeckProfile, type EnhancementId } from '../enhancements';
import { PERK_IDS, PERKS, type PerkId } from '../perks';

export const SHOP_OFFER_COUNT = 2;
export const BASE_REROLL_COST = 2;
export const MAX_PERKS = 3;
export const ENHANCEMENT_OFFER_COUNT = 2;
export const ENHANCEMENT_CARD_CHOICES = 3;
const DURAK_MIN_RANK = 6;

export type EnhancementOffer = {
  readonly enhancementId: EnhancementId;
  readonly price: number;
  /** The player picks one of these cards to carry the enhancement. */
  readonly cardIds: readonly string[];
};

export type ShopOffer = { readonly perkId: PerkId; readonly price: number };

/** A `null` offer has been bought this visit. */
export type ShopState = {
  readonly offers: readonly (ShopOffer | null)[];
  readonly enhancementOffers: readonly (EnhancementOffer | null)[];
  readonly rerollCost: number;
};

export type Wallet = { readonly coins: number; readonly perks: readonly PerkId[] };

export type ShopError = 'noOffer' | 'notEnoughCoins' | 'perkSlotsFull' | 'perkNotOwned' | 'cardNotOffered';

function rollOffers(rng: RngState, owned: readonly PerkId[]): readonly [readonly ShopOffer[], RngState] {
  const pool = PERK_IDS.filter((id) => !owned.includes(id));
  const [shuffled, next] = shuffle(pool, rng);
  const offers = shuffled.slice(0, SHOP_OFFER_COUNT).map((perkId) => ({ perkId, price: PERKS[perkId].price }));
  return [offers, next];
}

function rollEnhancementOffers(rng: RngState): readonly [readonly EnhancementOffer[], RngState] {
  const [ids, afterIds] = shuffle(ENHANCEMENT_IDS, rng);
  return ids.slice(0, ENHANCEMENT_OFFER_COUNT).reduce<readonly [readonly EnhancementOffer[], RngState]>(
    ([offers, current], enhancementId) => {
      const [cards, next] = shuffle(createDeck(DURAK_MIN_RANK), current);
      const cardIds = cards.slice(0, ENHANCEMENT_CARD_CHOICES).map((card) => card.id);
      return [[...offers, { enhancementId, price: ENHANCEMENTS[enhancementId].price, cardIds }], next];
    },
    [[], afterIds],
  );
}

export function createShop(rng: RngState, owned: readonly PerkId[]): readonly [ShopState, RngState] {
  const [offers, afterPerks] = rollOffers(rng, owned);
  const [enhancementOffers, next] = rollEnhancementOffers(afterPerks);
  return [{ offers, enhancementOffers, rerollCost: BASE_REROLL_COST }, next];
}

export function buyEnhancement(
  shop: ShopState,
  coins: number,
  profile: DeckProfile,
  index: number,
  cardId: string,
): Result<{ readonly shop: ShopState; readonly coins: number; readonly profile: DeckProfile }, ShopError> {
  const offer = shop.enhancementOffers[index];
  if (!offer) return err('noOffer');
  if (!offer.cardIds.includes(cardId)) return err('cardNotOffered');
  if (coins < offer.price) return err('notEnoughCoins');
  return ok({
    shop: { ...shop, enhancementOffers: shop.enhancementOffers.map((current, i) => (i === index ? null : current)) },
    coins: coins - offer.price,
    profile: withEnhancement(profile, cardId, offer.enhancementId),
  });
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
  const [enhancementOffers, afterEnhancements] = rollEnhancementOffers(next);
  return ok({
    shop: { offers, enhancementOffers, rerollCost: shop.rerollCost + 1 },
    wallet: { ...wallet, coins: wallet.coins - shop.rerollCost },
    rng: afterEnhancements,
  });
}
