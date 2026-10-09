import { err, ok, type Result, type RngState } from '@game/core';
import { ENHANCEMENTS, withEnhancement, type DeckProfile } from '../enhancements';
import { JOKER_IDS, JOKERS, MAX_JOKERS, type JokerId } from '../jokers/catalog';
import {
  jokerWeight,
  PACK_SIZE_DEFS,
  rollDeckCard,
  rollPack,
  rollPackCards,
  rollTarotHand,
  tarotPool,
  tarotWeight,
  type Pack,
  type PackCard,
  type PackKind,
} from '../shop/packs';
import { applyTarot, TAROT_PRICE, TAROTS, type TarotId, type TarotSubject } from '../shop/tarot';
import { pickWeighted } from '../shop/weighted';

export const SHOP_ITEM_COUNT = 2;
export const SHOP_PACK_COUNT = 2;
export const BASE_REROLL_COST = 2;

const ITEM_KINDS = ['joker', 'tarot', 'card'] as const;
export const ITEM_KIND_WEIGHT: Readonly<Record<PackCard['kind'], number>> = { joker: 60, tarot: 25, card: 15 };

export type ShopItem = { readonly card: PackCard; readonly price: number };

/** A bought pack being chosen from; `hand` — the cards tarots can target (arcana only). */
export type OpenedPack = {
  readonly kind: PackKind;
  readonly cards: readonly (PackCard | null)[];
  readonly picksLeft: number;
  readonly hand: readonly string[];
};

/** A tarot bought from the shelf, paid and sold, waiting for «Применить» / «Пропустить» on its hand. */
export type TarotCast = { readonly tarotId: TarotId; readonly hand: readonly string[] };

/** A `null` item or pack has been bought this visit. */
export type ShopState = {
  readonly items: readonly (ShopItem | null)[];
  readonly packs: readonly (Pack | null)[];
  readonly rerollCost: number;
  readonly opened: OpenedPack | null;
  readonly casting: TarotCast | null;
};

/** What the shop spends and changes: coins, jokers, the deck profile and the run rng. */
export type Purse = TarotSubject;
export type Wallet = { readonly coins: number; readonly jokers: readonly JokerId[] };
export type ShopStep = { readonly shop: ShopState; readonly purse: Purse };

export type ShopError =
  | 'noOffer'
  | 'notEnoughCoins'
  | 'jokerSlotsFull'
  | 'jokerOwned'
  | 'jokerNotOwned'
  | 'cardNotOffered'
  | 'packOpen'
  | 'noPackOpen'
  | 'tarotPending'
  | 'noTarotPending'
  | 'badTargets';

/** An open pack or a waiting shelf tarot must be finished first. */
function busy(shop: ShopState): ShopError | null {
  if (shop.opened) return 'packOpen';
  if (shop.casting) return 'tarotPending';
  return null;
}

export function priceOf(card: PackCard): number {
  switch (card.kind) {
    case 'joker':
      return JOKERS[card.jokerId].price;
    case 'tarot':
      return TAROT_PRICE;
    case 'card':
      return ENHANCEMENTS[card.enhancement].price + 1;
  }
}

type Taken = { readonly jokers: readonly JokerId[]; readonly cardIds: readonly string[] };

function rollTarot(rng: RngState, profile: DeckProfile): readonly [PackCard | null, RngState] {
  const [tarotId, next] = pickWeighted<TarotId>(tarotPool(profile), tarotWeight, rng);
  return [tarotId ? { kind: 'tarot', tarotId } : null, next];
}

function rollItemCard(rng: RngState, taken: Taken, profile: DeckProfile): readonly [PackCard | null, RngState] {
  const [kind, afterKind] = pickWeighted(ITEM_KINDS, (k) => ITEM_KIND_WEIGHT[k], rng);
  if (kind === 'card') return rollDeckCard(afterKind, profile, taken.cardIds);
  if (kind === 'joker') {
    const [jokerId, next] = pickWeighted(JOKER_IDS.filter((id) => !taken.jokers.includes(id)), jokerWeight, afterKind);
    return jokerId ? [{ kind: 'joker', jokerId }, next] : rollTarot(next, profile);
  }
  return rollTarot(afterKind, profile);
}

