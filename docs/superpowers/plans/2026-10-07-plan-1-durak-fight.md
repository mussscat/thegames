# План 1: Фундамент + играемый бой в дурака — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Монорепо с общим ядром, чистой логикой дурака (правила, HP, ИИ) и PWA, в которой можно сыграть полный бой «игрок vs ИИ» из нескольких раздач на телефоне и ноутбуке.

**Architecture:** Чистые TS-пакеты `@game/core` (RNG, карты, Result) и `@game/durak` (иммутабельный редьюсер `(state, actor, action) → Result<state>`, ИИ) без зависимостей от UI. React-приложение `@game/web` только рендерит состояние и отправляет действия; ход ИИ — эффект с задержкой. Пакеты подключаются как исходники TS через npm workspaces, без шага сборки.

**Tech Stack:** Node 22, npm workspaces, TypeScript (strict), Vitest + @vitest/coverage-v8, fast-check, React, Motion (`motion/react`), Vite, vite-plugin-pwa, @vite-pwa/assets-generator, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-card-roguelike-prototypes-design.md` (этот план покрывает этап 1 и базовую часть этапа 2: правила дурака, урон, ИИ, UI боя. Забег, система эффектов, контент, сохранение — План 2; TriPeaks — План 3; фидбэк/симуляция/полировка — План 4).

## Global Constraints

- PWA: браузер на телефоне (iOS/Android), планшете, ноутбуке; устанавливается; работает оффлайн.
- Вертикальная ориентация, одна рука; на широком экране поле по центру, `max-width: 480px`.
- Ввод: тап и клик мышью.
- Подкидной дурак 1×1, 36 карт (6–Т), рука 6, козырь — нижняя карта колоды; не больше 6 атакующих карт за отбой и не больше, чем было карт у защищающегося в начале отбоя.
- Урон проигравшему раздачу = число оставшихся у него карт; ничья — без урона; HP не ниже 0.
- Вся случайность — из RNG с сидом (mulberry32); состояние иммутабельное (`readonly`), редьюсеры — чистые функции.
- Игровые ошибки — только `Result`, без исключений; исключения — только для багов (ловит error boundary).
- Пакеты логики (`packages/*`) не импортируют React и браузерные API.
- Покрытие пакетов логики ≥ 80%.
- Тексты интерфейса — на русском. Ранги: 6–10, В, Д, К, Т.
- Коммиты — Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`), без attribution.

## Review Focus

1. Тап по карте во время хода ИИ (или двойной тап) → действие отклоняется `notYourTurn`, состояние не меняется. Тесты — Task 5.
2. Подкидывание сверх лимита (у защищающегося кончились карты) → `cannotThrowIn`. Тесты — Task 3 и Task 5.
3. Колода кончается посреди добора: атакующий добирает первым, козырь уходит последним, защитник может не добрать — без падений и потерь карт. Тест — Task 5; инвариант числа карт — Task 7.
4. Оба игрока вышли одновременно → ничья без урона; урон больше остатка HP → HP = 0, а не отрицательное. Тесты — Task 6.
5. Мусор в `?seed=` (`abc`, `-1`, `1.5`, огромное число) → случайный сид, игра не падает. Тесты — Task 8 (unit) и Task 10 (e2e).

---

## Файловая структура

```
package.json                 # корень: workspaces, скрипты
tsconfig.json                # общий strict-конфиг, noEmit
vitest.config.ts             # тесты + пороги покрытия
playwright.config.ts
.gitignore
README.md
e2e/durak.spec.ts
packages/core/
  package.json
  src/index.ts
  src/result.ts   (+ .test.ts)   # Result<T,E>, ok, err
  src/rng.ts      (+ .test.ts)   # mulberry32, nextFloat, nextInt, shuffle
  src/cards.ts    (+ .test.ts)   # Suit, Rank, Card, createDeck, подписи
packages/durak/
  package.json
  src/index.ts
  src/types.ts                   # PlayerId, RoundState, RoundAction, DurakError
  src/fixtures.ts                # хелперы для тестов (c, roundState, filler)
  src/rules.ts    (+ .test.ts)   # beats, currentActor, attackLimit, canThrowIn, legalActions
  src/deal.ts     (+ .test.ts)   # dealRound, firstAttacker
  src/reducer.ts  (+ .test.ts)   # applyRoundAction, добор, конец раздачи
  src/fight.ts    (+ .test.ts)   # FightState, HP, applyFightAction
  src/ai.ts       (+ .test.ts)   # chooseAction (stingy/aggressive)
  src/simulation.test.ts         # property-тесты ИИ vs ИИ
apps/web/
  package.json
  index.html
  vite.config.ts
  public/favicon.svg (+ сгенерированные png)
  src/main.tsx
  src/App.tsx
  src/ErrorBoundary.tsx
  src/seed.ts     (+ .test.ts)
  src/styles.css
  src/screens/MenuScreen.tsx
  src/components/CardView.tsx    # CardView, CardBack
  src/components/HpBar.tsx
  src/games/durak/useDurakFight.ts
  src/games/durak/messages.ts
  src/games/durak/status.ts (+ .test.ts)
  src/games/durak/DeckView.tsx
  src/games/durak/TableView.tsx
  src/games/durak/ActionBar.tsx
  src/games/durak/FightOverlay.tsx
  src/games/durak/DurakFightScreen.tsx
```

---

### Task 0: Ветка

- [ ] **Step 1: Создать ветку**

Run: `git checkout -b feat/durak-fight`
Expected: `Switched to a new branch 'feat/durak-fight'`

---

### Task 1: Каркас монорепо + `core`: Result и RNG

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `packages/core/package.json`, `packages/core/src/index.ts`, `packages/core/src/result.ts`, `packages/core/src/rng.ts`
- Test: `packages/core/src/result.test.ts`, `packages/core/src/rng.test.ts`

**Interfaces:**
- Produces:
  - `type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }`
  - `ok<T>(value: T): Result<T, never>`, `err<E>(error: E): Result<never, E>`
  - `type RngState = { readonly seed: number }`
  - `createRng(seed: number): RngState`
  - `nextFloat(state: RngState): readonly [number, RngState]` — значение в `[0, 1)`
  - `nextInt(state: RngState, maxExclusive: number): readonly [number, RngState]` — бросает `RangeError`, если `maxExclusive` не целое > 0
  - `shuffle<T>(items: readonly T[], state: RngState): readonly [readonly T[], RngState]`

- [ ] **Step 1: Создать корневые конфиги**

`package.json`:
```json
{
  "name": "thegame",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "typecheck": "tsc -p tsconfig.json",
    "dev": "npm run dev -w @game/web",
    "build": "npm run build -w @game/web",
    "e2e": "playwright test"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["packages/*/src", "apps/web/src"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts', '**/fixtures.ts', '**/types.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

`.gitignore`:
```
node_modules/
dist/
coverage/
test-results/
playwright-report/
dev-dist/
.DS_Store
```

`packages/core/package.json`:
```json
{
  "name": "@game/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

- [ ] **Step 2: Установить зависимости**

Run: `npm install -D typescript vitest @vitest/coverage-v8`
Expected: создан `package-lock.json`, `node_modules/@game/core` — симлинк на `packages/core`.

- [ ] **Step 3: Написать падающие тесты**

`packages/core/src/result.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { err, ok } from './result';

