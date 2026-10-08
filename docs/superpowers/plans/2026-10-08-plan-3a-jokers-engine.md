# Jokers 3a: ordered scoring engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace perks with Balatro-like jokers: an ordered «Фишки × Множитель» damage pipeline on every «Беру», joker state from game events, enemy tiers and enemy jokers, rebalanced HP from a simulation, a joker shop with rarity and reordering, and the UI showing jokers and the scored hit.

**Architecture:** A new pure module `packages/durak/src/jokers/` (catalog, scoring, event state) replaces `perks.ts`. `fight.ts` calls `scoreTake` on each take and keeps per-side joker state; `run/` gains jokers, ordering and run-level growth. The web app swaps perk UI for joker UI (tickets, shop, score label). Animation, drag-and-drop and new joker art are Plan 3b.

**Tech Stack:** TypeScript strict, Vitest + fast-check, React 19, zod 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-jokers-design.md`

## Global Constraints

- Damage only on «Беру», to the taker. Удар = `floor(Фишки × Множитель)`, ≥ 0. Base: chips 0, mult 1.
- Card chips by rank: 6–10 → 1, В–К → 2, Т → 3. Order: tier step → each taken card (throw order): rank chips, its enhancement, attacker's per-card jokers left→right → attacker's per-take jokers left→right → taker's defensive jokers left→right.
- Enhancements in scoring: Золотая +3 chips; Острая +1 mult (its beat rule stays); Тяжёлая/Козырная/Монетная not scored.
- Jokers: 5 slots, order matters, sell for half price; rarity common 4–5 / rare 6–7 / legendary 9–10; shop 2 joker + 2 enhancement offers; reroll unchanged.
- Enemy tier multiplier on hits against the player: normal ×1, strong ×2, boss ×3; strong enemies 1 joker, bosses 2.
- Start HP (tuned in Task 7): enemies 30/50/80, 120/180/300; player 60, full each fight.
- Reward HP bonus by share of HP left.
- Deterministic scoring, immutable updates, files < 400 lines, functions < 50 lines.
- Save version 7; v6 saves report as corrupted.

## Review Focus

1. **Fractional multipliers** (×1.5, ×0.8, +0.5) — damage floors exactly (2 × 1.5 = 3); covered by Task 2 tests (epsilon).
2. **Зеркало edges** (at the end, next to another Зеркало, copying an event joker) — nothing / exactly one copy; Tasks 1–3.
3. **A 0-damage take** — still counts as a take and still spends the rage charge; Task 5.
4. **Reordering mid-fight** — the next take uses the new order; Task 6 `moveJoker` test.
5. **Old v6 saves** — «Сохранение повреждено», no crash; Task 8.

---

### Task 1: Joker catalog and rule hooks

**Files:** Create `packages/durak/src/jokers/catalog.ts`, `packages/durak/src/jokers/catalog.test.ts`

**Interfaces — Produces:** `JOKER_IDS`, `type JokerId`, `RARITIES`, `type Rarity`, `type JokerDef`, `type SideJokers`, `JOKERS`, `MAX_JOKERS = 5`, `RARITY_WEIGHT`, effect constants, `effectiveJokers(jokers): readonly (JokerId | null)[]`, `countJoker(jokers, id)`, `jokerHandSizes(jokers: SideJokers): HandSizes`, `revealsTopCard(jokers)`, `jokerInterestCap(jokers, baseCap)`, `jokerFightCoins(jokers, enemyTakes)`.

- [ ] **Step 1: Failing tests** — `catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countJoker, effectiveJokers, JOKER_IDS, jokerFightCoins, jokerHandSizes, jokerInterestCap, JOKERS, revealsTopCard } from './catalog';

const PRICE_RANGE = { common: [4, 5], rare: [6, 7], legendary: [9, 10] } as const;

describe('joker catalog', () => {
  it('has 18 jokers with names, rules and prices matching their rarity', () => {
    expect(JOKER_IDS).toHaveLength(18);
    for (const id of JOKER_IDS) {
      const joker = JOKERS[id];
      expect(joker.id).toBe(id);
      expect(joker.name.length).toBeGreaterThan(0);
      expect(joker.description.length).toBeGreaterThan(0);
      const [min, max] = PRICE_RANGE[joker.rarity];
      expect(joker.price, id).toBeGreaterThanOrEqual(min);
      expect(joker.price, id).toBeLessThanOrEqual(max);
    }
  });
});

describe('effectiveJokers', () => {
  it('turns each Зеркало into the joker on its right', () => {
    expect(effectiveJokers(['mirror', 'clubs'])).toEqual(['clubs', 'clubs']);
  });

  it('a Зеркало with nothing or another Зеркало on its right does nothing', () => {
    expect(effectiveJokers(['clubs', 'mirror'])).toEqual(['clubs', null]);
    expect(effectiveJokers(['mirror', 'mirror', 'gloat'])).toEqual([null, 'gloat', 'gloat']);
  });

  it('counts copies made by mirrors', () => {
    expect(countJoker(['mirror', 'rage', 'rage'], 'rage')).toBe(3);
  });
});

describe('rule jokers', () => {
  it('Длинные руки adds a card to its owner hand only', () => {
    expect(jokerHandSizes({ player: ['longArms'], enemy: [] })).toEqual({ player: 7, enemy: 6 });
    expect(jokerHandSizes({ player: [], enemy: ['mirror', 'longArms'] })).toEqual({ player: 6, enemy: 8 });
  });

  it('Шулер reveals the top card', () => {
    expect(revealsTopCard(['cardSharp'])).toBe(true);
    expect(revealsTopCard(['clubs'])).toBe(false);
  });

  it('Копилка raises the interest cap and Мародёр pays for enemy takes', () => {
    expect(jokerInterestCap(['piggyBank'], 5)).toBe(8);
    expect(jokerInterestCap([], 5)).toBe(5);
    expect(jokerFightCoins(['looter'], 4)).toBe(4);
    expect(jokerFightCoins(['clubs'], 4)).toBe(0);
  });
});
```

- [ ] **Step 2:** `npx vitest run packages/durak/src/jokers` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `catalog.ts`:

```ts
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
```

- [ ] **Step 4:** `npx vitest run packages/durak/src/jokers` — Expected: PASS (7).
- [ ] **Step 5:** `git add packages/durak/src/jokers && git commit -m "feat(durak): joker catalog and rule hooks"`

---

### Task 2: Ordered scoring

**Files:** Create `packages/durak/src/jokers/score.ts`, `score.test.ts`, `state.ts` (type + constant; events in Task 3)

**Interfaces — Produces:** `type JokerState = { rage; cleanStreak; collected }`, `EMPTY_JOKER_STATE`, `type TakenCard`, `type StepSource`, `type Effect`, `type ScoreStep = { source; effect; chips; mult }`, `type TakeScore = { chips; mult; damage; steps }`, `type ScoreSide = { jokers; state }`, `type ScoreInput`, `rankChips(rank)`, `scoreTake(input): TakeScore`.

- [ ] **Step 1: Failing tests** — `score.test.ts`:

```ts
import { makeCard, type Card, type Rank, type Suit } from '@game/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { EnhancementId } from '../enhancements';
import type { JokerId } from './catalog';
import { scoreTake, type ScoreInput, type TakenCard } from './score';
import { EMPTY_JOKER_STATE, type JokerState } from './state';

const c = (rank: Rank, suit: Suit): Card => makeCard(suit, rank);
const t = (card: Card, enhancement: EnhancementId | null = null): TakenCard => ({ card, enhancement });

function input(taken: readonly TakenCard[], over: Partial<ScoreInput> = {}, attacker: readonly JokerId[] = [], state: Partial<JokerState> = {}): ScoreInput {
  return {
    taken,
    trumpSuit: 'hearts',
    boss: null,
    topCard: null,
    takerPriorTakes: 0,
    baseMult: 1,
    attacker: { jokers: attacker, state: { ...EMPTY_JOKER_STATE, ...state } },
    defender: { jokers: [], state: EMPTY_JOKER_STATE },
    ...over,
  };
}

const damage = (i: ScoreInput): number => scoreTake(i).damage;
const side = (jokers: readonly JokerId[]) => ({ jokers, state: EMPTY_JOKER_STATE });

describe('base scoring', () => {
  it('scores rank chips: 6–10 → 1, В–К → 2, Т → 3', () => {
    expect(damage(input([t(c(7, 'clubs')), t(c(7, 'spades'))]))).toBe(2);
    expect(damage(input([t(c(6, 'clubs')), t(c(11, 'clubs')), t(c(14, 'clubs'))]))).toBe(6);
  });

  it('Золотая adds 3 chips and Острая adds 1 mult', () => {
    expect(damage(input([t(c(7, 'clubs'), 'golden')]))).toBe(4);
    expect(damage(input([t(c(7, 'clubs'), 'sharp'), t(c(8, 'clubs'))]))).toBe(4);
  });

  it('applies the tier multiplier first', () => {
    const score = scoreTake(input([t(c(7, 'clubs'))], { baseMult: 3 }));
    expect(score.damage).toBe(3);
    expect(score.steps[0]?.source).toEqual({ kind: 'tier' });
  });

  it('logs every effective step with running totals and skips neutral ones', () => {
    const score = scoreTake(input([t(c(7, 'clubs'), 'golden')], {}, ['gloat']));
    expect(score.steps.map((step) => [step.effect, step.chips, step.mult])).toEqual([
      [{ kind: 'chips', value: 1 }, 1, 1],
      [{ kind: 'chips', value: 3 }, 4, 1],
    ]);
  });
});

