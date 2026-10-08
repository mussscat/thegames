import type { Card, Suit } from '@game/core';
import type { DeckProfile, EnhancementId, Profiles } from './enhancements';

export type PlayerId = 'player' | 'enemy';

export const BOSS_RULES = ['witch', 'general', 'shuffler'] as const;

/** witch: queens are trumps; general: the player beats only by 2+ ranks; shuffler: trump changes after every «Бито». */
export type BossRule = (typeof BOSS_RULES)[number];

export const HAND_SIZE = 6;
export const MAX_ATTACKS_PER_BOUT = 6;

/** attackEnh/defenseEnh: the enhancement the card was played with (if any). */
export type TablePair = {
  readonly attack: Card;
  readonly defense: Card | null;
  readonly attackEnh?: EnhancementId;
  readonly defenseEnh?: EnhancementId;
};

/** own — the holder's profile; foreign — the enhancement a taken card carried in from the table. */
export type EnhancementSource = 'own' | 'foreign';

/** cardId → the enhancement a card was played with when it was taken from the table; it stays with the card. */
export type Carried = Readonly<Partial<Record<string, EnhancementId>>>;

/** loser === null means both players ran out of cards at once (draw). */
export type RoundOutcome = { readonly loser: PlayerId | null; readonly cardsLeft: number };

/** The last bout the defender took: who took it and which attack cards; a bout that ended in «Бито» leaves it null. */
export type BoutResult = {
  readonly damaged: PlayerId;
  readonly attackCards: readonly Card[];
  /** The enhancement each attack card was played with, aligned with `attackCards`. */
  readonly takenEnhancements: readonly (EnhancementId | null)[];
};

export type Hands = Readonly<Record<PlayerId, readonly Card[]>>;

export type HandSizes = Readonly<Record<PlayerId, number>>;

export const DEFAULT_HAND_SIZES: HandSizes = { player: HAND_SIZE, enemy: HAND_SIZE };

export type RoundState = {
  /** deck[0] is the top; the last card is the face-up trump card. */
  readonly deck: readonly Card[];
  readonly trumpSuit: Suit;
  readonly trumpCard: Card;
  readonly hands: Hands;
  readonly table: readonly TablePair[];
  readonly attacker: PlayerId;
  readonly defenderTaking: boolean;
  readonly discardCount: number;
  readonly outcome: RoundOutcome | null;
  readonly lastBout: BoutResult | null;
  readonly handSizes: HandSizes;
  readonly boss: BossRule | null;
  readonly profiles: Profiles;
  readonly carried: Carried;
  /** Enhancements a side played a card with this round; they override that side's profile until the next deal. */
  readonly fixed: Readonly<Record<PlayerId, DeckProfile>>;
};

export type RoundAction =
  | { readonly type: 'attack'; readonly cardId: string; readonly use?: EnhancementSource }
  | { readonly type: 'defend'; readonly cardId: string; readonly use?: EnhancementSource }
  | { readonly type: 'take' }
  | { readonly type: 'endAttack' };

export type DurakError =
  | 'roundOver'
  | 'notYourTurn'
  | 'cardNotInHand'
  | 'cannotThrowIn'
  | 'cannotBeat'
  | 'cannotEndAttack'
  | 'enhancementUnavailable';

export function opponentOf(id: PlayerId): PlayerId {
  return id === 'player' ? 'enemy' : 'player';
}

export function withHand(hands: Hands, id: PlayerId, cards: readonly Card[]): Hands {
  return id === 'player' ? { ...hands, player: cards } : { ...hands, enemy: cards };
}
