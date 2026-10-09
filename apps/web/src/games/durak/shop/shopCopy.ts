import { createDeck, rankLabel, SUIT_SYMBOLS, type Card } from '@game/core';
import {
  conflictFor,
  ENHANCEMENTS,
  JOKERS,
  PACK_SIZE_DEFS,
  packCardRarity,
  TAROTS,
  type DeckProfile,
  type Pack,
  type PackCard,
  type PackKind,
  type PackSize,
  type Rarity,
} from '@game/durak';
import type { TipLine } from '../../../components/tipLines';

export const PACK_NAMES: Readonly<Record<PackKind, string>> = { jokers: 'Джокеры', arcana: 'Таро', deck: 'Колода' };
export const PACK_SIZE_NAMES: Readonly<Record<PackSize, string>> = { normal: 'Обычный', big: 'Большой', mega: 'Мега' };
export const PACK_TEXT: Readonly<Record<PackKind, string>> = {
  jokers: 'Джокеры, которых у тебя ещё нет',
  arcana: 'Таро меняют карты колоды или монеты',
  deck: 'Готовые усиленные карты общей колоды',
};
export const RARITY_NAMES: Readonly<Record<Rarity, string>> = { common: 'обычная', rare: 'редкая', legendary: 'легендарная' };

const CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(createDeck(6).map((card) => [card.id, card]));

export function deckCard(cardId: string): Card | null {
  return CARDS_BY_ID.get(cardId) ?? null;
}

export function cardLabel(cardId: string): string {
  const card = deckCard(cardId);
  return card ? `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : cardId;
}

export function packCardTitle(card: PackCard): string {
  switch (card.kind) {
    case 'joker':
      return JOKERS[card.jokerId].name;
    case 'tarot':
      return TAROTS[card.tarotId].name;
    case 'card':
      return `${cardLabel(card.cardId)} ${ENHANCEMENTS[card.enhancement].name}`;
  }
}

export function packCardText(card: PackCard): string {
  switch (card.kind) {
    case 'joker':
      return JOKERS[card.jokerId].description;
    case 'tarot':
      return TAROTS[card.tarotId].description;
    case 'card':
      return ENHANCEMENTS[card.enhancement].description;
  }
}

export function packSizeText(size: PackSize): string {
  const { cards, picks } = PACK_SIZE_DEFS[size];
  return `${cards} ${cards < 5 ? 'карты' : 'карт'} · бери ${picks}`;
}

/** Shown under anything that talks about chips or the multiplier. */
export const SCORE_HELP: TipLine = { name: 'Как считается удар', owner: null, description: 'Фишки (от забранных на «Беру» карт) × Множитель = урон' };

const MENTIONS_SCORING = /фишк|множител/i;

/** The tooltip of a shop or pack card: name, rarity and rule, then a replacement warning or the scoring help. */
export function cardTipLines(card: PackCard, profile: DeckProfile): readonly TipLine[] {
  const main: TipLine = { name: packCardTitle(card), owner: RARITY_NAMES[packCardRarity(card)], description: packCardText(card) };
  const replaced = card.kind === 'card' ? conflictFor(profile, card.cardId, card.enhancement) : null;
  if (replaced && card.kind === 'card') {
    return [main, { name: 'Замена', owner: null, description: `В колоде: ${ENHANCEMENTS[replaced].name} → станет ${ENHANCEMENTS[card.enhancement].name}` }];
  }
  return MENTIONS_SCORING.test(main.description) ? [main, SCORE_HELP] : [main];
}

export function packTipLines(pack: Pack): readonly TipLine[] {
  return [{ name: PACK_NAMES[pack.kind], owner: `${PACK_SIZE_NAMES[pack.size]} · ${packSizeText(pack.size)}`, description: PACK_TEXT[pack.kind] }];
}
