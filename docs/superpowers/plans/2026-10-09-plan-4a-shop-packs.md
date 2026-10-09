# Shop and Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Balatro-like shop: 2 single-item slots (joker / tarot / enhanced card), 2 booster packs per visit (Джокеры / Аркана / Колода × обычный / большой / мега) opened with a card-flip reveal, 8 tarots applied at once, Balatro layout on wide screens and a thumb-friendly portrait layout.

**Architecture:** Engine first: `packages/durak/src/shop/` gets a weighted-draw helper, the tarot catalogue with `applyTarot`, and pack rolling; `run/shop.ts` is rewritten around `items`, `packs` and an `opened` pack kept in state; `run/run.ts` exposes `buyItem` / `buyPack` / `pickFromPack` / `skipPack`. The web app gets a save v8 and a new shop UI built from small parts under `apps/web/src/games/durak/shop/`, a pack-opening overlay, and a lab tab.

**Tech Stack:** TypeScript strict monorepo (`@game/core`, `@game/durak`, `@game/web`), React 19, motion/react, zod 4, Vitest (node env, no DOM), Playwright (Pixel 7).

**Spec:** `docs/superpowers/specs/2026-10-09-shop-packs-design.md`

## Global Constraints

- Everything lives within one run; no cross-run collection.
- Single slots: 2; item kind weights joker 60 / tarot 25 / card 15. Pack slots: 2 per visit; reroll changes single slots only; reroll 2, +1 per use.
- Packs: kinds Джокеры 40 / Аркана 35 / Колода 25; sizes обычный 3 cards pick 1 weight 70 price 4, большой 5 / 1 / 22 / 6, мега 5 / 2 / 8 / 8.
- Tarot price 3; enhanced card price = enhancement price + 1; jokers at catalogue prices; max 5 jokers; sell for half.
- Tarots: Солнце (≤2 → Золотые), Башня (≤2 → Острые), Звезда (≤2 → Монетные), Колесница (1 → Тяжёлая), Император (1 → Козырная) — common; Смерть (2: first gets the second's enhancement, second must be enhanced), Отшельник (coins ×2, at most +10) — rare; Колесо Фортуны (1 in 3: random joker if room) — legendary. Tarot targets come from a hand of 5 random deck cards.
- A pack is opened at once and kept in shop state until done; «Пропустить» closes it with no refund. Joker pack with full slots: sell on the opening screen or skip.
- A tarot bought from the shelf never goes through the pack screen: after «Купить за 3» the money is spent and the slot sold; the same sheet then shows a hand of 5 for targets with «Применить» / «Пропустить» (no refund). Tarots without targets (Отшельник, Колесо Фортуны) work at once on purchase. While a tarot waits, other shop actions are refused; a reload brings the same sheet and hand back.
- Replacing an enhancement: label «В колоде: <old>» and a confirm «<old> → <new>»; the same card with the same enhancement never appears in a Колода pack.
- Save version 8; v7 saves are reported invalid.
- Animations use the existing «Скорость анимации» setting; rarity glow: common grey, rare blue, legendary gold.
- Balance target: plain bot clears circle 1 in 35–45% of runs.
- Russian UI copy; code, comments and commits in English; conventional commits; immutability; files < 400 lines.
- Out of scope: «фокусы» (stored consumables), vouchers, cross-run collection, new enhancements or jokers.

## Review Focus

- Reload during a pack opening or while a shelf tarot waits for targets: the same cards / hand must come back — pinned by save round-trips with `opened` and `casting` (Task 4) and e2e reload tests (Task 8).
- A joker pack with all 5 slots full: «Взять» must not lose the pick; selling a joker on the opening screen makes the pick possible — pinned in Task 3 (unit) and Task 6 (`canTake`).
- Shop actions while a pack is open or a shelf tarot waits (buy, reroll, leave): refused with a clear message, never a half-state — pinned in Task 3 and Task 4.
- Invalid tarot targets (Смерть with an unenhanced source, duplicates, a card outside the hand, too many): refused by the engine and «Применить» disabled in the UI — pinned in Task 1, Task 3 and Task 6.
- A 375×667 phone: the whole shop (jokers, 2 items, 2 packs, both buttons) fits without scrolling — pinned by an e2e layout test in Task 8.

---

### Task 1: Weighted draws and the tarot catalogue

**Files:**
- Create: `packages/durak/src/shop/weighted.ts`, `packages/durak/src/shop/weighted.test.ts`
- Create: `packages/durak/src/shop/tarot.ts`, `packages/durak/src/shop/tarot.test.ts`
- Modify: `packages/durak/src/index.ts` (add `export * from './shop/tarot';`)

**Interfaces:**
- Produces:

```ts
// weighted.ts
export function pickWeighted<T>(pool: readonly T[], weight: (item: T) => number, rng: RngState): readonly [T | null, RngState];
export function drawUnique<T>(pool: readonly T[], count: number, weight: (item: T) => number, rng: RngState): readonly [readonly T[], RngState];
// tarot.ts
export const TAROT_IDS = ['sun', 'tower', 'star', 'chariot', 'emperor', 'death', 'hermit', 'wheel'] as const;
export type TarotId = (typeof TAROT_IDS)[number];
export type TarotDef = { readonly id: TarotId; readonly name: string; readonly numeral: string; readonly description: string; readonly rarity: Rarity; readonly minTargets: number; readonly maxTargets: number; readonly enhancement: EnhancementId | null };
export const TAROTS: Readonly<Record<TarotId, TarotDef>>;
export const TAROT_PRICE = 3; export const HERMIT_CAP = 10; export const WHEEL_ODDS = 3;
export type TarotSubject = { readonly coins: number; readonly jokers: readonly JokerId[]; readonly profile: DeckProfile; readonly rng: RngState };
export type TarotOutcome = TarotSubject & { readonly gained: JokerId | null };
export function targetsOk(id: TarotId, targets: readonly string[], profile: DeckProfile): boolean;
export function applyTarot(subject: TarotSubject, id: TarotId, targets: readonly string[]): Result<TarotOutcome, 'badTargets'>;
```

- [ ] **Step 1: Write the failing tests** — `weighted.test.ts`:

```ts
import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { drawUnique, pickWeighted } from './weighted';

describe('pickWeighted', () => {
  it('returns null and the same rng for an empty pool', () => {
    const rng = createRng(1);
    expect(pickWeighted([], () => 1, rng)).toEqual([null, rng]);
  });

  it('never picks a zero-weight item', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [picked] = pickWeighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1), createRng(seed));
      expect(picked).toBe('b');
    }
  });

  it('follows the weights roughly', () => {
    const picks = Array.from({ length: 2000 }, (_, seed) => pickWeighted(['a', 'b'], (x) => (x === 'a' ? 3 : 1), createRng(seed))[0]);
    const share = picks.filter((x) => x === 'a').length / picks.length;
    expect(share).toBeGreaterThan(0.68);
    expect(share).toBeLessThan(0.82);
  });
});

describe('drawUnique', () => {
  it('draws different items, at most the pool size', () => {
    const [drawn] = drawUnique(['a', 'b', 'c'], 5, () => 1, createRng(4));
    expect([...drawn].sort()).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic for a seed', () => {
    expect(drawUnique(['a', 'b', 'c', 'd'], 2, () => 1, createRng(9))).toEqual(drawUnique(['a', 'b', 'c', 'd'], 2, () => 1, createRng(9)));
  });
});
```

`tarot.test.ts`:

```ts
import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { MAX_JOKERS } from '../jokers/catalog';
import { applyTarot, HERMIT_CAP, TAROT_IDS, TAROTS, targetsOk, type TarotSubject } from './tarot';

const subject = (patch: Partial<TarotSubject> = {}): TarotSubject => ({ coins: 7, jokers: [], profile: {}, rng: createRng(1), ...patch });
const FULL = ['clubs', 'hearts', 'spades', 'diamonds', 'small'] as const;

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe('tarot catalogue', () => {
  it('has the 8 tarots with the rarities of the spec', () => {
    expect(TAROT_IDS).toHaveLength(8);
    expect(TAROT_IDS.filter((id) => TAROTS[id].rarity === 'common')).toEqual(['sun', 'tower', 'star', 'chariot', 'emperor']);
    expect(TAROTS.death.rarity).toBe('rare');
    expect(TAROTS.hermit.rarity).toBe('rare');
    expect(TAROTS.wheel.rarity).toBe('legendary');
  });
});

describe('enhancement tarots', () => {
  it('Солнце makes up to 2 cards Золотые, replacing what was there', () => {
    const out = expectOk(applyTarot(subject({ profile: { 'clubs-7': 'sharp' } }), 'sun', ['clubs-7', 'hearts-9']));
    expect(out.profile).toEqual({ 'clubs-7': 'golden', 'hearts-9': 'golden' });
    expect(out.coins).toBe(7);
  });

  it('Башня, Звезда, Колесница and Император give their enhancements', () => {
    expect(expectOk(applyTarot(subject(), 'tower', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'sharp' });
    expect(expectOk(applyTarot(subject(), 'star', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'coin' });
    expect(expectOk(applyTarot(subject(), 'chariot', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'heavy' });
    expect(expectOk(applyTarot(subject(), 'emperor', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'trump' });
  });

  it('refuses too many, too few or repeated targets', () => {
    expect(applyTarot(subject(), 'sun', ['a', 'b', 'c'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyTarot(subject(), 'sun', [])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyTarot(subject(), 'sun', ['a', 'a'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyTarot(subject(), 'chariot', ['a', 'b'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('Смерть', () => {
  it('gives the first card the enhancement of the second', () => {
    const out = expectOk(applyTarot(subject({ profile: { 'hearts-14': 'trump' } }), 'death', ['clubs-6', 'hearts-14']));
    expect(out.profile).toEqual({ 'hearts-14': 'trump', 'clubs-6': 'trump' });
  });

  it('needs an enhanced second card', () => {
    expect(targetsOk('death', ['clubs-6', 'hearts-14'], {})).toBe(false);
    expect(applyTarot(subject(), 'death', ['clubs-6', 'hearts-14'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('Отшельник', () => {
  it('doubles the coins', () => {
    expect(expectOk(applyTarot(subject({ coins: 7 }), 'hermit', [])).coins).toBe(14);
  });

  it('adds at most HERMIT_CAP', () => {
    expect(expectOk(applyTarot(subject({ coins: 30 }), 'hermit', [])).coins).toBe(30 + HERMIT_CAP);
  });

  it('takes no targets', () => {
    expect(applyTarot(subject(), 'hermit', ['clubs-6'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('Колесо Фортуны', () => {
  it('gives a random joker the player does not own about 1 time in 3', () => {
    const outs = Array.from({ length: 300 }, (_, seed) => expectOk(applyTarot(subject({ jokers: ['looter'], rng: createRng(seed) }), 'wheel', [])));
    const wins = outs.filter((out) => out.gained !== null);
    expect(wins.length).toBeGreaterThan(70);
    expect(wins.length).toBeLessThan(130);
    for (const out of wins) {
      expect(out.gained).not.toBe('looter');
      expect(out.jokers).toEqual(['looter', out.gained]);
    }
  });

  it('never gives a joker when all slots are full, but still moves the rng', () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = subject({ jokers: FULL, rng: createRng(seed) });
      const out = expectOk(applyTarot(before, 'wheel', []));
      expect(out.gained).toBeNull();
      expect(out.jokers).toHaveLength(MAX_JOKERS);
      expect(out.rng).not.toEqual(before.rng);
    }
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak/src/shop`
Expected: FAIL — cannot resolve `./weighted` / `./tarot`.

- [ ] **Step 3: Implement** `weighted.ts`:

```ts
import { nextInt, type RngState } from '@game/core';

/** One item with probability proportional to its integer weight; null for an empty or weightless pool. */
export function pickWeighted<T>(pool: readonly T[], weight: (item: T) => number, rng: RngState): readonly [T | null, RngState] {
  const total = pool.reduce((sum, item) => sum + weight(item), 0);
  if (total <= 0) return [null, rng];
  const [roll, next] = nextInt(rng, total);
  const bounds = pool.reduce<readonly number[]>((acc, item) => [...acc, (acc.at(-1) ?? 0) + weight(item)], []);
  const index = bounds.findIndex((bound) => roll < bound);
  return [pool[index] ?? null, next];
}

type Draw<T> = readonly [readonly T[], readonly T[], RngState];

/** Up to `count` different items, each drawn by weight from what is left. */
export function drawUnique<T>(pool: readonly T[], count: number, weight: (item: T) => number, rng: RngState): readonly [readonly T[], RngState] {
  const [drawn, , next] = Array.from({ length: count }).reduce<Draw<T>>(
    ([acc, left, current]) => {
      const [item, after] = pickWeighted(left, weight, current);
      return item === null ? [acc, left, after] : [[...acc, item], left.filter((other) => other !== item), after];
    },
    [[], pool, rng],
  );
  return [drawn, next];
}
```

`tarot.ts`:

```ts
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
```

Add `export * from './shop/tarot';` to `packages/durak/src/index.ts`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run packages/durak/src/shop && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/durak/src/shop packages/durak/src/index.ts
git commit -m "feat(durak): weighted draws and the tarot catalogue with applyTarot"
```

---

### Task 2: Packs

**Files:**
- Create: `packages/durak/src/shop/packs.ts`, `packages/durak/src/shop/packs.test.ts`
- Modify: `packages/durak/src/index.ts` (add `export * from './shop/packs';`)

**Interfaces:**
- Consumes: `pickWeighted`, `drawUnique`, `TAROT_IDS`, `TAROTS`, `TarotId` (Task 1).
- Produces:

```ts
export const PACK_KINDS = ['jokers', 'arcana', 'deck'] as const; export type PackKind;
export const PACK_SIZES = ['normal', 'big', 'mega'] as const; export type PackSize;
export type PackSizeDef = { readonly cards: number; readonly picks: number; readonly weight: number; readonly price: number };
export const PACK_SIZE_DEFS: Readonly<Record<PackSize, PackSizeDef>>;
export const PACK_KIND_WEIGHT: Readonly<Record<PackKind, number>>;
export const TAROT_HAND_SIZE = 5;
export const ENHANCEMENT_RARITY: Readonly<Record<EnhancementId, Rarity>>;
export type Pack = { readonly kind: PackKind; readonly size: PackSize; readonly price: number };
export type PackCard =
  | { readonly kind: 'joker'; readonly jokerId: JokerId }
  | { readonly kind: 'tarot'; readonly tarotId: TarotId }
  | { readonly kind: 'card'; readonly cardId: string; readonly enhancement: EnhancementId };
export function packCardRarity(card: PackCard): Rarity;
export const jokerWeight: (id: JokerId) => number; export const tarotWeight: (id: TarotId) => number;
export function rollPack(rng: RngState): readonly [Pack, RngState];
export function conflictFor(profile: DeckProfile, cardId: string, enhancement: EnhancementId): EnhancementId | null;
export function rollDeckCard(rng: RngState, profile: DeckProfile, exclude: readonly string[]): readonly [PackCard | null, RngState];
export function rollPackCards(rng: RngState, pack: Pack, owned: readonly JokerId[], profile: DeckProfile): readonly [readonly PackCard[], RngState];
export function rollTarotHand(rng: RngState): readonly [readonly string[], RngState];
```

- [ ] **Step 1: Write the failing tests** — `packs.test.ts`:

```ts
import { createDeck, createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import {
  conflictFor,
  PACK_SIZE_DEFS,
  packCardRarity,
  rollDeckCard,
  rollPack,
  rollPackCards,
  rollTarotHand,
  TAROT_HAND_SIZE,
  type Pack,
  type PackCard,
} from './packs';

const DECK_IDS = createDeck(6).map((card) => card.id);
const pack = (patch: Partial<Pack>): Pack => ({ kind: 'jokers', size: 'normal', price: 4, ...patch });

describe('rollPack', () => {
  it('prices a pack by its size', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [rolled] = rollPack(createRng(seed));
      expect(rolled.price).toBe(PACK_SIZE_DEFS[rolled.size].price);
    }
  });

  it('follows the kind and size weights roughly', () => {
    const packs = Array.from({ length: 3000 }, (_, seed) => rollPack(createRng(seed))[0]);
    const share = (test: (p: Pack) => boolean) => packs.filter(test).length / packs.length;
    expect(share((p) => p.kind === 'deck')).toBeGreaterThan(0.2);
    expect(share((p) => p.kind === 'deck')).toBeLessThan(0.3);
    expect(share((p) => p.size === 'normal')).toBeGreaterThan(0.65);
    expect(share((p) => p.size === 'mega')).toBeLessThan(0.12);
  });
});

