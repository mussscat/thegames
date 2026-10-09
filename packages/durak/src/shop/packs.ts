import { createDeck, nextInt, shuffle, type RngState } from '@game/core';
import { ENHANCEMENT_IDS, type DeckProfile, type EnhancementId } from '../enhancements';
import { JOKER_IDS, JOKERS, RARITY_WEIGHT, type JokerId, type Rarity } from '../jokers/catalog';
import { TAROT_IDS, TAROTS, type TarotId } from './tarot';
import { drawUnique, pickWeighted } from './weighted';

export const PACK_KINDS = ['jokers', 'arcana', 'deck'] as const;
export type PackKind = (typeof PACK_KINDS)[number];
export const PACK_SIZES = ['normal', 'big', 'mega'] as const;
export type PackSize = (typeof PACK_SIZES)[number];

export type PackSizeDef = { readonly cards: number; readonly picks: number; readonly weight: number; readonly price: number };

export const PACK_SIZE_DEFS: Readonly<Record<PackSize, PackSizeDef>> = {
  normal: { cards: 3, picks: 1, weight: 70, price: 4 },
  big: { cards: 5, picks: 1, weight: 22, price: 6 },
  mega: { cards: 5, picks: 2, weight: 8, price: 8 },
};

export const PACK_KIND_WEIGHT: Readonly<Record<PackKind, number>> = { jokers: 40, arcana: 35, deck: 25 };

/** Cards dealt to pick tarot targets from. */
export const TAROT_HAND_SIZE = 5;

/** The rarity glow of an enhanced card in a pack. */
export const ENHANCEMENT_RARITY: Readonly<Record<EnhancementId, Rarity>> = { golden: 'common', heavy: 'common', coin: 'common', sharp: 'rare', trump: 'rare' };

const DURAK_MIN_RANK = 6;
const DECK_IDS: readonly string[] = createDeck(DURAK_MIN_RANK).map((card) => card.id);

export type Pack = { readonly kind: PackKind; readonly size: PackSize; readonly price: number };

export type PackCard =
  | { readonly kind: 'joker'; readonly jokerId: JokerId }
  | { readonly kind: 'tarot'; readonly tarotId: TarotId }
  | { readonly kind: 'card'; readonly cardId: string; readonly enhancement: EnhancementId };

export function packCardRarity(card: PackCard): Rarity {
  switch (card.kind) {
    case 'joker':
      return JOKERS[card.jokerId].rarity;
    case 'tarot':
      return TAROTS[card.tarotId].rarity;
    case 'card':
      return ENHANCEMENT_RARITY[card.enhancement];
  }
}

export const jokerWeight = (id: JokerId): number => RARITY_WEIGHT[JOKERS[id].rarity];
export const tarotWeight = (id: TarotId): number => RARITY_WEIGHT[TAROTS[id].rarity];

export function rollPack(rng: RngState): readonly [Pack, RngState] {
  const [kind, afterKind] = pickWeighted(PACK_KINDS, (k) => PACK_KIND_WEIGHT[k], rng);
  const [size, next] = pickWeighted(PACK_SIZES, (s) => PACK_SIZE_DEFS[s].weight, afterKind);
  const chosenSize = size ?? 'normal';
  return [{ kind: kind ?? 'jokers', size: chosenSize, price: PACK_SIZE_DEFS[chosenSize].price }, next];
}

/** The enhancement taking `enhancement` onto `cardId` would replace, or null. */
export function conflictFor(profile: DeckProfile, cardId: string, enhancement: EnhancementId): EnhancementId | null {
  const current = profile[cardId];
  return current !== undefined && current !== enhancement ? current : null;
}

/** A random enhanced card of the shared deck, never one the player already has exactly so; null if none is left. */
export function rollDeckCard(rng: RngState, profile: DeckProfile, exclude: readonly string[]): readonly [PackCard | null, RngState] {
  const candidates = DECK_IDS.filter((cardId) => !exclude.includes(cardId)).flatMap((cardId) =>
    ENHANCEMENT_IDS.filter((enhancement) => profile[cardId] !== enhancement).map((enhancement) => ({ kind: 'card' as const, cardId, enhancement })),
  );
  if (candidates.length === 0) return [null, rng];
  const [index, next] = nextInt(rng, candidates.length);
  return [candidates[index] ?? null, next];
}

function rollDeckCards(rng: RngState, profile: DeckProfile, count: number): readonly [readonly PackCard[], RngState] {
  return Array.from({ length: count }).reduce<readonly [readonly PackCard[], RngState]>(
    ([cards, current]) => {
      const taken = cards.flatMap((card) => (card.kind === 'card' ? [card.cardId] : []));
      const [card, next] = rollDeckCard(current, profile, taken);
      return [card ? [...cards, card] : cards, next];
    },
    [[], rng],
  );
}

export function rollPackCards(rng: RngState, pack: Pack, owned: readonly JokerId[], profile: DeckProfile): readonly [readonly PackCard[], RngState] {
  const count = PACK_SIZE_DEFS[pack.size].cards;
  switch (pack.kind) {
    case 'jokers': {
      const [ids, next] = drawUnique(JOKER_IDS.filter((id) => !owned.includes(id)), count, jokerWeight, rng);
      return [ids.map((jokerId) => ({ kind: 'joker' as const, jokerId })), next];
    }
    case 'arcana': {
      const [ids, next] = drawUnique(tarotPool(profile), count, tarotWeight, rng);
      return [ids.map((tarotId) => ({ kind: 'tarot' as const, tarotId })), next];
    }
    case 'deck':
      return rollDeckCards(rng, profile, count);
  }
}

/**
 * The cards a tarot can target: TAROT_HAND_SIZE different cards of the shared deck.
 * When the deck has enhanced cards, one is always dealt — Смерть needs a source to copy.
 */
export function rollTarotHand(rng: RngState, profile: DeckProfile): readonly [readonly string[], RngState] {
  const [ids, next] = shuffle(DECK_IDS, rng);
  const hand = ids.slice(0, TAROT_HAND_SIZE);
  const enhanced = (cardId: string): boolean => profile[cardId] !== undefined;
  const source = ids.find(enhanced);
  return [source && !hand.some(enhanced) ? [...hand.slice(0, -1), source] : hand, next];
}

/** Tarots that can act on this deck: Смерть is left out until some card is enhanced. */
export function tarotPool(profile: DeckProfile): readonly TarotId[] {
  return Object.values(profile).some((id) => id !== undefined) ? TAROT_IDS : TAROT_IDS.filter((id) => id !== 'death');
}