describe('result', () => {
  it('ok wraps a value', () => {
    expect(ok(5)).toEqual({ ok: true, value: 5 });
  });

  it('err wraps an error', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });
});
```

`packages/core/src/rng.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt, shuffle } from './rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const [a] = nextFloat(createRng(42));
    const [b] = nextFloat(createRng(42));
    expect(a).toBe(b);
  });

  it('gives different values for different seeds', () => {
    const [a] = nextFloat(createRng(1));
    const [b] = nextFloat(createRng(2));
    expect(a).not.toBe(b);
  });

  it('does not mutate the input state', () => {
    const state = createRng(7);
    nextFloat(state);
    expect(state).toEqual({ seed: 7 });
  });

  it('nextFloat stays in [0, 1)', () => {
    let rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextFloat(rng);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      rng = next;
    }
  });

  it('nextInt covers [0, max) with integers only', () => {
    const seen = new Set<number>();
    let rng = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextInt(rng, 5);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
      rng = next;
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('nextInt rejects non-positive or fractional max', () => {
    expect(() => nextInt(createRng(1), 0)).toThrow(RangeError);
    expect(() => nextInt(createRng(1), -3)).toThrow(RangeError);
    expect(() => nextInt(createRng(1), 2.5)).toThrow(RangeError);
  });

  it('shuffle keeps the same items and does not mutate input', () => {
    const items = Array.from({ length: 36 }, (_, i) => i);
    const copy = [...items];
    const [shuffled] = shuffle(items, createRng(5));
    expect(items).toEqual(copy);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it('shuffle is deterministic per seed and differs between seeds', () => {
    const items = Array.from({ length: 36 }, (_, i) => i);
    const [a] = shuffle(items, createRng(1));
    const [b] = shuffle(items, createRng(1));
    const [c] = shuffle(items, createRng(2));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
```

- [ ] **Step 4: Запустить тесты — убедиться, что падают**

Run: `npx vitest run packages/core`
Expected: FAIL — `Failed to resolve import "./result"` / `"./rng"`.

- [ ] **Step 5: Реализовать**

`packages/core/src/result.ts`:
```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

`packages/core/src/rng.ts`:
```ts
/** Seeded deterministic RNG (mulberry32). State is an immutable value. */
export type RngState = { readonly seed: number };

const UINT32_RANGE = 4294967296;
const MULBERRY_INCREMENT = 0x6d2b79f5;

export function createRng(seed: number): RngState {
  return { seed: seed >>> 0 };
}

export function nextFloat(state: RngState): readonly [number, RngState] {
  const nextSeed = (state.seed + MULBERRY_INCREMENT) >>> 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  return [value, { seed: nextSeed }];
}

export function nextInt(state: RngState, maxExclusive: number): readonly [number, RngState] {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`maxExclusive must be a positive integer, got ${maxExclusive}`);
  }
  const [value, next] = nextFloat(state);
  return [Math.floor(value * maxExclusive), next];
}

/** Fisher–Yates over a fresh copy; the input array is never touched. */
export function shuffle<T>(items: readonly T[], state: RngState): readonly [readonly T[], RngState] {
  const result = [...items];
  let rng = state;
  for (let i = result.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1);
    rng = next;
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return [result, rng];
}
```

`packages/core/src/index.ts`:
```ts
export * from './result';
export * from './rng';
```

- [ ] **Step 6: Запустить тесты и typecheck**

Run: `npx vitest run packages/core && npm run typecheck`
Expected: все тесты PASS, `tsc` без ошибок.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore packages/core
git commit -m "chore: scaffold npm workspaces monorepo with seeded rng and result"
```

---

### Task 2: `core`: карты

**Files:**
- Create: `packages/core/src/cards.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/cards.test.ts`

**Interfaces:**
- Produces:
  - `SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const`, `type Suit`
  - `RANKS = [2..14] as const`, `type Rank = 2 | 3 | … | 14` (11 = В, 12 = Д, 13 = К, 14 = Т)
  - `type Card = { readonly id: string; readonly suit: Suit; readonly rank: Rank }`, `id = "${suit}-${rank}"`
  - `makeCard(suit: Suit, rank: Rank): Card`
  - `createDeck(minRank?: Rank): readonly Card[]` — по умолчанию 52, `createDeck(6)` → 36
  - `rankLabel(rank: Rank): string`
  - `SUIT_SYMBOLS: Readonly<Record<Suit, string>>`, `SUIT_NAMES: Readonly<Record<Suit, string>>`
  - `isRedSuit(suit: Suit): boolean`

- [ ] **Step 1: Написать падающий тест**

`packages/core/src/cards.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createDeck, isRedSuit, makeCard, rankLabel, SUIT_NAMES, SUIT_SYMBOLS } from './cards';

describe('cards', () => {
  it('makeCard builds a stable id', () => {
    expect(makeCard('hearts', 12)).toEqual({ id: 'hearts-12', suit: 'hearts', rank: 12 });
  });

  it('createDeck() has 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id)).size).toBe(52);
  });

  it('createDeck(6) has 36 cards from six to ace', () => {
    const deck = createDeck(6);
    expect(deck).toHaveLength(36);
    expect(deck.every((card) => card.rank >= 6 && card.rank <= 14)).toBe(true);
  });

  it('rankLabel uses Russian face labels', () => {
    expect(rankLabel(6)).toBe('6');
    expect(rankLabel(10)).toBe('10');
    expect(rankLabel(11)).toBe('В');
    expect(rankLabel(12)).toBe('Д');
    expect(rankLabel(13)).toBe('К');
    expect(rankLabel(14)).toBe('Т');
  });

  it('suit helpers', () => {
    expect(SUIT_SYMBOLS.hearts).toBe('♥');
    expect(SUIT_NAMES.spades).toBe('пики');
    expect(isRedSuit('hearts')).toBe(true);
    expect(isRedSuit('diamonds')).toBe(true);
    expect(isRedSuit('clubs')).toBe(false);
    expect(isRedSuit('spades')).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run packages/core/src/cards.test.ts`
Expected: FAIL — `Failed to resolve import "./cards"`.

- [ ] **Step 3: Реализовать**

`packages/core/src/cards.ts`:
```ts
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
```

`packages/core/src/index.ts`:
```ts
export * from './cards';
export * from './result';
export * from './rng';
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run packages/core && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: add card model and deck creation to core"
```

---

### Task 3: `durak`: типы, фикстуры, правила

**Files:**
- Create: `packages/durak/package.json`, `packages/durak/src/index.ts`, `packages/durak/src/types.ts`, `packages/durak/src/fixtures.ts`, `packages/durak/src/rules.ts`
- Test: `packages/durak/src/rules.test.ts`

**Interfaces:**
- Consumes: `Card`, `Suit`, `Rank`, `makeCard`, `createDeck` из `@game/core`.
- Produces (`types.ts`):
  ```ts
  type PlayerId = 'player' | 'enemy';
  const HAND_SIZE = 6; const MAX_ATTACKS_PER_BOUT = 6;
  type TablePair = { readonly attack: Card; readonly defense: Card | null };
  type RoundOutcome = { readonly loser: PlayerId | null; readonly cardsLeft: number }; // loser null = ничья
  type Hands = Readonly<Record<PlayerId, readonly Card[]>>;
  type RoundState = {
    readonly deck: readonly Card[];      // [0] — верх, последний — козырная карта
    readonly trumpSuit: Suit;
    readonly trumpCard: Card;
    readonly hands: Hands;
    readonly table: readonly TablePair[];
    readonly attacker: PlayerId;
    readonly defenderTaking: boolean;
    readonly discardCount: number;
    readonly outcome: RoundOutcome | null;
  };
  type RoundAction =
    | { readonly type: 'attack'; readonly cardId: string }   // заход или подкидывание
    | { readonly type: 'defend'; readonly cardId: string }   // бьёт единственную неотбитую карту
    | { readonly type: 'take' }
    | { readonly type: 'endAttack' };                         // «Бито» или «Готово» после «Беру»
  type DurakError = 'roundOver' | 'notYourTurn' | 'cardNotInHand' | 'cannotThrowIn' | 'cannotBeat' | 'cannotEndAttack';
  opponentOf(id: PlayerId): PlayerId
  withHand(hands: Hands, id: PlayerId, cards: readonly Card[]): Hands
  ```
- Produces (`rules.ts`):
  - `beats(attack: Card, defense: Card, trump: Suit): boolean`
  - `defenderOf(state: RoundState): PlayerId`
  - `uncoveredPair(state: RoundState): TablePair | undefined`
  - `currentActor(state: RoundState): PlayerId | null` — `null` если раздача окончена; атакующий, если защитник «берёт» или на столе нет неотбитых; иначе защитник. Ход строго пошаговый: неотбитая карта на столе максимум одна (кроме фазы «беру»).
  - `attackLimit(state: RoundState): number` = `min(6, карт у защитника сейчас + число отбитых пар)`
  - `canThrowIn(state: RoundState, card: Card): boolean`
  - `legalActions(state: RoundState, actor: PlayerId): readonly RoundAction[]`
- Produces (`fixtures.ts`, только для тестов): `c(rank, suit)`, `filler(n, suit?)`, `roundState(overrides?)` (по умолчанию козырь — черви, атакует `player`, всё пусто).

- [ ] **Step 1: Создать пакет**

`packages/durak/package.json`:
```json
{
  "name": "@game/durak",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./fixtures": "./src/fixtures.ts"
  },
  "dependencies": { "@game/core": "*" }
}
```

Run: `npm install`
Expected: появился симлинк `node_modules/@game/durak`.

- [ ] **Step 2: Типы и фикстуры**

`packages/durak/src/types.ts`:
```ts
import type { Card, Suit } from '@game/core';

export type PlayerId = 'player' | 'enemy';

export const HAND_SIZE = 6;
export const MAX_ATTACKS_PER_BOUT = 6;

export type TablePair = { readonly attack: Card; readonly defense: Card | null };

/** loser === null means both players ran out of cards at once (draw). */
export type RoundOutcome = { readonly loser: PlayerId | null; readonly cardsLeft: number };

export type Hands = Readonly<Record<PlayerId, readonly Card[]>>;

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
};

export type RoundAction =
  | { readonly type: 'attack'; readonly cardId: string }
  | { readonly type: 'defend'; readonly cardId: string }
  | { readonly type: 'take' }
  | { readonly type: 'endAttack' };

export type DurakError =
  | 'roundOver'
  | 'notYourTurn'
  | 'cardNotInHand'
  | 'cannotThrowIn'
  | 'cannotBeat'
  | 'cannotEndAttack';

export function opponentOf(id: PlayerId): PlayerId {
  return id === 'player' ? 'enemy' : 'player';
}

export function withHand(hands: Hands, id: PlayerId, cards: readonly Card[]): Hands {
  return id === 'player' ? { ...hands, player: cards } : { ...hands, enemy: cards };
}
```

`packages/durak/src/fixtures.ts`:
```ts
import { createDeck, makeCard, type Card, type Rank, type Suit } from '@game/core';
import type { RoundState } from './types';

/** Test helpers. Not for production code. */
export const c = (rank: Rank, suit: Suit): Card => makeCard(suit, rank);

/** Up to 9 distinct cards of one suit (6..A), used to pad hands. */
export const filler = (count: number, suit: Suit = 'spades'): readonly Card[] =>
  createDeck(6)
    .filter((card) => card.suit === suit)
    .slice(0, count);

export function roundState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    deck: [],
    trumpSuit: 'hearts',
    trumpCard: c(6, 'hearts'),
    hands: { player: [], enemy: [] },
    table: [],
    attacker: 'player',
    defenderTaking: false,
    discardCount: 0,
    outcome: null,
    ...overrides,
  };
}
```

- [ ] **Step 3: Написать падающий тест правил**

`packages/durak/src/rules.test.ts`:
```ts
import { createDeck } from '@game/core';
import { describe, expect, it } from 'vitest';
import { c, filler, roundState } from './fixtures';
import { attackLimit, beats, canThrowIn, currentActor, legalActions } from './rules';

describe('beats', () => {
  it('higher card of the same suit beats lower', () => {
    expect(beats(c(7, 'clubs'), c(9, 'clubs'), 'hearts')).toBe(true);
  });
  it('lower card of the same suit does not beat', () => {
    expect(beats(c(9, 'clubs'), c(7, 'clubs'), 'hearts')).toBe(false);
  });
  it('any trump beats a non-trump', () => {
    expect(beats(c(14, 'clubs'), c(6, 'hearts'), 'hearts')).toBe(true);
  });
  it('a non-trump never beats a trump', () => {
    expect(beats(c(6, 'hearts'), c(14, 'clubs'), 'hearts')).toBe(false);
  });
  it('a different non-trump suit does not beat', () => {
    expect(beats(c(6, 'clubs'), c(14, 'spades'), 'hearts')).toBe(false);
  });
  it('higher trump beats lower trump', () => {
    expect(beats(c(7, 'hearts'), c(8, 'hearts'), 'hearts')).toBe(true);
  });
});

describe('currentActor', () => {
  it('attacker acts on an empty table', () => {
    expect(currentActor(roundState())).toBe('player');
  });
  it('defender acts when a card is uncovered', () => {
    const state = roundState({ table: [{ attack: c(7, 'clubs'), defense: null }] });
    expect(currentActor(state)).toBe('enemy');
  });
  it('attacker acts when everything is covered', () => {
    const state = roundState({ table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }] });
    expect(currentActor(state)).toBe('player');
  });
  it('attacker acts while the defender is taking', () => {
    const state = roundState({
      table: [{ attack: c(7, 'clubs'), defense: null }],
      defenderTaking: true,
    });
    expect(currentActor(state)).toBe('player');
  });
  it('nobody acts after the round is over', () => {
    expect(currentActor(roundState({ outcome: { loser: 'enemy', cardsLeft: 2 } }))).toBeNull();
  });
});

describe('attackLimit', () => {
  it('is capped at 6', () => {
    const state = roundState({ hands: { player: [], enemy: createDeck(6).slice(0, 10) } });
    expect(attackLimit(state)).toBe(6);
  });
  it('counts cards the defender had at the start of the bout', () => {
    const state = roundState({
      hands: { player: [], enemy: filler(2) },
      table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }],
    });
    expect(attackLimit(state)).toBe(3);
  });
});

describe('canThrowIn', () => {
  const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };

  it('any card can lead on an empty table', () => {
    expect(canThrowIn(roundState(), c(14, 'diamonds'))).toBe(true);
  });
  it('allows ranks that are already on the table', () => {
    const state = roundState({ hands: { player: [], enemy: filler(5) }, table: [covered] });
    expect(canThrowIn(state, c(7, 'diamonds'))).toBe(true);
    expect(canThrowIn(state, c(9, 'diamonds'))).toBe(true);
  });
  it('rejects ranks that are not on the table', () => {
    const state = roundState({ hands: { player: [], enemy: filler(5) }, table: [covered] });
    expect(canThrowIn(state, c(8, 'diamonds'))).toBe(false);
  });
  it('rejects throw-in when the defender has no cards left', () => {
    const state = roundState({ hands: { player: [], enemy: [] }, table: [covered] });
    expect(canThrowIn(state, c(7, 'diamonds'))).toBe(false);
  });
});