describe('rollPackCards', () => {
  it('fills a pack with as many cards as its size', () => {
    expect(rollPackCards(createRng(1), pack({ size: 'normal' }), [], {})[0]).toHaveLength(3);
    expect(rollPackCards(createRng(1), pack({ size: 'big' }), [], {})[0]).toHaveLength(5);
    expect(rollPackCards(createRng(1), pack({ size: 'mega', kind: 'arcana' }), [], {})[0]).toHaveLength(5);
  });

  it('a joker pack holds different jokers the player does not own', () => {
    for (let seed = 0; seed < 40; seed++) {
      const [cards] = rollPackCards(createRng(seed), pack({ size: 'big' }), ['looter', 'clubs'], {});
      const ids = cards.map((card) => (card.kind === 'joker' ? card.jokerId : 'not a joker'));
      expect(new Set(ids).size).toBe(5);
      expect(ids).not.toContain('looter');
      expect(ids).not.toContain('clubs');
      expect(ids).not.toContain('not a joker');
    }
  });

  it('an arcana pack holds different tarots', () => {
    const [cards] = rollPackCards(createRng(3), pack({ kind: 'arcana', size: 'big' }), [], {});
    expect(cards.every((card) => card.kind === 'tarot')).toBe(true);
    expect(new Set(cards.map((card) => (card.kind === 'tarot' ? card.tarotId : ''))).size).toBe(5);
  });

  it('a deck pack holds different cards, never one the player already has with that enhancement', () => {
    const profile = { 'hearts-14': 'sharp' } as const;
    for (let seed = 0; seed < 60; seed++) {
      const [cards] = rollPackCards(createRng(seed), pack({ kind: 'deck', size: 'big' }), [], profile);
      const deckCards = cards.flatMap((card) => (card.kind === 'card' ? [card] : []));
      expect(deckCards).toHaveLength(5);
      expect(new Set(deckCards.map((card) => card.cardId)).size).toBe(5);
      expect(deckCards.every((card) => DECK_IDS.includes(card.cardId))).toBe(true);
      expect(deckCards.some((card) => card.cardId === 'hearts-14' && card.enhancement === 'sharp')).toBe(false);
    }
  });

  it('is deterministic for a seed', () => {
    expect(rollPackCards(createRng(8), pack({ kind: 'deck' }), [], {})).toEqual(rollPackCards(createRng(8), pack({ kind: 'deck' }), [], {}));
  });
});

describe('rollDeckCard', () => {
  it('returns null when every card is excluded', () => {
    expect(rollDeckCard(createRng(1), {}, DECK_IDS)[0]).toBeNull();
  });
});

describe('rollTarotHand', () => {
  it('deals 5 different cards of the deck', () => {
    const [hand] = rollTarotHand(createRng(2));
    expect(hand).toHaveLength(TAROT_HAND_SIZE);
    expect(new Set(hand).size).toBe(TAROT_HAND_SIZE);
    expect(hand.every((id) => DECK_IDS.includes(id))).toBe(true);
  });
});

describe('conflictFor', () => {
  it('names the enhancement a pick would replace', () => {
    expect(conflictFor({ 'hearts-14': 'sharp' }, 'hearts-14', 'golden')).toBe('sharp');
    expect(conflictFor({ 'hearts-14': 'golden' }, 'hearts-14', 'golden')).toBeNull();
    expect(conflictFor({}, 'hearts-14', 'golden')).toBeNull();
  });
});

