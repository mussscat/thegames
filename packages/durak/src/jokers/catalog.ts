import { DEFAULT_HAND_SIZES, type HandSizes, type PlayerId } from '../types';

export const JOKER_IDS = [
  'hearts',
  'diamonds',
  'clubs',
  'spades',
  'small',
  'gloat',
  'looter',
  'piggyBank',
  'longArms',
  'rage',
  'trumpAce',
  'serial',
  'cardSharp',
  'usurer',
  'cleanHands',
  'mirror',
  'collector',
  'thickSkin',
] as const;

export type JokerId = (typeof JOKER_IDS)[number];

export const RARITIES = ['common', 'rare', 'legendary'] as const;

export type Rarity = (typeof RARITIES)[number];

export type JokerDef = {
  readonly id: JokerId;
  readonly name: string;
  readonly description: string;
  readonly rarity: Rarity;
  readonly price: number;
};

/** Jokers that act once per taken card (their pop shows over that card). Keep in sync with `cardEffect` in score.ts. */
export const CARD_JOKERS: readonly JokerId[] = ['hearts', 'diamonds', 'clubs', 'spades', 'small'];

export type SideJokers = Readonly<Record<PlayerId, readonly JokerId[]>>;

export const MAX_JOKERS = 5;
/** Shop draw weights: legendary jokers show up rarely. */
export const RARITY_WEIGHT: Readonly<Record<Rarity, number>> = { common: 6, rare: 3, legendary: 1 };

export const SUIT_CHIPS = 3;
export const SMALL_CHIPS = 2;
export const SMALL_MAX_RANK = 8;
export const GLOAT_MIN_CARDS = 3;
export const GLOAT_MULT = 2;
export const RAGE_CHARGE = 4;
export const TRUMP_ACE_TIMES = 2;
export const SERIAL_STEP = 0.5;
export const CARD_SHARP_MULT = 1;
export const USURER_TIMES = 1.5;
export const THICK_SKIN_TAKEN = 0.5;
export const THICK_SKIN_DEALT = 0.8;
export const PIGGY_EXTRA_CAP = 3;
export const LONG_ARMS_EXTRA = 1;

const joker = (id: JokerId, name: string, rarity: Rarity, price: number, description: string): JokerDef => ({
  id,
  name,
  rarity,
  price,
  description,
});

export const JOKERS: Readonly<Record<JokerId, JokerDef>> = {
  hearts: joker('hearts', 'Червонец', 'common', 4, `+${SUIT_CHIPS} фишки за каждую червовую карту во взятке`),
  diamonds: joker('diamonds', 'Бубнарь', 'common', 4, `+${SUIT_CHIPS} фишки за каждую бубновую карту во взятке`),
  clubs: joker('clubs', 'Трефовик', 'common', 4, `+${SUIT_CHIPS} фишки за каждую трефовую карту во взятке`),
  spades: joker('spades', 'Пиковик', 'common', 4, `+${SUIT_CHIPS} фишки за каждую пиковую карту во взятке`),
  small: joker('small', 'Мелочь', 'common', 4, `+${SMALL_CHIPS} фишки за каждую карту 6–${SMALL_MAX_RANK} во взятке`),
  gloat: joker('gloat', 'Злорадство', 'common', 5, `+${GLOAT_MULT} к множителю, если взято ${GLOAT_MIN_CARDS} карты и больше`),
  looter: joker('looter', 'Мародёр', 'common', 5, '+1 монета за каждый «Беру» соперника'),
  piggyBank: joker('piggyBank', 'Копилка', 'common', 4, `Предел процентов +${PIGGY_EXTRA_CAP}`),
  longArms: joker('longArms', 'Длинные руки', 'common', 5, 'Добираешь до 7 карт'),
  rage: joker('rage', 'Копилка ярости', 'rare', 6, `Каждое твоё «Бито» — +${RAGE_CHARGE} фишки к следующему удару`),
  trumpAce: joker('trumpAce', 'Козырной туз', 'rare', 7, `×${TRUMP_ACE_TIMES} к множителю, если во взятке есть козырь`),
  serial: joker('serial', 'Серийный', 'rare', 6, `+${SERIAL_STEP} к множителю за каждый прошлый «Беру» соперника в этом бою`),
  cardSharp: joker('cardSharp', 'Шулер', 'rare', 6, 'Верхняя карта колоды открыта; +1 к множителю, если во взятке есть её ранг'),
  usurer: joker('usurer', 'Ростовщик', 'rare', 6, `×${USURER_TIMES} к множителю, но удары по тебе тоже ×${USURER_TIMES}`),
  cleanHands: joker('cleanHands', 'Чистюля', 'rare', 6, '+1 к множителю за каждую раздачу подряд без твоего «Беру»'),
  mirror: joker('mirror', 'Зеркало', 'legendary', 10, 'Повторяет джокера справа'),
  collector: joker('collector', 'Коллекционер', 'legendary', 9, '+1 к множителю навсегда за каждую усиленную карту, взятую соперником'),
  thickSkin: joker('thickSkin', 'Толстая кожа', 'legendary', 9, `Удары по тебе ×${THICK_SKIN_TAKEN}, твои удары ×${THICK_SKIN_DEALT}`),
};

/** What each slot actually does: a Зеркало becomes the joker on its right (nothing at the edge or before another Зеркало). */
export function effectiveJokers(jokers: readonly JokerId[]): readonly (JokerId | null)[] {
  return jokers.map((id, index) => {
    if (id !== 'mirror') return id;
    const right = jokers[index + 1];
    return right && right !== 'mirror' ? right : null;
  });
}

export function countJoker(jokers: readonly JokerId[], id: JokerId): number {
  return effectiveJokers(jokers).filter((acting) => acting === id).length;
}

export function jokerHandSizes(jokers: SideJokers): HandSizes {
  return {
    player: DEFAULT_HAND_SIZES.player + LONG_ARMS_EXTRA * countJoker(jokers.player, 'longArms'),
    enemy: DEFAULT_HAND_SIZES.enemy + LONG_ARMS_EXTRA * countJoker(jokers.enemy, 'longArms'),
  };
}

export function revealsTopCard(jokers: readonly JokerId[]): boolean {
  return countJoker(jokers, 'cardSharp') > 0;
}

export function jokerInterestCap(jokers: readonly JokerId[], baseCap: number): number {
  return baseCap + PIGGY_EXTRA_CAP * countJoker(jokers, 'piggyBank');
}

export function jokerFightCoins(jokers: readonly JokerId[], enemyTakes: number): number {
  return countJoker(jokers, 'looter') * Math.max(0, enemyTakes);
}