describe('jokers', () => {
  it('suit jokers add chips per matching card; Мелочь per card 6–8', () => {
    expect(damage(input([t(c(7, 'clubs')), t(c(8, 'spades'))], {}, ['clubs']))).toBe(5);
    expect(damage(input([t(c(8, 'clubs')), t(c(9, 'clubs'))], {}, ['small']))).toBe(4);
  });

  it('order matters: +mult before ×mult beats the reverse', () => {
    const taken = [t(c(7, 'clubs')), t(c(8, 'clubs')), t(c(9, 'hearts'))];
    expect(damage(input(taken, {}, ['gloat', 'trumpAce']))).toBe(18);
    expect(damage(input(taken, {}, ['trumpAce', 'gloat']))).toBe(12);
  });

  it('Козырной туз counts Козырная cards and boss trumps', () => {
    expect(damage(input([t(c(7, 'clubs'), 'trump')], {}, ['trumpAce']))).toBe(2);
    expect(damage(input([t(c(12, 'clubs'))], { boss: 'witch' }, ['trumpAce']))).toBe(4);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['trumpAce']))).toBe(1);
  });

  it('Зеркало copies the joker on its right, once', () => {
    expect(damage(input([t(c(7, 'clubs'))], {}, ['mirror', 'clubs']))).toBe(7);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['clubs', 'mirror']))).toBe(4);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['mirror', 'mirror', 'clubs']))).toBe(7);
  });

  it('Копилка ярости spends its charge; Серийный grows with prior takes', () => {
    expect(damage(input([t(c(7, 'clubs'))], {}, ['rage'], { rage: 8 }))).toBe(9);
    expect(damage(input([t(c(7, 'clubs')), t(c(8, 'clubs'))], { takerPriorTakes: 2 }, ['serial']))).toBe(4);
  });

  it('Шулер adds mult when a taken card matches the open top card', () => {
    expect(damage(input([t(c(7, 'clubs'))], { topCard: c(7, 'diamonds') }, ['cardSharp']))).toBe(2);
    expect(damage(input([t(c(7, 'clubs'))], { topCard: c(8, 'diamonds') }, ['cardSharp']))).toBe(1);
  });

  it('Чистюля and Коллекционер add their accumulated mult', () => {
    expect(damage(input([t(c(7, 'clubs'))], {}, ['cleanHands'], { cleanStreak: 2 }))).toBe(3);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['collector'], { collected: 4 }))).toBe(5);
  });

  it('the taker defensive jokers apply last; fractional multipliers floor exactly', () => {
    const two = [t(c(7, 'clubs')), t(c(8, 'clubs'))];
    expect(damage(input(two, { defender: side(['usurer']) }))).toBe(3);
    expect(damage(input(two, { defender: side(['thickSkin']) }))).toBe(1);
    expect(damage(input([...two, t(c(9, 'clubs'))], {}, ['thickSkin']))).toBe(2);
    expect(damage(input(two, {}, ['usurer']))).toBe(3);
  });
});

describe('scoring properties', () => {
  const ranks = fc.constantFrom<Rank>(6, 7, 8, 9, 10, 11, 12, 13, 14);
  const suits = fc.constantFrom<Suit>('clubs', 'diamonds', 'hearts', 'spades');
  const takens = fc.array(fc.tuple(ranks, suits), { minLength: 1, maxLength: 6 }).map((cards) => cards.map(([r, s]) => t(c(r, s))));

  it('without jokers damage equals the summed rank chips (never negative)', () => {
    fc.assert(
      fc.property(takens, (taken) => {
        const expected = taken.reduce((sum, { card }) => sum + (card.rank === 14 ? 3 : card.rank >= 11 ? 2 : 1), 0);
        expect(damage(input(taken))).toBe(expected);
      }),
    );
  });

  it('swapping two chips-only jokers does not change the result', () => {
    fc.assert(
      fc.property(takens, (taken) => {
        expect(damage(input(taken, {}, ['hearts', 'small']))).toBe(damage(input(taken, {}, ['small', 'hearts'])));
      }),
    );
  });
});
```

- [ ] **Step 2:** `npx vitest run packages/durak/src/jokers/score.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `state.ts`:

```ts
/** Joker memory of one side: Копилка ярости charge, Чистюля streak, Коллекционер growth (run-wide). */
export type JokerState = { readonly rage: number; readonly cleanStreak: number; readonly collected: number };

export const EMPTY_JOKER_STATE: JokerState = { rage: 0, cleanStreak: 0, collected: 0 };
```

`score.ts`:

```ts
import type { Card, Rank, Suit } from '@game/core';
import type { EnhancementId } from '../enhancements';
import { isTrumpCard } from '../rules';
import type { BossRule } from '../types';
import {
  CARD_SHARP_MULT,
  effectiveJokers,
  GLOAT_MIN_CARDS,
  GLOAT_MULT,
  SERIAL_STEP,
  SMALL_CHIPS,
  SMALL_MAX_RANK,
  SUIT_CHIPS,
  THICK_SKIN_DEALT,
  THICK_SKIN_TAKEN,
  TRUMP_ACE_TIMES,
  USURER_TIMES,
  type JokerId,
} from './catalog';
import type { JokerState } from './state';

export type TakenCard = { readonly card: Card; readonly enhancement: EnhancementId | null };

export type StepSource =
  | { readonly kind: 'tier' }
  | { readonly kind: 'card'; readonly card: Card }
  | { readonly kind: 'enhancement'; readonly card: Card; readonly enhancement: EnhancementId }
  | { readonly kind: 'joker'; readonly side: 'attacker' | 'defender'; readonly slot: number; readonly joker: JokerId; readonly acting: JokerId };

export type Effect = { readonly kind: 'chips' | 'mult' | 'times'; readonly value: number };

/** One visible scoring step with the running chips and mult after it (drives the 3b animation). */
export type ScoreStep = { readonly source: StepSource; readonly effect: Effect; readonly chips: number; readonly mult: number };

export type TakeScore = { readonly chips: number; readonly mult: number; readonly damage: number; readonly steps: readonly ScoreStep[] };

export type ScoreSide = { readonly jokers: readonly JokerId[]; readonly state: JokerState };

export type ScoreInput = {
  readonly taken: readonly TakenCard[];
  readonly trumpSuit: Suit;
  readonly boss: BossRule | null;
  /** The face-up top card of the deck (Шулер), if shown. */
  readonly topCard: Card | null;
  /** Takes by the same taker earlier in this fight (Серийный). */
  readonly takerPriorTakes: number;
  /** The attacker's tier multiplier (enemies 1/2/3 by tier; the player 1). */
  readonly baseMult: number;
  readonly attacker: ScoreSide;
  /** The taker: only its defensive jokers act. */
  readonly defender: ScoreSide;
};

type Tally = { readonly chips: number; readonly mult: number; readonly steps: readonly ScoreStep[] };

/** Guards floor() against binary rounding (2 × 1.5 must be 3, not 2.999…). */
const EPSILON = 1e-9;

const chips = (value: number): Effect => ({ kind: 'chips', value });
const mult = (value: number): Effect => ({ kind: 'mult', value });
const times = (value: number): Effect => ({ kind: 'times', value });

export function rankChips(rank: Rank): number {
  if (rank === 14) return 3;
  return rank >= 11 ? 2 : 1;
}

function apply(tally: Tally, source: StepSource, effect: Effect): Tally {
  const neutral = effect.kind === 'times' ? effect.value === 1 : effect.value === 0;
  if (neutral) return tally;
  const nextChips = effect.kind === 'chips' ? tally.chips + effect.value : tally.chips;
  const nextMult = effect.kind === 'mult' ? tally.mult + effect.value : effect.kind === 'times' ? tally.mult * effect.value : tally.mult;
  return { chips: nextChips, mult: nextMult, steps: [...tally.steps, { source, effect, chips: nextChips, mult: nextMult }] };
}

const SUIT_JOKERS: Partial<Record<JokerId, Suit>> = { hearts: 'hearts', diamonds: 'diamonds', clubs: 'clubs', spades: 'spades' };

function cardEffect(acting: JokerId, card: Card): Effect | null {
  const suit = SUIT_JOKERS[acting];
  if (suit) return card.suit === suit ? chips(SUIT_CHIPS) : null;
  if (acting === 'small') return card.rank <= SMALL_MAX_RANK ? chips(SMALL_CHIPS) : null;
  return null;
}

function enhancementEffect(enhancement: EnhancementId): Effect | null {
  if (enhancement === 'golden') return chips(3);
  if (enhancement === 'sharp') return mult(1);
  return null;
}

function hasTrump(input: ScoreInput): boolean {
  return input.taken.some(({ card, enhancement }) => enhancement === 'trump' || isTrumpCard(card, input.trumpSuit, input.boss));
}

function takeEffect(acting: JokerId, input: ScoreInput): Effect | null {
  const { state } = input.attacker;
  switch (acting) {
    case 'gloat':
      return input.taken.length >= GLOAT_MIN_CARDS ? mult(GLOAT_MULT) : null;
    case 'rage':
      return chips(state.rage);
    case 'trumpAce':
      return hasTrump(input) ? times(TRUMP_ACE_TIMES) : null;
    case 'serial':
      return mult(SERIAL_STEP * input.takerPriorTakes);
    case 'cardSharp': {
      const top = input.topCard;
      return top && input.taken.some(({ card }) => card.rank === top.rank) ? mult(CARD_SHARP_MULT) : null;
    }
    case 'usurer':
      return times(USURER_TIMES);
    case 'cleanHands':
      return mult(state.cleanStreak);
    case 'collector':
      return mult(state.collected);
    case 'thickSkin':
      return times(THICK_SKIN_DEALT);
    default:
      return null;
  }
}

function defenseEffect(acting: JokerId): Effect | null {
  if (acting === 'usurer') return times(USURER_TIMES);
  if (acting === 'thickSkin') return times(THICK_SKIN_TAKEN);
  return null;
}

function jokerPass(tally: Tally, jokers: readonly JokerId[], side: 'attacker' | 'defender', effectOf: (acting: JokerId) => Effect | null): Tally {
  return effectiveJokers(jokers).reduce<Tally>((current, acting, slot) => {
    const effect = acting ? effectOf(acting) : null;
    const joker = jokers[slot];
    return effect && acting && joker ? apply(current, { kind: 'joker', side, slot, joker, acting }, effect) : current;
  }, tally);
}

function scoreCard(tally: Tally, taken: TakenCard, input: ScoreInput): Tally {
  const { card, enhancement } = taken;
  const afterRank = apply(tally, { kind: 'card', card }, chips(rankChips(card.rank)));
  const boost = enhancement ? enhancementEffect(enhancement) : null;
  const afterEnhancement = enhancement && boost ? apply(afterRank, { kind: 'enhancement', card, enhancement }, boost) : afterRank;
  return jokerPass(afterEnhancement, input.attacker.jokers, 'attacker', (acting) => cardEffect(acting, card));
}

/** «Фишки × Множитель» for one take, in Balatro order; every effective step is logged. */
export function scoreTake(input: ScoreInput): TakeScore {
  const start = apply({ chips: 0, mult: 1, steps: [] }, { kind: 'tier' }, times(input.baseMult));
  const afterCards = input.taken.reduce((tally, taken) => scoreCard(tally, taken, input), start);
  const afterAttack = jokerPass(afterCards, input.attacker.jokers, 'attacker', (acting) => takeEffect(acting, input));
  const final = jokerPass(afterAttack, input.defender.jokers, 'defender', defenseEffect);
  const damage = Math.max(0, Math.floor(final.chips * final.mult + EPSILON));
  return { chips: final.chips, mult: final.mult, damage, steps: final.steps };
}
```

