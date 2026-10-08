import { createDeck, err, nextInt, ok, shuffle, type Result, type RngState } from '@game/core';
import { ENHANCEMENT_IDS, ENHANCEMENTS, withEnhancement, type DeckProfile, type EnhancementId } from '../enhancements';
import { JOKER_IDS, JOKERS, MAX_JOKERS, RARITY_WEIGHT, type JokerId } from '../jokers/catalog';

export const SHOP_OFFER_COUNT = 2;
export const BASE_REROLL_COST = 2;
export const ENHANCEMENT_OFFER_COUNT = 2;
export const ENHANCEMENT_CARD_CHOICES = 3;
const DURAK_MIN_RANK = 6;

export type EnhancementOffer = {
  readonly enhancementId: EnhancementId;
  readonly price: number;
  /** The player picks one of these cards to carry the enhancement. */
  readonly cardIds: readonly string[];
};

export type ShopOffer = { readonly jokerId: JokerId; readonly price: number };

/** A `null` offer has been bought this visit. */
export type ShopState = {
  readonly offers: readonly (ShopOffer | null)[];
  readonly enhancementOffers: readonly (EnhancementOffer | null)[];
  readonly rerollCost: number;
};

export type Wallet = { readonly coins: number; readonly jokers: readonly JokerId[] };

export type ShopError = 'noOffer' | 'notEnoughCoins' | 'jokerSlotsFull' | 'jokerNotOwned' | 'cardNotOffered';

const weightOf = (id: JokerId): number => RARITY_WEIGHT[JOKERS[id].rarity];

function pickWeighted(pool: readonly JokerId[], rng: RngState): readonly [JokerId, RngState] {
  const total = pool.reduce((sum, id) => sum + weightOf(id), 0);
  const [roll, next] = nextInt(rng, total);
  const cumulative = pool.reduce<readonly number[]>((acc, id) => [...acc, (acc[acc.length - 1] ?? 0) + weightOf(id)], []);
  const index = cumulative.findIndex((bound) => roll < bound);
  return [pool[index] ?? (pool[0] as JokerId), next];
}

type Draw = readonly [readonly ShopOffer[], readonly JokerId[], RngState];

function rollOffers(rng: RngState, owned: readonly JokerId[]): readonly [readonly ShopOffer[], RngState] {
  const start: Draw = [[], JOKER_IDS.filter((id) => !owned.includes(id)), rng];
  const [offers, , next] = Array.from({ length: SHOP_OFFER_COUNT }).reduce<Draw>(([acc, pool, current]) => {
    if (pool.length === 0) return [acc, pool, current];
    const [jokerId, after] = pickWeighted(pool, current);
    return [[...acc, { jokerId, price: JOKERS[jokerId].price }], pool.filter((id) => id !== jokerId), after];
  }, start);
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

export function createShop(rng: RngState, owned: readonly JokerId[]): readonly [ShopState, RngState] {
  const [offers, afterJokers] = rollOffers(rng, owned);
  const [enhancementOffers, next] = rollEnhancementOffers(afterJokers);
  return [{ offers, enhancementOffers, rerollCost: BASE_REROLL_COST }, next];
}

export function sellPrice(jokerId: JokerId): number {
  return Math.floor(JOKERS[jokerId].price / 2);
}

export function buyJoker(shop: ShopState, wallet: Wallet, index: number): Result<{ readonly shop: ShopState; readonly wallet: Wallet }, ShopError> {
  const offer = shop.offers[index];
  if (!offer) return err('noOffer');
  if (wallet.jokers.length >= MAX_JOKERS) return err('jokerSlotsFull');
  if (wallet.coins < offer.price) return err('notEnoughCoins');
  return ok({
    shop: { ...shop, offers: shop.offers.map((current, i) => (i === index ? null : current)) },
    wallet: { coins: wallet.coins - offer.price, jokers: [...wallet.jokers, offer.jokerId] },
  });
}

export function sellJoker(wallet: Wallet, jokerId: JokerId): Result<Wallet, ShopError> {
  if (!wallet.jokers.includes(jokerId)) return err('jokerNotOwned');
  return ok({ coins: wallet.coins + sellPrice(jokerId), jokers: wallet.jokers.filter((id) => id !== jokerId) });
}

/** Moves the joker at `from` to slot `to` (both within the owned jokers). */
export function moveJoker(jokers: readonly JokerId[], from: number, to: number): Result<readonly JokerId[], ShopError> {
  const moving = jokers[from];
  if (moving === undefined || to < 0 || to >= jokers.length) return err('jokerNotOwned');
  const without = jokers.filter((_, i) => i !== from);
  return ok([...without.slice(0, to), moving, ...without.slice(to)]);
}

export function rerollShop(
  shop: ShopState,
  wallet: Wallet,
  rng: RngState,
): Result<{ readonly shop: ShopState; readonly wallet: Wallet; readonly rng: RngState }, ShopError> {
  if (wallet.coins < shop.rerollCost) return err('notEnoughCoins');
  const [offers, next] = rollOffers(rng, wallet.jokers);
  const [enhancementOffers, afterEnhancements] = rollEnhancementOffers(next);
  return ok({
    shop: { offers, enhancementOffers, rerollCost: shop.rerollCost + 1 },
    wallet: { ...wallet, coins: wallet.coins - shop.rerollCost },
    rng: afterEnhancements,
  });
}