describe('legalActions', () => {
  it('defender may beat with suitable cards or take', () => {
    const state = roundState({
      hands: { player: [], enemy: [c(9, 'clubs'), c(6, 'diamonds'), c(6, 'hearts')] },
      table: [{ attack: c(7, 'clubs'), defense: null }],
    });
    expect(legalActions(state, 'enemy')).toEqual([
      { type: 'defend', cardId: 'clubs-9' },
      { type: 'defend', cardId: 'hearts-6' },
      { type: 'take' },
    ]);
  });
  it('leading attacker may play any card and cannot end', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs'), c(8, 'diamonds')], enemy: filler(6) } });
    expect(legalActions(state, 'player')).toEqual([
      { type: 'attack', cardId: 'clubs-7' },
      { type: 'attack', cardId: 'diamonds-8' },
    ]);
  });
  it('attacker after a cover may throw in matching ranks or end', () => {
    const state = roundState({
      hands: { player: [c(7, 'diamonds'), c(8, 'diamonds')], enemy: filler(5) },
      table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }],
    });
    expect(legalActions(state, 'player')).toEqual([
      { type: 'attack', cardId: 'diamonds-7' },
      { type: 'endAttack' },
    ]);
  });
  it('the player who is not acting has no actions', () => {
    expect(legalActions(roundState(), 'enemy')).toEqual([]);
  });
});
```

- [ ] **Step 4: Запустить — убедиться, что падает**

Run: `npx vitest run packages/durak`
Expected: FAIL — `Failed to resolve import "./rules"`.

- [ ] **Step 5: Реализовать правила**

`packages/durak/src/rules.ts`:
```ts
import type { Card, Suit } from '@game/core';
import {
  MAX_ATTACKS_PER_BOUT,
  opponentOf,
  type PlayerId,
  type RoundAction,
  type RoundState,
  type TablePair,
} from './types';

export function beats(attack: Card, defense: Card, trump: Suit): boolean {
  if (defense.suit === attack.suit) return defense.rank > attack.rank;
  return defense.suit === trump;
}

export function defenderOf(state: RoundState): PlayerId {
  return opponentOf(state.attacker);
}

export function uncoveredPair(state: RoundState): TablePair | undefined {
  return state.table.find((pair) => pair.defense === null);
}

export function currentActor(state: RoundState): PlayerId | null {
  if (state.outcome) return null;
  if (state.defenderTaking) return state.attacker;
  return uncoveredPair(state) ? defenderOf(state) : state.attacker;
}

/** Defender's hand size at bout start = cards in hand now + cards already used to cover. */
export function attackLimit(state: RoundState): number {
  const covered = state.table.filter((pair) => pair.defense !== null).length;
  return Math.min(MAX_ATTACKS_PER_BOUT, state.hands[defenderOf(state)].length + covered);
}

export function canThrowIn(state: RoundState, card: Card): boolean {
  if (state.table.length === 0) return true;
  if (state.table.length >= attackLimit(state)) return false;
  return state.table.some(
    (pair) => pair.attack.rank === card.rank || pair.defense?.rank === card.rank,
  );
}

export function legalActions(state: RoundState, actor: PlayerId): readonly RoundAction[] {
  if (currentActor(state) !== actor) return [];
  const hand = state.hands[actor];
  const pair = uncoveredPair(state);

  if (actor !== state.attacker && pair) {
    const defends = hand
      .filter((card) => beats(pair.attack, card, state.trumpSuit))
      .map((card): RoundAction => ({ type: 'defend', cardId: card.id }));
    return [...defends, { type: 'take' }];
  }

  const attacks = hand
    .filter((card) => canThrowIn(state, card))
    .map((card): RoundAction => ({ type: 'attack', cardId: card.id }));
  return state.table.length === 0 ? attacks : [...attacks, { type: 'endAttack' }];
}
```

`packages/durak/src/index.ts`:
```ts
export * from './rules';
export * from './types';
```

- [ ] **Step 6: Запустить тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package-lock.json packages/durak
git commit -m "feat: add durak types and move legality rules"
```

---

### Task 4: `durak`: раздача

**Files:**
- Create: `packages/durak/src/deal.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/deal.test.ts`

**Interfaces:**
- Consumes: `createDeck`, `shuffle`, `RngState`, `Suit` из `@game/core`; `HAND_SIZE`, `Hands`, `PlayerId`, `RoundState` из `./types`.
- Produces:
  - `dealRound(rng: RngState): readonly [RoundState, RngState]` — 36 карт, по 6 каждому по очереди (игрок первым), козырь — последняя карта колоды.
  - `firstAttacker(hands: Hands, trump: Suit): PlayerId` — у кого младший козырь; если козырей нет ни у кого — `player`.

- [ ] **Step 1: Написать падающий тест**

`packages/durak/src/deal.test.ts`:
```ts
import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { dealRound, firstAttacker } from './deal';
import { c } from './fixtures';

describe('dealRound', () => {
  const [round] = dealRound(createRng(7));

  it('deals six cards to each player and leaves 24 in the deck', () => {
    expect(round.hands.player).toHaveLength(6);
    expect(round.hands.enemy).toHaveLength(6);
    expect(round.deck).toHaveLength(24);
  });

  it('uses 36 unique cards', () => {
    const all = [...round.deck, ...round.hands.player, ...round.hands.enemy];
    expect(new Set(all.map((card) => card.id)).size).toBe(36);
  });

  it('takes the trump from the bottom card of the deck', () => {
    expect(round.trumpCard).toEqual(round.deck[round.deck.length - 1]);
    expect(round.trumpSuit).toBe(round.trumpCard.suit);
  });

  it('starts with an empty table and no outcome', () => {
    expect(round.table).toEqual([]);
    expect(round.defenderTaking).toBe(false);
    expect(round.discardCount).toBe(0);
    expect(round.outcome).toBeNull();
  });

  it('lets the holder of the lowest trump attack first', () => {
    expect(round.attacker).toBe(firstAttacker(round.hands, round.trumpSuit));
  });

  it('is deterministic per seed', () => {
    expect(dealRound(createRng(7))[0]).toEqual(round);
    expect(dealRound(createRng(8))[0]).not.toEqual(round);
  });
});

describe('firstAttacker', () => {
  it('picks the player with the lowest trump', () => {
    expect(firstAttacker({ player: [c(6, 'hearts')], enemy: [c(10, 'hearts')] }, 'hearts')).toBe('player');
    expect(firstAttacker({ player: [c(10, 'hearts')], enemy: [c(6, 'hearts')] }, 'hearts')).toBe('enemy');
  });
  it('picks the only player that has a trump', () => {
    expect(firstAttacker({ player: [c(14, 'clubs')], enemy: [c(13, 'hearts')] }, 'hearts')).toBe('enemy');
  });
  it('defaults to the player when nobody has a trump', () => {
    expect(firstAttacker({ player: [c(14, 'clubs')], enemy: [c(13, 'clubs')] }, 'hearts')).toBe('player');
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run packages/durak/src/deal.test.ts`
Expected: FAIL — `Failed to resolve import "./deal"`.

- [ ] **Step 3: Реализовать**

`packages/durak/src/deal.ts`:
```ts
import { createDeck, shuffle, type Card, type RngState, type Suit } from '@game/core';
import { HAND_SIZE, type Hands, type PlayerId, type RoundState } from './types';

const DURAK_MIN_RANK = 6;

export function firstAttacker(hands: Hands, trump: Suit): PlayerId {
  const lowestTrump = (cards: readonly Card[]): number =>
    Math.min(Infinity, ...cards.filter((card) => card.suit === trump).map((card) => card.rank));
  return lowestTrump(hands.enemy) < lowestTrump(hands.player) ? 'enemy' : 'player';
}

export function dealRound(rng: RngState): readonly [RoundState, RngState] {
  const [deck, nextRng] = shuffle(createDeck(DURAK_MIN_RANK), rng);
  const dealt = deck.slice(0, HAND_SIZE * 2);
  const rest = deck.slice(HAND_SIZE * 2);
  const hands: Hands = {
    player: dealt.filter((_, index) => index % 2 === 0),
    enemy: dealt.filter((_, index) => index % 2 === 1),
  };
  const trumpCard = rest[rest.length - 1] as Card;
  const round: RoundState = {
    deck: rest,
    trumpSuit: trumpCard.suit,
    trumpCard,
    hands,
    table: [],
    attacker: firstAttacker(hands, trumpCard.suit),
    defenderTaking: false,
    discardCount: 0,
    outcome: null,
  };
  return [round, nextRng];
}
```

`packages/durak/src/index.ts`:
```ts
export * from './deal';
export * from './rules';
export * from './types';
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: deal durak rounds from a seeded deck"
```

---

### Task 5: `durak`: редьюсер раздачи

**Files:**
- Create: `packages/durak/src/reducer.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/reducer.test.ts`

**Interfaces:**
- Consumes: `ok`, `err`, `Result`, `Card` из `@game/core`; `canThrowIn`, `beats`, `currentActor`, `defenderOf`, `uncoveredPair` из `./rules`; типы и `withHand`, `opponentOf`, `HAND_SIZE` из `./types`.
- Produces:
  - `applyRoundAction(state: RoundState, actor: PlayerId, action: RoundAction): Result<RoundState, DurakError>`
  - Поведение `endAttack`: если защитник «берёт», он забирает все карты со стола, атакующий остаётся атакующим; иначе стол уходит в сброс (`discardCount += карт на столе`), атакующим становится защитник. Затем добор до 6: сначала прежний атакующий, потом защитник. Затем проверка конца раздачи: колода пуста и у кого-то 0 карт.

- [ ] **Step 1: Написать падающий тест**