describe('packCardRarity', () => {
  it('takes jokers and tarots from their catalogues and enhancements from ENHANCEMENT_RARITY', () => {
    const cards: PackCard[] = [
      { kind: 'joker', jokerId: 'mirror' },
      { kind: 'tarot', tarotId: 'wheel' },
      { kind: 'card', cardId: 'clubs-6', enhancement: 'golden' },
      { kind: 'card', cardId: 'clubs-6', enhancement: 'trump' },
    ];
    expect(cards.map(packCardRarity)).toEqual(['legendary', 'legendary', 'common', 'rare']);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak/src/shop/packs.test.ts`
Expected: FAIL — cannot resolve `./packs`.

- [ ] **Step 3: Implement** `packs.ts`:

```ts
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
      const [ids, next] = drawUnique(TAROT_IDS, count, tarotWeight, rng);
      return [ids.map((tarotId) => ({ kind: 'tarot' as const, tarotId })), next];
    }
    case 'deck':
      return rollDeckCards(rng, profile, count);
  }
}

/** The cards a tarot can target: TAROT_HAND_SIZE different cards of the shared deck. */
export function rollTarotHand(rng: RngState): readonly [readonly string[], RngState] {
  const [ids, next] = shuffle(DECK_IDS, rng);
  return [ids.slice(0, TAROT_HAND_SIZE), next];
}
```

Add `export * from './shop/packs';` to `packages/durak/src/index.ts`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run packages/durak/src/shop && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/durak/src/shop packages/durak/src/index.ts
git commit -m "feat(durak): booster packs — kinds, sizes, contents, tarot hand, replacement check"
```

---

### Task 3: Shop state — items, packs, opened pack

**Files:**
- Modify (rewrite): `packages/durak/src/run/shop.ts`, `packages/durak/src/run/shop.test.ts`

**Interfaces:**
- Consumes: Task 1 (`applyTarot`, `TarotSubject`, `TarotId`, `TAROT_IDS`, `TAROT_PRICE`, `pickWeighted`), Task 2 (`Pack`, `PackCard`, `PackKind`, `PACK_SIZE_DEFS`, `rollPack`, `rollPackCards`, `rollDeckCard`, `rollTarotHand`, `jokerWeight`, `tarotWeight`).
- Produces:

```ts
export const SHOP_ITEM_COUNT = 2; export const SHOP_PACK_COUNT = 2; export const BASE_REROLL_COST = 2;
export const ITEM_KIND_WEIGHT: Readonly<Record<PackCard['kind'], number>>;
export type ShopItem = { readonly card: PackCard; readonly price: number };
export type OpenedPack = { readonly kind: PackKind; readonly cards: readonly (PackCard | null)[]; readonly picksLeft: number; readonly hand: readonly string[] };
export type TarotCast = { readonly tarotId: TarotId; readonly hand: readonly string[] };
export type ShopState = { readonly items: readonly (ShopItem | null)[]; readonly packs: readonly (Pack | null)[]; readonly rerollCost: number; readonly opened: OpenedPack | null; readonly casting: TarotCast | null };
export type Purse = TarotSubject;
export type Wallet = { readonly coins: number; readonly jokers: readonly JokerId[] };
export type ShopStep = { readonly shop: ShopState; readonly purse: Purse };
export type ShopError = 'noOffer' | 'notEnoughCoins' | 'jokerSlotsFull' | 'jokerNotOwned' | 'cardNotOffered' | 'packOpen' | 'noPackOpen' | 'tarotPending' | 'noTarotPending' | 'badTargets';
export function priceOf(card: PackCard): number;
export function createShop(rng: RngState, owned: readonly JokerId[], profile: DeckProfile): readonly [ShopState, RngState];
/** A shelf tarot with targets → `casting`; Отшельник / Колесо Фортуны apply at once. */
export function buyItem(shop: ShopState, purse: Purse, index: number): Result<ShopStep, ShopError>;
export function buyPack(shop: ShopState, purse: Purse, index: number): Result<ShopStep, ShopError>;
export function pickFromPack(shop: ShopState, purse: Purse, index: number, targets: readonly string[]): Result<ShopStep, ShopError>;
export function skipPack(shop: ShopState): Result<ShopState, ShopError>;
export function castShopTarot(shop: ShopState, purse: Purse, targets: readonly string[]): Result<ShopStep, ShopError>;
export function skipTarot(shop: ShopState): Result<ShopState, ShopError>;
export function rerollShop(shop: ShopState, purse: Purse): Result<ShopStep, ShopError>;
export function sellPrice(jokerId: JokerId): number;                                   // unchanged
export function sellJoker(wallet: Wallet, jokerId: JokerId): Result<Wallet, ShopError>; // unchanged
export function moveJoker(jokers: readonly JokerId[], from: number, to: number): Result<readonly JokerId[], ShopError>; // unchanged
```

Removed: `ShopOffer`, `EnhancementOffer`, `buyJoker`, `buyEnhancement`, `SHOP_OFFER_COUNT`, `ENHANCEMENT_OFFER_COUNT`, `ENHANCEMENT_CARD_CHOICES`. After this task `run.ts` and the web app do not compile until Tasks 4–5; this task's gate is `npx vitest run packages/durak/src/run/shop.test.ts packages/durak/src/shop`.

- [ ] **Step 1: Write the failing tests** — replace `shop.test.ts` with:

```ts
import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { JOKERS } from '../jokers/catalog';
import {
  buyItem,
  buyPack,
  castShopTarot,
  createShop,
  moveJoker,
  pickFromPack,
  priceOf,
  rerollShop,
  sellJoker,
  sellPrice,
  skipPack,
  skipTarot,
  type OpenedPack,
  type Purse,
  type ShopState,
} from './shop';

const purse = (patch: Partial<Purse> = {}): Purse => ({ coins: 20, jokers: [], profile: {}, rng: createRng(7), ...patch });
const FULL = ['clubs', 'hearts', 'spades', 'diamonds', 'small'] as const;
const HAND = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];

const shop: ShopState = {
  items: [
    { card: { kind: 'joker', jokerId: 'looter' }, price: 5 },
    { card: { kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, price: 5 },
  ],
  packs: [
    { kind: 'jokers', size: 'normal', price: 4 },
    { kind: 'arcana', size: 'mega', price: 8 },
  ],
  rerollCost: 2,
  opened: null,
  casting: null,
};

const opened = (patch: Partial<OpenedPack>): ShopState => ({ ...shop, opened: { kind: 'jokers', cards: [], picksLeft: 1, hand: [], ...patch } });
const casting: ShopState = { ...shop, casting: { tarotId: 'sun', hand: HAND } };

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe('createShop', () => {
  it('stocks 2 items and 2 packs, no pack open, reroll at 2', () => {
    const [created] = createShop(createRng(3), ['looter'], {});
    expect(created.items).toHaveLength(2);
    expect(created.items.every((item) => item !== null)).toBe(true);
    expect(created.packs).toHaveLength(2);
    expect(created.packs.every((pack) => pack !== null)).toBe(true);
    expect(created.opened).toBeNull();
    expect(created.casting).toBeNull();
    expect(created.rerollCost).toBe(2);
  });

  it('never offers an owned joker or the same joker twice', () => {
    for (let seed = 0; seed < 60; seed++) {
      const [created] = createShop(createRng(seed), ['looter'], {});
      const jokers = created.items.flatMap((item) => (item?.card.kind === 'joker' ? [item.card.jokerId] : []));
      expect(jokers).not.toContain('looter');
      expect(new Set(jokers).size).toBe(jokers.length);
    }
  });

  it('is deterministic for a seed', () => {
    expect(createShop(createRng(9), [], {})).toEqual(createShop(createRng(9), [], {}));
  });
});

describe('priceOf', () => {
  it('prices jokers by the catalogue, tarots at 3 and cards at the enhancement price + 1', () => {
    expect(priceOf({ kind: 'joker', jokerId: 'looter' })).toBe(JOKERS.looter.price);
    expect(priceOf({ kind: 'tarot', tarotId: 'sun' })).toBe(3);
    expect(priceOf({ kind: 'card', cardId: 'clubs-6', enhancement: 'golden' })).toBe(5);
  });
});

describe('buyItem', () => {
  it('buys a joker', () => {
    const { shop: after, purse: paid } = expectOk(buyItem(shop, purse(), 0));
    expect(paid.jokers).toEqual(['looter']);
    expect(paid.coins).toBe(15);
    expect(after.items[0]).toBeNull();
  });

  it('buys an enhanced card into the profile, replacing another enhancement', () => {
    const { purse: paid } = expectOk(buyItem(shop, purse({ profile: { 'hearts-14': 'sharp' } }), 1));
    expect(paid.profile).toEqual({ 'hearts-14': 'golden' });
  });

  it('a tarot with targets is paid and sold at once, then waits in `casting` with a hand of 5 — no pack opens', () => {
    const tarotShop: ShopState = { ...shop, items: [{ card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }, null] };
    const { shop: after, purse: paid } = expectOk(buyItem(tarotShop, purse(), 0));
    expect(after.opened).toBeNull();
    expect(after.items[0]).toBeNull();
    expect(after.casting?.tarotId).toBe('sun');
    expect(after.casting?.hand).toHaveLength(5);
    expect(paid.coins).toBe(17);
  });

  it('Отшельник from the shelf works at once, with nothing left waiting', () => {
    const hermitShop: ShopState = { ...shop, items: [{ card: { kind: 'tarot', tarotId: 'hermit' }, price: 3 }, null] };
    const { shop: after, purse: paid } = expectOk(buyItem(hermitShop, purse(), 0));
    expect(after.casting).toBeNull();
    expect(paid.coins).toBe(17 + 10);
  });

  it('refuses a sold slot, a short purse, full joker slots, an open pack and a waiting tarot', () => {
    expect(buyItem({ ...shop, items: [null, null] }, purse(), 0)).toEqual({ ok: false, error: 'noOffer' });
    expect(buyItem(shop, purse({ coins: 1 }), 0)).toEqual({ ok: false, error: 'notEnoughCoins' });
    expect(buyItem(shop, purse({ jokers: FULL }), 0)).toEqual({ ok: false, error: 'jokerSlotsFull' });
    expect(buyItem(opened({}), purse(), 0)).toEqual({ ok: false, error: 'packOpen' });
    expect(buyItem(casting, purse(), 0)).toEqual({ ok: false, error: 'tarotPending' });
  });
});

describe('a shelf tarot waiting for targets', () => {
  it('is cast on targets from its hand and stops waiting', () => {
    const { shop: after, purse: next } = expectOk(castShopTarot(casting, purse(), ['clubs-7', 'clubs-10']));
    expect(next.profile).toEqual({ 'clubs-7': 'golden', 'clubs-10': 'golden' });
    expect(after.casting).toBeNull();
  });

  it('refuses targets outside the hand or of the wrong count, and keeps waiting', () => {
    expect(castShopTarot(casting, purse(), ['hearts-14'])).toEqual({ ok: false, error: 'cardNotOffered' });
    expect(castShopTarot(casting, purse(), [])).toEqual({ ok: false, error: 'badTargets' });
  });

  it('can be skipped — the money stays spent', () => {
    expect(expectOk(skipTarot(casting)).casting).toBeNull();
  });

  it('refuses cast and skip when nothing waits', () => {
    expect(castShopTarot(shop, purse(), ['clubs-7'])).toEqual({ ok: false, error: 'noTarotPending' });
    expect(skipTarot(shop)).toEqual({ ok: false, error: 'noTarotPending' });
  });

  it('blocks packs and rerolls while waiting', () => {
    expect(buyPack(casting, purse(), 0)).toEqual({ ok: false, error: 'tarotPending' });
    expect(rerollShop(casting, purse())).toEqual({ ok: false, error: 'tarotPending' });
  });
});

describe('buyPack', () => {
  it('opens a joker pack of 3 unowned jokers, pick 1, no hand', () => {
    const { shop: after, purse: paid } = expectOk(buyPack(shop, purse({ jokers: ['clubs'] }), 0));
    expect(after.packs[0]).toBeNull();
    expect(paid.coins).toBe(16);
    expect(after.opened?.kind).toBe('jokers');
    expect(after.opened?.cards).toHaveLength(3);
    expect(after.opened?.picksLeft).toBe(1);
    expect(after.opened?.hand).toEqual([]);
    expect(after.opened?.cards.some((card) => card?.kind === 'joker' && card.jokerId === 'clubs')).toBe(false);
  });

  it('opens a mega arcana of 5 tarots, pick 2, with a hand', () => {
    const { shop: after } = expectOk(buyPack(shop, purse(), 1));
    expect(after.opened?.cards).toHaveLength(5);
    expect(after.opened?.picksLeft).toBe(2);
    expect(after.opened?.hand).toHaveLength(5);
  });

  it('refuses while another pack is open, and when short of coins', () => {
    expect(buyPack(opened({}), purse(), 0)).toEqual({ ok: false, error: 'packOpen' });
    expect(buyPack(shop, purse({ coins: 3 }), 0)).toEqual({ ok: false, error: 'notEnoughCoins' });
  });
});

describe('pickFromPack', () => {
  const jokerPack = opened({ cards: [{ kind: 'joker', jokerId: 'gloat' }, { kind: 'joker', jokerId: 'rage' }] });

  it('takes a joker and closes the pack', () => {
    const { shop: after, purse: next } = expectOk(pickFromPack(jokerPack, purse(), 1, []));
    expect(next.jokers).toEqual(['rage']);
    expect(after.opened).toBeNull();
  });

  it('a full joker row refuses the pick until a joker is sold', () => {
    expect(pickFromPack(jokerPack, purse({ jokers: FULL }), 0, [])).toEqual({ ok: false, error: 'jokerSlotsFull' });
    const sold = expectOk(sellJoker({ coins: 20, jokers: FULL }, 'clubs'));
    const { purse: next } = expectOk(pickFromPack(jokerPack, purse(sold), 0, []));
    expect(next.jokers).toEqual(['hearts', 'spades', 'diamonds', 'small', 'gloat']);
  });

  it('a mega pack takes two picks, marking the taken card', () => {
    const mega = opened({ cards: [{ kind: 'joker', jokerId: 'gloat' }, { kind: 'joker', jokerId: 'rage' }, { kind: 'joker', jokerId: 'mirror' }], picksLeft: 2 });
    const first = expectOk(pickFromPack(mega, purse(), 0, []));
    expect(first.shop.opened).toMatchObject({ picksLeft: 1, cards: [null, { jokerId: 'rage' }, { jokerId: 'mirror' }] });
    expect(pickFromPack(first.shop, first.purse, 0, [])).toEqual({ ok: false, error: 'noOffer' });
    const second = expectOk(pickFromPack(first.shop, first.purse, 2, []));
    expect(second.shop.opened).toBeNull();
    expect(second.purse.jokers).toEqual(['gloat', 'mirror']);
  });

  it('a deck card lands in the profile', () => {
    const deck = opened({ kind: 'deck', cards: [{ kind: 'card', cardId: 'spades-9', enhancement: 'trump' }] });
    expect(expectOk(pickFromPack(deck, purse(), 0, [])).purse.profile).toEqual({ 'spades-9': 'trump' });
  });

  it('a tarot is cast on targets from the hand only', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'sun' }], hand: HAND });
    expect(expectOk(pickFromPack(arcana, purse(), 0, ['clubs-6', 'clubs-9'])).purse.profile).toEqual({ 'clubs-6': 'golden', 'clubs-9': 'golden' });
    expect(pickFromPack(arcana, purse(), 0, ['hearts-14'])).toEqual({ ok: false, error: 'cardNotOffered' });
    expect(pickFromPack(arcana, purse(), 0, ['clubs-6', 'clubs-7', 'clubs-8'])).toEqual({ ok: false, error: 'badTargets' });
  });

  it('Смерть with an unenhanced source is refused', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'death' }], hand: HAND });
    expect(pickFromPack(arcana, purse(), 0, ['clubs-6', 'clubs-7'])).toEqual({ ok: false, error: 'badTargets' });
  });

  it('a tarot result keeps the purse shape (no extra fields)', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'hermit' }], hand: HAND });
    expect(Object.keys(expectOk(pickFromPack(arcana, purse(), 0, [])).purse).sort()).toEqual(['coins', 'jokers', 'profile', 'rng']);
  });

  it('refuses when no pack is open', () => {
    expect(pickFromPack(shop, purse(), 0, [])).toEqual({ ok: false, error: 'noPackOpen' });
  });
});

describe('skipPack', () => {
  it('closes the open pack with no refund', () => {
    expect(expectOk(skipPack(opened({}))).opened).toBeNull();
    expect(skipPack(shop)).toEqual({ ok: false, error: 'noPackOpen' });
  });
});

describe('rerollShop', () => {
  it('rerolls only the items, keeps the packs, and costs one more next time', () => {
    const { shop: after, purse: paid } = expectOk(rerollShop({ ...shop, packs: [shop.packs[0] ?? null, null] }, purse()));
    expect(after.packs).toEqual([shop.packs[0], null]);
    expect(after.items).toHaveLength(2);
    expect(after.rerollCost).toBe(3);
    expect(paid.coins).toBe(18);
    expect(paid.rng).not.toEqual(purse().rng);
  });

  it('refuses while a pack is open or when short of coins', () => {
    expect(rerollShop(opened({}), purse())).toEqual({ ok: false, error: 'packOpen' });
    expect(rerollShop(shop, purse({ coins: 1 }))).toEqual({ ok: false, error: 'notEnoughCoins' });
  });
});

describe('selling and moving jokers', () => {
  it('sells for half the price', () => {
    expect(sellPrice('looter')).toBe(Math.floor(JOKERS.looter.price / 2));
    expect(expectOk(sellJoker({ coins: 1, jokers: ['looter'] }, 'looter'))).toEqual({ coins: 1 + sellPrice('looter'), jokers: [] });
    expect(sellJoker({ coins: 1, jokers: [] }, 'looter')).toEqual({ ok: false, error: 'jokerNotOwned' });
  });

  it('moves a joker to another slot', () => {
    expect(expectOk(moveJoker(['clubs', 'gloat', 'rage'], 0, 2))).toEqual(['gloat', 'rage', 'clubs']);
    expect(moveJoker(['clubs'], 0, 3)).toEqual({ ok: false, error: 'jokerNotOwned' });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak/src/run/shop.test.ts`
Expected: FAIL — `buyItem` / `buyPack` / `pickFromPack` / `priceOf` are not exported.

- [ ] **Step 3: Implement** — replace `shop.ts` with:

```ts
import { err, ok, type Result, type RngState } from '@game/core';
import { ENHANCEMENTS, withEnhancement, type DeckProfile } from '../enhancements';
import { JOKER_IDS, JOKERS, MAX_JOKERS, type JokerId } from '../jokers/catalog';
import {
  jokerWeight,
  PACK_SIZE_DEFS,
  rollDeckCard,
  rollPack,
  rollPackCards,
  rollTarotHand,
  tarotWeight,
  type Pack,
  type PackCard,
  type PackKind,
} from '../shop/packs';
import { applyTarot, TAROT_IDS, TAROT_PRICE, TAROTS, type TarotId, type TarotSubject } from '../shop/tarot';
import { pickWeighted } from '../shop/weighted';

export const SHOP_ITEM_COUNT = 2;
export const SHOP_PACK_COUNT = 2;
export const BASE_REROLL_COST = 2;

const ITEM_KINDS = ['joker', 'tarot', 'card'] as const;
export const ITEM_KIND_WEIGHT: Readonly<Record<PackCard['kind'], number>> = { joker: 60, tarot: 25, card: 15 };

export type ShopItem = { readonly card: PackCard; readonly price: number };

/** A bought pack being chosen from; `hand` — the cards tarots can target (arcana only). */
export type OpenedPack = {
  readonly kind: PackKind;
  readonly cards: readonly (PackCard | null)[];
  readonly picksLeft: number;
  readonly hand: readonly string[];
};

/** A tarot bought from the shelf, paid and sold, waiting for «Применить» / «Пропустить» on its hand. */
export type TarotCast = { readonly tarotId: TarotId; readonly hand: readonly string[] };

/** A `null` item or pack has been bought this visit. */
export type ShopState = {
  readonly items: readonly (ShopItem | null)[];
  readonly packs: readonly (Pack | null)[];
  readonly rerollCost: number;
  readonly opened: OpenedPack | null;
  readonly casting: TarotCast | null;
};

/** What the shop spends and changes: coins, jokers, the deck profile and the run rng. */
export type Purse = TarotSubject;
export type Wallet = { readonly coins: number; readonly jokers: readonly JokerId[] };
export type ShopStep = { readonly shop: ShopState; readonly purse: Purse };

export type ShopError =
  | 'noOffer'
  | 'notEnoughCoins'
  | 'jokerSlotsFull'
  | 'jokerNotOwned'
  | 'cardNotOffered'
  | 'packOpen'
  | 'noPackOpen'
  | 'tarotPending'
  | 'noTarotPending'
  | 'badTargets';

/** An open pack or a waiting shelf tarot must be finished first. */
function busy(shop: ShopState): ShopError | null {
  if (shop.opened) return 'packOpen';
  if (shop.casting) return 'tarotPending';
  return null;
}

export function priceOf(card: PackCard): number {
  switch (card.kind) {
    case 'joker':
      return JOKERS[card.jokerId].price;
    case 'tarot':
      return TAROT_PRICE;
    case 'card':
      return ENHANCEMENTS[card.enhancement].price + 1;
  }
}

type Taken = { readonly jokers: readonly JokerId[]; readonly cardIds: readonly string[] };

function rollTarot(rng: RngState): readonly [PackCard | null, RngState] {
  const [tarotId, next] = pickWeighted<TarotId>(TAROT_IDS, tarotWeight, rng);
  return [tarotId ? { kind: 'tarot', tarotId } : null, next];
}

function rollItemCard(rng: RngState, taken: Taken, profile: DeckProfile): readonly [PackCard | null, RngState] {
  const [kind, afterKind] = pickWeighted(ITEM_KINDS, (k) => ITEM_KIND_WEIGHT[k], rng);
  if (kind === 'card') return rollDeckCard(afterKind, profile, taken.cardIds);
  if (kind === 'joker') {
    const [jokerId, next] = pickWeighted(JOKER_IDS.filter((id) => !taken.jokers.includes(id)), jokerWeight, afterKind);
    return jokerId ? [{ kind: 'joker', jokerId }, next] : rollTarot(next);
  }
  return rollTarot(afterKind);
}

function takenAfter(taken: Taken, card: PackCard | null): Taken {
  if (card?.kind === 'joker') return { ...taken, jokers: [...taken.jokers, card.jokerId] };
  if (card?.kind === 'card') return { ...taken, cardIds: [...taken.cardIds, card.cardId] };
  return taken;
}

type ItemDraw = readonly [readonly (ShopItem | null)[], Taken, RngState];

function rollItems(rng: RngState, owned: readonly JokerId[], profile: DeckProfile): readonly [readonly (ShopItem | null)[], RngState] {
  const [items, , next] = Array.from({ length: SHOP_ITEM_COUNT }).reduce<ItemDraw>(
    ([acc, taken, current]) => {
      const [card, after] = rollItemCard(current, taken, profile);
      return [[...acc, card ? { card, price: priceOf(card) } : null], takenAfter(taken, card), after];
    },
    [[], { jokers: owned, cardIds: [] }, rng],
  );
  return [items, next];
}

function rollPacks(rng: RngState): readonly [readonly Pack[], RngState] {
  return Array.from({ length: SHOP_PACK_COUNT }).reduce<readonly [readonly Pack[], RngState]>(
    ([packs, current]) => {
      const [pack, next] = rollPack(current);
      return [[...packs, pack], next];
    },
    [[], rng],
  );
}

export function createShop(rng: RngState, owned: readonly JokerId[], profile: DeckProfile): readonly [ShopState, RngState] {
  const [items, afterItems] = rollItems(rng, owned, profile);
  const [packs, next] = rollPacks(afterItems);
  return [{ items, packs, rerollCost: BASE_REROLL_COST, opened: null, casting: null }, next];
}

function emptied<T>(list: readonly (T | null)[], index: number): readonly (T | null)[] {
  return list.map((entry, i) => (i === index ? null : entry));
}

/** A joker or an enhanced card goes straight into the purse; tarots are cast, never taken. */
function take(purse: Purse, card: PackCard): Result<Purse, ShopError> {
  if (card.kind === 'joker') {
    if (purse.jokers.length >= MAX_JOKERS) return err('jokerSlotsFull');
    return ok({ ...purse, jokers: [...purse.jokers, card.jokerId] });
  }
  if (card.kind === 'card') return ok({ ...purse, profile: withEnhancement(purse.profile, card.cardId, card.enhancement) });
  return err('badTargets');
}

function openArcana(cards: readonly PackCard[], picksLeft: number, rng: RngState): readonly [OpenedPack, RngState] {
  const [hand, next] = rollTarotHand(rng);
  return [{ kind: 'arcana', cards, picksLeft, hand }, next];
}

/** A shelf tarot is paid and sold at once; with targets it waits in `casting`, without them it is cast right away. */
function buyTarot(shop: ShopState, paid: Purse, items: ShopState['items'], tarotId: TarotId): Result<ShopStep, ShopError> {
  if (TAROTS[tarotId].maxTargets === 0) {
    const cast = castTarot(paid, tarotId, [], []);
    return cast.ok ? ok({ shop: { ...shop, items }, purse: cast.value }) : cast;
  }
  const [hand, rng] = rollTarotHand(paid.rng);
  return ok({ shop: { ...shop, items, casting: { tarotId, hand } }, purse: { ...paid, rng } });
}

export function buyItem(shop: ShopState, purse: Purse, index: number): Result<ShopStep, ShopError> {
  const blocked = busy(shop);
  if (blocked) return err(blocked);
  const item = shop.items[index];
  if (!item) return err('noOffer');
  if (purse.coins < item.price) return err('notEnoughCoins');
  const paid: Purse = { ...purse, coins: purse.coins - item.price };
  const items = emptied(shop.items, index);
  if (item.card.kind === 'tarot') return buyTarot(shop, paid, items, item.card.tarotId);
  const taken = take(paid, item.card);
  return taken.ok ? ok({ shop: { ...shop, items }, purse: taken.value }) : taken;
}

export function buyPack(shop: ShopState, purse: Purse, index: number): Result<ShopStep, ShopError> {
  const blocked = busy(shop);
  if (blocked) return err(blocked);
  const pack = shop.packs[index];
  if (!pack) return err('noOffer');
  if (purse.coins < pack.price) return err('notEnoughCoins');
  const [cards, afterCards] = rollPackCards(purse.rng, pack, purse.jokers, purse.profile);
  const picksLeft = PACK_SIZE_DEFS[pack.size].picks;
  const packs = emptied(shop.packs, index);
  const coins = purse.coins - pack.price;
  if (pack.kind === 'arcana') {
    const [opened, rng] = openArcana(cards, picksLeft, afterCards);
    return ok({ shop: { ...shop, packs, opened }, purse: { ...purse, coins, rng } });
  }
  const opened: OpenedPack = { kind: pack.kind, cards, picksLeft, hand: [] };
  return ok({ shop: { ...shop, packs, opened }, purse: { ...purse, coins, rng: afterCards } });
}

function castTarot(purse: Purse, id: TarotId, targets: readonly string[], hand: readonly string[]): Result<Purse, ShopError> {
  if (!targets.every((target) => hand.includes(target))) return err('cardNotOffered');
  const cast = applyTarot(purse, id, targets);
  if (!cast.ok) return cast;
  const { coins, jokers, profile, rng } = cast.value;
  return ok({ coins, jokers, profile, rng });
}

export function pickFromPack(shop: ShopState, purse: Purse, index: number, targets: readonly string[]): Result<ShopStep, ShopError> {
  const { opened } = shop;
  if (!opened) return err('noPackOpen');
  const card = opened.cards[index];
  if (!card) return err('noOffer');
  const result = card.kind === 'tarot' ? castTarot(purse, card.tarotId, targets, opened.hand) : take(purse, card);
  if (!result.ok) return result;
  const cards = emptied(opened.cards, index);
  const picksLeft = opened.picksLeft - 1;
  const done = picksLeft <= 0 || cards.every((entry) => entry === null);
  return ok({ shop: { ...shop, opened: done ? null : { ...opened, cards, picksLeft } }, purse: result.value });
}

/** Closes the open pack; the money is not returned. */
export function skipPack(shop: ShopState): Result<ShopState, ShopError> {
  return shop.opened ? ok({ ...shop, opened: null }) : err('noPackOpen');
}

/** Casts the waiting shelf tarot on targets from its hand. */
export function castShopTarot(shop: ShopState, purse: Purse, targets: readonly string[]): Result<ShopStep, ShopError> {
  const { casting } = shop;
  if (!casting) return err('noTarotPending');
  const cast = castTarot(purse, casting.tarotId, targets, casting.hand);
  return cast.ok ? ok({ shop: { ...shop, casting: null }, purse: cast.value }) : cast;
}

/** Drops the waiting shelf tarot; it stays sold and the money is not returned. */
export function skipTarot(shop: ShopState): Result<ShopState, ShopError> {
  return shop.casting ? ok({ ...shop, casting: null }) : err('noTarotPending');
}

/** New single items; the packs stay — two per visit is the whole supply. */
export function rerollShop(shop: ShopState, purse: Purse): Result<ShopStep, ShopError> {
  const blocked = busy(shop);
  if (blocked) return err(blocked);
  if (purse.coins < shop.rerollCost) return err('notEnoughCoins');
  const [items, rng] = rollItems(purse.rng, purse.jokers, purse.profile);
  return ok({ shop: { ...shop, items, rerollCost: shop.rerollCost + 1 }, purse: { ...purse, coins: purse.coins - shop.rerollCost, rng } });
}

export function sellPrice(jokerId: JokerId): number {
  return Math.floor(JOKERS[jokerId].price / 2);
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
```

Note: in the full-slots test `purse(sold)` spreads a `Wallet` over the default purse — intended.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run packages/durak/src/run/shop.test.ts packages/durak/src/shop`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak/src/run/shop.ts packages/durak/src/run/shop.test.ts
git commit -m "feat(durak): shop of 2 items and 2 packs with an opened pack kept in state"
```

---

### Task 4: Run actions, bot, save v8 and error copy

**Files:**
- Modify: `packages/durak/src/run/run.ts`, `packages/durak/src/run/run.test.ts`
- Modify: `packages/durak/src/sim/simulate.ts`, `packages/durak/src/sim/simulate.test.ts`
- Modify: `apps/web/src/games/durak/runSchema.ts`, `apps/web/src/games/durak/runStorage.test.ts`, `apps/web/src/games/durak/messages.ts`

**Interfaces:**
- Consumes: Task 3 shop API.
- Produces: `RunAction` gains `{ type: 'buyItem'; index: number }`, `{ type: 'buyPack'; index: number }`, `{ type: 'pickFromPack'; index: number; targets: readonly string[] }`, `{ type: 'skipPack' }`, `{ type: 'castTarot'; targets: readonly string[] }`, `{ type: 'skipTarot' }`; loses `buyJoker` and `buyEnhancement`. `leaveShop` and `reroll` with an open pack → `'packOpen'`, with a waiting shelf tarot → `'tarotPending'`. `export function botTargets(id: TarotId, hand: readonly string[], profile: DeckProfile): readonly string[] | null;` from `sim/simulate.ts`. `SAVE_VERSION = 8`.

- [ ] **Step 1: Write the failing tests.** In `run.test.ts` add `import type { ShopState } from './shop';`, add the helper below `inShop`, replace the `describe('shop phase', …)` block, and replace the two tests «a bought enhancement lands in the profile and in the next fight» and «cannot buy enhancements during a fight» inside `describe('deck profiles in a run', …)` with the pack test below:

```ts
function withShop(run: RunState, patch: Partial<ShopState>): RunState {
  if (run.phase.kind !== 'shop') throw new Error('not in shop');
  return { ...run, phase: { ...run.phase, shop: { ...run.phase.shop, ...patch } } };
}

describe('shop phase', () => {
  it('buying a joker item spends coins and carries the joker into the next fight', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 50 }, { items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, null] });
    const bought = expectOk(applyRunAction(shop, { type: 'buyItem', index: 0 }));
    expect(bought.jokers).toEqual(['clubs']);
    expect(bought.coins).toBe(46);
    const next = expectOk(applyRunAction(bought, { type: 'leaveShop' }));
    expect(next.stage).toBe(1);
    expect(next.phase.kind === 'fight' && next.phase.fight.jokers.player).toEqual(['clubs']);
    expect(next.phase.kind === 'fight' && next.phase.fight.hp).toEqual({ player: PLAYER_HP, enemy: enemyAt(1).hp });
  });

  it('selling and rerolling update coins', () => {
    const shop = { ...inShop(createRun(1)), jokers: ['looter' as const] };
    const sold = expectOk(applyRunAction(shop, { type: 'sellJoker', jokerId: 'looter' }));
    expect(sold.jokers).toEqual([]);
    expect(sold.coins).toBe(shop.coins + 2);
    const rerolled = expectOk(applyRunAction(sold, { type: 'reroll' }));
    expect(rerolled.coins).toBe(sold.coins - 2);
  });

  it('passes shop errors through', () => {
    const broke = { ...inShop(createRun(1)), coins: 0 };
    expect(applyRunAction(broke, { type: 'buyItem', index: 0 })).toEqual({ ok: false, error: 'notEnoughCoins' });
    expect(applyRunAction(broke, { type: 'buyPack', index: 0 })).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('an open pack blocks leaving and rerolling until it is picked from or skipped', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 50 }, { packs: [{ kind: 'jokers', size: 'normal', price: 4 }, null] });
    const opened = expectOk(applyRunAction(shop, { type: 'buyPack', index: 0 }));
    expect(applyRunAction(opened, { type: 'leaveShop' })).toEqual({ ok: false, error: 'packOpen' });
    expect(applyRunAction(opened, { type: 'reroll' })).toEqual({ ok: false, error: 'packOpen' });
    const skipped = expectOk(applyRunAction(opened, { type: 'skipPack' }));
    expect(skipped.coins).toBe(46);
    expect(expectOk(applyRunAction(skipped, { type: 'leaveShop' })).stage).toBe(1);
  });

  it('a shelf tarot waits for targets, blocks leaving, and is cast or skipped', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 50 }, { items: [{ card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }, null] });
    const bought = expectOk(applyRunAction(shop, { type: 'buyItem', index: 0 }));
    if (bought.phase.kind !== 'shop' || !bought.phase.shop.casting) throw new Error('no tarot waiting');
    expect(bought.coins).toBe(47);
    expect(applyRunAction(bought, { type: 'leaveShop' })).toEqual({ ok: false, error: 'tarotPending' });
    const [first] = bought.phase.shop.casting.hand;
    const cast = expectOk(applyRunAction(bought, { type: 'castTarot', targets: [first!] }));
    expect(cast.profile).toEqual({ [first!]: 'golden' });
    const skipped = expectOk(applyRunAction(bought, { type: 'skipTarot' }));
    expect(skipped.coins).toBe(47);
    expect(skipped.profile).toEqual({});
    expect(expectOk(applyRunAction(skipped, { type: 'leaveShop' })).stage).toBe(1);
  });

  it('rejects fight actions in the shop and shop actions in a fight', () => {
    const shop = inShop(createRun(1));
    expect(applyRunAction(shop, { type: 'fight', actor: 'enemy', action: { type: 'take' } })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(shop, { type: 'leaveFight' })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(createRun(1), { type: 'buyItem', index: 0 })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(createRun(1), { type: 'skipPack' })).toEqual({ ok: false, error: 'wrongPhase' });
  });
});
```

Inside `describe('deck profiles in a run', …)`:

```ts
  it('a card picked from a deck pack lands in the profile and in the next fight', () => {
    const shop = withShop({ ...inShop(createRun(1)), coins: 20 }, { packs: [{ kind: 'deck', size: 'normal', price: 4 }, null] });
    const opened = expectOk(applyRunAction(shop, { type: 'buyPack', index: 0 }));
    if (opened.phase.kind !== 'shop' || !opened.phase.shop.opened) throw new Error('no pack open');
    const card = opened.phase.shop.opened.cards[0];
    if (card?.kind !== 'card') throw new Error('not a deck card');
    const picked = expectOk(applyRunAction(opened, { type: 'pickFromPack', index: 0, targets: [] }));
    expect(picked.profile).toEqual({ [card.cardId]: card.enhancement });
    expect(picked.phase.kind === 'shop' && picked.phase.shop.opened).toBeNull();
    const next = expectOk(applyRunAction(picked, { type: 'leaveShop' }));
    expect(next.phase.kind === 'fight' && next.phase.fight.round.profiles.player).toEqual({ [card.cardId]: card.enhancement });
  });
```

In `simulate.test.ts` add (reuse the file's vitest imports; add `botTargets` to its import from `./simulate`):

```ts
describe('botTargets', () => {
  const hand = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];
  it('fills an enhancement tarot up to its limit', () => {
    expect(botTargets('sun', hand, {})).toEqual(['clubs-6', 'clubs-7']);
    expect(botTargets('chariot', hand, {})).toEqual(['clubs-6']);
    expect(botTargets('hermit', hand, {})).toEqual([]);
  });
  it('Смерть copies from an enhanced hand card, or is skipped', () => {
    expect(botTargets('death', hand, { 'clubs-8': 'trump' })).toEqual(['clubs-6', 'clubs-8']);
    expect(botTargets('death', hand, {})).toBeNull();
  });
});
```

In `runStorage.test.ts` add (use the file's existing `shopRun`, `memoryStore`, `saveRun`, `loadRun`, `RUN_STORAGE_KEY`; add missing imports such as `type RunState`):

```ts
  it('round-trips a shop with an open pack', () => {
    const run = shopRun();
    if (run.phase.kind !== 'shop') throw new Error('not in shop');
    const opened: RunState = {
      ...run,
      phase: {
        ...run.phase,
        shop: {
          ...run.phase.shop,
          opened: { kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'sun' }, null], picksLeft: 1, hand: ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'] },
        },
      },
    };
    const store = memoryStore();
    saveRun(store, opened);
    expect(loadRun(store)).toEqual({ status: 'ok', run: opened });
  });

  it('round-trips a shop with a shelf tarot waiting for targets', () => {
    const run = shopRun();
    if (run.phase.kind !== 'shop') throw new Error('not in shop');
    const waiting: RunState = {
      ...run,
      phase: { ...run.phase, shop: { ...run.phase.shop, casting: { tarotId: 'death', hand: ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'] } } },
    };
    const store = memoryStore();
    saveRun(store, waiting);
    expect(loadRun(store)).toEqual({ status: 'ok', run: waiting });
  });

  it('rejects saves from version 7', () => {
    const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: 7, run: shopRun() }) });
    expect(loadRun(store)).toEqual({ status: 'invalid' });
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak apps/web/src/games/durak/runStorage.test.ts`
Expected: FAIL — `run.ts` does not compile against the new shop (`buyJoker` not exported), new actions unknown, save still v7.

- [ ] **Step 3: Implement `run.ts`.** Replace the shop import:

```ts
import {
  buyItem,
  buyPack,
  castShopTarot,
  createShop,
  moveJoker,
  pickFromPack,
  rerollShop,
  sellJoker,
  skipPack,
  skipTarot,
  type Purse,
  type ShopError,
  type ShopState,
  type ShopStep,
  type Wallet,
} from './shop';
```

`RunAction` becomes:

```ts
export type RunAction =
  | { readonly type: 'fight'; readonly actor: PlayerId; readonly action: FightAction }
  | { readonly type: 'leaveFight' }
  | { readonly type: 'buyItem'; readonly index: number }
  | { readonly type: 'buyPack'; readonly index: number }
  | { readonly type: 'pickFromPack'; readonly index: number; readonly targets: readonly string[] }
  | { readonly type: 'skipPack' }
  | { readonly type: 'castTarot'; readonly targets: readonly string[] }
  | { readonly type: 'skipTarot' }
  | { readonly type: 'sellJoker'; readonly jokerId: JokerId }
  | { readonly type: 'moveJoker'; readonly from: number; readonly to: number }
  | { readonly type: 'reroll' }
  | { readonly type: 'leaveShop' };
```

The shop cases of `applyRunAction` become (replacing `buyJoker`, `buyEnhancement`, `reroll`, `leaveShop`; `sellJoker` and `moveJoker` stay):

```ts
    case 'buyItem':
      return inShop(state, (phase) => withStep(state, phase, buyItem(phase.shop, purse(state), action.index)));
    case 'buyPack':
      return inShop(state, (phase) => withStep(state, phase, buyPack(phase.shop, purse(state), action.index)));
    case 'pickFromPack':
      return inShop(state, (phase) => withStep(state, phase, pickFromPack(phase.shop, purse(state), action.index, action.targets)));
    case 'skipPack':
      return inShop(state, (phase) => {
        const result = skipPack(phase.shop);
        return result.ok ? ok({ ...state, phase: { ...phase, shop: result.value } }) : result;
      });
    case 'castTarot':
      return inShop(state, (phase) => withStep(state, phase, castShopTarot(phase.shop, purse(state), action.targets)));
    case 'skipTarot':
      return inShop(state, (phase) => {
        const result = skipTarot(phase.shop);
        return result.ok ? ok({ ...state, phase: { ...phase, shop: result.value } }) : result;
      });
    case 'reroll':
      return inShop(state, (phase) => withStep(state, phase, rerollShop(phase.shop, purse(state))));
    case 'leaveShop':
      return inShop(state, (phase) => {
        if (phase.shop.opened) return err('packOpen');
        if (phase.shop.casting) return err('tarotPending');
        return ok(startFight({ ...state, stage: state.stage + 1 }));
      });
```

Helpers (next to `wallet`):

```ts
function purse(state: RunState): Purse {
  return { coins: state.coins, jokers: state.jokers, profile: state.profile, rng: state.rng };
}

function withStep(state: RunState, phase: ShopPhase, result: Result<ShopStep, ShopError>): RunResult {
  if (!result.ok) return result;
  const { shop, purse: changed } = result.value;
  return ok({ ...state, ...changed, phase: { ...phase, shop } });
}
```

In `leaveFight`: `const [shop, rng] = createShop(state.rng, state.jokers, state.profile);`.

- [ ] **Step 4: Implement the bot** in `simulate.ts`. Replace the shop branch of `botAction` with `if (phase.kind === 'shop') return shopAction(run, phase.shop);`, update its doc comment to `/** A plain bot: aggressive AI in fights; in the shop buys joker items, then joker and arcana packs — no synergy hunting. */`, and add:

```ts
import type { DeckProfile } from '../enhancements';
import type { OpenedPack, ShopState } from '../run/shop';
import { TAROTS, targetsOk, type TarotId } from '../shop/tarot';

/** Packs the plain bot buys, most wanted first. */
const BOT_PACKS = ['jokers', 'arcana'] as const;

/** Simple tarot targets: the first hand cards; Смерть copies from the first enhanced one. */
export function botTargets(id: TarotId, hand: readonly string[], profile: DeckProfile): readonly string[] | null {
  if (id === 'death') {
    const source = hand.find((cardId) => profile[cardId] !== undefined);
    const target = hand.find((cardId) => cardId !== source);
    return source && target ? [target, source] : null;
  }
  const targets = hand.slice(0, TAROTS[id].maxTargets);
  return targetsOk(id, targets, profile) ? targets : null;
}

function packAction(run: RunState, opened: OpenedPack): RunAction {
  const room = run.jokers.length < MAX_JOKERS;
  const picks = opened.cards.flatMap((card, index): RunAction[] => {
    if (!card) return [];
    if (card.kind === 'joker') return room ? [{ type: 'pickFromPack', index, targets: [] }] : [];
    if (card.kind === 'card') return [{ type: 'pickFromPack', index, targets: [] }];
    const targets = botTargets(card.tarotId, opened.hand, run.profile);
    return targets ? [{ type: 'pickFromPack', index, targets }] : [];
  });
  return picks[0] ?? { type: 'skipPack' };
}

/** Buys an affordable joker item, then a joker pack, then an arcana pack; otherwise moves on. */
function shopAction(run: RunState, shop: ShopState): RunAction {
  if (shop.opened) return packAction(run, shop.opened);
  if (shop.casting) {
    const targets = botTargets(shop.casting.tarotId, shop.casting.hand, run.profile);
    return targets ? { type: 'castTarot', targets } : { type: 'skipTarot' };
  }
  const room = run.jokers.length < MAX_JOKERS;
  const item = shop.items.findIndex((entry) => entry !== null && entry.card.kind === 'joker' && room && entry.price <= run.coins);
  if (item >= 0) return { type: 'buyItem', index: item };
  const pack = BOT_PACKS.flatMap((kind) =>
    shop.packs.flatMap((entry, index) => (entry && entry.kind === kind && entry.price <= run.coins && (kind !== 'jokers' || room) ? [index] : [])),
  )[0];
  return pack === undefined ? { type: 'leaveShop' } : { type: 'buyPack', index: pack };
}
```

- [ ] **Step 5: Implement the save v8** in `runSchema.ts`: `SAVE_VERSION = 8`; import `PACK_KINDS, PACK_SIZES, TAROT_IDS` from `@game/durak`; replace the `shop` schema with:

```ts
const packCard = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('joker'), jokerId: joker }),
  z.object({ kind: z.literal('tarot'), tarotId: z.enum(TAROT_IDS) }),
  z.object({ kind: z.literal('card'), cardId: z.string(), enhancement }),
]);
const shop = z.object({
  items: z.array(z.object({ card: packCard, price: count }).nullable()),
  packs: z.array(z.object({ kind: z.enum(PACK_KINDS), size: z.enum(PACK_SIZES), price: count }).nullable()),
  rerollCost: count,
  opened: z
    .object({ kind: z.enum(PACK_KINDS), cards: z.array(packCard.nullable()), picksLeft: count, hand: z.array(z.string()) })
    .nullable(),
  casting: z.object({ tarotId: z.enum(TAROT_IDS), hand: z.array(z.string()) }).nullable(),
});
```

Add to `ERROR_MESSAGES` in `messages.ts`:

```ts
  packOpen: 'Сначала возьми карту из пака или пропусти его',
  noPackOpen: 'Пак не открыт',
  tarotPending: 'Сначала примени таро или пропусти его',
  noTarotPending: 'Таро не ждёт применения',
  badTargets: 'Выбери подходящие карты',
```

- [ ] **Step 6: Run to verify**

Run: `npx vitest run packages/durak apps/web/src/games/durak/runStorage.test.ts apps/web/src/games/durak/messages.test.ts`
Expected: PASS (the fast-check simulation test included: every run ends, coins ≥ 0, jokers ≤ 5 and unique).
Run: `npm run typecheck`
Expected: errors only in `apps/web/src/games/durak/ShopScreen.tsx` (fixed in Task 5); none in `packages/`.

- [ ] **Step 7: Commit**

```bash
git add packages/durak apps/web/src/games/durak/runSchema.ts apps/web/src/games/durak/runStorage.test.ts apps/web/src/games/durak/messages.ts
git commit -m "feat: run actions for items and packs, pack-buying bot, save v8"
```

---

### Task 5: Shop screen — Balatro layout, slots, packs, detail sheet

**Files:**
- Create: `apps/web/src/games/durak/shop/shopCopy.ts`, `apps/web/src/games/durak/shop/shopCopy.test.ts`
- Create: `apps/web/src/games/durak/shop/PackCardFace.tsx`, `PackArt.tsx`, `ShopSlot.tsx`, `DetailSheet.tsx`, `ShopDetail.tsx`, `OwnedJokers.tsx`
- Modify (rewrite): `apps/web/src/games/durak/ShopScreen.tsx`, `apps/web/src/games/durak/shop.css`

**Interfaces:**
- Consumes: engine exports from Tasks 1–4.
- Produces:

```ts
// shopCopy.ts
export const PACK_NAMES: Readonly<Record<PackKind, string>>;
export const PACK_SIZE_NAMES: Readonly<Record<PackSize, string>>;
export const PACK_TEXT: Readonly<Record<PackKind, string>>;
export const RARITY_NAMES: Readonly<Record<Rarity, string>>;
export function deckCard(cardId: string): Card | null;
export function cardLabel(cardId: string): string;
export function packCardTitle(card: PackCard): string;
export function packCardText(card: PackCard): string;
export function packSizeText(size: PackSize): string;
// components
export function PackCardFace(props: { card: PackCard; size?: 'slot' | 'big'; faceDown?: boolean }): JSX.Element;
export function PackArt(props: { kind: PackKind; size?: PackSize }): JSX.Element;
export function DetailSheet(props: { title: string; subtitle?: string; text: string; warning?: string | null; art: ReactNode; actions: ReactNode; children?: ReactNode; onClose: (() => void) | null }): JSX.Element;
```

- [ ] **Step 1: Write the failing test** — `shopCopy.test.ts`:

```ts
import { rankLabel } from '@game/core';
import { JOKERS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { cardLabel, packCardText, packCardTitle, packSizeText } from './shopCopy';

describe('shop copy', () => {
  it('names a deck card by rank and suit', () => {
    expect(cardLabel('hearts-14')).toBe(`${rankLabel(14)}♥`);
    expect(cardLabel('nope')).toBe('nope');
  });

  it('titles each kind of pack card', () => {
    expect(packCardTitle({ kind: 'joker', jokerId: 'looter' })).toBe(JOKERS.looter.name);
    expect(packCardTitle({ kind: 'tarot', tarotId: 'sun' })).toBe('Солнце');
    expect(packCardTitle({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' })).toBe(`${rankLabel(14)}♥ Золотая`);
  });

  it('describes a pack card by its catalogue text', () => {
    expect(packCardText({ kind: 'tarot', tarotId: 'hermit' })).toBe('Удваивает монеты (не больше +10)');
  });

  it('says how many cards a pack holds and how many to take', () => {
    expect(packSizeText('normal')).toBe('3 карты · бери 1');
    expect(packSizeText('big')).toBe('5 карт · бери 1');
    expect(packSizeText('mega')).toBe('5 карт · бери 2');
  });
});
```

Run: `npx vitest run apps/web/src/games/durak/shop`
Expected: FAIL — cannot resolve `./shopCopy`.

- [ ] **Step 2: Implement `shopCopy.ts`:**

```ts
import { createDeck, rankLabel, SUIT_SYMBOLS, type Card } from '@game/core';
import { ENHANCEMENTS, JOKERS, PACK_SIZE_DEFS, TAROTS, type PackCard, type PackKind, type PackSize, type Rarity } from '@game/durak';

export const PACK_NAMES: Readonly<Record<PackKind, string>> = { jokers: 'Пак джокеров', arcana: 'Аркана', deck: 'Колода' };
export const PACK_SIZE_NAMES: Readonly<Record<PackSize, string>> = { normal: 'Обычный', big: 'Большой', mega: 'Мега' };
export const PACK_TEXT: Readonly<Record<PackKind, string>> = {
  jokers: 'Джокеры, которых у тебя ещё нет',
  arcana: 'Таро: меняют карты колоды или монеты',
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
```

Run: `npx vitest run apps/web/src/games/durak/shop` — Expected: PASS.

- [ ] **Step 3: Components.** `PackCardFace.tsx`:

```tsx
import { JOKERS, packCardRarity, TAROTS, type PackCard, type TarotId } from '@game/durak';
import { PixelCard } from '../../../ui/PixelCard';
import { emblemUrl } from '../../../ui/pixel/jokerEmblem';
import { deckCard } from './shopCopy';

const TAROT_GLYPHS: Readonly<Record<TarotId, string>> = { sun: '☀', tower: '♜', star: '★', chariot: '♞', emperor: '♔', death: '☠', hermit: '☾', wheel: '☸' };
const CARD_WIDTH = { slot: 64, big: 96 } as const;

type PackCardFaceProps = { readonly card: PackCard; readonly size?: 'slot' | 'big'; readonly faceDown?: boolean };

/** One card of the shop or a pack: a joker picture, a tarot or an enhanced playing card, framed by rarity. */
export function PackCardFace({ card, size = 'slot', faceDown = false }: PackCardFaceProps) {
  const classes = ['pcard', `pcard--${size}`, `pcard--${packCardRarity(card)}`, faceDown ? 'pcard--down' : ''].filter(Boolean).join(' ');
  if (faceDown) return <span className={classes} aria-hidden="true" />;
  if (card.kind === 'card') {
    const playing = deckCard(card.cardId);
    return <span className={`${classes} pcard--playing`}>{playing && <PixelCard card={playing} width={CARD_WIDTH[size]} enhancement={card.enhancement} idle={false} />}</span>;
  }
  if (card.kind === 'joker') {
    return (
      <span className={`${classes} pcard--joker`}>
        <img className="sprite pcard__art" src={emblemUrl(card.jokerId)} alt="" draggable={false} />
        <span className="pcard__name">{JOKERS[card.jokerId].name}</span>
      </span>
    );
  }
  const tarot = TAROTS[card.tarotId];
  return (
    <span className={`${classes} pcard--tarot`}>
      <span className="pcard__numeral">{tarot.numeral}</span>
      <span className="pcard__glyph">{TAROT_GLYPHS[card.tarotId]}</span>
      <span className="pcard__name">{tarot.name}</span>
    </span>
  );
}
```

`PackArt.tsx`:

```tsx
import type { PackKind, PackSize } from '@game/durak';
import { PACK_NAMES, PACK_SIZE_NAMES, packSizeText } from './shopCopy';

/** A sealed foil booster: colour by kind, size and «N карт · бери K» on the front. */
export function PackArt({ kind, size }: { readonly kind: PackKind; readonly size?: PackSize }) {
  return (
    <span className={`pack pack--${kind}${size ? ` pack--${size}` : ''}`}>
      <span className="pack__foil" />
      <span className="pack__name">{PACK_NAMES[kind]}</span>
      {size && <span className="pack__size">{PACK_SIZE_NAMES[size]}</span>}
      {size && <span className="pack__count">{packSizeText(size)}</span>}
    </span>
  );
}
```

`ShopSlot.tsx`:

```tsx
import type { ReactNode } from 'react';

type ShopSlotProps = {
  readonly price: number | null;
  readonly label: string;
  readonly testId: string;
  readonly onOpen: () => void;
  readonly children: ReactNode;
};

/** A shop slot with a hanging price tag; `price: null` — sold this visit. */
export function ShopSlot({ price, label, testId, onOpen, children }: ShopSlotProps) {
  if (price === null) {
    return (
      <div className="shop-slot shop-slot--sold" data-testid={testId}>
        Продано
      </div>
    );
  }
  return (
    <div className="shop-slot" data-testid={testId}>
      <span className="price-tag">● {price}</span>
      <button type="button" className="shop-slot__face" aria-label={label} onClick={onOpen}>
        {children}
      </button>
    </div>
  );
}
```

`DetailSheet.tsx`:

```tsx
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PixelButton } from '../../../ui/PixelButton';

type DetailSheetProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly text: string;
  readonly warning?: string | null;
  readonly art: ReactNode;
  readonly actions: ReactNode;
  /** Extra content under the text (the tarot target hand). */
  readonly children?: ReactNode;
  /** null — the sheet cannot be dismissed (a bought tarot waits for «Применить» / «Пропустить»). */
  readonly onClose: (() => void) | null;
};

/** A bottom sheet on phones (a centred card on wide screens): big art, text, and the actions in thumb reach. */
export function DetailSheet({ title, subtitle, text, warning = null, art, actions, children, onClose }: DetailSheetProps) {
  return createPortal(
    <div className="sheet-backdrop" data-testid="detail-sheet" onClick={onClose ?? undefined}>
      <div className="sheet panel" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__art">{art}</div>
        <h3 className="sheet__title">{title}</h3>
        {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
        <p className="sheet__text">{text}</p>
        {children}
        {warning && (
          <p className="sheet__warning" role="alert">
            {warning}
          </p>
        )}
        <div className="sheet__actions">
          {actions}
          {onClose && (
            <PixelButton tone="blue" onClick={onClose}>
              Закрыть
            </PixelButton>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

`ShopDetail.tsx`:

```tsx
import { conflictFor, ENHANCEMENTS, packCardRarity, type RunAction, type RunState, type ShopState } from '@game/durak';
import { PixelButton } from '../../../ui/PixelButton';
import { DetailSheet } from './DetailSheet';
import { PackArt } from './PackArt';
import { PackCardFace } from './PackCardFace';
import { PACK_NAMES, PACK_SIZE_NAMES, PACK_TEXT, packCardText, packCardTitle, packSizeText, RARITY_NAMES } from './shopCopy';

export type ShopFocus = { readonly kind: 'item' | 'pack'; readonly index: number };

type ShopDetailProps = {
  readonly focus: ShopFocus;
  readonly shop: ShopState;
  readonly run: RunState;
  readonly onAct: (action: RunAction) => void;
  readonly onClose: () => void;
};

/** The sheet for a tapped item or pack, with its buy button and the replacement warning. */
export function ShopDetail({ focus, shop, run, onAct, onClose }: ShopDetailProps) {
  const buy = (action: RunAction): void => {
    onAct(action);
    onClose();
  };
  if (focus.kind === 'pack') {
    const pack = shop.packs[focus.index];
    if (!pack) return null;
    const name = PACK_NAMES[pack.kind];
    return (
      <DetailSheet
        title={name}
        subtitle={`${PACK_SIZE_NAMES[pack.size]} · ${packSizeText(pack.size)}`}
        text={PACK_TEXT[pack.kind]}
        art={<PackArt kind={pack.kind} size={pack.size} />}
        onClose={onClose}
        actions={
          <PixelButton tone="orange" aria-label={`Купить ${name} за ${pack.price}`} onClick={() => buy({ type: 'buyPack', index: focus.index })}>
            Открыть за ● {pack.price}
          </PixelButton>
        }
      />
    );
  }
  const item = shop.items[focus.index];
  if (!item) return null;
  const { card } = item;
  const title = packCardTitle(card);
  const replaced = card.kind === 'card' ? conflictFor(run.profile, card.cardId, card.enhancement) : null;
  const warning = replaced && card.kind === 'card' ? `В колоде: ${ENHANCEMENTS[replaced].name} → станет ${ENHANCEMENTS[card.enhancement].name}` : null;
  return (
    <DetailSheet
      title={title}
      subtitle={`Редкость: ${RARITY_NAMES[packCardRarity(card)]}`}
      text={packCardText(card)}
      warning={warning}
      art={<PackCardFace card={card} size="big" />}
      onClose={onClose}
      actions={
        <PixelButton tone="orange" aria-label={`Купить ${title} за ${item.price}`} onClick={() => buy({ type: 'buyItem', index: focus.index })}>
          Купить за ● {item.price}
        </PixelButton>
      }
    />
  );
}
```

`OwnedJokers.tsx`:

```tsx
import { JOKERS, MAX_JOKERS, sellPrice, type JokerId, type RunAction } from '@game/durak';
import { useState } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { TicketFace } from '../JokerTicket';
import { DetailSheet } from './DetailSheet';
import { RARITY_NAMES } from './shopCopy';

type OwnedJokersProps = { readonly jokers: readonly JokerId[]; readonly onAct: (action: RunAction) => void };

/** The row of owned jokers across the top; a tap opens a sheet to sell or move the joker. */
export function OwnedJokers({ jokers, onAct }: OwnedJokersProps) {
  const [open, setOpen] = useState<JokerId | null>(null);
  const index = open ? jokers.indexOf(open) : -1;
  return (
    <section className="owned panel" data-testid="owned-jokers" aria-label="Твои джокеры">
      <ul className="owned__list">
        {jokers.map((id) => (
          <li key={id} className="owned__slot">
            <button type="button" className="owned__ticket" aria-label={JOKERS[id].name} onClick={() => setOpen(id)}>
              <TicketFace id={id} wide={false} />
            </button>
          </li>
        ))}
        {Array.from({ length: Math.max(0, MAX_JOKERS - jokers.length) }, (_, i) => (
          <li key={`empty-${i}`} className="owned__slot" aria-hidden="true">
            <span className="ticket ticket--placeholder" />
          </li>
        ))}
      </ul>
      <span className="owned__count">
        {jokers.length}/{MAX_JOKERS}
      </span>
      {open && index >= 0 && (
        <DetailSheet
          title={JOKERS[open].name}
          subtitle={`Редкость: ${RARITY_NAMES[JOKERS[open].rarity]}`}
          text={JOKERS[open].description}
          art={<TicketFace id={open} wide />}
          onClose={() => setOpen(null)}
          actions={
            <>
              <PixelButton tone="blue" aria-label={`${JOKERS[open].name} левее`} disabled={index === 0} onClick={() => onAct({ type: 'moveJoker', from: index, to: index - 1 })}>
                ◀
              </PixelButton>
              <PixelButton
                tone="orange"
                onClick={() => {
                  onAct({ type: 'sellJoker', jokerId: open });
                  setOpen(null);
                }}
              >
                Продать за ● {sellPrice(open)}
              </PixelButton>
              <PixelButton
                tone="blue"
                aria-label={`${JOKERS[open].name} правее`}
                disabled={index === jokers.length - 1}
                onClick={() => onAct({ type: 'moveJoker', from: index, to: index + 1 })}
              >
                ▶
              </PixelButton>
            </>
          }
        />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Rewrite `ShopScreen.tsx`** (the pack-opening overlay is added in Task 6):

```tsx
import { stageEnemy, stageLabel, type FightReward, type RunAction, type RunState, type ShopState } from '@game/durak';
import { useEffect, useState } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { OwnedJokers } from './shop/OwnedJokers';
import { PackArt } from './shop/PackArt';
import { PackCardFace } from './shop/PackCardFace';
import { ShopDetail, type ShopFocus } from './shop/ShopDetail';
import { ShopSlot } from './shop/ShopSlot';
import { PACK_NAMES, PACK_SIZE_NAMES, packCardTitle } from './shop/shopCopy';
import { coinSound, isNewError } from './sounds';
import './fight.css';
import './shop.css';

type ShopScreenProps = {
  readonly run: RunState;
  readonly shop: ShopState;
  readonly reward: FightReward;
  readonly error: string | null;
  readonly errorSeq: number;
  readonly onAct: (action: RunAction) => void;
  readonly onExit: () => void;
};

/** Balatro's shop: owned jokers on top, a «МАГАЗИН» panel with 2 items and 2 packs, reroll and next fight. */
export function ShopScreen({ run, shop, reward, error, errorSeq, onAct, onExit }: ShopScreenProps) {
  const { play } = useSettings();
  const [focus, setFocus] = useState<ShopFocus | null>(null);
  const previousCoins = usePrevious(run.coins);
  useEffect(() => {
    if (previousCoins === undefined) return;
    const sound = coinSound(previousCoins, run.coins);
    if (sound) play(sound);
  }, [run.coins, previousCoins, play]);
  const previousErrorSeq = usePrevious(errorSeq);
  useEffect(() => {
    if (isNewError(previousErrorSeq, errorSeq)) play('deny');
  }, [errorSeq, previousErrorSeq, play]);
  const next = stageEnemy(run, run.stage + 1);
  const { circle, fight } = stageLabel(run.stage + 1);

  return (
    <main className="screen shop" data-testid="shop">
      <header className="shop__side panel">
        <PixelButton tone="blue" small onClick={onExit}>
          Меню
        </PixelButton>
        <span className="shop__coins" aria-label={`Монеты: ${run.coins}`}>
          ● {run.coins}
        </span>
        <span className="shop__stage">
          Круг {circle} · бой {fight}
        </span>
        <span className="shop__reward" data-testid="shop-reward">
          Награда +{reward.total}
        </span>
      </header>

      <OwnedJokers jokers={run.jokers} onAct={onAct} />

      <section className="shop__panel panel" aria-label="Магазин">
        <h2 className="shop__head">Магазин</h2>
        <nav className="shop__bar">
          <PixelButton tone="red" onClick={() => onAct({ type: 'leaveShop' })}>
            Следующий бой: {next.name}
          </PixelButton>
          <PixelButton tone="green" onClick={() => onAct({ type: 'reroll' })}>
            Рерол ● {shop.rerollCost}
          </PixelButton>
        </nav>
        <div className="shop__items">
          {shop.items.map((item, index) => (
            <ShopSlot
              key={`item-${index}`}
              testId={`shop-item-${index}`}
              price={item?.price ?? null}
              label={item ? `${packCardTitle(item.card)}, ${item.price} монет` : 'Продано'}
              onOpen={() => setFocus({ kind: 'item', index })}
            >
              {item && <PackCardFace card={item.card} />}
            </ShopSlot>
          ))}
        </div>
        <div className="shop__packs">
          {shop.packs.map((pack, index) => (
            <ShopSlot
              key={`pack-${index}`}
              testId={`shop-pack-${index}`}
              price={pack?.price ?? null}
              label={pack ? `${PACK_NAMES[pack.kind]}, ${PACK_SIZE_NAMES[pack.size]}, ${pack.price} монет` : 'Продано'}
              onOpen={() => setFocus({ kind: 'pack', index })}
            >
              {pack && <PackArt kind={pack.kind} size={pack.size} />}
            </ShopSlot>
          ))}
        </div>
      </section>

      <p className={error ? 'shop__status panel' : 'shop__status'} role="status">
        {error ?? ''}
      </p>

      {focus && <ShopDetail focus={focus} shop={shop} run={run} onAct={onAct} onClose={() => setFocus(null)} />}
    </main>
  );
}
```

- [ ] **Step 5: Rewrite `shop.css`** (portrait first; landscape à la Balatro):

```css
/* ---------- shop: portrait ---------- */
.shop {
  --slot-h: clamp(92px, 16vh, 200px);
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas: 'side' 'owned' 'panel' 'status';
  align-content: start;
  gap: 8px;
  min-height: 100dvh;
  padding: 8px 10px calc(78px + env(safe-area-inset-bottom, 0px));
}
.shop__side { grid-area: side; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 6px 10px; }
.shop__coins { font-family: var(--font-head); color: var(--gold); font-size: 1.1rem; }
.shop__stage, .shop__reward { font-size: 0.85rem; opacity: 0.9; }
.shop__reward { margin-left: auto; }

.owned { grid-area: owned; display: flex; align-items: center; gap: 8px; padding: 6px 8px; }
.owned__list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; flex: 1; margin: 0; padding: 0; list-style: none; justify-items: center; }
.owned__ticket { padding: 0; border: 0; background: none; cursor: pointer; }
.owned__count { font-size: 0.8rem; opacity: 0.8; }

.shop__panel {
  grid-area: panel;
  display: grid;
  grid-template-areas: 'head' 'items' 'packs';
  gap: 10px;
  padding: 0 10px 12px;
  overflow: hidden;
}
.shop__head {
  grid-area: head;
  margin: 0 -10px;
  padding: 6px;
  border-bottom: 3px solid #000000;
  background: #c8323a;
  font-family: var(--font-head);
  font-size: 0.95rem;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 2px 2px 0 #000000;
}
.shop__items { grid-area: items; }
.shop__packs { grid-area: packs; }
.shop__items, .shop__packs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; justify-items: center; }

/* The bottom bar: both buttons in thumb reach. */
.shop__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 8px;
  padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 3px solid #000000;
  background: rgb(14 10 22 / 94%);
}
.shop__status { grid-area: status; margin: 0; min-height: 1.4em; text-align: center; }

/* ---------- slots, tags, cards, packs ---------- */
.shop-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.shop-slot--sold { justify-content: center; height: var(--slot-h); opacity: 0.5; font-size: 0.85rem; }
.shop-slot__face { padding: 0; border: 0; background: none; cursor: pointer; }
.price-tag {
  padding: 1px 8px;
  border: 2px solid #000000;
  border-radius: 4px 4px 8px 8px;
  background: #f4efe2;
  color: #1b1426;
  font-family: var(--font-head);
  font-size: 0.75rem;
  box-shadow: 0 2px 0 rgb(0 0 0 / 55%);
}

.pcard {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: calc(var(--slot-h) * 0.7);
  height: var(--slot-h);
  border: 3px solid #000000;
  border-radius: 8px;
  background: #2a2140;
  color: #ffffff;
  text-align: center;
}
.pcard--big { width: clamp(110px, 30vw, 170px); height: clamp(156px, 42vw, 240px); }
.pcard--playing { border: 0; background: none; }
.pcard--common { box-shadow: 0 0 0 2px #9a93a8, 0 0 10px rgb(154 147 168 / 55%); }
.pcard--rare { box-shadow: 0 0 0 3px #3a7bd5, 0 0 16px rgb(58 123 213 / 80%); }
.pcard--legendary { box-shadow: 0 0 0 3px #f5c542, 0 0 20px rgb(245 197 66 / 90%); }
.pcard--down { background: repeating-linear-gradient(45deg, #8e1f2c 0 6px, #b52a3a 6px 12px); box-shadow: none; }
.pcard--tarot { background: linear-gradient(180deg, #3b2a63, #1c1430); }
.pcard__numeral { font-family: var(--font-head); font-size: 0.7rem; color: var(--gold); }
.pcard__glyph { font-size: 2.2em; line-height: 1; }
.pcard__name { padding: 0 4px; font-size: 0.75rem; font-weight: 800; }
.pcard__art { width: 60%; image-rendering: pixelated; }

.pack {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  width: calc(var(--slot-h) * 0.72);
  height: var(--slot-h);
  padding: 6px 4px;
  overflow: hidden;
  border: 3px solid #000000;
  border-radius: 6px 6px 10px 10px;
  color: #ffffff;
  text-align: center;
  text-shadow: 1px 1px 0 #000000;
  box-shadow: 0 4px 0 rgb(0 0 0 / 55%);
}
.pack--jokers { background: linear-gradient(180deg, #8b4fd8, #3e1f73); }
.pack--arcana { background: linear-gradient(180deg, #2fb6a8, #135a55); }
.pack--deck { background: linear-gradient(180deg, #e2593f, #7a1f1f); }
.pack--mega { box-shadow: 0 0 0 3px #f5c542, 0 4px 0 rgb(0 0 0 / 55%); }
.pack__foil { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, rgb(255 255 255 / 18%) 0 3px, transparent 3px 12px); pointer-events: none; }
.pack__name { font-family: var(--font-head); font-size: 0.6rem; }
.pack__size { font-size: 0.75rem; font-weight: 800; }
.pack__count { font-size: 0.65rem; opacity: 0.9; }

/* ---------- detail sheet ---------- */
.sheet-backdrop { position: fixed; inset: 0; z-index: 30; display: flex; align-items: flex-end; justify-content: center; background: rgb(0 0 0 / 55%); }
.sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 520px;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-radius: 14px 14px 0 0;
  animation: sheet-up 0.2s ease-out;
}
.sheet__title { margin: 0; font-family: var(--font-head); font-size: 1rem; }
.sheet__subtitle, .sheet__text { margin: 0; text-align: center; }
.sheet__subtitle { font-size: 0.8rem; opacity: 0.8; }
.sheet__warning { margin: 0; padding: 6px 10px; border: 2px solid #000000; border-radius: 6px; background: #f39c32; color: #1b1426; font-weight: 800; }
.sheet__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
@keyframes sheet-up { from { transform: translateY(40%); opacity: 0; } }

/* ---------- shop: wide screens, Balatro layout ---------- */
@media (min-aspect-ratio: 5/4) {
  .shop {
    --slot-h: clamp(120px, 24vh, 240px);
    grid-template-columns: minmax(200px, 22vw) 1fr;
    grid-template-areas: 'side owned' 'side panel' 'side status';
    padding-bottom: 12px;
  }
  .shop__side { flex-direction: column; align-items: stretch; align-self: start; }
  .shop__reward { margin-left: 0; }
  .shop__panel { grid-template-columns: auto 1fr; grid-template-areas: 'head head' 'bar items' 'bar packs'; }
  .shop__bar { position: static; grid-area: bar; display: flex; flex-direction: column; justify-content: center; gap: 12px; padding: 0; border: 0; background: none; }
  .sheet-backdrop { align-items: center; }
  .sheet { border-radius: 14px; }
}
```

- [ ] **Step 6: Run to verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: all unit tests PASS, no type errors, build succeeds. (`e2e/jokers.spec.ts` and `e2e/landscape.spec.ts` shop tests are updated in Task 8.)

- [ ] **Step 7: Manual check** on the dev server (inject a v8 shop save from Task 8's fixture via the console, then «Продолжить забег»): portrait 375×667 and 412×860, wide 1280×800 — everything visible without scrolling, the sheet opens and buys. Ledger anything off.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/games/durak/shop apps/web/src/games/durak/ShopScreen.tsx apps/web/src/games/durak/shop.css
git commit -m "feat(web): Balatro-style shop — items, packs, price tags, detail sheet, owned jokers row"
```

---

### Task 6: Pack opening, tarot targets and the replacement confirm

**Files:**
- Create: `apps/web/src/games/durak/shop/opening.ts`, `apps/web/src/games/durak/shop/opening.test.ts`
- Create: `apps/web/src/games/durak/shop/PackOpening.tsx`, `TarotTargets.tsx`, `ConfirmReplace.tsx`, `TarotCastSheet.tsx`, `opening.css`
- Modify: `apps/web/src/games/durak/ShopScreen.tsx`, `apps/web/src/ui/sound.ts`

**Interfaces:**
- Consumes: Task 5 (`PackCardFace`, `PackArt`, `shopCopy`), engine (`OpenedPack`, `PackCard`, `conflictFor`, `targetsOk`, `TAROTS`, `MAX_JOKERS`, `sellPrice`, `packCardRarity`).
- Produces:

```ts
// opening.ts
export const TEAR_MS = 600; export const FLIP_STEP_MS = 250; export const FLIP_MS = 300;
export type RevealPlan = { readonly cardsAt: number; readonly flips: readonly number[]; readonly done: number };
export function revealSchedule(count: number, speed: number, reduced: boolean): RevealPlan;
export type Replacement = { readonly cardId: string; readonly from: EnhancementId; readonly to: EnhancementId };
export function replacementsFor(card: PackCard, targets: readonly string[], profile: DeckProfile): readonly Replacement[];
export function canTake(card: PackCard, targets: readonly string[], profile: DeckProfile, jokers: readonly JokerId[]): boolean;
// PackOpening.tsx
export function PackOpening(props: { opened: OpenedPack; profile: DeckProfile; jokers: readonly JokerId[]; speed: number; error?: string | null; onPick: (index: number, targets: readonly string[]) => void; onSkip: () => void; onSell: (jokerId: JokerId) => void }): JSX.Element;
// TarotCastSheet.tsx — the shelf tarot's sheet after purchase: hand, «Применить», «Пропустить»
export function TarotCastSheet(props: { cast: TarotCast; profile: DeckProfile; error?: string | null; onCast: (targets: readonly string[]) => void; onSkip: () => void }): JSX.Element;
// sound.ts SOUNDS gains: tear, reveal, revealRare, revealLegendary
```

- [ ] **Step 1: Write the failing test** — `opening.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canTake, replacementsFor, revealSchedule } from './opening';

const FULL = ['clubs', 'hearts', 'spades', 'diamonds', 'small'] as const;

describe('revealSchedule', () => {
  it('tears the pack, then flips one card after another', () => {
    expect(revealSchedule(3, 1, false)).toEqual({ cardsAt: 600, flips: [600, 850, 1100], done: 1400 });
  });
  it('divides every time by the speed', () => {
    const plan = revealSchedule(2, 2, false);
    expect(plan.cardsAt).toBe(300);
    expect(plan.flips).toEqual([300, 425]);
    expect(plan.done).toBe(575);
  });
  it('shows everything at once with reduced motion', () => {
    expect(revealSchedule(5, 1, true)).toEqual({ cardsAt: 0, flips: [0, 0, 0, 0, 0], done: 0 });
  });
});

describe('replacementsFor', () => {
  it('warns when a deck card would replace another enhancement', () => {
    expect(replacementsFor({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, [], { 'hearts-14': 'sharp' })).toEqual([
      { cardId: 'hearts-14', from: 'sharp', to: 'golden' },
    ]);
    expect(replacementsFor({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, [], {})).toEqual([]);
  });
  it('lists every differently enhanced target of an enhancement tarot', () => {
    expect(replacementsFor({ kind: 'tarot', tarotId: 'sun' }, ['a', 'b'], { a: 'coin', b: 'golden' })).toEqual([{ cardId: 'a', from: 'coin', to: 'golden' }]);
  });
  it('warns when Смерть overwrites the first card', () => {
    expect(replacementsFor({ kind: 'tarot', tarotId: 'death' }, ['a', 'b'], { a: 'coin', b: 'trump' })).toEqual([{ cardId: 'a', from: 'coin', to: 'trump' }]);
  });
  it('never warns for jokers or tarots without targets', () => {
    expect(replacementsFor({ kind: 'joker', jokerId: 'looter' }, [], {})).toEqual([]);
    expect(replacementsFor({ kind: 'tarot', tarotId: 'hermit' }, [], { a: 'coin' })).toEqual([]);
  });
});

describe('canTake', () => {
  it('needs a free slot for a joker', () => {
    expect(canTake({ kind: 'joker', jokerId: 'looter' }, [], {}, [])).toBe(true);
    expect(canTake({ kind: 'joker', jokerId: 'looter' }, [], {}, FULL)).toBe(false);
  });
  it('needs valid targets for a tarot', () => {
    expect(canTake({ kind: 'tarot', tarotId: 'sun' }, [], {}, [])).toBe(false);
    expect(canTake({ kind: 'tarot', tarotId: 'sun' }, ['a'], {}, [])).toBe(true);
    expect(canTake({ kind: 'tarot', tarotId: 'death' }, ['a', 'b'], {}, [])).toBe(false);
    expect(canTake({ kind: 'tarot', tarotId: 'hermit' }, [], {}, [])).toBe(true);
  });
  it('always takes a deck card', () => {
    expect(canTake({ kind: 'card', cardId: 'a', enhancement: 'golden' }, [], {}, FULL)).toBe(true);
  });
});
```

Run: `npx vitest run apps/web/src/games/durak/shop/opening.test.ts`
Expected: FAIL — cannot resolve `./opening`.

- [ ] **Step 2: Implement `opening.ts`:**

```ts
import { conflictFor, MAX_JOKERS, TAROTS, targetsOk, type DeckProfile, type EnhancementId, type JokerId, type PackCard } from '@game/durak';

/** Durations at x1; the animation speed setting divides them. */
export const TEAR_MS = 600;
export const FLIP_STEP_MS = 250;
export const FLIP_MS = 300;

export type RevealPlan = { readonly cardsAt: number; readonly flips: readonly number[]; readonly done: number };

/** When the torn pack shows its cards and when each one flips face up. */
export function revealSchedule(count: number, speed: number, reduced: boolean): RevealPlan {
  if (reduced) return { cardsAt: 0, flips: Array.from({ length: count }, () => 0), done: 0 };
  const cardsAt = TEAR_MS / speed;
  const flips = Array.from({ length: count }, (_, i) => cardsAt + (i * FLIP_STEP_MS) / speed);
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

export function canTake(card: PackCard, targets: readonly string[], profile: DeckProfile, jokers: readonly JokerId[]): boolean {
  if (card.kind === 'joker') return jokers.length < MAX_JOKERS;
  if (card.kind === 'tarot') return targetsOk(card.tarotId, targets, profile);
  return true;
}
```

Run: `npx vitest run apps/web/src/games/durak/shop/opening.test.ts` — Expected: PASS.

- [ ] **Step 3: Sounds** — add to `SOUNDS` in `ui/sound.ts` (before `win`):

```ts
  /** A booster pack tearing open. */
  tear: () => {
    whoosh(0.35, 0.16, 900);
    tone(220, 0.2, 'sine', 0.04, 330);
  },
  /** Card flips in a pack, by rarity. */
  reveal: () => tone(523, 0.12, 'sine', 0.04),
  revealRare: () => {
    tone(659, 0.16, 'triangle', 0.05);
    tone(988, 0.22, 'triangle', 0.04, undefined, 0.06);
  },
  revealLegendary: () => {
    tone(523, 0.18, 'triangle', 0.05);
    tone(659, 0.18, 'triangle', 0.05, undefined, 0.08);
    tone(784, 0.2, 'triangle', 0.05, undefined, 0.16);
    tone(1047, 0.34, 'triangle', 0.05, undefined, 0.24);
  },
```

- [ ] **Step 4: Components.** `TarotTargets.tsx`:

```tsx
import { ENHANCEMENTS, TAROTS, type DeckProfile, type TarotId } from '@game/durak';
import { PixelCard } from '../../../ui/PixelCard';
import { cardLabel, deckCard } from './shopCopy';

type TarotTargetsProps = {
  readonly tarotId: TarotId;
  readonly hand: readonly string[];
  readonly profile: DeckProfile;
  readonly picked: readonly string[];
  readonly onChange: (picked: readonly string[]) => void;
};

function hint(tarotId: TarotId): string {
  if (tarotId === 'death') return 'Выбери карту, затем карту, чьё усиление она получит';
  const max = TAROTS[tarotId].maxTargets;
  return max === 1 ? 'Выбери карту' : `Выбери до ${max} карт`;
}

/** The hand of 5 deck cards a tarot targets; picks are numbered in order (Смерть: 1 — target, 2 — source). */
export function TarotTargets({ tarotId, hand, profile, picked, onChange }: TarotTargetsProps) {
  const max = TAROTS[tarotId].maxTargets;
  const toggle = (cardId: string): void => {
    if (picked.includes(cardId)) onChange(picked.filter((id) => id !== cardId));
    else if (picked.length < max) onChange([...picked, cardId]);
  };
  return (
    <div className="targets" data-testid="tarot-targets">
      <p className="targets__hint">{hint(tarotId)}</p>
      <div className="targets__hand">
        {hand.map((cardId) => {
          const card = deckCard(cardId);
          if (!card) return null;
          const order = picked.indexOf(cardId);
          const current = profile[cardId];
          return (
            <button
              key={cardId}
              type="button"
              className={order >= 0 ? 'targets__card targets__card--picked' : 'targets__card'}
              aria-pressed={order >= 0}
              aria-label={`${cardLabel(cardId)}${current ? `, ${ENHANCEMENTS[current].name}` : ''}`}
              onClick={() => toggle(cardId)}
            >
              <PixelCard card={card} width={52} enhancement={current} idle={false} />
              {order >= 0 && <span className="targets__order">{order + 1}</span>}
              {current && <span className="targets__current">{ENHANCEMENTS[current].name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

`ConfirmReplace.tsx`:

```tsx
import { ENHANCEMENTS } from '@game/durak';
import { PixelButton } from '../../../ui/PixelButton';
import { PixelCard } from '../../../ui/PixelCard';
import type { Replacement } from './opening';
import { deckCard } from './shopCopy';

type ConfirmReplaceProps = { readonly changes: readonly Replacement[]; readonly onConfirm: () => void; readonly onCancel: () => void };

/** «Острая → Золотая»: the card as it is in the deck and as it will be, side by side. */
export function ConfirmReplace({ changes, onConfirm, onCancel }: ConfirmReplaceProps) {
  return (
    <div className="confirm-backdrop" onClick={(event) => event.stopPropagation()}>
      <div className="confirm panel" role="alertdialog" aria-label="Замена усиления">
        <h3 className="confirm__title">Заменить усиление?</h3>
        {changes.map((change) => {
          const card = deckCard(change.cardId);
          return (
            card && (
              <div key={change.cardId} className="confirm__row">
                <PixelCard card={card} width={56} enhancement={change.from} idle={false} />
                <span className="confirm__text">
                  {ENHANCEMENTS[change.from].name} → {ENHANCEMENTS[change.to].name}
                </span>
                <PixelCard card={card} width={56} enhancement={change.to} idle={false} />
              </div>
            )
          );
        })}
        <div className="confirm__actions">
          <PixelButton tone="orange" onClick={onConfirm}>
            Заменить
          </PixelButton>
          <PixelButton tone="blue" onClick={onCancel}>
            Отмена
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
```

`TarotCastSheet.tsx` — the sheet a shelf tarot turns into once bought (the purchase is final; «Пропустить» refunds nothing):

```tsx
import { TAROTS, targetsOk, type DeckProfile, type PackCard, type TarotCast } from '@game/durak';
import { useState } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { ConfirmReplace } from './ConfirmReplace';
import { DetailSheet } from './DetailSheet';
import { replacementsFor, type Replacement } from './opening';
import { PackCardFace } from './PackCardFace';
import { TarotTargets } from './TarotTargets';
import './opening.css';

type TarotCastSheetProps = {
  readonly cast: TarotCast;
  readonly profile: DeckProfile;
  readonly error?: string | null;
  readonly onCast: (targets: readonly string[]) => void;
  readonly onSkip: () => void;
};

/** A bought shelf tarot: pick targets from its hand and apply, or skip it — it is sold either way. */
export function TarotCastSheet({ cast, profile, error = null, onCast, onSkip }: TarotCastSheetProps) {
  const [targets, setTargets] = useState<readonly string[]>([]);
  const [confirm, setConfirm] = useState<readonly Replacement[] | null>(null);
  const tarot = TAROTS[cast.tarotId];
  const card: PackCard = { kind: 'tarot', tarotId: cast.tarotId };
  const apply = (): void => {
    const changes = replacementsFor(card, targets, profile);
    if (changes.length > 0) setConfirm(changes);
    else onCast(targets);
  };
  return (
    <>
      <DetailSheet
        title={tarot.name}
        subtitle="Куплено — выбери карты"
        text={tarot.description}
        warning={error}
        art={<PackCardFace card={card} size="big" />}
        onClose={null}
        actions={
          <>
            <PixelButton tone="orange" disabled={!targetsOk(cast.tarotId, targets, profile)} onClick={apply}>
              Применить
            </PixelButton>
            <PixelButton tone="blue" onClick={onSkip}>
              Пропустить
            </PixelButton>
          </>
        }
      >
        <TarotTargets tarotId={cast.tarotId} hand={cast.hand} profile={profile} picked={targets} onChange={setTargets} />
      </DetailSheet>
      {confirm && (
        <ConfirmReplace
          changes={confirm}
          onConfirm={() => {
            setConfirm(null);
            onCast(targets);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
```

`PackOpening.tsx`:

```tsx
import {
  conflictFor,
  ENHANCEMENTS,
  JOKERS,
  MAX_JOKERS,
  packCardRarity,
  sellPrice,
  TAROTS,
  type DeckProfile,
  type JokerId,
  type OpenedPack,
  type Rarity,
} from '@game/durak';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { useSettings } from '../../../ui/SettingsContext';
import type { SoundName } from '../../../ui/sound';
import { ConfirmReplace } from './ConfirmReplace';
import { canTake, FLIP_MS, replacementsFor, revealSchedule, type Replacement } from './opening';
import { PackArt } from './PackArt';
import { PackCardFace } from './PackCardFace';
import { PACK_NAMES, packCardText, packCardTitle } from './shopCopy';
import { TarotTargets } from './TarotTargets';
import './opening.css';

const RARITY_SOUND: Readonly<Record<Rarity, SoundName>> = { common: 'reveal', rare: 'revealRare', legendary: 'revealLegendary' };

type PackOpeningProps = {
  readonly opened: OpenedPack;
  readonly profile: DeckProfile;
  readonly jokers: readonly JokerId[];
  readonly speed: number;
  readonly error?: string | null;
  readonly onPick: (index: number, targets: readonly string[]) => void;
  readonly onSkip: () => void;
  readonly onSell: (jokerId: JokerId) => void;
};

/** Full-screen pack opening: the pack shakes and tears, cards flip by rarity, then the player takes or skips. */
export function PackOpening({ opened, profile, jokers, speed, error = null, onPick, onSkip, onSell }: PackOpeningProps) {
  const { play } = useSettings();
  const reduced = useReducedMotion() ?? false;
  const count = opened.cards.length;
  const [torn, setTorn] = useState(reduced);
  const [flipped, setFlipped] = useState(reduced ? count : 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [targets, setTargets] = useState<readonly string[]>([]);
  const [confirm, setConfirm] = useState<readonly Replacement[] | null>(null);

  // The reveal plays once per opening: the parent keys this component per pack, so a mega-pack pick does not replay it.
  useEffect(() => {
    const plan = revealSchedule(count, speed, reduced);
    if (!reduced) play('tear');
    const timers = [
      window.setTimeout(() => setTorn(true), plan.cardsAt),
      ...plan.flips.map((at, i) =>
        window.setTimeout(() => {
          setFlipped((n) => Math.max(n, i + 1));
          const card = opened.cards[i];
          if (card) play(RARITY_SOUND[packCardRarity(card)]);
        }, at),
      ),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealing = flipped < count;
  const revealAll = (): void => {
    setTorn(true);
    setFlipped(count);
  };
  const card = selected === null ? null : (opened.cards[selected] ?? null);
  const tarot = card?.kind === 'tarot' ? TAROTS[card.tarotId] : null;
  const ready = card !== null && canTake(card, targets, profile, jokers);
  const choose = (index: number): void => {
    setSelected(index);
    setTargets([]);
  };
  const commit = (): void => {
    if (selected === null) return;
    onPick(selected, targets);
    setSelected(null);
    setTargets([]);
  };
  const take = (): void => {
    if (!card) return;
    const changes = replacementsFor(card, targets, profile);
    if (changes.length > 0) setConfirm(changes);
    else commit();
  };

  return (
    <div
      className="opening"
      data-testid="pack-opening"
      role="dialog"
      aria-modal="true"
      aria-label={`Вскрытие: ${PACK_NAMES[opened.kind]}`}
      onClick={revealing ? revealAll : undefined}
    >
      <h2 className="opening__title">
        {PACK_NAMES[opened.kind]} · бери {opened.picksLeft}
      </h2>
      {!torn ? (
        <span className="opening__pack">
          <PackArt kind={opened.kind} />
        </span>
      ) : (
        <div className="opening__cards">
          {opened.cards.map((entry, i) =>
            entry ? (
              <button
                key={i}
                type="button"
                className={selected === i ? 'opening__card opening__card--selected' : 'opening__card'}
                aria-label={packCardTitle(entry)}
                aria-pressed={selected === i}
                disabled={i >= flipped}
                onClick={() => choose(i)}
              >
                <motion.span
                  className="opening__flip"
                  initial={reduced ? false : { rotateY: 180 }}
                  animate={{ rotateY: i < flipped ? 0 : 180 }}
                  transition={{ duration: FLIP_MS / 1000 / speed }}
                >
                  <PackCardFace card={entry} size="big" faceDown={i >= flipped} />
                </motion.span>
                {entry.kind === 'card' && i < flipped && conflictFor(profile, entry.cardId, entry.enhancement) && (
                  <span className="opening__conflict">В колоде: {ENHANCEMENTS[profile[entry.cardId] ?? entry.enhancement].name}</span>
                )}
              </button>
            ) : (
              <span key={i} className="opening__taken">
                Взято
              </span>
            ),
          )}
        </div>
      )}

      {card && <p className="opening__text">{packCardText(card)}</p>}
      {card?.kind === 'tarot' && tarot && tarot.maxTargets > 0 && (
        <TarotTargets tarotId={card.tarotId} hand={opened.hand} profile={profile} picked={targets} onChange={setTargets} />
      )}
      {card?.kind === 'joker' && jokers.length >= MAX_JOKERS && (
        <div className="opening__full">
          <p>Все {MAX_JOKERS} мест заняты — продай джокера:</p>
          {jokers.map((id) => (
            <PixelButton key={id} tone="blue" small onClick={() => onSell(id)}>
              {JOKERS[id].name} +{sellPrice(id)}
            </PixelButton>
          ))}
        </div>
      )}
      {error && (
        <p className="opening__error" role="alert">
          {error}
        </p>
      )}

      <div className="opening__bar">
        <PixelButton tone="orange" disabled={!ready || revealing} onClick={take}>
          {tarot && tarot.maxTargets > 0 ? 'Применить' : 'Взять'}
        </PixelButton>
        <PixelButton tone="blue" onClick={onSkip}>
          Пропустить
        </PixelButton>
      </div>

      {confirm && (
        <ConfirmReplace
          changes={confirm}
          onConfirm={() => {
            setConfirm(null);
            commit();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
```

`opening.css`:

```css
.opening {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 12px calc(84px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  background: rgb(8 6 14 / 90%);
}
.opening__title { margin: 0; font-family: var(--font-head); font-size: 1rem; text-align: center; }
.opening__pack { animation: pack-shake 0.6s ease-in-out infinite; }
.opening__pack .pack { width: 150px; height: 210px; }
.opening__cards { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; perspective: 800px; }
.opening__card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0; border: 0; background: none; cursor: pointer; }
.opening__card--selected .pcard { transform: translateY(-10px); outline: 3px solid #ffffff; outline-offset: 2px; }
.opening__flip { display: inline-block; transform-style: preserve-3d; }
.opening__conflict { padding: 1px 6px; border: 2px solid #000000; border-radius: 4px; background: #f39c32; color: #1b1426; font-size: 0.7rem; font-weight: 800; }
.opening__taken { display: flex; align-items: center; justify-content: center; width: clamp(110px, 30vw, 170px); height: clamp(156px, 42vw, 240px); border: 2px dashed rgb(255 255 255 / 30%); border-radius: 8px; opacity: 0.6; }
.opening__text { max-width: 420px; margin: 0; text-align: center; }
.opening__full { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; max-width: 460px; text-align: center; }
.opening__full p { width: 100%; margin: 0; }
.opening__error { margin: 0; color: #ff8a73; font-weight: 800; }
.opening__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 8px;
  padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 3px solid #000000;
  background: rgb(14 10 22 / 94%);
}
.targets { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.targets__hint { margin: 0; font-size: 0.85rem; }
.targets__hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.targets__card { position: relative; display: flex; flex-direction: column; align-items: center; padding: 0; border: 0; background: none; cursor: pointer; }
.targets__card--picked { transform: translateY(-8px); }
.targets__order { position: absolute; top: -6px; right: -6px; width: 1.4em; height: 1.4em; border: 2px solid #000000; border-radius: 50%; background: var(--gold); color: #1b1426; font-weight: 800; line-height: 1.2; }
.targets__current { font-size: 0.65rem; opacity: 0.85; }
.confirm-backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 60%); }
.confirm { display: flex; flex-direction: column; align-items: center; gap: 10px; max-width: 92vw; }
.confirm__title { margin: 0; font-family: var(--font-head); font-size: 0.95rem; }
.confirm__row { display: flex; align-items: center; gap: 10px; }
.confirm__text { font-weight: 800; }
.confirm__actions { display: flex; gap: 8px; }
@keyframes pack-shake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-4deg) scale(1.03); } 75% { transform: rotate(4deg) scale(1.03); } }
@media (prefers-reduced-motion: reduce) { .opening__pack { animation: none; } }
```

- [ ] **Step 5: Wire into `ShopScreen.tsx`.** Add imports `JOKERS` (from `@game/durak`), `useRef`, `PackOpening` from `./shop/PackOpening`, `TarotCastSheet` from `./shop/TarotCastSheet`; take `settings` from `useSettings()`; add inside the component:

```tsx
  const [notice, setNotice] = useState<string | null>(null);
  /**
   * Set when Колесо Фортуны is used — from a pack or straight off the shelf: the jokers count and the shop state it changes
   * (`opened` or `items`), to tell the result once the action lands.
   */
  const wheel = useRef<{ readonly jokers: number; readonly marker: unknown } | null>(null);
  const [openingKey, setOpeningKey] = useState(0);
  const previousOpened = usePrevious(shop.opened);
  useEffect(() => {
    if (shop.opened && !previousOpened) setOpeningKey((key) => key + 1);
  }, [shop.opened, previousOpened]);
  useEffect(() => {
    const pending = wheel.current;
    if (!pending || (pending.marker === shop.opened || pending.marker === shop.items)) return;
    wheel.current = null;
    const gained = run.jokers.length > pending.jokers ? run.jokers.at(-1) : undefined;
    setNotice(gained ? `Колесо Фортуны: ${JOKERS[gained].name}!` : 'Колесо Фортуны: не повезло');
  }, [shop.opened, shop.items, run.jokers]);

  const isWheel = (card: PackCard | null | undefined): boolean => card?.kind === 'tarot' && card.tarotId === 'wheel';
  const pick = (index: number, targets: readonly string[]): void => {
    if (isWheel(shop.opened?.cards[index])) wheel.current = { jokers: run.jokers.length, marker: shop.opened };
    setNotice(null);
    onAct({ type: 'pickFromPack', index, targets });
  };
  /** The detail sheet's actions; a shelf Колесо Фортуны is cast on purchase, so its result is told here too. */
  const actFromSheet = (action: RunAction): void => {
    if (action.type === 'buyItem' && isWheel(shop.items[action.index]?.card)) wheel.current = { jokers: run.jokers.length, marker: shop.items };
    setNotice(null);
    onAct(action);
  };
```

(import `type PackCard` from `@game/durak`). Pass `onAct={actFromSheet}` to `ShopDetail`. The status line becomes `{error ?? notice ?? ''}`. After the `ShopDetail` render add the shelf tarot sheet and the pack overlay:

```tsx
      {shop.casting && (
        <TarotCastSheet
          key={`${shop.casting.tarotId}-${shop.casting.hand.join()}`}
          cast={shop.casting}
          profile={run.profile}
          error={error}
          onCast={(targets) => onAct({ type: 'castTarot', targets })}
          onSkip={() => onAct({ type: 'skipTarot' })}
        />
      )}
      {shop.opened && (
        <PackOpening
          key={openingKey}
          opened={shop.opened}
          profile={run.profile}
          jokers={run.jokers}
          speed={settings.animSpeed}
          error={error}
          onPick={pick}
          onSkip={() => onAct({ type: 'skipPack' })}
          onSell={(jokerId) => onAct({ type: 'sellJoker', jokerId })}
        />
      )}
```

- [ ] **Step 6: Run to verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, no type errors, build succeeds.

- [ ] **Step 7: Manual check** (dev server, portrait 412×860 and wide 1280×800): buy a shelf tarot — the same sheet turns into the target hand, «Пропустить» keeps it sold; buy each pack kind; the pack shakes, cards flip with sounds; a tap during the reveal shows all; a tarot shows the hand and «Применить» enables only on valid targets; a deck card over another enhancement shows the label and the confirm; a full joker row shows the sell buttons. Ledger anything off.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/games/durak/shop apps/web/src/games/durak/ShopScreen.tsx apps/web/src/ui/sound.ts
git commit -m "feat(web): pack opening — tear, rarity flips, tarot targets, replacement confirm"
```

---

### Task 7: Lab tab «Паки»

**Files:**
- Create: `apps/web/src/lab/PacksTab.tsx`
- Modify: `apps/web/src/lab/CardLab.tsx` (tab entry and render), `apps/web/src/lab/lab.css`

**Interfaces:**
- Consumes: `PackOpening`, `PackCardFace`, `shopCopy` (Tasks 5–6); engine `rollPackCards`, `rollTarotHand`, `pickFromPack`, `PACK_KINDS`, `PACK_SIZES`, `PACK_SIZE_DEFS`, `TAROT_IDS`, `ShopState`, `Purse`; `SettingsProvider` from `ui/SettingsContext` — the lab opens through `?lab` in `main.tsx`, outside `App`, so it has no settings provider, and `PixelButton` / `PackOpening` need one.

- [ ] **Step 1: Implement `PacksTab.tsx`** (UI only; the e2e smoke in Task 8 covers it):

```tsx
import { createRng } from '@game/core';
import {
  ENHANCEMENTS,
  JOKERS,
  PACK_KINDS,
  PACK_SIZE_DEFS,
  PACK_SIZES,
  pickFromPack,
  rollPackCards,
  rollTarotHand,
  TAROT_IDS,
  type PackKind,
  type PackSize,
  type Purse,
  type ShopState,
} from '@game/durak';
import { useState } from 'react';
import { PackCardFace } from '../games/durak/shop/PackCardFace';
import { PackOpening } from '../games/durak/shop/PackOpening';
import { cardLabel, PACK_NAMES, PACK_SIZE_NAMES } from '../games/durak/shop/shopCopy';
import '../games/durak/shop.css';
import { PixelButton } from '../ui/PixelButton';
import { SettingsProvider, useSettings } from '../ui/SettingsContext';

type Bench = { readonly shop: ShopState; readonly purse: Purse };

const EMPTY_SHOP: ShopState = { items: [], packs: [], rerollCost: 0, opened: null, casting: null };

function PacksBench() {
  const { settings } = useSettings();
  const [kind, setKind] = useState<PackKind>('jokers');
  const [size, setSize] = useState<PackSize>('normal');
  const [seed, setSeed] = useState(1);
  const [bench, setBench] = useState<Bench>({ shop: EMPTY_SHOP, purse: { coins: 10, jokers: [], profile: {}, rng: createRng(1) } });

  const open = (): void => {
    const [cards, afterCards] = rollPackCards(createRng(seed), { kind, size, price: 0 }, bench.purse.jokers, bench.purse.profile);
    const [hand, rng] = rollTarotHand(afterCards);
    const opened = { kind, cards, picksLeft: PACK_SIZE_DEFS[size].picks, hand: kind === 'arcana' ? hand : [] };
    setBench({ shop: { ...EMPTY_SHOP, opened }, purse: { ...bench.purse, rng } });
    setSeed((value) => value + 1);
  };
  const pick = (index: number, targets: readonly string[]): void => {
    const result = pickFromPack(bench.shop, bench.purse, index, targets);
    if (result.ok) setBench(result.value);
  };
  const deck = Object.entries(bench.purse.profile)
    .map(([cardId, id]) => (id ? `${cardLabel(cardId)} ${ENHANCEMENTS[id].name}` : ''))
    .join(', ');

  return (
    <div className="lab__packs" data-testid="lab-packs">
      <div className="lab__row">
        <label>
          Тип{' '}
          <select value={kind} onChange={(event) => setKind(event.target.value as PackKind)}>
            {PACK_KINDS.map((id) => (
              <option key={id} value={id}>
                {PACK_NAMES[id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Размер{' '}
          <select value={size} onChange={(event) => setSize(event.target.value as PackSize)}>
            {PACK_SIZES.map((id) => (
              <option key={id} value={id}>
                {PACK_SIZE_NAMES[id]}
              </option>
            ))}
          </select>
        </label>
        <PixelButton tone="orange" onClick={open}>
          Вскрыть
        </PixelButton>
      </div>
      <p>
        Монеты: {bench.purse.coins} · Джокеры: {bench.purse.jokers.map((id) => JOKERS[id].name).join(', ') || '—'} · Колода: {deck || '—'}
      </p>
      <h3>Все таро</h3>
      <div className="lab__tarots">
        {TAROT_IDS.map((id) => (
          <PackCardFace key={id} card={{ kind: 'tarot', tarotId: id }} size="big" />
        ))}
      </div>
      {bench.shop.opened && (
        <PackOpening
          key={seed}
          opened={bench.shop.opened}
          profile={bench.purse.profile}
          jokers={bench.purse.jokers}
          speed={settings.animSpeed}
          onPick={pick}
          onSkip={() => setBench({ ...bench, shop: EMPTY_SHOP })}
          onSell={() => undefined}
        />
      )}
    </div>
  );
}

/** Open any pack type and size without a run; the picks land in a scratch purse shown below. */
export function PacksTab() {
  return (
    <SettingsProvider>
      <PacksBench />
    </SettingsProvider>
  );
}
```

In `CardLab.tsx`: add `{ id: 'packs', name: 'Паки' }` to `TABS`, `import { PacksTab } from './PacksTab';`, and `{tab === 'packs' && <PacksTab />}` next to `{tab === 'gallery' && <GalleryTab />}`. In `lab.css` add:

```css
.lab__packs { display: flex; flex-direction: column; gap: 12px; }
.lab__tarots { display: flex; flex-wrap: wrap; gap: 10px; }
.lab__row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
```

(If `.lab__row` already exists, skip that rule.)

- [ ] **Step 2: Run to verify**

Run: `npm run typecheck && npm run build`
Expected: no type errors, build succeeds. Manual: `http://localhost:5173/?lab`, tab «Паки», open each kind and size, take cards, see all 8 tarots with rarity frames.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lab
git commit -m "feat(web): lab tab Паки — open any pack, all tarots and rarity frames"
```

---

### Task 8: End-to-end tests

**Files:**
- Create: `e2e/shop.spec.ts`
- Modify: `e2e/jokers.spec.ts`, `e2e/landscape.spec.ts` (v8 fixtures, new shop UI)

**Interfaces:**
- Consumes: test ids and labels from Tasks 5–7: `shop`, `shop-item-<i>`, `shop-pack-<i>`, `detail-sheet`, `owned-jokers`, `pack-opening`, `tarot-targets`, `shop-reward`; buttons «Купить <title> за <price>», «Следующий бой: …», «Рерол ● N», «Взять», «Применить», «Пропустить», «Заменить», «Закрыть», «<name> левее/правее»; the lab at `/?lab` with tab «Паки».

- [ ] **Step 1: Write the e2e** — `e2e/shop.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const HAND = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];

function shopRun(shop: object, patch: object = {}) {
  return {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {},
    bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    ...patch,
  };
}

const BASE_SHOP = {
  items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }],
  packs: [{ kind: 'deck', size: 'normal', price: 4 }, { kind: 'jokers', size: 'normal', price: 4 }],
  rerollCost: 2,
  opened: null,
  casting: null,
};

async function openShop(page: Page, run: object): Promise<void> {
  await page.goto('/');
  await page.evaluate((saved) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 8, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('shop')).toBeVisible();
}

async function savedProfile(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('thegame.durak.run') ?? '{}').run.profile);
}

test('buying a joker item through the detail sheet', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  await expect(page.getByTestId('owned-jokers').getByRole('button', { name: 'Трефовик' })).toBeVisible();
  await expect(page.getByTestId('shop-item-0')).toContainText('Продано');
});

test('a bought pack opens, reveals its cards and a pick lands in the deck', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-pack-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Колода за 4' }).click();
  const opening = page.getByTestId('pack-opening');
  await expect(opening).toBeVisible();
  await opening.click({ position: { x: 5, y: 5 } });
  await opening.locator('.opening__card').first().click();
  await page.getByRole('button', { name: 'Взять' }).click();
  await expect(opening).toBeHidden();
  expect(Object.keys(await savedProfile(page))).toHaveLength(1);
});

test('a shelf tarot is bought, then applied right in its sheet — no pack screen', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-item-1').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Солнце за 3' }).click();
  await expect(page.getByTestId('pack-opening')).toHaveCount(0);
  const targets = page.getByTestId('tarot-targets');
  await expect(targets).toBeVisible();
  await targets.getByRole('button').nth(1).click();
  await targets.getByRole('button').nth(2).click();
  await page.getByRole('button', { name: 'Применить' }).click();
  await expect(targets).toHaveCount(0);
  expect(Object.values(await savedProfile(page))).toEqual(['golden', 'golden']);
  await expect(page.getByTestId('shop-item-1')).toContainText('Продано');
});

test('a bought shelf tarot survives a reload and can be skipped with the money spent', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-item-1').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Солнце за 3' }).click();
  await expect(page.getByTestId('tarot-targets')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('tarot-targets')).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await expect(page.getByTestId('tarot-targets')).toHaveCount(0);
  expect(await savedProfile(page)).toEqual({});
  await expect(page.getByLabel('Монеты: 27')).toBeVisible();
});

test('a tarot from an arcana pack is applied to chosen cards of the hand', async ({ page }) => {
  await openShop(page, shopRun({ ...BASE_SHOP, opened: { kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'sun' }], picksLeft: 1, hand: HAND } }));
  const opening = page.getByTestId('pack-opening');
  await opening.click({ position: { x: 5, y: 5 } });
  await opening.getByRole('button', { name: 'Солнце' }).click();
  const apply = page.getByRole('button', { name: 'Применить' });
  await expect(apply).toBeDisabled();
  const targets = page.getByTestId('tarot-targets');
  await targets.getByRole('button').nth(0).click();
  await targets.getByRole('button').nth(3).click();
  await apply.click();
  await expect(opening).toBeHidden();
  expect(await savedProfile(page)).toEqual({ 'clubs-6': 'golden', 'clubs-9': 'golden' });
});

test('replacing an enhancement asks first and shows both versions', async ({ page }) => {
  const opened = { kind: 'deck', cards: [{ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }], picksLeft: 1, hand: [] };
  await openShop(page, shopRun({ ...BASE_SHOP, opened }, { profile: { 'hearts-14': 'sharp' } }));
  const opening = page.getByTestId('pack-opening');
  await opening.click({ position: { x: 5, y: 5 } });
  await expect(opening).toContainText('В колоде: Острая');
  await opening.locator('.opening__card').first().click();
  await page.getByRole('button', { name: 'Взять' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Замена усиления' });
  await expect(dialog).toContainText('Острая → Золотая');
  await dialog.getByRole('button', { name: 'Заменить' }).click();
  await expect(opening).toBeHidden();
  expect(await savedProfile(page)).toEqual({ 'hearts-14': 'golden' });
});

test('a reload during an opening brings the same pack back', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-pack-1').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Пак джокеров за 4' }).click();
  await expect(page.getByTestId('pack-opening')).toBeVisible();
  const read = () => page.evaluate(() => JSON.parse(window.localStorage.getItem('thegame.durak.run') ?? '{}').run.phase.shop.opened);
  const before = await read();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('pack-opening')).toBeVisible();
  expect(await read()).toEqual(before);
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await expect(page.getByTestId('pack-opening')).toBeHidden();
});

for (const viewport of [
  { width: 375, height: 667 },
  { width: 1280, height: 800 },
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('the whole shop fits on screen without scrolling', async ({ page }) => {
      await openShop(page, shopRun(BASE_SHOP));
      for (const id of ['owned-jokers', 'shop-item-0', 'shop-item-1', 'shop-pack-0', 'shop-pack-1']) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box, id).not.toBeNull();
        expect(box!.y + box!.height, id).toBeLessThanOrEqual(viewport.height);
      }
      for (const name of [/Следующий бой/, /Рерол/]) {
        const box = await page.getByRole('button', { name }).boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      }
    });
  });
}

test('the lab opens any pack', async ({ page }) => {
  await page.goto('/?lab');
  await page.getByRole('button', { name: 'Паки' }).click();
  await page.getByRole('button', { name: 'Вскрыть' }).click();
  await expect(page.getByTestId('pack-opening')).toBeVisible();
});
```

In `e2e/jokers.spec.ts`: change `SHOP_RUN.phase.shop` to `{ items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }`, both `version: 7` → `version: 8`, `/В бой/` → `/Следующий бой/`, and rewrite «jokers can be bought and reordered in the shop»:

```ts
test('jokers can be bought and reordered in the shop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {},
      bosses: ['general', 'witch'],
      phase: {
        kind: 'shop',
        shop: { items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, null], packs: [null, null], rerollCost: 2, opened: null, casting: null },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 8, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  const owned = page.getByTestId('owned-jokers').locator('.owned__ticket');
  await expect(owned).toHaveCount(2);
  await expect(owned.nth(1)).toHaveAccessibleName('Трефовик');
  await owned.nth(1).click();
  await page.getByRole('button', { name: 'Трефовик левее' }).click();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(owned.nth(0)).toHaveAccessibleName('Трефовик');
});
```

In `e2e/landscape.spec.ts`: switch its shop fixture to v8 (`items` / `packs` / `opened` / `casting` like `BASE_SHOP` above, `version: 8`) and replace the final assertions with the Balatro layout check:

```ts
  const side = await page.getByTestId('shop-reward').boundingBox();
  const items = await page.getByTestId('shop-item-0').boundingBox();
  const owned = await page.getByTestId('owned-jokers').boundingBox();
  expect(side && items && side.x + side.width <= items.x).toBe(true);
  expect(owned && items && owned.y + owned.height <= items.y).toBe(true);
```

- [ ] **Step 2: Run to verify**

Run: `npx playwright test`
Expected: all e2e PASS — the 22 existing (with `jokers.spec.ts` and `landscape.spec.ts` updated) plus 10 in `shop.spec.ts`. Fix UI bugs the tests expose under systematic-debugging; ledger any test change.

- [ ] **Step 3: Commit**

```bash
git add e2e
git commit -m "test(e2e): shop items, pack opening, tarot targets, replacement confirm, reload, layouts"
```

---

### Task 9: Balance by simulation

**Files:**
- Modify (if numbers change): `packages/durak/src/shop/packs.ts`, `packages/durak/src/shop/tarot.ts`, related unit tests
- Modify: `docs/superpowers/specs/2026-10-09-shop-packs-design.md` (tuned numbers, status)

- [ ] **Step 1: Run the simulation**

Run: `npm run simulate 2>&1 | tail -12`
Expected: a report `runs N, full wins X%` and `stage 1..6` lines. Circle 1 cleared = the `reached` share of `stage 4`.

- [ ] **Step 2: Tune.** If circle 1 is cleared in more than 45% of runs, raise all pack prices by 1 (normal 5, big 7, mega 9) and `TAROT_PRICE` to 4; if below 35%, lower pack prices by 1. Re-run after each change, at most 3 rounds, keeping unit-test price expectations in sync (`shop.test.ts` `priceOf`, `packs.test.ts`; e2e fixtures carry explicit prices and need no change). Record each run's numbers in the ledger.

- [ ] **Step 3: Run the whole suite**

Run: `npm test && npm run typecheck && npx playwright test`
Expected: all PASS.

- [ ] **Step 4: Update the spec and commit** — set `Статус: реализован (план 4a)` and add under §8: «Итог настройки (дата): цены паков …, круг 1 — X%, весь забег — Y%».

```bash
git add packages/durak docs/superpowers/specs/2026-10-09-shop-packs-design.md
git commit -m "balance: tune shop and pack prices by simulation"
```