function takenAfter(taken: Taken, card: PackCard | null): Taken {
  if (card?.kind === 'joker') return { ...taken, jokers: [...taken.jokers, card.jokerId] };
  if (card?.kind === 'card') return { ...taken, cardIds: [...taken.cardIds, card.cardId] };
  return taken;
}

type ItemDraw = readonly [readonly (ShopItem | null)[], Taken, RngState];

function rollItems(rng: RngState, owned: readonly JokerId[], profile: DeckProfile): readonly [readonly (ShopItem | null)[], RngState] {
  const [items, , next] = Array.from({ length: SHOP_ITEM_COUNT }).reduce<ItemDraw>(
    ([acc, taken, current]) => {
      const [card, after] = rollItemCard(current, taken, profile);
      return [[...acc, card ? { card, price: priceOf(card) } : null], takenAfter(taken, card), after];
    },
    [[], { jokers: owned, cardIds: [] }, rng],
  );
  return [items, next];
}

function rollPacks(rng: RngState): readonly [readonly Pack[], RngState] {
  return Array.from({ length: SHOP_PACK_COUNT }).reduce<readonly [readonly Pack[], RngState]>(
    ([packs, current]) => {
      const [pack, next] = rollPack(current);
      return [[...packs, pack], next];
    },
    [[], rng],
  );
}

export function createShop(rng: RngState, owned: readonly JokerId[], profile: DeckProfile): readonly [ShopState, RngState] {
  const [items, afterItems] = rollItems(rng, owned, profile);
  const [packs, next] = rollPacks(afterItems);
  return [{ items, packs, rerollCost: BASE_REROLL_COST, opened: null, casting: null }, next];
}

function emptied<T>(list: readonly (T | null)[], index: number): readonly (T | null)[] {
  return list.map((entry, i) => (i === index ? null : entry));
}

/** A joker or an enhanced card goes straight into the purse; tarots are cast, never taken. */
function take(purse: Purse, card: PackCard): Result<Purse, ShopError> {
  if (card.kind === 'joker') {
    if (purse.jokers.includes(card.jokerId)) return err('jokerOwned');
    if (purse.jokers.length >= MAX_JOKERS) return err('jokerSlotsFull');
    return ok({ ...purse, jokers: [...purse.jokers, card.jokerId] });
  }
  if (card.kind === 'card') return ok({ ...purse, profile: withEnhancement(purse.profile, card.cardId, card.enhancement) });
  return err('badTargets');
}

function openArcana(cards: readonly PackCard[], picksLeft: number, rng: RngState, profile: DeckProfile): readonly [OpenedPack, RngState] {
  const [hand, next] = rollTarotHand(rng, profile);
  return [{ kind: 'arcana', cards, picksLeft, hand }, next];
}

/** A shelf tarot is paid and sold at once; with targets it waits in `casting`, without them it is cast right away. */
function buyTarot(shop: ShopState, paid: Purse, items: ShopState['items'], tarotId: TarotId): Result<ShopStep, ShopError> {
  if (TAROTS[tarotId].maxTargets === 0) {
    const cast = castTarot(paid, tarotId, [], []);
    return cast.ok ? ok({ shop: { ...shop, items }, purse: cast.value }) : cast;
  }
  const [hand, rng] = rollTarotHand(paid.rng, paid.profile);
  return ok({ shop: { ...shop, items, casting: { tarotId, hand } }, purse: { ...paid, rng } });
}

export function buyItem(shop: ShopState, purse: Purse, index: number): Result<ShopStep, ShopError> {
  const blocked = busy(shop);
  if (blocked) return err(blocked);
  const item = shop.items[index];
  if (!item) return err('noOffer');
  if (purse.coins < item.price) return err('notEnoughCoins');
  const paid: Purse = { ...purse, coins: purse.coins - item.price };
  const items = emptied(shop.items, index);
  if (item.card.kind === 'tarot') return buyTarot(shop, paid, items, item.card.tarotId);
  const taken = take(paid, item.card);
  return taken.ok ? ok({ shop: { ...shop, items }, purse: taken.value }) : taken;
}