`packages/durak/src/reducer.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { c, filler, roundState } from './fixtures';
import { applyRoundAction } from './reducer';
import { currentActor } from './rules';
import type { RoundState } from './types';

function expectOk(result: ReturnType<typeof applyRoundAction>): RoundState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };
const uncovered = { attack: c(7, 'clubs'), defense: null };

describe('attack', () => {
  it('leads a card from hand onto the empty table', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' }));
    expect(next.table).toEqual([uncovered]);
    expect(next.hands.player).toEqual([]);
  });

  it('does not mutate the previous state', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    const snapshot = structuredClone(state);
    applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' });
    expect(state).toEqual(snapshot);
  });

  it('rejects a card that is not in hand', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    const result = applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-14' });
    expect(result).toEqual({ ok: false, error: 'cardNotInHand' });
  });

  it('rejects any action from the player whose turn it is not', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: [c(8, 'clubs')] } });
    const result = applyRoundAction(state, 'enemy', { type: 'attack', cardId: 'clubs-8' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('rejects a throw-in whose rank is not on the table', () => {
    const state = roundState({ hands: { player: [c(8, 'diamonds')], enemy: filler(5) }, table: [covered] });
    const result = applyRoundAction(state, 'player', { type: 'attack', cardId: 'diamonds-8' });
    expect(result).toEqual({ ok: false, error: 'cannotThrowIn' });
  });

  it('rejects a throw-in beyond the defender hand size', () => {
    const state = roundState({ hands: { player: [c(7, 'diamonds')], enemy: [] }, table: [covered] });
    const result = applyRoundAction(state, 'player', { type: 'attack', cardId: 'diamonds-7' });
    expect(result).toEqual({ ok: false, error: 'cannotThrowIn' });
  });

  it('the defender cannot attack while a card is uncovered', () => {
    const state = roundState({ hands: { player: filler(5), enemy: [c(8, 'clubs')] }, table: [uncovered] });
    const result = applyRoundAction(state, 'enemy', { type: 'attack', cardId: 'clubs-8' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });
});

describe('defend', () => {
  const state = roundState({
    hands: { player: filler(5), enemy: [c(9, 'clubs'), c(8, 'diamonds')] },
    table: [uncovered],
  });

  it('covers the uncovered card with a beating card', () => {
    const next = expectOk(applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'clubs-9' }));
    expect(next.table).toEqual([covered]);
    expect(next.hands.enemy).toEqual([c(8, 'diamonds')]);
  });

  it('rejects a card that does not beat', () => {
    const result = applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'diamonds-8' });
    expect(result).toEqual({ ok: false, error: 'cannotBeat' });
  });

  it('rejects a card that is not in hand', () => {
    const result = applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'clubs-14' });
    expect(result).toEqual({ ok: false, error: 'cardNotInHand' });
  });

  it('the attacker cannot defend', () => {
    const result = applyRoundAction(state, 'player', { type: 'defend', cardId: 'spades-6' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('the defender cannot end the attack', () => {
    const result = applyRoundAction(state, 'enemy', { type: 'endAttack' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });
});

describe('take', () => {
  it('lets the attacker throw in more, then gives everything to the defender', () => {
    const start = roundState({
      hands: { player: [c(7, 'spades'), c(14, 'clubs')], enemy: filler(5, 'diamonds') },
      table: [uncovered],
    });
    const taking = expectOk(applyRoundAction(start, 'enemy', { type: 'take' }));
    expect(taking.defenderTaking).toBe(true);
    expect(currentActor(taking)).toBe('player');

    const thrown = expectOk(applyRoundAction(taking, 'player', { type: 'attack', cardId: 'spades-7' }));
    const done = expectOk(applyRoundAction(thrown, 'player', { type: 'endAttack' }));

    expect(done.hands.enemy).toHaveLength(7);
    expect(done.hands.enemy).toEqual(expect.arrayContaining([c(7, 'clubs'), c(7, 'spades')]));
    expect(done.hands.player).toEqual([c(14, 'clubs')]);
    expect(done.attacker).toBe('player');
    expect(done.table).toEqual([]);
    expect(done.defenderTaking).toBe(false);
    expect(done.discardCount).toBe(0);
    expect(done.outcome).toBeNull();
  });

  it('a second take is rejected', () => {
    const taking = roundState({ hands: { player: filler(3), enemy: filler(3, 'diamonds') }, table: [uncovered], defenderTaking: true });
    expect(applyRoundAction(taking, 'enemy', { type: 'take' })).toEqual({ ok: false, error: 'notYourTurn' });
  });
});

describe('endAttack', () => {
  it('rejects ending with an empty table', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(3) } });
    expect(applyRoundAction(state, 'player', { type: 'endAttack' })).toEqual({ ok: false, error: 'cannotEndAttack' });
  });

  it('discards a fully covered table, swaps roles, attacker draws first', () => {
    const state = roundState({
      hands: { player: filler(5, 'spades'), enemy: filler(5, 'diamonds') },
      table: [covered],
      deck: [c(11, 'clubs'), c(12, 'clubs'), c(13, 'clubs')],
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.table).toEqual([]);
    expect(next.discardCount).toBe(2);
    expect(next.attacker).toBe('enemy');
    expect(next.hands.player).toHaveLength(6);
    expect(next.hands.player).toContainEqual(c(11, 'clubs'));
    expect(next.hands.enemy).toContainEqual(c(12, 'clubs'));
    expect(next.deck).toEqual([c(13, 'clubs')]);
  });

  it('when the deck runs short the attacker draws and the defender may get nothing', () => {
    const state = roundState({
      hands: { player: filler(5, 'spades'), enemy: filler(5, 'diamonds') },
      table: [covered],
      deck: [c(11, 'clubs')],
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.hands.player).toContainEqual(c(11, 'clubs'));
    expect(next.hands.enemy).toHaveLength(5);
    expect(next.deck).toEqual([]);
    expect(next.outcome).toBeNull();
  });
});

describe('round end', () => {
  it('the player out of cards wins; the other loses with the cards left', () => {
    const state = roundState({
      hands: { player: [], enemy: [c(10, 'spades'), c(11, 'spades')] },
      table: [covered],
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.outcome).toEqual({ loser: 'enemy', cardsLeft: 2 });
    expect(currentActor(next)).toBeNull();
  });

  it('both out of cards at once is a draw', () => {
    const state = roundState({ hands: { player: [], enemy: [] }, table: [covered] });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.outcome).toEqual({ loser: null, cardsLeft: 0 });
  });

  it('no outcome while the deck still has cards', () => {
    const state = roundState({ hands: { player: [], enemy: filler(2) }, table: [covered], deck: [c(11, 'clubs')] });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.outcome).toBeNull();
  });

  it('rejects any action after the round is over', () => {
    const state = roundState({ outcome: { loser: 'enemy', cardsLeft: 2 } });
    expect(applyRoundAction(state, 'player', { type: 'endAttack' })).toEqual({ ok: false, error: 'roundOver' });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run packages/durak/src/reducer.test.ts`
Expected: FAIL — `Failed to resolve import "./reducer"`.

- [ ] **Step 3: Реализовать**

`packages/durak/src/reducer.ts`:
```ts
import { err, ok, type Card, type Result } from '@game/core';
import { beats, canThrowIn, currentActor, defenderOf, uncoveredPair } from './rules';
import {
  HAND_SIZE,
  opponentOf,
  withHand,
  type DurakError,
  type PlayerId,
  type RoundAction,
  type RoundState,
} from './types';

type RoundResult = Result<RoundState, DurakError>;

export function applyRoundAction(state: RoundState, actor: PlayerId, action: RoundAction): RoundResult {
  if (state.outcome) return err('roundOver');
  if (currentActor(state) !== actor) return err('notYourTurn');
  switch (action.type) {
    case 'attack':
      return attack(state, actor, action.cardId);
    case 'defend':
      return defend(state, actor, action.cardId);
    case 'take':
      return take(state, actor);
    case 'endAttack':
      return endAttack(state, actor);
  }
}

function findCard(hand: readonly Card[], cardId: string): Card | undefined {
  return hand.find((card) => card.id === cardId);
}

function withoutCard(hand: readonly Card[], cardId: string): readonly Card[] {
  return hand.filter((card) => card.id !== cardId);
}

function attack(state: RoundState, actor: PlayerId, cardId: string): RoundResult {
  if (actor !== state.attacker) return err('notYourTurn');
  const card = findCard(state.hands[actor], cardId);
  if (!card) return err('cardNotInHand');
  if (!canThrowIn(state, card)) return err('cannotThrowIn');
  return ok({
    ...state,
    hands: withHand(state.hands, actor, withoutCard(state.hands[actor], cardId)),
    table: [...state.table, { attack: card, defense: null }],
  });
}

function defend(state: RoundState, actor: PlayerId, cardId: string): RoundResult {
  const pair = uncoveredPair(state);
  if (actor !== defenderOf(state) || !pair) return err('notYourTurn');
  const card = findCard(state.hands[actor], cardId);
  if (!card) return err('cardNotInHand');
  if (!beats(pair.attack, card, state.trumpSuit)) return err('cannotBeat');
  return ok({
    ...state,
    hands: withHand(state.hands, actor, withoutCard(state.hands[actor], cardId)),
    table: state.table.map((p) => (p === pair ? { ...p, defense: card } : p)),
  });
}

function take(state: RoundState, actor: PlayerId): RoundResult {
  if (actor !== defenderOf(state)) return err('notYourTurn');
  return ok({ ...state, defenderTaking: true });
}

function endAttack(state: RoundState, actor: PlayerId): RoundResult {
  if (actor !== state.attacker) return err('notYourTurn');
  if (state.table.length === 0) return err('cannotEndAttack');
  return ok(finishBout(state));
}

function finishBout(state: RoundState): RoundState {
  const defender = defenderOf(state);
  const tableCards = state.table.flatMap((pair) => (pair.defense ? [pair.attack, pair.defense] : [pair.attack]));
  const cleared: RoundState = state.defenderTaking
    ? { ...state, hands: withHand(state.hands, defender, [...state.hands[defender], ...tableCards]) }
    : { ...state, discardCount: state.discardCount + tableCards.length };
  const drawn = drawAll(cleared, state.attacker);
  return checkRoundEnd({
    ...drawn,
    table: [],
    defenderTaking: false,
    attacker: state.defenderTaking ? state.attacker : defender,
  });
}

function drawAll(state: RoundState, firstDrawer: PlayerId): RoundState {
  return [firstDrawer, opponentOf(firstDrawer)].reduce<RoundState>((current, id) => {
    const need = Math.max(0, HAND_SIZE - current.hands[id].length);
    return {
      ...current,
      deck: current.deck.slice(need),
      hands: withHand(current.hands, id, [...current.hands[id], ...current.deck.slice(0, need)]),
    };
  }, state);
}

function checkRoundEnd(state: RoundState): RoundState {
  if (state.deck.length > 0) return state;
  const playerCards = state.hands.player.length;
  const enemyCards = state.hands.enemy.length;
  if (playerCards > 0 && enemyCards > 0) return state;
  if (playerCards === 0 && enemyCards === 0) return { ...state, outcome: { loser: null, cardsLeft: 0 } };
  const loser: PlayerId = playerCards === 0 ? 'enemy' : 'player';
  return { ...state, outcome: { loser, cardsLeft: state.hands[loser].length } };
}
```

`packages/durak/src/index.ts`:
```ts
export * from './deal';
export * from './reducer';
export * from './rules';
export * from './types';
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: add immutable durak round reducer with draw and round end"
```

---

### Task 6: `durak`: бой с HP

**Files:**
- Create: `packages/durak/src/fight.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/fight.test.ts`

**Interfaces:**
- Consumes: `createRng`, `ok`, `err`, `Result`, `RngState` из `@game/core`; `dealRound` из `./deal`; `applyRoundAction` из `./reducer`; типы из `./types`.
- Produces:
  ```ts
  type FightConfig = { readonly seed: number; readonly playerHp: number; readonly enemyHp: number };
  const DEFAULT_FIGHT_CONFIG: { readonly playerHp: 15; readonly enemyHp: 10 };
  type FightState = {
    readonly round: RoundState;
    readonly hp: Readonly<Record<PlayerId, number>>;
    readonly maxHp: Readonly<Record<PlayerId, number>>;
    readonly rng: RngState;
    readonly roundNumber: number;   // с 1
    readonly winner: PlayerId | null;
  };
  type FightAction = RoundAction | { readonly type: 'nextRound' };
  type FightError = DurakError | 'fightOver' | 'roundInProgress';
  createFight(config: FightConfig): FightState
  applyFightAction(state: FightState, actor: PlayerId, action: FightAction): Result<FightState, FightError>
  ```

- [ ] **Step 1: Написать падающий тест**

