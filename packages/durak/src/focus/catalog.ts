import { RARITY_WEIGHT, type Rarity } from '../jokers/catalog';

export const FOCUS_IDS = ['peek', 'foresight', 'redeal', 'boost', 'pad', 'shield', 'piggy', 'swap', 'doubler', 'suitShift'] as const;
export type FocusId = (typeof FOCUS_IDS)[number];

export type FocusDef = {
  readonly id: FocusId;
  readonly name: string;
  readonly description: string;
  readonly rarity: Rarity;
  readonly price: number;
  /** Cards of the player's hand the focus needs. */
  readonly minTargets: number;
  readonly maxTargets: number;
};

export const MAX_FOCUSES = 2;
export const BOOST_MULT = 3;
export const PAD_CHIPS = 8;
export const SHIELD_TIMES = 0.5;
export const DOUBLER_TIMES = 2;
export const PIGGY_COINS = 4;
export const FORESIGHT_CARDS = 3;

const def = (d: FocusDef): FocusDef => d;

export const FOCUSES: Readonly<Record<FocusId, FocusDef>> = {
  peek: def({ id: 'peek', name: 'Подглядывание', description: 'Рука соперника открыта до конца раздачи', rarity: 'common', price: 3, minTargets: 0, maxTargets: 0 }),
  foresight: def({ id: 'foresight', name: 'Прорицание', description: `Видишь ${FORESIGHT_CARDS} верхние карты колоды до конца раздачи`, rarity: 'common', price: 3, minTargets: 0, maxTargets: 0 }),
  redeal: def({ id: 'redeal', name: 'Пересдача', description: 'Сбрось 1–2 карты из руки и добери столько же', rarity: 'common', price: 3, minTargets: 1, maxTargets: 2 }),
  boost: def({ id: 'boost', name: 'Разгон', description: `+${BOOST_MULT} множителя к следующему твоему удару`, rarity: 'common', price: 3, minTargets: 0, maxTargets: 0 }),
  pad: def({ id: 'pad', name: 'Набивка', description: `+${PAD_CHIPS} фишек к следующему твоему удару`, rarity: 'common', price: 3, minTargets: 0, maxTargets: 0 }),
  shield: def({ id: 'shield', name: 'Щит', description: `Следующий удар по тебе ×${SHIELD_TIMES}`, rarity: 'common', price: 3, minTargets: 0, maxTargets: 0 }),
  piggy: def({ id: 'piggy', name: 'Копилочка', description: `+${PIGGY_COINS} монеты сразу`, rarity: 'common', price: 2, minTargets: 0, maxTargets: 0 }),
  swap: def({ id: 'swap', name: 'Подмена', description: 'Обменяй карту из руки на карту под колодой; масть козыря не меняется', rarity: 'rare', price: 5, minTargets: 1, maxTargets: 1 }),
  doubler: def({ id: 'doubler', name: 'Удвоитель', description: `×${DOUBLER_TIMES} к следующему твоему удару`, rarity: 'rare', price: 5, minTargets: 0, maxTargets: 0 }),
  suitShift: def({ id: 'suitShift', name: 'Смена масти', description: 'До конца раздачи козырь — масть выбранной карты из руки', rarity: 'legendary', price: 7, minTargets: 1, maxTargets: 1 }),
};

export const focusWeight = (id: FocusId): number => RARITY_WEIGHT[FOCUSES[id].rarity];
