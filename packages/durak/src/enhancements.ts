import type { PlayerId } from './types';

export const ENHANCEMENT_IDS = ['golden', 'sharp', 'heavy', 'trump', 'coin'] as const;

export type EnhancementId = (typeof ENHANCEMENT_IDS)[number];

/** One side's version of the shared 36-card deck: which enhancement sits on which card id. */
export type DeckProfile = Readonly<Partial<Record<string, EnhancementId>>>;

export type Profiles = Readonly<Record<PlayerId, DeckProfile>>;

export const EMPTY_PROFILES: Profiles = { player: {}, enemy: {} };

export type EnhancementDef = {
  readonly id: EnhancementId;
  readonly name: string;
  readonly short: string;
  readonly description: string;
  readonly price: number;
};

export const ENHANCEMENTS: Readonly<Record<EnhancementId, EnhancementDef>> = {
  golden: { id: 'golden', name: 'Золотая', short: 'Зол', description: 'Её забрали («Беру») — +3 фишки к удару', price: 4 },
  sharp: { id: 'sharp', name: 'Острая', short: 'Остр', description: 'Бьёт карту любой масти, если старше по рангу', price: 5 },
  heavy: { id: 'heavy', name: 'Тяжёлая', short: 'Тяж', description: 'Отбился ею — к её рангу нельзя подкинуть', price: 3 },
  trump: { id: 'trump', name: 'Козырная', short: 'Коз', description: 'Всегда считается козырем', price: 6 },
  coin: { id: 'coin', name: 'Монетная', short: 'Мон', description: 'Отбился ею — +1 монета в награде за бой', price: 3 },
};

export function withEnhancement(profile: DeckProfile, cardId: string, id: EnhancementId): DeckProfile {
  return { ...profile, [cardId]: id };
}