`packages/durak/src/fight.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { applyFightAction, createFight, type FightState } from './fight';
import { c, roundState } from './fixtures';

function expectOk(result: ReturnType<typeof applyFightAction>): FightState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const base = createFight({ seed: 1, playerHp: 10, enemyHp: 10 });
const covered = { attack: c(7, 'clubs'), defense: c(9, 'clubs') };
const endingRound = roundState({
  hands: { player: [], enemy: [c(10, 'spades'), c(11, 'spades')] },
  table: [covered],
});

describe('createFight', () => {
  it('starts round 1 with full HP and no winner', () => {
    expect(base.hp).toEqual({ player: 10, enemy: 10 });
    expect(base.maxHp).toEqual({ player: 10, enemy: 10 });
    expect(base.roundNumber).toBe(1);
    expect(base.winner).toBeNull();
    expect(base.round.hands.player).toHaveLength(6);
  });
});

describe('applyFightAction', () => {
  it('the round loser takes damage equal to cards left', () => {
    const next = expectOk(applyFightAction({ ...base, round: endingRound }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 8 });
    expect(next.winner).toBeNull();
  });

  it('HP never goes below zero and the survivor wins', () => {
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round: endingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hp.enemy).toBe(0);
    expect(next.winner).toBe('player');
  });

  it('a drawn round deals no damage', () => {
    const drawRound = roundState({ hands: { player: [], enemy: [] }, table: [covered] });
    const next = expectOk(applyFightAction({ ...base, round: drawRound }, 'player', { type: 'endAttack' }));
    expect(next.hp).toEqual({ player: 10, enemy: 10 });
  });

  it('passes round errors through unchanged', () => {
    const result = applyFightAction({ ...base, round: roundState() }, 'enemy', { type: 'endAttack' });
    expect(result).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('nextRound is rejected while the round is in progress', () => {
    expect(applyFightAction(base, 'player', { type: 'nextRound' })).toEqual({ ok: false, error: 'roundInProgress' });
  });

  it('nextRound deals a fresh round after an outcome', () => {
    const ended = expectOk(applyFightAction({ ...base, round: endingRound }, 'player', { type: 'endAttack' }));
    const next = expectOk(applyFightAction(ended, 'player', { type: 'nextRound' }));
    expect(next.roundNumber).toBe(2);
    expect(next.round.outcome).toBeNull();
    expect(next.round.hands.player).toHaveLength(6);
    expect(next.rng).not.toEqual(ended.rng);
  });

  it('rejects everything after the fight is won', () => {
    const fight = { ...base, hp: { player: 10, enemy: 1 }, round: endingRound };
    const won = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(applyFightAction(won, 'player', { type: 'nextRound' })).toEqual({ ok: false, error: 'fightOver' });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run packages/durak/src/fight.test.ts`
Expected: FAIL — `Failed to resolve import "./fight"`.

- [ ] **Step 3: Реализовать**

`packages/durak/src/fight.ts`:
```ts
import { createRng, err, ok, type Result, type RngState } from '@game/core';
import { dealRound } from './deal';
import { applyRoundAction } from './reducer';
import { opponentOf, type DurakError, type PlayerId, type RoundAction, type RoundState } from './types';

export type FightConfig = { readonly seed: number; readonly playerHp: number; readonly enemyHp: number };

export const DEFAULT_FIGHT_CONFIG = { playerHp: 15, enemyHp: 10 } as const;

export type FightState = {
  readonly round: RoundState;
  readonly hp: Readonly<Record<PlayerId, number>>;
  readonly maxHp: Readonly<Record<PlayerId, number>>;
  readonly rng: RngState;
  readonly roundNumber: number;
  readonly winner: PlayerId | null;
};

export type FightAction = RoundAction | { readonly type: 'nextRound' };

export type FightError = DurakError | 'fightOver' | 'roundInProgress';

export function createFight(config: FightConfig): FightState {
  const [round, rng] = dealRound(createRng(config.seed));
  const hp = { player: config.playerHp, enemy: config.enemyHp };
  return { round, hp, maxHp: hp, rng, roundNumber: 1, winner: null };
}

export function applyFightAction(
  state: FightState,
  actor: PlayerId,
  action: FightAction,
): Result<FightState, FightError> {
  if (state.winner) return err('fightOver');
  if (action.type === 'nextRound') return nextRound(state);
  const result = applyRoundAction(state.round, actor, action);
  if (!result.ok) return result;
  return ok(resolveOutcome({ ...state, round: result.value }));
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng);
  return ok({ ...state, round, rng, roundNumber: state.roundNumber + 1 });
}

function resolveOutcome(state: FightState): FightState {
  const outcome = state.round.outcome;
  if (!outcome || outcome.loser === null) return state;
  const loser = outcome.loser;
  const remaining = Math.max(0, state.hp[loser] - outcome.cardsLeft);
  const hp = loser === 'player' ? { ...state.hp, player: remaining } : { ...state.hp, enemy: remaining };
  return { ...state, hp, winner: remaining === 0 ? opponentOf(loser) : null };
}
```

`packages/durak/src/index.ts`:
```ts
export * from './deal';
export * from './fight';
export * from './reducer';
export * from './rules';
export * from './types';
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: add durak fight with HP damage from leftover cards"
```

---

### Task 7: `durak`: ИИ + property-тесты

**Files:**
- Create: `packages/durak/src/ai.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/ai.test.ts`, `packages/durak/src/simulation.test.ts`

**Interfaces:**
- Consumes: `legalActions` из `./rules`; `applyRoundAction`; `dealRound`; `createFight`, `applyFightAction`.
- Produces:
  - `type AiStyle = 'stingy' | 'aggressive'` («Скупой» / «Агрессор»)
  - `chooseAction(state: RoundState, me: PlayerId, style: AiStyle): RoundAction | null` — всегда одно из `legalActions(state, me)`; `null`, если ходить не мне.
  - Эвристика: цена карты = ранг (+20, если козырь). Защита — самая дешёвая бьющая; козырь тратится, только если стиль `aggressive`, или в колоде ≤ 6 карт, или на столе ≥ 2 атакующих карт; иначе «Беру». Заход — самая дешёвая карта. Подкидывание — самая дешёвая подходящая: колода пуста → всегда; `aggressive` → некозырная или колода ≤ 6; `stingy` → только некозырная ранга ≤ В (11). Иначе `endAttack`.

- [ ] **Step 1: Установить fast-check**

Run: `npm install -D fast-check`

- [ ] **Step 2: Написать падающие тесты ИИ**

`packages/durak/src/ai.test.ts`:
```ts
import { createDeck } from '@game/core';
import { describe, expect, it } from 'vitest';
import { chooseAction } from './ai';
import { c, filler, roundState } from './fixtures';

const spadesDeck = createDeck(6).filter((card) => card.suit === 'spades');
const attackOn7 = [{ attack: c(7, 'clubs'), defense: null }];
const covered = [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }];

describe('chooseAction — defending', () => {
  it('beats with the cheapest non-trump card', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(9, 'clubs'), c(8, 'clubs'), c(6, 'hearts')] },
      table: attackOn7,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'defend', cardId: 'clubs-8' });
  });

  it('takes when nothing beats', () => {
    const state = roundState({ hands: { player: filler(5), enemy: [c(6, 'diamonds')] }, table: attackOn7, deck: spadesDeck });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'take' });
  });

  it('stingy keeps its trump early in the round', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(6, 'hearts'), c(8, 'diamonds')] },
      table: attackOn7,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'take' });
  });

  it('aggressive spends its trump', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(6, 'hearts'), c(8, 'diamonds')] },
      table: attackOn7,
      deck: spadesDeck,
    });
    expect(chooseAction(state, 'enemy', 'aggressive')).toEqual({ type: 'defend', cardId: 'hearts-6' });
  });

  it('stingy spends a trump late in the round', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(6, 'hearts'), c(8, 'diamonds')] },
      table: attackOn7,
      deck: [c(14, 'spades')],
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'defend', cardId: 'hearts-6' });
  });
});

describe('chooseAction — attacking', () => {
  it('leads with the cheapest non-trump card', () => {
    const state = roundState({ hands: { player: [c(10, 'clubs'), c(7, 'spades'), c(6, 'hearts')], enemy: filler(6, 'diamonds') } });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'spades-7' });
  });

  it('ends the attack when nothing can be thrown in', () => {
    const state = roundState({ hands: { player: [c(13, 'diamonds')], enemy: filler(5) }, table: covered, deck: spadesDeck });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'endAttack' });
  });

  it('stingy throws in a cheap matching card', () => {
    const state = roundState({ hands: { player: [c(9, 'diamonds')], enemy: filler(5) }, table: covered, deck: spadesDeck });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'diamonds-9' });
  });

  it('stingy does not throw in a trump while the deck has cards', () => {
    const state = roundState({ hands: { player: [c(7, 'hearts')], enemy: filler(5) }, table: covered, deck: spadesDeck });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'endAttack' });
  });

  it('throws in everything once the deck is empty', () => {
    const state = roundState({ hands: { player: [c(7, 'hearts')], enemy: filler(5) }, table: covered, deck: [] });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'hearts-7' });
  });

  it('returns null when it is not my turn', () => {
    expect(chooseAction(roundState(), 'enemy', 'stingy')).toBeNull();
  });
});
```

`packages/durak/src/simulation.test.ts`:
```ts
import { createRng } from '@game/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { chooseAction, type AiStyle } from './ai';
import { dealRound } from './deal';
import { applyFightAction, createFight, type FightAction, type FightState } from './fight';
import { applyRoundAction } from './reducer';
import { currentActor } from './rules';
import type { PlayerId, RoundState } from './types';

const DECK_SIZE = 36;
const MAX_ROUND_STEPS = 2_000;
const MAX_FIGHT_STEPS = 50_000;

const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const styleArb = fc.constantFrom<AiStyle>('stingy', 'aggressive');

function visibleCards(state: RoundState) {
  return [
    ...state.deck,
    ...state.hands.player,
    ...state.hands.enemy,
    ...state.table.flatMap((pair) => (pair.defense ? [pair.attack, pair.defense] : [pair.attack])),
  ];
}

describe('AI vs AI simulation', () => {
  it('every round ends, no card is lost or duplicated, AI only plays legal moves', () => {
    fc.assert(
      fc.property(seedArb, styleArb, styleArb, (seed, playerStyle, enemyStyle) => {
        const styles: Record<PlayerId, AiStyle> = { player: playerStyle, enemy: enemyStyle };
        let [state] = dealRound(createRng(seed));
        for (let step = 0; step < MAX_ROUND_STEPS && !state.outcome; step++) {
          const actor = currentActor(state);
          if (!actor) throw new Error('no actor in an unfinished round');
          const action = chooseAction(state, actor, styles[actor]);
          if (!action) throw new Error(`AI returned no action for ${actor}`);
          const result = applyRoundAction(state, actor, action);
          if (!result.ok) throw new Error(`illegal AI move ${JSON.stringify(action)}: ${result.error}`);
          state = result.value;
          const cards = visibleCards(state);
          expect(cards.length + state.discardCount).toBe(DECK_SIZE);
          expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
        }
        expect(state.outcome).not.toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  it('every fight ends with a winner and HP within bounds', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        let fight: FightState = createFight({ seed, playerHp: 15, enemyHp: 10 });
        for (let step = 0; step < MAX_FIGHT_STEPS && !fight.winner; step++) {
          const actor = currentActor(fight.round);
          const action: FightAction | null = actor ? chooseAction(fight.round, actor, 'stingy') : { type: 'nextRound' };
          if (!action) throw new Error('AI returned no action');
          const result = applyFightAction(fight, actor ?? 'player', action);
          if (!result.ok) throw new Error(`illegal move: ${result.error}`);
          fight = result.value;
          expect(fight.hp.player).toBeGreaterThanOrEqual(0);
          expect(fight.hp.enemy).toBeGreaterThanOrEqual(0);
        }
        expect(fight.winner).not.toBeNull();
      }),
      { numRuns: 50 },
    );
  });
});
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npx vitest run packages/durak/src/ai.test.ts packages/durak/src/simulation.test.ts`
Expected: FAIL — `Failed to resolve import "./ai"`.