- [ ] **Step 4:** `npx vitest run packages/durak/src/jokers` — Expected: PASS.
- [ ] **Step 5:** `git add packages/durak/src/jokers && git commit -m "feat(durak): ordered Фишки × Множитель scoring with a step log"`

---

### Task 3: Joker state from game events

**Files:** Modify `jokers/state.ts`; Create `jokers/state.test.ts`, `jokers/index.ts`; Modify `src/index.ts` (add `export * from './jokers';`)

**Interfaces — Produces:** `afterBeaten(state, jokers)`, `afterHitDealt(state, jokers, taken)`, `afterOwnTake(state)`, `afterRound(state, jokers, tookThisRound)`.

- [ ] **Step 1: Failing tests** — `state.test.ts`:

```ts
import { makeCard } from '@game/core';
import { describe, expect, it } from 'vitest';
import { afterBeaten, afterHitDealt, afterOwnTake, afterRound, EMPTY_JOKER_STATE, type JokerState } from './state';

const s = (over: Partial<JokerState> = {}): JokerState => ({ ...EMPTY_JOKER_STATE, ...over });

describe('joker events', () => {
  it('«Бито» charges Копилка ярости, mirrors included', () => {
    expect(afterBeaten(s(), ['rage']).rage).toBe(4);
    expect(afterBeaten(s({ rage: 4 }), ['mirror', 'rage']).rage).toBe(12);
    expect(afterBeaten(s(), ['clubs'])).toEqual(s());
  });

  it('a dealt hit spends the charge and grows Коллекционер per enhanced card', () => {
    const taken = [
      { card: makeCard('clubs', 7), enhancement: 'golden' as const },
      { card: makeCard('clubs', 8), enhancement: null },
    ];
    expect(afterHitDealt(s({ rage: 8 }), ['rage'], taken).rage).toBe(0);
    expect(afterHitDealt(s({ collected: 2 }), ['collector'], taken).collected).toBe(3);
    expect(afterHitDealt(s({ collected: 2 }), [], taken).collected).toBe(2);
  });

  it('taking resets the Чистюля streak; a clean deal grows it', () => {
    expect(afterOwnTake(s({ cleanStreak: 3 })).cleanStreak).toBe(0);
    expect(afterRound(s({ cleanStreak: 1 }), ['cleanHands'], false).cleanStreak).toBe(2);
    expect(afterRound(s({ cleanStreak: 1 }), ['cleanHands'], true).cleanStreak).toBe(1);
    expect(afterRound(s(), [], false).cleanStreak).toBe(0);
  });
});
```

- [ ] **Step 2:** `npx vitest run packages/durak/src/jokers/state.test.ts` — Expected: FAIL, `afterBeaten` not exported.

- [ ] **Step 3: Implement** — replace `state.ts`:

```ts
import { countJoker, RAGE_CHARGE, type JokerId } from './catalog';
import type { TakenCard } from './score';

/** Joker memory of one side: Копилка ярости charge, Чистюля streak, Коллекционер growth (run-wide). */
export type JokerState = { readonly rage: number; readonly cleanStreak: number; readonly collected: number };

export const EMPTY_JOKER_STATE: JokerState = { rage: 0, cleanStreak: 0, collected: 0 };

/** The side defended and the bout ended in «Бито». */
export function afterBeaten(state: JokerState, jokers: readonly JokerId[]): JokerState {
  const gain = RAGE_CHARGE * countJoker(jokers, 'rage');
  return gain > 0 ? { ...state, rage: state.rage + gain } : state;
}

/** The side's attack was taken and scored: the charge is spent, Коллекционер grows. */
export function afterHitDealt(state: JokerState, jokers: readonly JokerId[], taken: readonly TakenCard[]): JokerState {
  const enhanced = taken.filter((card) => card.enhancement !== null).length;
  return { ...state, rage: 0, collected: state.collected + enhanced * countJoker(jokers, 'collector') };
}

export function afterOwnTake(state: JokerState): JokerState {
  return { ...state, cleanStreak: 0 };
}

export function afterRound(state: JokerState, jokers: readonly JokerId[], tookThisRound: boolean): JokerState {
  const gain = countJoker(jokers, 'cleanHands');
  return tookThisRound || gain === 0 ? state : { ...state, cleanStreak: state.cleanStreak + gain };
}
```

`jokers/index.ts`:

```ts
export * from './catalog';
export * from './score';
export * from './state';
```

- [ ] **Step 4:** `npx vitest run packages/durak` — Expected: PASS.
- [ ] **Step 5:** `git add packages/durak/src && git commit -m "feat(durak): joker state from «Бито», hits, takes and deals"`

---

### Task 4: Takes record each taken card's enhancement

**Files:** Modify `types.ts` (`BoutResult`), `reducer.ts` (`boutResult`), `reducer.test.ts`, `fight.ts`, `fight.test.ts`

**Interfaces — Produces:** `BoutResult = { damaged; attackCards; takenEnhancements: readonly (EnhancementId | null)[] }` aligned with `attackCards`; `goldenHits` removed.

- [ ] **Step 1 (RED):** in `reducer.test.ts` replace `goldenHits: 0` with `takenEnhancements: [null]` (one-card bouts) / `takenEnhancements: [null, null]` (the two-card bout near line 200); add to the same `describe` as the existing `lastBout` tests:

```ts
  it('records the enhancement each taken attack card was played with', () => {
    const state = roundState({
      attacker: 'player',
      table: [
        { attack: c(7, 'clubs'), defense: null, attackEnh: 'golden' },
        { attack: c(7, 'spades'), defense: null },
      ],
      hands: { player: filler(3), enemy: filler(3, 'diamonds') },
      defenderTaking: true,
    });
    const result = applyRoundAction(state, 'player', { type: 'endAttack' });
    expect(result.ok && result.value.lastBout?.takenEnhancements).toEqual(['golden', null]);
  });
```

Run `npx vitest run packages/durak/src/reducer.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement** — `types.ts`:

```ts
export type BoutResult = {
  readonly damaged: PlayerId;
  readonly attackCards: readonly Card[];
  /** The enhancement each attack card was played with, aligned with `attackCards`. */
  readonly takenEnhancements: readonly (EnhancementId | null)[];
};
```

`reducer.ts` `boutResult`: replace the `goldenHits` line with `takenEnhancements: state.table.map((pair) => pair.attackEnh ?? null),`.
`fight.ts`: replace `bout.goldenHits` with `bout.takenEnhancements.filter((id) => id === 'golden').length` (Task 5 rewrites it).
`fight.test.ts`: `goldenHits: 0` → `takenEnhancements: [null]`.

- [ ] **Step 3:** `npm run typecheck && npx vitest run packages/durak` — Expected: clean, PASS. Commit `refactor(durak): bouts record each taken card's enhancement`.

---

### Task 5: Fights score takes with jokers

**Files:** Modify `packages/durak/src/fight.ts`, `fight.test.ts`

**Interfaces:**
- `FightConfig = { seed; playerHp; enemyHp; jokers?: Partial<SideJokers>; baseMult?: Partial<PerPlayer>; collected?: number; boss?; profiles? }` — `perks` removed.
- `FightState` gains `jokers: SideJokers`, `baseMult: PerPlayer`, `jokerState: SideJokerState`, `lastScore: ScoredHit | null`; `type ScoredHit = TakeScore & { target: PlayerId }`; loses `perks`.

- [ ] **Step 1 (RED)** — `fight.test.ts`:
  - imports: add `import type { JokerId } from './jokers/catalog';` and `import type { RoundState } from './types';`.
  - `createFight` test: replace `expect(base.perks).toEqual([])` with `expect(base.jokers).toEqual({ player: [], enemy: [] }); expect(base.lastScore).toBeNull();`.
  - Replace the whole `describe('perks in a fight', …)` with:

```ts
describe('jokers in a fight', () => {
  const playerTaking = roundState({
    attacker: 'enemy',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(8, 'clubs'), defense: null }],
    defenderTaking: true,
    deck: filler(6, 'hearts').slice(2),
  });
  /** The enemy attacked with one card the player covered; the enemy says «Бито». */
  const playerBeats = roundState({
    attacker: 'enemy',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }],
    deck: filler(6, 'hearts').slice(2),
  });
  const fightWith = (player: readonly JokerId[], round: RoundState, over: Partial<Parameters<typeof createFight>[0]> = {}) => ({
    ...createFight({ seed: 1, playerHp: 60, enemyHp: 60, jokers: { player }, ...over }),
    round,
  });

  it('counts takes per round and per fight', () => {
    const next = expectOk(applyFightAction({ ...base, round: takingRound }, 'player', { type: 'endAttack' }));
    expect(next.roundTakes).toEqual({ player: 0, enemy: 1 });
    expect(next.fightTakes).toEqual({ player: 0, enemy: 1 });
  });

  it('a new round resets round takes but keeps fight takes', () => {
    const fight = { ...base, round: endingRound, roundTakes: { player: 2, enemy: 1 }, fightTakes: { player: 2, enemy: 1 } };
    const ended = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    const next = expectOk(applyFightAction(ended, 'player', { type: 'nextRound' }));
    expect(next.roundTakes).toEqual({ player: 0, enemy: 0 });
    expect(next.fightTakes).toEqual({ player: 2, enemy: 1 });
  });

  it('records the scored hit and applies the player jokers', () => {
    const next = expectOk(applyFightAction(fightWith(['clubs'], takingRound), 'player', { type: 'endAttack' }));
    expect(next.lastScore).toMatchObject({ target: 'enemy', chips: 5, mult: 1, damage: 5 });
    expect(next.hp.enemy).toBe(55);
  });

  it('the enemy tier multiplier scales hits on the player', () => {
    const fight = fightWith([], playerTaking, { baseMult: { enemy: 3 } });
    const done = expectOk(applyFightAction(fight, 'enemy', { type: 'endAttack' }));
    expect(done.hp.player).toBe(54);
  });

  it('«Бито» charges Копилка ярости and the next hit spends it', () => {
    const beaten = expectOk(applyFightAction(fightWith(['rage'], playerBeats), 'enemy', { type: 'endAttack' }));
    expect(beaten.jokerState.player.rage).toBe(4);
    const hit = expectOk(applyFightAction({ ...beaten, round: takingRound }, 'player', { type: 'endAttack' }));
    expect(hit.lastScore?.damage).toBe(6);
    expect(hit.jokerState.player.rage).toBe(0);
  });

  it('a 0-damage take still counts and still spends the charge', () => {
    const single = roundState({ ...takingRound, table: [{ attack: c(7, 'clubs'), defense: null }] });
    const fight = { ...fightWith(['thickSkin'], single), jokers: { player: ['thickSkin'] as const, enemy: ['thickSkin'] as const } };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.lastScore?.damage).toBe(0);
    expect(next.hp.enemy).toBe(60);
    expect(next.fightTakes.enemy).toBe(1);
  });

  it('Коллекционер grows from enhanced cards the enemy takes', () => {
    const golden = roundState({ ...takingRound, table: [{ attack: c(7, 'clubs'), defense: null, attackEnh: 'golden' }] });
    const next = expectOk(applyFightAction(fightWith(['collector'], golden, { collected: 2 }), 'player', { type: 'endAttack' }));
    expect(next.lastScore).toMatchObject({ chips: 4, mult: 3, damage: 12 });
    expect(next.jokerState.player.collected).toBe(3);
  });

  it('a clean deal grows Чистюля', () => {
    const ended = expectOk(applyFightAction(fightWith(['cleanHands'], endingRound), 'player', { type: 'endAttack' }));
    const next = expectOk(applyFightAction(ended, 'player', { type: 'nextRound' }));
    expect(next.jokerState.player.cleanStreak).toBe(1);
  });

  it('Длинные руки deals and keeps a 7-card player hand', () => {
    const fight = createFight({ seed: 1, playerHp: 60, enemyHp: 60, jokers: { player: ['longArms'] } });
    expect(fight.round.hands.player).toHaveLength(7);
    expect(fight.round.handSizes).toEqual({ player: 7, enemy: 6 });
  });
});
```

  - Enhancements block: the Золотая test (7♣ golden + 7♥ taken) now deals `1 + 3 + 1 = 5`; update its expected HP / hit and rename to `'Золотая attack cards add 3 chips to the hit'`.

Run `npx vitest run packages/durak/src/fight.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement** — `fight.ts`:

Imports (replace perks import; add `type Card` to the core import):

```ts
import { jokerHandSizes, type SideJokers } from './jokers/catalog';
import { scoreTake, type TakeScore, type TakenCard } from './jokers/score';
import { afterBeaten, afterHitDealt, afterOwnTake, afterRound, EMPTY_JOKER_STATE, type JokerState } from './jokers/state';
```

Types:

```ts
export type FightConfig = {
  readonly seed: number;
  readonly playerHp: number;
  readonly enemyHp: number;
  readonly jokers?: Partial<SideJokers>;
  /** Tier multiplier of each side's hits (enemy 1/2/3 by tier). */
  readonly baseMult?: Partial<PerPlayer>;
  /** Коллекционер growth carried in from the run. */
  readonly collected?: number;
  readonly boss?: BossRule | null;
  readonly profiles?: Profiles;
};

export type ScoredHit = TakeScore & { readonly target: PlayerId };
export type SideJokerState = Readonly<Record<PlayerId, JokerState>>;
```

`FightState`: remove `perks`; add

```ts
  /** Each side's jokers in slot order. */
  readonly jokers: SideJokers;
  readonly baseMult: PerPlayer;
  readonly jokerState: SideJokerState;
  /** The last scored take (score label now; animation in 3b). */
  readonly lastScore: ScoredHit | null;
```

`createFight`:

```ts
export function createFight(config: FightConfig): FightState {
  const jokers: SideJokers = { player: config.jokers?.player ?? [], enemy: config.jokers?.enemy ?? [] };
  const boss = config.boss ?? null;
  const [round, rng] = dealRound(createRng(config.seed), jokerHandSizes(jokers), boss, config.profiles ?? EMPTY_PROFILES);
  const hp = { player: config.playerHp, enemy: config.enemyHp };
  return {
    round,
    hp,
    maxHp: hp,
    rng,
    roundNumber: 1,
    winner: null,
    hits: [],
    hitSeq: 0,
    jokers,
    baseMult: { player: 1, enemy: 1, ...config.baseMult },
    jokerState: { player: { ...EMPTY_JOKER_STATE, collected: config.collected ?? 0 }, enemy: EMPTY_JOKER_STATE },
    lastScore: null,
    roundTakes: NO_TAKES,
    fightTakes: NO_TAKES,
    boss,
    cardCoins: NO_TAKES,
  };
}
```

`applyFightAction`: `chargeTake(next, bout, state.round.trumpSuit)` → `chargeTake(next, bout, state.round)`.

`nextRound`:

```ts
function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng, jokerHandSizes(state.jokers), state.boss, state.round.profiles);
  const jokerState: SideJokerState = {
    player: afterRound(state.jokerState.player, state.jokers.player, state.roundTakes.player > 0),
    enemy: afterRound(state.jokerState.enemy, state.jokers.enemy, state.roundTakes.enemy > 0),
  };
  return ok({ ...state, round, rng, jokerState, roundNumber: state.roundNumber + 1, hits: [], roundTakes: NO_TAKES });
}
```

Replace `chargeTake`, add helpers:

```ts
/** The face-up top card, shown only while more than the trump is left (same rule as the deck view). */
function topCardOf(round: RoundState): Card | null {
  return round.deck.length > 1 ? (round.deck[0] ?? null) : null;
}

function withSide<T>(record: Readonly<Record<PlayerId, T>>, id: PlayerId, value: T): Readonly<Record<PlayerId, T>> {
  return id === 'player' ? { ...record, player: value } : { ...record, enemy: value };
}

