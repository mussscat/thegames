import { conflictFor, MAX_FOCUSES, MAX_JOKERS, TAROTS, targetsOk, type DeckProfile, type EnhancementId, type FocusId, type JokerId, type PackCard, type ShopItem } from '@game/durak';

/** Durations at x1; the animation speed setting divides them. */
/** The pack shakes and tears open. */
export const TEAR_MS = 1100;
/** The cards fly out of the tear before the first one flips. */
export const BURST_MS = 350;
export const FLIP_STEP_MS = 250;
export const FLIP_MS = 300;

export type RevealPlan = { readonly cardsAt: number; readonly flips: readonly number[]; readonly done: number };

/** When the torn pack shows its cards and when each one flips face up (after they have flown out). */
export function revealSchedule(count: number, speed: number, reduced: boolean): RevealPlan {
  if (reduced) return { cardsAt: 0, flips: Array.from({ length: count }, () => 0), done: 0 };
  const cardsAt = TEAR_MS / speed;
  const flips = Array.from({ length: count }, (_, i) => cardsAt + (BURST_MS + i * FLIP_STEP_MS) / speed);
  return { cardsAt, flips, done: (flips.at(-1) ?? cardsAt) + FLIP_MS / speed };
}

export type Replacement = { readonly cardId: string; readonly from: EnhancementId; readonly to: EnhancementId };

function replacement(profile: DeckProfile, cardId: string, to: EnhancementId): readonly Replacement[] {
  const from = conflictFor(profile, cardId, to);
  return from ? [{ cardId, from, to }] : [];
}

/** The enhancements a pick would overwrite — each needs the player's confirmation. */
export function replacementsFor(card: PackCard, targets: readonly string[], profile: DeckProfile): readonly Replacement[] {
  if (card.kind === 'card') return replacement(profile, card.cardId, card.enhancement);
  if (card.kind !== 'tarot') return [];
  const { enhancement } = TAROTS[card.tarotId];
  if (enhancement) return targets.flatMap((cardId) => replacement(profile, cardId, enhancement));
  if (card.tarotId !== 'death') return [];
  const [to, from] = targets;
  const source = from === undefined ? undefined : profile[from];
  return to !== undefined && source ? replacement(profile, to, source) : [];
}

export function canTake(card: PackCard, targets: readonly string[], profile: DeckProfile, jokers: readonly JokerId[], focuses: readonly FocusId[]): boolean {
  if (card.kind === 'joker') return jokers.length < MAX_JOKERS;
  if (card.kind === 'focus') return focuses.length < MAX_FOCUSES;
  if (card.kind === 'tarot') return targetsOk(card.tarotId, targets, profile);
  return true;
}

/** A shelf Колесо Фортуны that this tap will really buy (and so cast at once): affordable, with no pack or tarot pending. */
export function castsWheelNow(item: ShopItem | null | undefined, coins: number, busy: boolean): boolean {
  return !busy && item?.card.kind === 'tarot' && item.card.tarotId === 'wheel' && coins >= item.price;
}

const CARD_RATIO = 0.7;
const MAX_CARD_W = 120;
const CARDS_HEIGHT_SHARE = 0.3;
const SIDE_PADDING = 24;
const CARD_GAP = 16;
const PYRAMID_FROM = 5;
const PYRAMID_COLUMNS = 3;

/** Cards per row: a big pack stacks as a pyramid (3 + 2), like the shop jokers; a small one stays in one line. */
export function cardColumns(count: number): number {
  return count >= PYRAMID_FROM ? PYRAMID_COLUMNS : Math.max(1, count);
}

/** Width of one pack card so the rows fit the screen width and take at most ~30% of its height. */
export function fitCardWidth(count: number, viewW: number, viewH: number): number {
  const columns = cardColumns(count);
  const rows = Math.ceil(count / columns);
  const byWidth = (viewW - SIDE_PADDING - CARD_GAP * (columns - 1)) / columns;
  const byHeight = ((viewH * CARDS_HEIGHT_SHARE - CARD_GAP * (rows - 1)) / rows) * CARD_RATIO;
  return Math.floor(Math.max(40, Math.min(MAX_CARD_W, byWidth, byHeight)));
}

/** Pixel width of the card block, so rows wrap at the right column. */
export function cardsBlockWidth(count: number, cardW: number): number {
  const columns = cardColumns(count);
  return columns * cardW + CARD_GAP * (columns - 1);
}