- [ ] **Step 4: Реализовать ИИ**

`packages/durak/src/ai.ts`:
```ts
import type { Card } from '@game/core';
import { legalActions } from './rules';
import type { PlayerId, RoundAction, RoundState } from './types';

export type AiStyle = 'stingy' | 'aggressive';

const TRUMP_COST_PENALTY = 20;
const LATE_GAME_DECK_SIZE = 6;
const STINGY_MAX_THROW_RANK = 11;
const COSTLY_TAKE_TABLE_SIZE = 2;

const TAKE: RoundAction = { type: 'take' };
const END_ATTACK: RoundAction = { type: 'endAttack' };

type CardAction = Extract<RoundAction, { readonly cardId: string }>;
type Candidate = { readonly action: CardAction; readonly card: Card };

export function chooseAction(state: RoundState, me: PlayerId, style: AiStyle): RoundAction | null {
  const legal = legalActions(state, me);
  if (legal.length === 0) return null;
  const cheapest = cheapestCandidate(state, me, legal);
  if (me !== state.attacker) return chooseDefense(state, style, cheapest);
  if (state.table.length === 0) return cheapest ? cheapest.action : null;
  return cheapest && wantsToThrow(state, cheapest.card, style) ? cheapest.action : END_ATTACK;
}

function isTrump(state: RoundState, card: Card): boolean {
  return card.suit === state.trumpSuit;
}

function cardCost(state: RoundState, card: Card): number {
  return card.rank + (isTrump(state, card) ? TRUMP_COST_PENALTY : 0);
}

function cheapestCandidate(state: RoundState, me: PlayerId, legal: readonly RoundAction[]): Candidate | null {
  const hand = state.hands[me];
  const candidates = legal.flatMap((action): Candidate[] => {
    if (action.type !== 'attack' && action.type !== 'defend') return [];
    const card = hand.find((c) => c.id === action.cardId);
    return card ? [{ action, card }] : [];
  });
  const sorted = [...candidates].sort((a, b) => cardCost(state, a.card) - cardCost(state, b.card));
  return sorted[0] ?? null;
}

function chooseDefense(state: RoundState, style: AiStyle, best: Candidate | null): RoundAction {
  if (!best) return TAKE;
  return isTrump(state, best.card) && !shouldSpendTrump(state, style) ? TAKE : best.action;
}

function shouldSpendTrump(state: RoundState, style: AiStyle): boolean {
  return (
    style === 'aggressive' ||
    state.deck.length <= LATE_GAME_DECK_SIZE ||
    state.table.length >= COSTLY_TAKE_TABLE_SIZE
  );
}

function wantsToThrow(state: RoundState, card: Card, style: AiStyle): boolean {
  if (state.deck.length === 0) return true;
  if (style === 'aggressive') return !isTrump(state, card) || state.deck.length <= LATE_GAME_DECK_SIZE;
  return !isTrump(state, card) && card.rank <= STINGY_MAX_THROW_RANK;
}
```

`packages/durak/src/index.ts`:
```ts
export * from './ai';
export * from './deal';
export * from './fight';
export * from './reducer';
export * from './rules';
export * from './types';
```

- [ ] **Step 5: Запустить все тесты и покрытие**

Run: `npm run coverage && npm run typecheck`
Expected: все тесты PASS; пороги покрытия 80% соблюдены (иначе vitest завершится с ошибкой `ERROR: Coverage for ... does not meet global threshold`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json packages/durak
git commit -m "feat: add heuristic durak AI with property-based simulation tests"
```

---

### Task 8: Каркас web-приложения: Vite, React, PWA, меню, сид

**Files:**
- Create: `apps/web/package.json`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/public/favicon.svg`
- Create: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/ErrorBoundary.tsx`, `apps/web/src/seed.ts`, `apps/web/src/styles.css`, `apps/web/src/screens/MenuScreen.tsx`
- Modify: `tsconfig.json` (добавить `"types": ["vite/client"]`)
- Test: `apps/web/src/seed.test.ts`

**Interfaces:**
- Produces:
  - `parseSeed(raw: string | null): number | null` — только целые `0..4294967295` из цифр, иначе `null`
  - `randomSeed(): number`
  - `seedFromUrl(search: string): number` — `?seed=` или случайный
  - `App` с экраном `menu`; в Task 9 добавится экран `durak`.
  - `ErrorBoundary({ children, onReset })`

- [ ] **Step 1: Создать пакет приложения и установить зависимости**

`apps/web/package.json`:
```json
{
  "name": "@game/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview --host",
    "icons": "pwa-assets-generator --preset minimal-2023 public/favicon.svg"
  },
  "dependencies": {
    "@game/core": "*",
    "@game/durak": "*"
  }
}
```

Run:
```bash
npm install -w @game/web react react-dom motion
npm install -D vite @vitejs/plugin-react vite-plugin-pwa @vite-pwa/assets-generator @types/react @types/react-dom
```
Expected: зависимости установлены, `node_modules/@game/web` — симлинк.

В `tsconfig.json` внутрь `compilerOptions` добавить строку:
```json
    "types": ["vite/client"],
```

- [ ] **Step 2: Написать падающий тест сида**

`apps/web/src/seed.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseSeed, randomSeed, seedFromUrl } from './seed';

describe('parseSeed', () => {
  it('accepts non-negative uint32 integers', () => {
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('123')).toBe(123);
    expect(parseSeed('4294967295')).toBe(4294967295);
  });

  it.each([null, '', 'abc', '-1', '1.5', '1e3', ' 12', '4294967296', '99999999999999999999'])(
    'rejects %j',
    (raw) => {
      expect(parseSeed(raw)).toBeNull();
    },
  );
});

describe('seedFromUrl', () => {
  it('reads ?seed= when valid', () => {
    expect(seedFromUrl('?seed=42')).toBe(42);
  });

  it('falls back to a random uint32 when invalid or missing', () => {
    for (const search of ['', '?seed=abc', '?seed=-5']) {
      const seed = seedFromUrl(search);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(4294967295);
    }
  });
});

describe('randomSeed', () => {
  it('returns a uint32', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(4294967295);
  });
});
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npx vitest run apps/web`
Expected: FAIL — `Failed to resolve import "./seed"`.

- [ ] **Step 4: Реализовать сид**

`apps/web/src/seed.ts`:
```ts
const MAX_SEED = 0xffffffff;
const DIGITS_ONLY = /^\d+$/;

export function parseSeed(raw: string | null): number | null {
  if (raw === null || !DIGITS_ONLY.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value <= MAX_SEED ? value : null;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

export function seedFromUrl(search: string): number {
  return parseSeed(new URLSearchParams(search).get('seed')) ?? randomSeed();
}
```

Run: `npx vitest run apps/web`
Expected: PASS.

- [ ] **Step 5: HTML, Vite, PWA, иконка**

`apps/web/index.html`:
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#14532d" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <title>Карточный рогалик</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/vite.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Карточный рогалик',
        short_name: 'Карты',
        description: 'Прототипы карточных рогаликов: дурак и TriPeaks',
        lang: 'ru',
        theme_color: '#14532d',
        background_color: '#0b3320',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
```

`apps/web/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#14532d"/>
  <rect x="136" y="96" width="240" height="320" rx="28" fill="#ffffff"/>
  <path d="M256 352 C160 280 176 192 224 192 C244 192 256 208 256 224 C256 208 268 192 288 192 C336 192 352 280 256 352 Z" fill="#dc2626"/>
</svg>
```

Run: `npm run icons -w @game/web`
Expected: в `apps/web/public/` появились `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

- [ ] **Step 6: Стили, меню, error boundary, App, main**

`apps/web/src/styles.css`:
```css
:root {
  --felt: #14532d;
  --felt-dark: #0b3320;
  --accent: #facc15;
  --card-w: min(14vw, 64px);
  color-scheme: dark;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

* { box-sizing: border-box; }

html, body, #root { height: 100%; margin: 0; }

body {
  background: radial-gradient(circle at 50% 40%, var(--felt), var(--felt-dark));
  color: #f8fafc;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  user-select: none;
}

.screen {
  max-width: 480px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: max(12px, env(safe-area-inset-top)) 16px max(12px, env(safe-area-inset-bottom));
}

.menu { justify-content: center; text-align: center; }
.menu__title { font-size: 2rem; margin: 0; }
.menu__subtitle { margin: 0 0 24px; opacity: 0.7; }

.btn {
  font: inherit;
  font-size: 1.05rem;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgb(255 255 255 / 25%);
  background: rgb(255 255 255 / 8%);
  color: inherit;
  cursor: pointer;
}
.btn:disabled { opacity: 0.4; cursor: default; }
.btn--primary { background: var(--accent); color: #1c1917; border-color: transparent; font-weight: 600; }
.btn--small { padding: 6px 12px; font-size: 0.9rem; }
```

`apps/web/src/screens/MenuScreen.tsx`:
```tsx
type MenuScreenProps = { readonly onStartDurak: () => void };

export function MenuScreen({ onStartDurak }: MenuScreenProps) {
  return (
    <main className="screen menu">
      <h1 className="menu__title">Карточный рогалик</h1>
      <p className="menu__subtitle">Прототипы</p>
      <button type="button" className="btn btn--primary" onClick={onStartDurak}>
        Дурак
      </button>
      <button type="button" className="btn" disabled>
        TriPeaks — скоро
      </button>
    </main>
  );
}
```

`apps/web/src/ErrorBoundary.tsx`:
```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = { readonly children: ReactNode; readonly onReset: () => void };
type ErrorBoundaryState = { readonly failed: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ failed: false });
    this.props.onReset();
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen menu">
        <h1 className="menu__title">Что-то сломалось</h1>
        <button type="button" className="btn btn--primary" onClick={this.reset}>
          Вернуться в меню
        </button>
      </main>
    );
  }
}
```

`apps/web/src/App.tsx` (временная версия; в Task 9 будет заменена):
```tsx
import { ErrorBoundary } from './ErrorBoundary';
import { MenuScreen } from './screens/MenuScreen';

export function App() {
  return (
    <ErrorBoundary onReset={() => undefined}>
      <MenuScreen onStartDurak={() => undefined} />
    </ErrorBoundary>
  );
}
```

`apps/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Проверить сборку и PWA**

Run: `npm run typecheck && npm test && npm run build && ls apps/web/dist`
Expected: typecheck и тесты PASS; в `apps/web/dist` есть `index.html`, `manifest.webmanifest`, `sw.js`, `pwa-192x192.png`.