/** Only taking the table hurts: the attacker's jokers score the take, the taker's defensive jokers apply last. */
function chargeTake(state: FightState, bout: BoutResult, before: RoundState): FightState {
  const taker = bout.damaged;
  const attacker = opponentOf(taker);
  const taken: readonly TakenCard[] = bout.attackCards.map((card, i) => ({ card, enhancement: bout.takenEnhancements[i] ?? null }));
  const score = scoreTake({
    taken,
    trumpSuit: before.trumpSuit,
    boss: state.boss,
    topCard: topCardOf(before),
    takerPriorTakes: state.fightTakes[taker],
    baseMult: state.baseMult[attacker],
    attacker: { jokers: state.jokers[attacker], state: state.jokerState[attacker] },
    defender: { jokers: state.jokers[taker], state: state.jokerState[taker] },
  });
  const afterAttacker = withSide(state.jokerState, attacker, afterHitDealt(state.jokerState[attacker], state.jokers[attacker], taken));
  const counted: FightState = {
    ...state,
    jokerState: withSide(afterAttacker, taker, afterOwnTake(afterAttacker[taker])),
    lastScore: { ...score, target: taker },
    roundTakes: increment(state.roundTakes, taker),
    fightTakes: increment(state.fightTakes, taker),
  };
  return score.damage > 0 ? applyHit(counted, { target: taker, amount: score.damage }) : counted;
}
```

`creditBeatenDefenses`:

```ts
function creditBeatenDefenses(state: FightState, beatenRound: RoundState): FightState {
  const defender = opponentOf(beatenRound.attacker);
  const charged: FightState = {
    ...state,
    jokerState: withSide(state.jokerState, defender, afterBeaten(state.jokerState[defender], state.jokers[defender])),
  };
  return beatenRound.table.reduce<FightState>(
    (current, pair) => (pair.defenseEnh ? creditDefense(current, defender, pair.defenseEnh) : current),
    charged,
  );
}
```

Remove the perk imports and helpers no longer used.

- [ ] **Step 3:** `npx vitest run packages/durak/src/fight.test.ts` — Expected: PASS. (`run/` still references perks — Task 6; ledger it.)
- [ ] **Step 4:** Commit `feat(durak): fights score takes with jokers and track joker state`.

---

### Task 6: Run, shop, economy and enemies on jokers

**Files:** Modify `run/run.ts`, `run/shop.ts`, `run/economy.ts`, `content/enemies.ts`, `run/*.test.ts`, `src/index.ts`; Delete `perks.ts`, `perks.test.ts`

**Interfaces — Produces:** `RunState.jokers`, `RunState.collected`; actions `buyJoker {index}`, `sellJoker {jokerId}`, `moveJoker {from,to}` (fight and shop phases; also updates the fight's player jokers); `ShopOffer = { jokerId; price }`; `Wallet = { coins; jokers }`; `ShopError` with `jokerSlotsFull`/`jokerNotOwned`; `sellPrice(jokerId)`; `moveJoker(jokers, from, to)`; `RewardInput = { tier; playerHp; playerMaxHp; coinsBefore; jokers; enemyTakes; cardCoins }`; `FightReward.jokerBonus`; `HP_BONUS_MAX = 5`; `EnemySpec.jokers`; `TIER_MULT`; `PLAYER_HP = 60`.

- [ ] **Step 1 (RED)** — tests:
  - `economy.test.ts`: input `{ tier: 'normal', playerHp: 60, playerMaxHp: 60, coinsBefore: 0, jokers: [], enemyTakes: 3, cardCoins: 0 }` → `{ base: 3, hpBonus: 5, interest: 0, jokerBonus: 0, cardBonus: 0, total: 8 }`; add `expect(fightReward({ ...input, playerHp: 30 }).hpBonus).toBe(2)`; Мародёр → `jokerBonus: 3`; delete the two Чистюля coin assertions; Копилка uses `jokers: ['piggyBank']`.
  - `shop.test.ts`: rename perk API to joker API (`buyJoker`, `sellJoker`, `MAX_JOKERS`, `jokerSlotsFull`, `jokerNotOwned`, `jokers`), keep the "offers exclude owned and never repeat" assertions; add:

```ts
  it('moves a joker to another slot', () => {
    expect(moveJoker(['clubs', 'gloat', 'rage'], 0, 2)).toEqual({ ok: true, value: ['gloat', 'rage', 'clubs'] });
    expect(moveJoker(['clubs'], 0, 3)).toEqual({ ok: false, error: 'jokerNotOwned' });
  });

  it('legendary jokers are rarer than common ones over many shops', () => {
    const counts = { common: 0, rare: 0, legendary: 0 };
    let rng = createRng(7);
    for (let i = 0; i < 400; i++) {
      const [shop, next] = createShop(rng, []);
      rng = next;
      for (const offer of shop.offers) if (offer) counts[JOKERS[offer.jokerId].rarity] += 1;
    }
    expect(counts.common).toBeGreaterThan(counts.legendary * 3);
  });
```

  - `run.test.ts`: `perks` → `jokers`, perk actions → joker actions (`jokerId`), player HP 60 (`PLAYER_HP`); add:

```ts
  it('moveJoker reorders the run jokers and the current fight uses the new order', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const jokers = ['clubs', 'gloat'] as const;
    const fighting: RunState = { ...run, jokers, phase: { kind: 'fight', fight: { ...run.phase.fight, jokers: { player: jokers, enemy: [] } } } };
    const moved = expectOk(applyRunAction(fighting, { type: 'moveJoker', from: 0, to: 1 }));
    expect(moved.jokers).toEqual(['gloat', 'clubs']);
    expect(moved.phase.kind === 'fight' && moved.phase.fight.jokers.player).toEqual(['gloat', 'clubs']);
  });

  it('carries Коллекционер growth from a won fight into the run', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const fight = { ...run.phase.fight, winner: 'player' as const, jokerState: { ...run.phase.fight.jokerState, player: { rage: 0, cleanStreak: 0, collected: 4 } } };
    const left = expectOk(applyRunAction({ ...run, phase: { kind: 'fight', fight } }, { type: 'leaveFight' }));
    expect(left.collected).toBe(4);
  });
```

  - `simulation.test.ts`: `MAX_PERKS`→`MAX_JOKERS`, `run.perks`→`run.jokers`, `buyPerk`→`buyJoker`, "3 slots"→"5 slots".

Run `npx vitest run packages/durak` — Expected: FAIL.

- [ ] **Step 2: Implement**

`content/enemies.ts`:

```ts
import type { AiStyle } from '../ai';
import type { DeckProfile } from '../enhancements';
import type { JokerId } from '../jokers/catalog';
import type { EnemyTier } from '../run/economy';

export type EnemySpec = {
  readonly name: string;
  readonly tier: EnemyTier;
  readonly hp: number;
  readonly style: AiStyle;
  /** The enemy's version of the shared deck. */
  readonly profile: DeckProfile;
  /** The enemy's jokers (strong 1, boss 2), scoring the player's takes. */
  readonly jokers: readonly JokerId[];
};

/** Multiplier of the enemy's hits on the player, by tier. */
export const TIER_MULT: Readonly<Record<EnemyTier, number>> = { normal: 1, strong: 2, boss: 3 };

/** 2 circles × (normal → strong → boss). HP is tuned by the balance simulation. */
export const RUN_SCHEDULE: readonly EnemySpec[] = [
  { name: 'Скупой', tier: 'normal', hp: 30, style: 'stingy', profile: { 'diamonds-6': 'trump' }, jokers: [] },
  { name: 'Задира', tier: 'strong', hp: 50, style: 'aggressive', profile: { 'clubs-13': 'golden', 'spades-12': 'sharp' }, jokers: ['gloat'] },
  {
    name: 'Босс круга 1',
    tier: 'boss',
    hp: 80,
    style: 'aggressive',
    profile: { 'hearts-14': 'golden', 'spades-14': 'sharp', 'clubs-11': 'heavy' },
    jokers: ['serial', 'trumpAce'],
  },
  {
    name: 'Скряга',
    tier: 'normal',
    hp: 120,
    style: 'stingy',
    profile: { 'diamonds-13': 'coin', 'spades-7': 'trump', 'clubs-10': 'sharp' },
    jokers: [],
  },
  {
    name: 'Громила',
    tier: 'strong',
    hp: 180,
    style: 'aggressive',
    profile: { 'spades-13': 'golden', 'spades-11': 'golden', 'diamonds-12': 'sharp', 'hearts-10': 'heavy' },
    jokers: ['rage'],
  },
  {
    name: 'Босс круга 2',
    tier: 'boss',
    hp: 300,
    style: 'aggressive',
    profile: { 'hearts-13': 'golden', 'diamonds-14': 'sharp', 'clubs-14': 'sharp', 'spades-10': 'heavy', 'clubs-8': 'trump' },
    jokers: ['gloat', 'usurer'],
  },
];
```

`run/economy.ts`:

```ts
import { jokerFightCoins, jokerInterestCap, type JokerId } from '../jokers/catalog';

export type EnemyTier = 'normal' | 'strong' | 'boss';

export const FIGHT_BASE_COINS: Readonly<Record<EnemyTier, number>> = { normal: 3, strong: 4, boss: 5 };
/** Coins for finishing a fight at full HP; less in proportion to HP lost. */
export const HP_BONUS_MAX = 5;
export const COINS_PER_INTEREST = 5;
export const BASE_INTEREST_CAP = 5;

export type FightReward = {
  readonly base: number;
  readonly hpBonus: number;
  readonly interest: number;
  readonly jokerBonus: number;
  readonly cardBonus: number;
  readonly total: number;
};

export type RewardInput = {
  readonly tier: EnemyTier;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  /** Coins held before this reward; interest is paid on them (like Balatro). */
  readonly coinsBefore: number;
  readonly jokers: readonly JokerId[];
  readonly enemyTakes: number;
  /** Coins earned by Монетная defenses during the fight. */
  readonly cardCoins: number;
};

export function fightReward(input: RewardInput): FightReward {
  const base = FIGHT_BASE_COINS[input.tier];
  const share = input.playerMaxHp > 0 ? Math.max(0, input.playerHp) / input.playerMaxHp : 0;
  const hpBonus = Math.floor(HP_BONUS_MAX * share);
  const cap = jokerInterestCap(input.jokers, BASE_INTEREST_CAP);
  const interest = Math.min(Math.floor(Math.max(0, input.coinsBefore) / COINS_PER_INTEREST), cap);
  const jokerBonus = jokerFightCoins(input.jokers, input.enemyTakes);
  const cardBonus = Math.max(0, input.cardCoins);
  return { base, hpBonus, interest, jokerBonus, cardBonus, total: base + hpBonus + interest + jokerBonus + cardBonus };
}
```

`run/shop.ts` — keep `EnhancementOffer`, `rollEnhancementOffers`, `buyEnhancement` unchanged; replace the rest:

```ts
import { createDeck, err, nextInt, ok, shuffle, type Result, type RngState } from '@game/core';
import { ENHANCEMENT_IDS, ENHANCEMENTS, withEnhancement, type DeckProfile, type EnhancementId } from '../enhancements';
import { JOKER_IDS, JOKERS, MAX_JOKERS, RARITY_WEIGHT, type JokerId } from '../jokers/catalog';

export const SHOP_OFFER_COUNT = 2;
export const BASE_REROLL_COST = 2;
export const ENHANCEMENT_OFFER_COUNT = 2;
export const ENHANCEMENT_CARD_CHOICES = 3;
const DURAK_MIN_RANK = 6;

