export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export type Card = { readonly id: string; readonly suit: Suit; readonly rank: Rank };

export const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

export const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  clubs: 'трефы',
  diamonds: 'бубны',
  hearts: 'червы',
  spades: 'пики',
};

const FACE_LABELS: Readonly<Partial<Record<Rank, string>>> = { 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' };

export function makeCard(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

export function createDeck(minRank: Rank = 2): readonly Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.filter((rank) => rank >= minRank).map((rank) => makeCard(suit, rank)),
  );
}

export function rankLabel(rank: Rank): string {
  return FACE_LABELS[rank] ?? String(rank);
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