Run: `npm run dev` и открыть `http://localhost:5173`.
Expected: зелёный фон, заголовок «Карточный рогалик», кнопки «Дурак» и «TriPeaks — скоро» (неактивна). Остановить сервер.

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json package.json package-lock.json apps/web
git commit -m "feat: scaffold PWA web app with menu, error boundary and seed parsing"
```

---

### Task 9: UI боя в дурака

**Files:**
- Create: `apps/web/src/components/CardView.tsx`, `apps/web/src/components/HpBar.tsx`
- Create: `apps/web/src/games/durak/useDurakFight.ts`, `messages.ts`, `status.ts`, `DeckView.tsx`, `TableView.tsx`, `ActionBar.tsx`, `FightOverlay.tsx`, `DurakFightScreen.tsx`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/styles.css`
- Test: `apps/web/src/games/durak/status.test.ts`

**Interfaces:**
- Consumes: из `@game/durak` — `createFight`, `applyFightAction`, `chooseAction`, `currentActor`, `legalActions`, `DEFAULT_FIGHT_CONFIG`, типы `FightState`, `FightAction`, `FightError`, `RoundState`, `RoundOutcome`, `TablePair`, `AiStyle`; из `@game/durak/fixtures` (только тесты) — `roundState`, `c`, `filler`; из `@game/core` — `Card`, `rankLabel`, `isRedSuit`, `SUIT_SYMBOLS`, `SUIT_NAMES`; из `../seed` — `randomSeed`, `seedFromUrl`.
- Produces:
  - `statusText(state: FightState): string`
  - `errorMessage(error: FightError): string`
  - `useDurakFight(seed: number): { state; error: string | null; act(action: FightAction): void }`
  - `DurakFightScreen({ seed, onExit, onRestart })`
- Взаимодействие: тап по карте в свой ход → `defend` (если защищаешься) или `attack`. Кнопки: «Беру» (защита), «Бито» (все отбиты) / «Готово» (соперник берёт). Ход ИИ — через 700 мс. Подсвечиваются карты из `legalActions`. Тап по неподходящей карте → понятное сообщение в строке статуса.

- [ ] **Step 1: Написать падающий тест статуса**

`apps/web/src/games/durak/status.test.ts`:
```ts
import { createFight } from '@game/durak';
import { c, filler, roundState } from '@game/durak/fixtures';
import { describe, expect, it } from 'vitest';
import { statusText } from './status';

const base = createFight({ seed: 1, playerHp: 10, enemyHp: 10 });

describe('statusText', () => {
  it('asks the player to attack on an empty table', () => {
    const round = roundState({ hands: { player: filler(6), enemy: filler(6, 'diamonds') } });
    expect(statusText({ ...base, round })).toBe('Твой ход — атакуй');
  });

  it('asks the player to defend', () => {
    const round = roundState({ attacker: 'enemy', table: [{ attack: c(7, 'clubs'), defense: null }] });
    expect(statusText({ ...base, round })).toBe('Отбивайся или бери');
  });

  it('shows the enemy turn', () => {
    const round = roundState({ attacker: 'enemy' });
    expect(statusText({ ...base, round })).toBe('Ход соперника…');
  });

  it('prompts to throw in while the enemy is taking', () => {
    const round = roundState({ table: [{ attack: c(7, 'clubs'), defense: null }], defenderTaking: true });
    expect(statusText({ ...base, round })).toBe('Соперник берёт — подкинь ещё или нажми «Готово»');
  });

  it('prompts to throw in or finish after a cover', () => {
    const round = roundState({ table: [{ attack: c(7, 'clubs'), defense: c(9, 'clubs') }] });
    expect(statusText({ ...base, round })).toBe('Подкинь или нажми «Бито»');
  });

  it('reports the end of the fight', () => {
    expect(statusText({ ...base, winner: 'player' })).toBe('Бой окончен');
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run apps/web/src/games/durak/status.test.ts`
Expected: FAIL — `Failed to resolve import "./status"`.

- [ ] **Step 3: Реализовать статус и сообщения об ошибках**

`apps/web/src/games/durak/status.ts`:
```ts
import { currentActor, type FightState } from '@game/durak';

export function statusText(state: FightState): string {
  const { round } = state;
  if (state.winner) return 'Бой окончен';
  if (round.outcome) return 'Раздача окончена';
  if (currentActor(round) === 'enemy') {
    return round.defenderTaking ? 'Соперник подкидывает…' : 'Ход соперника…';
  }
  if (round.defenderTaking) return 'Соперник берёт — подкинь ещё или нажми «Готово»';
  if (round.attacker === 'enemy') return 'Отбивайся или бери';
  return round.table.length === 0 ? 'Твой ход — атакуй' : 'Подкинь или нажми «Бито»';
}
```

`apps/web/src/games/durak/messages.ts`:
```ts
import type { FightError } from '@game/durak';

const ERROR_MESSAGES: Readonly<Record<FightError, string>> = {
  roundOver: 'Раздача уже окончена',
  notYourTurn: 'Сейчас не твой ход',
  cardNotInHand: 'Этой карты нет в руке',
  cannotThrowIn: 'Эту карту нельзя подкинуть',
  cannotBeat: 'Эта карта не бьёт',
  cannotEndAttack: 'Сначала сходи картой',
  fightOver: 'Бой окончен',
  roundInProgress: 'Раздача ещё идёт',
};

export function errorMessage(error: FightError): string {
  return ERROR_MESSAGES[error];
}
```

Run: `npx vitest run apps/web`
Expected: PASS.

- [ ] **Step 4: Общие компоненты карт и HP**