export type ShopOffer = { readonly jokerId: JokerId; readonly price: number };

/** A `null` offer has been bought this visit. */
export type ShopState = {
  readonly offers: readonly (ShopOffer | null)[];
  readonly enhancementOffers: readonly (EnhancementOffer | null)[];
  readonly rerollCost: number;
};

export type Wallet = { readonly coins: number; readonly jokers: readonly JokerId[] };

export type ShopError = 'noOffer' | 'notEnoughCoins' | 'jokerSlotsFull' | 'jokerNotOwned' | 'cardNotOffered';

const weightOf = (id: JokerId): number => RARITY_WEIGHT[JOKERS[id].rarity];

function pickWeighted(pool: readonly JokerId[], rng: RngState): readonly [JokerId, RngState] {
  const total = pool.reduce((sum, id) => sum + weightOf(id), 0);
  const [roll, next] = nextInt(rng, total);
  const cumulative = pool.reduce<readonly number[]>((acc, id) => [...acc, (acc[acc.length - 1] ?? 0) + weightOf(id)], []);
  const index = cumulative.findIndex((bound) => roll < bound);
  return [pool[index] ?? (pool[0] as JokerId), next];
}

type Draw = readonly [readonly ShopOffer[], readonly JokerId[], RngState];

function rollOffers(rng: RngState, owned: readonly JokerId[]): readonly [readonly ShopOffer[], RngState] {
  const start: Draw = [[], JOKER_IDS.filter((id) => !owned.includes(id)), rng];
  const [offers, , next] = Array.from({ length: SHOP_OFFER_COUNT }).reduce<Draw>(([acc, pool, current]) => {
    if (pool.length === 0) return [acc, pool, current];
    const [jokerId, after] = pickWeighted(pool, current);
    return [[...acc, { jokerId, price: JOKERS[jokerId].price }], pool.filter((id) => id !== jokerId), after];
  }, start);
  return [offers, next];
}

export function createShop(rng: RngState, owned: readonly JokerId[]): readonly [ShopState, RngState] {
  const [offers, afterJokers] = rollOffers(rng, owned);
  const [enhancementOffers, next] = rollEnhancementOffers(afterJokers);
  return [{ offers, enhancementOffers, rerollCost: BASE_REROLL_COST }, next];
}

export function sellPrice(jokerId: JokerId): number {
  return Math.floor(JOKERS[jokerId].price / 2);
}

