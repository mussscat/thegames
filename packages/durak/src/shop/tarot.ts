import { err, nextInt, ok, type Result, type RngState } from '@game/core';
import { withEnhancement, type DeckProfile, type EnhancementId } from '../enhancements';
import { JOKER_IDS, JOKERS, MAX_JOKERS, RARITY_WEIGHT, type JokerId, type Rarity } from '../jokers/catalog';
import { pickWeighted } from './weighted';

export const TAROT_IDS = ['sun', 'tower', 'star', 'chariot', 'emperor', 'death', 'hermit', 'wheel'] as const;
export type TarotId = (typeof TAROT_IDS)[number];

export type TarotDef = {
  readonly id: TarotId;
  readonly name: string;
  /** Roman numeral of the major arcana, shown on the card. */
  readonly numeral: string;
  readonly description: string;
  readonly rarity: Rarity;
  readonly minTargets: number;
  readonly maxTargets: number;
  /** The enhancement it puts on its targets, for the five enhancement tarots. */
  readonly enhancement: EnhancementId | null;
};

export const TAROT_PRICE = 3;
/** Отшельник adds at most this many coins. */
export const HERMIT_CAP = 10;
/** Колесо Фортуны wins 1 time in WHEEL_ODDS. */
export const WHEEL_ODDS = 3;

const def = (d: TarotDef): TarotDef => d;

export const TAROTS: Readonly<Record<TarotId, TarotDef>> = {
  sun: def({ id: 'sun', name: 'Солнце', numeral: 'XIX', description: 'До 2 карт становятся Золотыми', rarity: 'common', minTargets: 1, maxTargets: 2, enhancement: 'golden' }),
  tower: def({ id: 'tower', name: 'Башня', numeral: 'XVI', description: 'До 2 карт становятся Острыми', rarity: 'common', minTargets: 1, maxTargets: 2, enhancement: 'sharp' }),
  star: def({ id: 'star', name: 'Звезда', numeral: 'XVII', description: 'До 2 карт становятся Монетными', rarity: 'common', minTargets: 1, maxTargets: 2, enhancement: 'coin' }),
  chariot: def({ id: 'chariot', name: 'Колесница', numeral: 'VII', description: 'Карта становится Тяжёлой', rarity: 'common', minTargets: 1, maxTargets: 1, enhancement: 'heavy' }),
  emperor: def({ id: 'emperor', name: 'Император', numeral: 'IV', description: 'Карта становится Козырной', rarity: 'common', minTargets: 1, maxTargets: 1, enhancement: 'trump' }),
  death: def({ id: 'death', name: 'Смерть', numeral: 'XIII', description: 'Первая карта получает усиление второй', rarity: 'rare', minTargets: 2, maxTargets: 2, enhancement: null }),
  hermit: def({ id: 'hermit', name: 'Отшельник', numeral: 'IX', description: 'Удваивает монеты (не больше +10)', rarity: 'rare', minTargets: 0, maxTargets: 0, enhancement: null }),
  wheel: def({ id: 'wheel', name: 'Колесо Фортуны', numeral: 'X', description: 'С шансом 1 из 3 — случайный джокер', rarity: 'legendary', minTargets: 0, maxTargets: 0, enhancement: null }),
};

/** What a tarot can change: coins, jokers, the deck profile; the rng drives Колесо Фортуны. */
export type TarotSubject = { readonly coins: number; readonly jokers: readonly JokerId[]; readonly profile: DeckProfile; readonly rng: RngState };
/** `gained` — the joker Колесо Фортуны gave, or null. */
export type TarotOutcome = TarotSubject & { readonly gained: JokerId | null };

export function targetsOk(id: TarotId, targets: readonly string[], profile: DeckProfile): boolean {
  const { minTargets, maxTargets } = TAROTS[id];
  if (targets.length < minTargets || targets.length > maxTargets) return false;
  if (new Set(targets).size !== targets.length) return false;
  const source = targets[1];
  return id !== 'death' || (source !== undefined && profile[source] !== undefined);
}

function spinWheel(subject: TarotSubject): TarotOutcome {
  const [roll, rng] = nextInt(subject.rng, WHEEL_ODDS);
  if (roll !== 0 || subject.jokers.length >= MAX_JOKERS) return { ...subject, rng, gained: null };
  const pool = JOKER_IDS.filter((id) => !subject.jokers.includes(id));
  const [gained, next] = pickWeighted(pool, (id) => RARITY_WEIGHT[JOKERS[id].rarity], rng);
  return gained ? { ...subject, rng: next, jokers: [...subject.jokers, gained], gained } : { ...subject, rng: next, gained: null };
}

export function applyTarot(subject: TarotSubject, id: TarotId, targets: readonly string[]): Result<TarotOutcome, 'badTargets'> {
  if (!targetsOk(id, targets, subject.profile)) return err('badTargets');
  const base: TarotOutcome = { ...subject, gained: null };
  const { enhancement } = TAROTS[id];
  if (enhancement) return ok({ ...base, profile: targets.reduce((profile, cardId) => withEnhancement(profile, cardId, enhancement), subject.profile) });
  switch (id) {
    case 'death': {
      const [to, from] = targets;
      const source = from === undefined ? undefined : subject.profile[from];
      return to !== undefined && source ? ok({ ...base, profile: withEnhancement(subject.profile, to, source) }) : err('badTargets');
    }
    case 'hermit':
      return ok({ ...base, coins: subject.coins + Math.min(subject.coins, HERMIT_CAP) });
    case 'wheel':
      return ok(spinWheel(subject));
    default:
      return err('badTargets');
  }
}