`apps/web/src/components/CardView.tsx`:
```tsx
import { isRedSuit, rankLabel, SUIT_NAMES, SUIT_SYMBOLS, type Card } from '@game/core';
import { motion } from 'motion/react';

const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 35 } as const;

type CardViewProps = {
  readonly card: Card;
  readonly playable?: boolean;
  readonly trump?: boolean;
  readonly onTap?: () => void;
};

export function CardView({ card, playable = false, trump = false, onTap }: CardViewProps) {
  const classes = [
    'card',
    isRedSuit(card.suit) ? 'card--red' : 'card--black',
    playable ? 'card--playable' : '',
    trump ? 'card--trump' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      type="button"
      layoutId={card.id}
      transition={CARD_SPRING}
      className={classes}
      onClick={onTap}
      disabled={!onTap}
      aria-label={`${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`}
    >
      <span className="card__rank">{rankLabel(card.rank)}</span>
      <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </motion.button>
  );
}

type CardBackProps = { readonly layoutId?: string };

export function CardBack({ layoutId }: CardBackProps) {
  return <motion.div layoutId={layoutId} transition={CARD_SPRING} className="card card--back" aria-hidden="true" />;
}
```

`apps/web/src/components/HpBar.tsx`:
```tsx
import { motion } from 'motion/react';

type HpBarProps = { readonly label: string; readonly hp: number; readonly maxHp: number };

export function HpBar({ label, hp, maxHp }: HpBarProps) {
  const percent = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  return (
    <div className="hp" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
      <span className="hp__label">{label}</span>
      <div className="hp__track">
        <motion.div className="hp__fill" initial={false} animate={{ width: `${percent}%` }} />
      </div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Хук боя**

`apps/web/src/games/durak/useDurakFight.ts`:
```ts
import {
  applyFightAction,
  chooseAction,
  createFight,
  currentActor,
  DEFAULT_FIGHT_CONFIG,
  type AiStyle,
  type FightAction,
  type FightState,
} from '@game/durak';
import { useEffect, useState } from 'react';
import { errorMessage } from './messages';

const ENEMY_DELAY_MS = 700;
const ENEMY_STYLE: AiStyle = 'stingy';

export type DurakFight = {
  readonly state: FightState;
  readonly error: string | null;
  readonly act: (action: FightAction) => void;
};

export function useDurakFight(seed: number): DurakFight {
  const [state, setState] = useState(() => createFight({ seed, ...DEFAULT_FIGHT_CONFIG }));
  const [error, setError] = useState<string | null>(null);

  const act = (action: FightAction): void => {
    const result = applyFightAction(state, 'player', action);
    if (result.ok) {
      setState(result.value);
      setError(null);
    } else {
      setError(errorMessage(result.error));
    }
  };

  useEffect(() => {
    if (state.winner || currentActor(state.round) !== 'enemy') return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseAction(state.round, 'enemy', ENEMY_STYLE);
      if (!action) return;
      const result = applyFightAction(state, 'enemy', action);
      if (result.ok) setState(result.value);
      else console.error('AI chose an illegal action', { action, error: result.error });
    }, ENEMY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  return { state, error, act };
}
```

- [ ] **Step 6: Части экрана боя**

`apps/web/src/games/durak/DeckView.tsx`:
```tsx
import { SUIT_SYMBOLS } from '@game/core';
import type { RoundState } from '@game/durak';
import { CardBack, CardView } from '../../components/CardView';

export function DeckView({ round }: { readonly round: RoundState }) {
  return (
    <div className="deck" data-testid="deck">
      {round.deck.length > 1 && <CardBack />}
      {round.deck.length > 0 && <CardView card={round.trumpCard} trump />}
      <span className="deck__count">{round.deck.length > 0 ? `Колода: ${round.deck.length}` : 'Колода пуста'}</span>
      <span className="deck__trump">Козырь {SUIT_SYMBOLS[round.trumpSuit]}</span>
    </div>
  );
}
```

`apps/web/src/games/durak/TableView.tsx`:
```tsx
import type { TablePair } from '@game/durak';
import { CardView } from '../../components/CardView';

export function TableView({ table }: { readonly table: readonly TablePair[] }) {
  return (
    <div className="table" data-testid="table">
      {table.map((pair) => (
        <div key={pair.attack.id} className="table__pair">
          <CardView card={pair.attack} />
          {pair.defense && (
            <div className="table__defense">
              <CardView card={pair.defense} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

`apps/web/src/games/durak/ActionBar.tsx`:
```tsx
import type { FightAction, RoundState } from '@game/durak';

type ActionBarProps = {
  readonly round: RoundState;
  readonly myTurn: boolean;
  readonly onAct: (action: FightAction) => void;
};

export function ActionBar({ round, myTurn, onAct }: ActionBarProps) {
  if (!myTurn || (round.attacker === 'player' && round.table.length === 0)) {
    return <div className="actions" />;
  }
  if (round.attacker === 'enemy') {
    return (
      <div className="actions">
        <button type="button" className="btn" onClick={() => onAct({ type: 'take' })}>
          Беру
        </button>
      </div>
    );
  }
  return (
    <div className="actions">
      <button type="button" className="btn btn--primary" onClick={() => onAct({ type: 'endAttack' })}>
        {round.defenderTaking ? 'Готово' : 'Бито'}
      </button>
    </div>
  );
}
```

`apps/web/src/games/durak/FightOverlay.tsx`:
```tsx
import type { FightState, RoundOutcome } from '@game/durak';

type FightOverlayProps = {
  readonly state: FightState;
  readonly onNextRound: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
};

function roundTitle(outcome: RoundOutcome): string {
  if (outcome.loser === null) return 'Ничья';
  return outcome.loser === 'player' ? 'Ты остался в дураках' : 'Соперник в дураках';
}

function roundDetails(outcome: RoundOutcome): string {
  if (outcome.loser === null) return 'Оба вышли одновременно — урона нет';
  return outcome.loser === 'player'
    ? `Ты получаешь ${outcome.cardsLeft} урона`
    : `Соперник получает ${outcome.cardsLeft} урона`;
}

export function FightOverlay({ state, onNextRound, onRestart, onExit }: FightOverlayProps) {
  if (state.winner) {
    return (
      <div className="overlay" role="dialog" aria-modal="true">
        <div className="overlay__panel">
          <h2>{state.winner === 'player' ? 'Победа!' : 'Поражение'}</h2>
          <p>Раздач сыграно: {state.roundNumber}</p>
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            Ещё бой
          </button>
          <button type="button" className="btn" onClick={onExit}>
            В меню
          </button>
        </div>
      </div>
    );
  }
  const outcome = state.round.outcome;
  if (!outcome) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlay__panel">
        <h2>{roundTitle(outcome)}</h2>
        <p>{roundDetails(outcome)}</p>
        <button type="button" className="btn btn--primary" onClick={onNextRound}>
          Следующая раздача
        </button>
      </div>
    </div>
  );
}
```

`apps/web/src/games/durak/DurakFightScreen.tsx`:
```tsx
import type { Card } from '@game/core';
import { currentActor, legalActions } from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { CardBack, CardView } from '../../components/CardView';
import { HpBar } from '../../components/HpBar';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { FightOverlay } from './FightOverlay';
import { statusText } from './status';
import { TableView } from './TableView';
import { useDurakFight } from './useDurakFight';

type DurakFightScreenProps = {
  readonly seed: number;
  readonly onExit: () => void;
  readonly onRestart: () => void;
};

export function DurakFightScreen({ seed, onExit, onRestart }: DurakFightScreenProps) {
  const { state, error, act } = useDurakFight(seed);
  const { round } = state;
  const myTurn = !state.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const playableIds = new Set(
    legalActions(round, 'player').flatMap((action) => ('cardId' in action ? [action.cardId] : [])),
  );

  const onCardTap = (card: Card): void =>
    act(defending ? { type: 'defend', cardId: card.id } : { type: 'attack', cardId: card.id });

  return (
    <LayoutGroup>
      <main className="screen fight">
        <header className="fight__header">
          <button type="button" className="btn btn--small" onClick={onExit}>
            Меню
          </button>
          <span className="fight__round">Раздача {state.roundNumber}</span>
        </header>

        <HpBar label="Соперник" hp={state.hp.enemy} maxHp={state.maxHp.enemy} />
        <div className="hand hand--enemy" data-testid="enemy-hand">
          {round.hands.enemy.map((card) => (
            <CardBack key={card.id} layoutId={card.id} />
          ))}
        </div>

        <div className="fight__middle">
          <DeckView round={round} />
          <TableView table={round.table} />
        </div>

        <p className="fight__status" role="status">
          {error ?? statusText(state)}
        </p>
        <ActionBar round={round} myTurn={myTurn} onAct={act} />

        <div className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand">
          {round.hands.player.map((card) => (
            <CardView
              key={card.id}
              card={card}
              playable={myTurn && playableIds.has(card.id)}
              trump={card.suit === round.trumpSuit}
              onTap={myTurn ? () => onCardTap(card) : undefined}
            />
          ))}
        </div>
        <HpBar label="Ты" hp={state.hp.player} maxHp={state.maxHp.player} />
      </main>
      <FightOverlay state={state} onNextRound={() => act({ type: 'nextRound' })} onRestart={onRestart} onExit={onExit} />
    </LayoutGroup>
  );
}
```

- [ ] **Step 7: Подключить экран в App**

`apps/web/src/App.tsx` (полная замена):
```tsx
import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DurakFightScreen } from './games/durak/DurakFightScreen';
import { MenuScreen } from './screens/MenuScreen';
import { randomSeed, seedFromUrl } from './seed';

type Screen = { readonly name: 'menu' } | { readonly name: 'durak'; readonly seed: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const toMenu = (): void => setScreen({ name: 'menu' });

  return (
    <ErrorBoundary onReset={toMenu}>
      {screen.name === 'durak' ? (
        <DurakFightScreen
          key={screen.seed}
          seed={screen.seed}
          onExit={toMenu}
          onRestart={() => setScreen({ name: 'durak', seed: randomSeed() })}
        />
      ) : (
        <MenuScreen onStartDurak={() => setScreen({ name: 'durak', seed: seedFromUrl(window.location.search) })} />
      )}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 8: Стили боя**

Дописать в конец `apps/web/src/styles.css`:
```css
.fight__header { display: flex; justify-content: space-between; align-items: center; }
.fight__round { opacity: 0.8; font-size: 0.9rem; }
.fight__middle { flex: 1; display: flex; align-items: center; gap: 12px; min-height: calc(var(--card-w) * 1.8); }
.fight__status { margin: 0; min-height: 1.4em; text-align: center; opacity: 0.9; }

.actions { display: flex; justify-content: center; gap: 12px; min-height: 52px; }

.hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; min-height: calc(var(--card-w) * 1.4); }
.hand--enemy { min-height: var(--card-w); }
.hand--enemy .card { width: calc(var(--card-w) * 0.7); }
.hand--waiting .card { filter: brightness(0.8); }

.card {
  width: var(--card-w);
  aspect-ratio: 5 / 7;
  padding: 0;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgb(0 0 0 / 35%);
}
.card:disabled { cursor: default; }
.card--red { color: #dc2626; }
.card--black { color: #111827; }
.card--trump { background: #fef9c3; }
.card--playable { outline: 3px solid var(--accent); outline-offset: 1px; }
.card--back {
  background: repeating-linear-gradient(45deg, #1e3a8a 0 6px, #1e40af 6px 12px);
  border-color: #93c5fd;
}
.card__rank { font-size: calc(var(--card-w) * 0.32); line-height: 1; }
.card__suit { font-size: calc(var(--card-w) * 0.36); line-height: 1; }

.deck { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 0.8rem; text-align: center; }

.table {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, var(--card-w));
  gap: 20px 14px;
  justify-content: center;
  align-content: center;
}
.table__pair { position: relative; width: var(--card-w); }
.table__defense { position: absolute; top: 22%; left: 22%; }

.hp { display: grid; grid-template-columns: 5.5em 1fr 3.5em; align-items: center; gap: 8px; font-size: 0.9rem; }
.hp__track { height: 10px; border-radius: 5px; background: rgb(0 0 0 / 35%); overflow: hidden; }
.hp__fill { height: 100%; background: linear-gradient(90deg, #ef4444, #f97316); }
.hp__value { text-align: right; }

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 60%);
}
.overlay__panel {
  width: min(100%, 360px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgb(255 255 255 / 20%);
  background: var(--felt-dark);
  text-align: center;
}
.overlay__panel h2, .overlay__panel p { margin: 0; }
```

- [ ] **Step 9: Проверить**

Run: `npm run typecheck && npm test`
Expected: PASS.

Run: `npm run dev`, открыть `http://localhost:5173/?seed=42` в Chrome DevTools с эмуляцией iPhone/Pixel. Проверить вручную:
1. «Дурак» открывает бой: у тебя 6 карт, у соперника 6 рубашек, видны колода, козырь, обе полоски HP.
2. В свой ход подходящие карты подсвечены; тап по карте переносит её на стол с анимацией.
3. Тап по неподходящей карте показывает сообщение («Эта карта не бьёт» / «Эту карту нельзя подкинуть»), состояние не меняется.
4. Соперник ходит сам примерно через 0,7 с; работают «Беру», «Бито», «Готово».
5. Конец раздачи: оверлей с уроном, HP уменьшается, «Следующая раздача» раздаёт заново.
6. Конец боя: «Победа!/Поражение», «Ещё бой» и «В меню» работают.
7. На ширине окна ноутбука поле стоит по центру, не шире 480px.

Остановить сервер.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat: add playable durak fight screen with animated cards and AI turns"
```

---

### Task 10: E2E, README, финальная проверка

**Files:**
- Create: `playwright.config.ts`, `e2e/durak.spec.ts`, `README.md`

**Interfaces:**
- Consumes: UI из Task 9 (`data-testid="player-hand"`, `"deck"`, `role="status"`, `role="meter"`, `.card--playable`, кнопки «Дурак», «Беру», «Меню»).

- [ ] **Step 1: Установить Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium`

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npm run build && npm run preview -w @game/web -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Написать e2e-тесты**

`e2e/durak.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('starts a durak fight with full hands', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Дурак' }).click();
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('meter', { name: 'Ты' })).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Соперник' })).toBeVisible();
  await expect(page.getByTestId('deck')).toContainText('Козырь');
});

test('the player can make a move on their turn', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Дурак' }).click();
  const status = page.getByRole('status');
  await expect(status).not.toHaveText(/соперник/i, { timeout: 5_000 });

  const hand = page.getByTestId('player-hand');
  const playable = hand.locator('.card--playable');
  if ((await playable.count()) > 0) {
    await playable.first().click();
    await expect(hand.getByRole('button')).toHaveCount(5);
  } else {
    await page.getByRole('button', { name: 'Беру' }).click();
    await expect(status).toHaveText(/Соперник подкидывает|Твой ход|Отбивайся/);
  }
});

test('garbage seed in the URL still starts a fight', async ({ page }) => {
  await page.goto('/?seed=abc');
  await page.getByRole('button', { name: 'Дурак' }).click();
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
});

test('menu button returns to the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Дурак' }).click();
  await page.getByRole('button', { name: 'Меню' }).click();
  await expect(page.getByRole('heading', { name: 'Карточный рогалик' })).toBeVisible();
});
```

- [ ] **Step 3: Запустить e2e**

Run: `npm run e2e`
Expected: `4 passed`.

- [ ] **Step 4: README с запуском и деплоем**

`README.md`:
````markdown
# Карточный рогалик — прототипы

Два прототипа для проверки идеи: «Дурак-рогалик» и «TriPeaks-рогалик» (в разработке).
Спецификация: `docs/superpowers/specs/2026-10-07-card-roguelike-prototypes-design.md`.

## Запуск

```bash
npm install
npm run dev          # http://localhost:5173 (и по IP в локальной сети — открой с телефона)
```

Фиксированный сид для воспроизведения раздачи: `http://localhost:5173/?seed=42`.

## Проверки

```bash
npm test             # unit + property-тесты
npm run coverage     # покрытие (порог 80% для packages/*)
npm run typecheck
npm run e2e          # Playwright, мобильный viewport
```

## Структура

- `packages/core` — RNG с сидом, карты, Result
- `packages/durak` — правила дурака, бой с HP, ИИ (чистая логика)
- `apps/web` — React PWA

## Деплой (Cloudflare Pages)

1. Запушить репозиторий на GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → выбрать репозиторий.
3. Настройки сборки:
   - Build command: `npm run build`
   - Build output directory: `apps/web/dist`
   - Environment variable: `NODE_VERSION=22`
4. Каждый пуш в `main` деплоится автоматически; ссылку `*.pages.dev` можно раздавать тестерам.
````

- [ ] **Step 5: Финальная проверка**

Run: `npm run typecheck && npm run coverage && npm run build && npm run e2e`
Expected: всё зелёное, покрытие ≥ 80%, `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e README.md package.json package-lock.json
git commit -m "test: add mobile e2e for durak fight and document run and deploy"
```