export function buyJoker(shop: ShopState, wallet: Wallet, index: number): Result<{ readonly shop: ShopState; readonly wallet: Wallet }, ShopError> {
  const offer = shop.offers[index];
  if (!offer) return err('noOffer');
  if (wallet.jokers.length >= MAX_JOKERS) return err('jokerSlotsFull');
  if (wallet.coins < offer.price) return err('notEnoughCoins');
  return ok({
    shop: { ...shop, offers: shop.offers.map((current, i) => (i === index ? null : current)) },
    wallet: { coins: wallet.coins - offer.price, jokers: [...wallet.jokers, offer.jokerId] },
  });
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

export function rerollShop(
  shop: ShopState,
  wallet: Wallet,
  rng: RngState,
): Result<{ readonly shop: ShopState; readonly wallet: Wallet; readonly rng: RngState }, ShopError> {
  if (wallet.coins < shop.rerollCost) return err('notEnoughCoins');
  const [offers, next] = rollOffers(rng, wallet.jokers);
  const [enhancementOffers, afterEnhancements] = rollEnhancementOffers(next);
  return ok({
    shop: { offers, enhancementOffers, rerollCost: shop.rerollCost + 1 },
    wallet: { ...wallet, coins: wallet.coins - shop.rerollCost },
    rng: afterEnhancements,
  });
}
```

`run/run.ts`:
- imports: `TIER_MULT` with `RUN_SCHEDULE`; `type JokerId` from `../jokers/catalog`; shop: `buyEnhancement, buyJoker, createShop, moveJoker, rerollShop, sellJoker, type ShopError, type ShopState, type Wallet`; drop the perks import.
- `export const PLAYER_HP = 60;`
- `RunState`: `perks` → `readonly jokers: readonly JokerId[];` plus `/** Коллекционер growth over the whole run. */ readonly collected: number;`.
- `RunAction`: replace perk actions with `{ type: 'buyJoker'; index: number }`, `{ type: 'sellJoker'; jokerId: JokerId }`, `{ type: 'moveJoker'; from: number; to: number }`.
- `createRun`: `jokers: [], collected: 0`.
- `applyRunAction`: `buyJoker`/`sellJoker` cases as the old perk cases with the renamed functions; add `case 'moveJoker': return reorderJokers(state, action.from, action.to);` and

```ts
function reorderJokers(state: RunState, from: number, to: number): RunResult {
  if (state.phase.kind === 'over') return err('wrongPhase');
  const result = moveJoker(state.jokers, from, to);
  if (!result.ok) return result;
  const jokers = result.value;
  if (state.phase.kind !== 'fight') return ok({ ...state, jokers });
  const fight = { ...state.phase.fight, jokers: { ...state.phase.fight.jokers, player: jokers } };
  return ok({ ...state, jokers, phase: { kind: 'fight', fight } });
}
```

- `wallet()` → `{ coins: state.coins, jokers: state.jokers }`.
- `startFight`:

```ts
function startFight(state: RunState): RunState {
  const [fightSeed, rng] = nextInt(state.rng, FIGHT_SEED_RANGE);
  const spec = enemyAt(state.stage);
  const fight = createFight({
    seed: fightSeed,
    playerHp: PLAYER_HP,
    enemyHp: spec.hp,
    jokers: { player: state.jokers, enemy: spec.jokers },
    baseMult: { enemy: TIER_MULT[spec.tier] },
    collected: state.collected,
    boss: stageEnemy(state, state.stage).boss,
    profiles: { player: state.profile, enemy: spec.profile },
  });
  return { ...state, rng, phase: { kind: 'fight', fight } };
}
```

- `leaveFight`:

```ts
function leaveFight(state: RunState): RunResult {
  if (state.phase.kind !== 'fight') return err('wrongPhase');
  const { fight } = state.phase;
  if (!fight.winner) return err('fightNotOver');
  const collected = fight.jokerState.player.collected;
  if (fight.winner === 'enemy') return ok({ ...state, collected, phase: { kind: 'over', won: false } });
  const reward = fightReward({
    tier: enemyAt(state.stage).tier,
    playerHp: fight.hp.player,
    playerMaxHp: fight.maxHp.player,
    coinsBefore: state.coins,
    jokers: state.jokers,
    enemyTakes: fight.fightTakes.enemy,
    cardCoins: fight.cardCoins.player,
  });
  const coins = state.coins + reward.total;
  if (state.stage >= RUN_SCHEDULE.length - 1) return ok({ ...state, coins, collected, phase: { kind: 'over', won: true } });
  const [shop, rng] = createShop(state.rng, state.jokers);
  return ok({ ...state, coins, collected, rng, phase: { kind: 'shop', shop, reward } });
}
```

`src/index.ts`: remove `export * from './perks';`; `git rm packages/durak/src/perks.ts packages/durak/src/perks.test.ts`.

- [ ] **Step 3:** `npx vitest run packages/durak` and `npm run typecheck 2>&1 | grep "packages/durak"` — Expected: PASS, no durak type errors (web errors remain until Tasks 8–9; ledger it).
- [ ] **Step 4:** Commit `feat(durak): runs, shop and economy on jokers; enemy tiers and jokers; perks removed`.

---

### Task 7: Balance simulation and tuning

**Files:** Create `packages/durak/src/sim/simulate.ts`, `sim/simulate.test.ts`, `sim/report.test.ts`; Modify root `package.json` (script), `run/simulation.test.ts` (reuse `botAction`), and tuning knobs in `content/enemies.ts` / `run/run.ts`.

**Interfaces — Produces:** `botAction(run): RunAction`, `simulateRun(seed): RunStats`, `type RunStats = { won; stagesWon; fights: readonly FightStats[] }`, `type FightStats = { stage; won; rounds; playerHpLeft; maxHit }`, `summarize(runs): string`.

- [ ] **Step 1: Failing test** — `sim/simulate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { simulateRun, summarize } from './simulate';

describe('simulateRun', () => {
  it('plays a whole run deterministically and records every fight', () => {
    const a = simulateRun(42);
    expect(simulateRun(42)).toEqual(a);
    expect(a.fights.length).toBe(a.won ? 6 : a.stagesWon + 1);
    expect(summarize([a])).toContain('stage 1');
  });
});
```

Run `npx vitest run packages/durak/src/sim` — Expected: FAIL.

- [ ] **Step 2: Implement** — `sim/simulate.ts`:

```ts
import { chooseAction } from '../ai';
import { MAX_JOKERS } from '../jokers/catalog';
import { currentActor } from '../rules';
import { applyRunAction, createRun, enemyAt, type RunAction, type RunState } from '../run/run';

const MAX_STEPS = 300_000;
const STAGES = 6;

export type FightStats = { readonly stage: number; readonly won: boolean; readonly rounds: number; readonly playerHpLeft: number; readonly maxHit: number };
export type RunStats = { readonly won: boolean; readonly stagesWon: number; readonly fights: readonly FightStats[] };

/** A plain bot: aggressive AI in fights, buys the first affordable joker while slots are free — no synergy hunting. */
export function botAction(run: RunState): RunAction {
  const { phase } = run;
  if (phase.kind === 'fight') {
    const { fight } = phase;
    if (fight.winner) return { type: 'leaveFight' };
    const actor = currentActor(fight.round);
    if (!actor) return { type: 'fight', actor: 'player', action: { type: 'nextRound' } };
    const style = actor === 'player' ? 'aggressive' : enemyAt(run.stage).style;
    const action = chooseAction(fight.round, actor, style);
    if (!action) throw new Error('AI returned no action');
    return { type: 'fight', actor, action };
  }
  if (phase.kind === 'shop') {
    const index = phase.shop.offers.findIndex((offer) => offer !== null && offer.price <= run.coins);
    return index >= 0 && run.jokers.length < MAX_JOKERS ? { type: 'buyJoker', index } : { type: 'leaveShop' };
  }
  throw new Error('run is over');
}

function finishedFight(before: RunState, after: RunState, maxHit: number): FightStats | null {
  if (before.phase.kind !== 'fight' || after.phase.kind === 'fight') return null;
  const { fight } = before.phase;
  return { stage: before.stage, won: fight.winner === 'player', rounds: fight.roundNumber, playerHpLeft: fight.hp.player, maxHit };
}

export function simulateRun(seed: number): RunStats {
  let run = createRun(seed);
  let maxHit = 0;
  const fights: FightStats[] = [];
  for (let step = 0; step < MAX_STEPS && run.phase.kind !== 'over'; step++) {
    const result = applyRunAction(run, botAction(run));
    if (!result.ok) throw new Error(`illegal bot move: ${result.error}`);
    const next = result.value;
    if (next.phase.kind === 'fight' && next.phase.fight.lastScore) maxHit = Math.max(maxHit, next.phase.fight.lastScore.damage);
    const done = finishedFight(run, next, maxHit);
    if (done) {
      fights.push(done);
      maxHit = 0;
    }
    run = next;
  }
  const won = run.phase.kind === 'over' && run.phase.won;
  return { won, stagesWon: fights.filter((fight) => fight.won).length, fights };
}

const pct = (part: number, whole: number): string => `${whole > 0 ? Math.round((100 * part) / whole) : 0}%`;
const mean = (values: readonly number[]): string => (values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-');

export function summarize(runs: readonly RunStats[]): string {
  const lines = Array.from({ length: STAGES }, (_, stage) => {
    const at = runs.flatMap((run) => run.fights.filter((fight) => fight.stage === stage));
    const won = at.filter((fight) => fight.won);
    return `stage ${stage + 1}: reached ${pct(at.length, runs.length)}, won ${pct(won.length, at.length)}, rounds ${mean(at.map((f) => f.rounds))}, hp left ${mean(won.map((f) => f.playerHpLeft))}, max hit ${mean(at.map((f) => f.maxHit))}`;
  });
  return [`runs ${runs.length}, full wins ${pct(runs.filter((run) => run.won).length, runs.length)}`, ...lines].join('\n');
}
```

`sim/report.test.ts`:

```ts
import { describe, it } from 'vitest';
import { simulateRun, summarize } from './simulate';

const RUNS = 400;

/** `npm run simulate` prints the balance table; skipped in normal test runs. */
describe.runIf(process.env.SIM === '1')('balance report', () => {
  it('prints win rates per stage', () => {
    const runs = Array.from({ length: RUNS }, (_, i) => simulateRun(i * 7919 + 1));
    console.info(`\n${summarize(runs)}`);
  }, 600_000);
});
```

Root `package.json` → `"simulate": "SIM=1 vitest run packages/durak/src/sim/report.test.ts"`. In `run/simulation.test.ts` import `botAction` from `../sim/simulate` and delete the local copy.

- [ ] **Step 3:** `npx vitest run packages/durak` — Expected: PASS.
- [ ] **Step 4: Tune** — `npm run simulate 2>&1 | grep -A7 "^runs "`. Targets: plain bot wins stage 3 in **60–70%** of runs; stage 6 won in **< 15%**; mean rounds per fight **3–6**. Knobs, one at a time: `RUN_SCHEDULE` hp values, `TIER_MULT`, `PLAYER_HP`. Ledger each change as `Task 7: Ruling: <knob> <old>→<new> — <table line>`; stop when targets hold or after 8 changes (ledger the final table).
- [ ] **Step 5:** Commit `feat(durak): balance simulation; tuned HP and tier multipliers`.

---

### Task 8: Web — save v7, messages, joker panel, enemy jokers, score label

**Files:** Modify `apps/web/src/games/durak/runSchema.ts`, `runStorage.test.ts`, `messages.ts`, `messages.test.ts`, `hits.ts`, `hits.test.ts`, `DurakFightScreen.tsx`, `RunHeader.tsx`, `RunOverScreen.tsx`, `fight.css`, `apps/web/src/ui/pixel/perkEmblem.ts` (+test), `apps/web/src/lab/GalleryTab.tsx`, `FontTab.tsx`; Rename `PerkPanel.tsx`→`JokerPanel.tsx`, `PerkTicket.tsx`→`JokerTicket.tsx`, `PerkCard.tsx`→`JokerCard.tsx`; Create `jokerBadge.ts` (+test).

**Interfaces — Produces:** `SAVE_VERSION = 7`; `jokerBadge(id, state, enemyTakes): string | null`; `hitLabelFor(hits, target, lastScore = null)`; `JokerPanel({ jokers, state, enemyTakes })`; `TicketFace({ id, wide, badge? })`; `JokerCard({ jokerId, action })`; `JOKER_ICONS`, `drawJokerEmblem`, `emblemUrl(id: JokerId)`.

- [ ] **Step 1 (RED)** — `jokerBadge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { jokerBadge } from './jokerBadge';

const state = { rage: 8, cleanStreak: 2, collected: 3 };

describe('jokerBadge', () => {
  it('shows live counters for charging and growing jokers', () => {
    expect(jokerBadge('rage', state, 0)).toBe('заряд +8');
    expect(jokerBadge('cleanHands', state, 0)).toBe('+2 множ.');
    expect(jokerBadge('collector', state, 0)).toBe('+3 множ.');
    expect(jokerBadge('serial', state, 3)).toBe('+1.5 множ.');
  });

  it('shows nothing for static jokers or empty counters', () => {
    expect(jokerBadge('clubs', state, 3)).toBeNull();
    expect(jokerBadge('rage', { ...state, rage: 0 }, 0)).toBeNull();
  });
});
```

`hits.test.ts`: change expectations `'−N взял'` → `'−N'`, and add:

```ts
  it('shows the score formula for a scored hit', () => {
    const lastScore = { target: 'enemy' as const, chips: 12, mult: 3, damage: 36, steps: [] };
    expect(hitLabelFor([{ target: 'enemy', amount: 36 }], 'enemy', lastScore)).toBe('−36 · 12 × 3');
    expect(hitLabelFor([{ target: 'enemy', amount: 36 }], 'player', lastScore)).toBeNull();
  });
```

`runStorage.test.ts`: version → 7; add a test writing `{ version: 6, run: {} }` and expecting `{ status: 'invalid' }`.
`perkEmblem.test.ts`: import `JOKER_IDS`, `JOKER_ICONS`, `drawJokerEmblem`; iterate jokers.

Run `npx vitest run apps/web/src` — Expected: FAIL.

- [ ] **Step 2: Implement**

`jokerBadge.ts`:

```ts
import { SERIAL_STEP, type JokerId, type JokerState } from '@game/durak';

function counter(id: JokerId, state: JokerState, enemyTakes: number): number {
  if (id === 'rage') return state.rage;
  if (id === 'cleanHands') return state.cleanStreak;
  if (id === 'collector') return state.collected;
  if (id === 'serial') return SERIAL_STEP * enemyTakes;
  return 0;
}

/** A live counter for jokers that charge or grow; null when there is nothing to show. */
export function jokerBadge(id: JokerId, state: JokerState, enemyTakes: number): string | null {
  const value = counter(id, state, enemyTakes);
  if (value <= 0) return null;
  return id === 'rage' ? `заряд +${value}` : `+${value} множ.`;
}
```

`hits.ts`:

```ts
import type { Hit, PlayerId, ScoredHit } from '@game/durak';

const formatMult = (mult: number): string => String(Math.round(mult * 100) / 100);

export function hitText(hit: Hit, lastScore: ScoredHit | null = null): string {
  return lastScore && lastScore.target === hit.target && lastScore.damage === hit.amount
    ? `−${hit.amount} · ${lastScore.chips} × ${formatMult(lastScore.mult)}`
    : `−${hit.amount}`;
}

/** Label for the hit a side took from the last action, or null if none. */
export function hitLabelFor(hits: readonly Hit[], target: PlayerId, lastScore: ScoredHit | null = null): string | null {
  const own = hits.filter((hit) => hit.target === target);
  return own.length > 0 ? own.map((hit) => hitText(hit, lastScore)).join(', ') : null;
}
```

`messages.ts`: replace `perkSlotsFull`, `perkNotOwned` with `jokerSlotsFull: 'Все 5 мест заняты — сначала продай джокера'`, `jokerNotOwned: 'Такого джокера нет'`; update `messages.test.ts`.

`runSchema.ts` (v7): `SAVE_VERSION = 7`; import `JOKER_IDS, MAX_JOKERS` instead of `PERK_IDS, MAX_PERKS`; add

```ts
const joker = z.enum(JOKER_IDS);
const jokerList = z.array(joker).max(MAX_JOKERS);
const jokerState = z.object({ rage: count, cleanStreak: count, collected: count });
const stepSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('tier') }),
  z.object({ kind: z.literal('card'), card }),
  z.object({ kind: z.literal('enhancement'), card, enhancement }),
  z.object({ kind: z.literal('joker'), side: z.enum(['attacker', 'defender']), slot: count, joker, acting: joker }),
]);
const step = z.object({
  source: stepSource,
  effect: z.object({ kind: z.enum(['chips', 'mult', 'times']), value: z.number() }),
  chips: z.number(),
  mult: z.number(),
});
const lastScore = z.object({ target: player, chips: z.number(), mult: z.number(), damage: count, steps: z.array(step) }).nullable();
```

(declare these after `card`/`enhancement`/`player`); `lastBout` → `z.object({ damaged: player, attackCards: z.array(card), takenEnhancements: z.array(enhancement.nullable()) }).nullable()`; `fight`: drop `perks`, add `jokers: z.object({ player: jokerList, enemy: jokerList })`, `baseMult: z.object({ player: z.number().positive(), enemy: z.number().positive() })`, `jokerState: z.object({ player: jokerState, enemy: jokerState })`, `lastScore`; `reward.perkBonus` → `jokerBonus`; `shop.offers` → `z.object({ jokerId: joker, price: count }).nullable()`; `run`: `perks` → `jokers: jokerList`, add `collected: count`.

Pixel art (`perkEmblem.ts`): `PERK_ICONS` → `JOKER_ICONS: Readonly<Record<JokerId, PerkIcon>>`, `TILES` keyed by `JokerId`, `drawPerkEmblem` → `drawJokerEmblem`, `emblemUrl(id: JokerId)`. Reuse: `thickSkin`, `longArms`, `cardSharp`, `looter`, `piggyBank`, `cleanHands` (same rows); `trumpAce` ← crown rows (old `trumpLover`); `serial` ← flying card rows (old `throwMaster`). Suit jokers:

```ts
const SUIT_MASKS = {
  hearts: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  diamonds: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  clubs: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
  spades: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '..X.X..', '.XXXXX.'],
} as const;