export function buyPack(shop: ShopState, purse: Purse, index: number): Result<ShopStep, ShopError> {
  const blocked = busy(shop);
  if (blocked) return err(blocked);
  const pack = shop.packs[index];
  if (!pack) return err('noOffer');
  if (purse.coins < pack.price) return err('notEnoughCoins');
  // Jokers already on the shelf stay out of the pack, so one joker can never be owned twice.
  const shelfJokers = shop.items.flatMap((item) => (item?.card.kind === 'joker' ? [item.card.jokerId] : []));
  const [cards, afterCards] = rollPackCards(purse.rng, pack, [...purse.jokers, ...shelfJokers], purse.profile);
  const picksLeft = PACK_SIZE_DEFS[pack.size].picks;
  const packs = emptied(shop.packs, index);
  const coins = purse.coins - pack.price;
  if (pack.kind === 'arcana') {
    const [opened, rng] = openArcana(cards, picksLeft, afterCards, purse.profile);
    return ok({ shop: { ...shop, packs, opened }, purse: { ...purse, coins, rng } });
  }
  const opened: OpenedPack = { kind: pack.kind, cards, picksLeft, hand: [] };
  return ok({ shop: { ...shop, packs, opened }, purse: { ...purse, coins, rng: afterCards } });
}

function castTarot(purse: Purse, id: TarotId, targets: readonly string[], hand: readonly string[]): Result<Purse, ShopError> {
  if (!targets.every((target) => hand.includes(target))) return err('cardNotOffered');
  const cast = applyTarot(purse, id, targets);
  if (!cast.ok) return cast;
  const { coins, jokers, profile, rng } = cast.value;
  return ok({ coins, jokers, profile, rng });
}

export function pickFromPack(shop: ShopState, purse: Purse, index: number, targets: readonly string[]): Result<ShopStep, ShopError> {
  const { opened } = shop;
  if (!opened) return err('noPackOpen');
  const card = opened.cards[index];
  if (!card) return err('noOffer');
  const result = card.kind === 'tarot' ? castTarot(purse, card.tarotId, targets, opened.hand) : take(purse, card);
  if (!result.ok) return result;
  const cards = emptied(opened.cards, index);
  const picksLeft = opened.picksLeft - 1;
  const done = picksLeft <= 0 || cards.every((entry) => entry === null);
  return ok({ shop: { ...shop, opened: done ? null : { ...opened, cards, picksLeft } }, purse: result.value });
}

/** Closes the open pack; the money is not returned. */
export function skipPack(shop: ShopState): Result<ShopState, ShopError> {
  return shop.opened ? ok({ ...shop, opened: null }) : err('noPackOpen');
}

/** Casts the waiting shelf tarot on targets from its hand. */
export function castShopTarot(shop: ShopState, purse: Purse, targets: readonly string[]): Result<ShopStep, ShopError> {
  const { casting } = shop;
  if (!casting) return err('noTarotPending');
  const cast = castTarot(purse, casting.tarotId, targets, casting.hand);
  return cast.ok ? ok({ shop: { ...shop, casting: null }, purse: cast.value }) : cast;
}

/** Drops the waiting shelf tarot; it stays sold and the money is not returned. */
export function skipTarot(shop: ShopState): Result<ShopState, ShopError> {
  return shop.casting ? ok({ ...shop, casting: null }) : err('noTarotPending');
}

/** New single items; the packs stay — two per visit is the whole supply. */
export function rerollShop(shop: ShopState, purse: Purse): Result<ShopStep, ShopError> {
  const blocked = busy(shop);
  if (blocked) return err(blocked);
  if (purse.coins < shop.rerollCost) return err('notEnoughCoins');
  const [items, rng] = rollItems(purse.rng, purse.jokers, purse.profile);
  return ok({ shop: { ...shop, items, rerollCost: shop.rerollCost + 1 }, purse: { ...purse, coins: purse.coins - shop.rerollCost, rng } });
}

export function sellPrice(jokerId: JokerId): number {
  return Math.floor(JOKERS[jokerId].price / 2);
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