/** Doubles a 7×7 suit mask into a one-colour 14×14 icon. */
function suitIcon(mask: readonly string[], color: string): PerkIcon {
  const rows = mask.flatMap((row) => {
    const wide = [...row].map((ch) => (ch === 'X' ? 'SS' : '..')).join('');
    return [wide, wide];
  });
  return { rows, palette: { S: color } };
}
```

(hearts/diamonds `#d83a4a` on a light pink/cream tile, clubs/spades `#1b1426` on a light tile). `small`, `gloat`, `rage`, `usurer`, `mirror`, `collector` share one 14×14 placeholder `?` icon until 3b:

```ts
const PLACEHOLDER: PerkIcon = {
  palette: { W: '#ffffff' },
  rows: [
    '..............', '....WWWWWW....', '...WW....WW...', '..........WW..', '.........WW...', '........WW....', '.......WW.....',
    '.......WW.....', '..............', '.......WW.....', '.......WW.....', '..............', '..............', '..............',
  ],
};
```

each on its own `TILES` colour (distinct emblems).

Components:
- `JokerTicket.tsx` (from `PerkTicket.tsx`): `JOKERS`, `JOKER_IDS` serial; props `{ id: JokerId; wide: boolean; badge?: string | null }`; root class adds `ticket--${JOKERS[id].rarity}`; badge `<span className="ticket__badge">{badge}</span>` inside the stub when present.
- `JokerPanel.tsx` (from `PerkPanel.tsx`): props `{ jokers: readonly JokerId[]; state: JokerState; enemyTakes: number }`; title «Джокеры», `aria-label="Джокеры"`; `MAX_JOKERS` compact slots; each ticket gets `badge={jokerBadge(id, state, enemyTakes)}`; compact button aria-label = joker name.
- `JokerCard.tsx` (from `PerkCard.tsx`): `JOKERS[jokerId]`; a rarity line `<span className="joker__rarity">{RARITY_NAMES[rarity]}</span>` (`{ common: 'Обычный', rare: 'Редкий', legendary: 'Легендарный' }`); root class `joker joker--${rarity}`.
- `DurakFightScreen.tsx`: `<JokerPanel jokers={fight.jokers.player} state={fight.jokerState.player} enemyTakes={fight.fightTakes.enemy} />`; `revealsTopCard(fight.jokers.player)`; `hitLabelFor(fight.hits, 'enemy' | 'player', fight.lastScore)`.
- `RunHeader.tsx`: after the stage line:

```tsx
      {(enemy.jokers.length > 0 || TIER_MULT[enemy.tier] > 1) && (
        <span className="run-header__jokers">
          {TIER_MULT[enemy.tier] > 1 && <span className="chip">×{TIER_MULT[enemy.tier]}</span>}
          {enemy.jokers.map((id) => (
            <span key={id} className="chip" title={JOKERS[id].description}>
              {JOKERS[id].name}
            </span>
          ))}
        </span>
      )}
```

- `RunOverScreen.tsx`: «Джокеры: …» from `run.jokers` with `JOKERS[id].name`.
- Lab `GalleryTab`/`FontTab`: `JOKER_IDS`, `JOKERS`, `JokerCard`, `TicketFace`; gallery heading «Джокеры».
- `fight.css`: compact grid `repeat(5, auto)`; `.ticket__stub { position: relative; }`; `.ticket__badge { position: absolute; bottom: -0.35em; left: 50%; translate: -50% 0; padding: 0 0.3em; border-radius: 4px; background: var(--ink); color: var(--gold); font-size: 0.6em; white-space: nowrap; }`; `.ticket--rare .ticket__stub { background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / 22%) 0 2px, transparent 2px 6px), linear-gradient(180deg, #bfe6ff, #3a7bd5); }`; `.ticket--legendary .ticket__stub { background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / 22%) 0 2px, transparent 2px 6px), linear-gradient(180deg, #e3c6ff, #7e3fbf); }`; `.run-header__jokers { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; }`.

- [ ] **Step 3:** `npm run typecheck && npx vitest run` — Expected: PASS. If `ShopScreen.tsx` is the only remaining type error, ledger it and finish Task 9 before committing both.
- [ ] **Step 4:** Commit `feat(web): jokers in the fight — save v7, joker panel with counters, enemy jokers, score label`.

---

### Task 9: Web — joker shop and e2e

**Files:** Modify `ShopScreen.tsx`, `shop.css`; Rename `e2e/perks.spec.ts` → `e2e/jokers.spec.ts`; Modify `e2e/landscape.spec.ts`

- [ ] **Step 1 (RED)** — `e2e/jokers.spec.ts`: the save fixture becomes `{ version: 7, run: { …, jokers: ['looter'], collected: 0, …, phase: { kind: 'shop', shop: { offers: [null, null], enhancementOffers: [null, null], rerollCost: 2 }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } } } }`; compact/wide tests use the Мародёр text «+1 монета за каждый «Беру» соперника»; add:

```ts
test('jokers can be bought and reordered in the shop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {},
      bosses: ['general', 'witch'],
      phase: {
        kind: 'shop',
        shop: { offers: [{ jokerId: 'clubs', price: 4 }, null], enhancementOffers: [null, null], rerollCost: 2 },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 7, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  const owned = page.getByTestId('owned-jokers').getByRole('heading', { level: 4 });
  await expect(owned).toHaveText(['Мародёр', 'Трефовик']);
  await page.getByRole('button', { name: 'Трефовик левее' }).click();
  await expect(owned).toHaveText(['Трефовик', 'Мародёр']);
});
```

`landscape.spec.ts`: shop fixture to the v7 shape (`jokers`, `collected`, `jokerId`, `jokerBonus`, `version: 7`).

Run `npx playwright test e2e/jokers.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Implement** — `ShopScreen.tsx`:
- Offers: `JokerCard` + `PixelButton tone="orange" small` with `aria-label={`Купить ${JOKERS[offer.jokerId].name} за ${offer.price}`}`, text `● {offer.price}`, `onAct({ type: 'buyJoker', index })`.
- Owned section «Твои джокеры ({run.jokers.length}/{MAX_JOKERS})» with `data-testid="owned-jokers"`; each `JokerCard` gets an actions row:

```tsx
<span className="joker__actions">
  <PixelButton tone="blue" small disabled={i === 0} aria-label={`${JOKERS[id].name} левее`} onClick={() => onAct({ type: 'moveJoker', from: i, to: i - 1 })}>
    ◀
  </PixelButton>
  <PixelButton tone="blue" small onClick={() => onAct({ type: 'sellJoker', jokerId: id })}>
    Продать +{sellPrice(id)}
  </PixelButton>
  <PixelButton tone="blue" small disabled={i === run.jokers.length - 1} aria-label={`${JOKERS[id].name} правее`} onClick={() => onAct({ type: 'moveJoker', from: i, to: i + 1 })}>
    ▶
  </PixelButton>
</span>
```

- Reward line: «джокеры {reward.jokerBonus}» instead of perks.
- `shop.css`: `.joker__actions { display: flex; gap: 4px; }`, `.joker--rare { border-color: #22509c; }`, `.joker--legendary { border-color: #7e3fbf; }`, `.joker__rarity { font-size: 0.65rem; opacity: 0.8; }`.

- [ ] **Step 3:** `npm run typecheck && npx vitest run && npm run build && npx playwright test` — Expected: all green. Manual (390×844, 1440×900): rarity colours, 5-slot panel, ◀ ▶ reorder, enemy jokers in the banner, «−36 · 12 × 3» on a take.
- [ ] **Step 4:** Commit `feat(web): joker shop with rarity, selling and reordering; e2e on jokers`.

---

### Task 10: Final pass

- [ ] **Step 1:** `grep -rn "perk\|Perk\|перк" packages apps/web/src e2e` — rename `perkEmblem.ts` → `jokerEmblem.ts` (+ test, imports) and remove any remaining user-facing «перк» text.
- [ ] **Step 2:** README «Структура»: `packages/durak/src/jokers` and `npm run simulate`.
- [ ] **Step 3:** `npm run typecheck && npm run coverage && npm run build && npx playwright test && npm run simulate` — Expected: green; coverage ≥ 80%; final balance table in the ledger.
- [ ] **Step 4:** Commit `chore: jokers 3a cleanup and docs`.
