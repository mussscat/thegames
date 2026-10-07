# План 2a: Забег, экономика, магазин и перки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить одиночный бой в забег из 2 кругов по 3 боя с монетами, магазином после каждого боя, 8 перками (не больше 3 одновременно) и сохранением забега в браузере.

**Architecture:** Вся логика забега — чистые функции в `@game/durak`: `perks.ts` (данные перков + хуки), `run/economy.ts` (награда), `run/shop.ts` (магазин), `run/run.ts` (редьюсер забега `applyRunAction(state, action) → Result<RunState>`), `content/enemies.ts` (расписание соперников). Бой (`fight.ts`) получает перки игрока и считает «Беру» через хуки. Web: zod-схема и хранилище сохранения, хук `useDurakRun`, экраны боя/магазина/итогов, меню с «Продолжить».

**Tech Stack:** TypeScript, Vitest, fast-check, React, Motion, zod, Playwright (как в Плане 1).

**Spec:** `docs/superpowers/specs/2026-10-07-card-roguelike-prototypes-design.md` — разделы 4.1–4.3, 4.6 (перки), 6.4, 6.5, 7, 8. Профили колоды, усиления, боссы с правилами — План 2b.

## Global Constraints

- Подкидной дурак 1×1, общая колода 36 карт; урон только за «Беру» = число атакующих карт (+ модификаторы перков); «Бито» и конец раздачи урона не наносят.
- Круг = 3 боя: обычный → сильный → босс. Прототип = 2 круга (6 боёв). Боссы в 2a — без особых правил (правила — План 2b).
- HP игрока полностью восстанавливается перед каждым боем: игрок 10 HP.
- Монеты за победу: база 3 / 4 / 5 (обычный / сильный / босс) + 1 за каждые 2 оставшихся HP + проценты 1 за каждые 5 накопленных (до начисления награды), максимум 5.
- Магазин после каждого боя кроме последнего: 2 перка; рерол 2 монеты, каждый следующий +1, цена сбрасывается в новом магазине.
- Перков одновременно **не больше 3**; продажа — за половину цены (округление вниз); продавать и покупать можно только в магазине.
- Проигрыш любого боя = конец забега.
- Вся случайность — из RNG забега с сидом; состояние иммутабельное; ошибки — `Result`.
- Сохранение: `localStorage`, версия схемы, zod-валидация; любой сбой хранилища не ломает игру.
- Тексты UI — на русском. Коммиты — Conventional Commits без attribution.
- Известная проблема окружения: после `npm install <пакет>` vitest может упасть с `Cannot find native binding` (баг npm optional deps, npm/cli#4828). Лечение: пересоздать `node_modules` и `package-lock.json` с нуля (`npm install` после их удаления) и убедиться, что в lockfile есть `@rolldown/binding-darwin-arm64` и `@rolldown/binding-linux-x64-gnu`.

## Review Focus

1. Покупка при ровно хватающих монетах и при полных слотах (какая ошибка приоритетнее) → `perkSlotsFull` проверяется раньше `notEnoughCoins`; ровно хватает — покупка проходит. Тесты — Task 6.
2. Действия магазина во время боя и действия боя в магазине (в т.ч. поздний таймер ИИ) → `wrongPhase`, состояние не меняется. Тесты — Task 7.
3. Повреждённое, старое по версии или подделанное (4 перка, отрицательные монеты) сохранение → статус `invalid`, меню предлагает новый забег, без падения. Тесты — Task 8.
4. `localStorage` бросает исключение (приватный режим Safari) → игра работает, `saveRun` возвращает `false`. Тест — Task 8.
5. «Толстая кожа» на втором «Беру» в раздаче и после новой раздачи; урон с модификаторами никогда не отрицателен. Тесты — Task 3 и Task 4.

---

## Файловая структура

```
packages/durak/src/
  types.ts            # + HandSizes, DEFAULT_HAND_SIZES, RoundState.handSizes; BoutResult.attackCards
  deal.ts             # dealRound(rng, handSizes?)
  reducer.ts          # добор до handSizes[id]; boutResult с attackCards
  fixtures.ts         # + handSizes
  perks.ts  (+test)   # PERK_IDS, PERKS (данные + хуки), perkTakeDamage, perkHandSizes, perkInterestCap, perkFightCoins, revealsTopCard
  fight.ts  (+test)   # FightConfig.perks; FightState.perks/roundTakes/fightTakes; урон через перки
  run/economy.ts (+test)  # EnemyTier, fightReward
  run/shop.ts    (+test)  # createShop, buyPerk, sellPerk, rerollShop, sellPrice, MAX_PERKS
  run/run.ts     (+test)  # RunState, RunAction, applyRunAction, createRun, enemyAt, stageLabel
  run/simulation.test.ts  # property: забег всегда заканчивается, инварианты
  content/enemies.ts      # EnemySpec, RUN_SCHEDULE
  index.ts            # + экспорты
apps/web/src/
  games/durak/runSchema.ts  (+test)  # zod-схема сохранения, parseSave
  games/durak/runStorage.ts (+test)  # saveRun, loadRun, clearRun, browserStore
  games/durak/useDurakRun.ts         # состояние забега + ход ИИ + автосохранение
  games/durak/messages.ts            # ошибки RunError → текст
  games/durak/RunHeader.tsx          # круг/бой/соперник/монеты/перки
  games/durak/DurakFightScreen.tsx   # теперь презентационный (fight + onFightAction)
  games/durak/FightOverlay.tsx       # «Забрать награду» / «К итогам»
  games/durak/DeckView.tsx           # открытая верхняя карта (перк «Шулер»)
  games/durak/ShopScreen.tsx
  games/durak/RunOverScreen.tsx
  games/durak/DurakRunScreen.tsx     # переключатель фаз забега
  games/durak/useDurakFight.ts       # удалить
  screens/MenuScreen.tsx             # Новый забег / Продолжить / сообщение о битом сохранении
  App.tsx
  styles.css
e2e/durak.spec.ts
README.md
```

---

### Task 0: Ветка

- [ ] **Step 1:** Убедиться, что текущая ветка `feat/run-economy` (создана вместе с коммитом спецификации).

Run: `git branch --show-current`
Expected: `feat/run-economy`

---

### Task 1: Размер руки на игрока

**Files:**
- Modify: `packages/durak/src/types.ts`, `packages/durak/src/deal.ts`, `packages/durak/src/reducer.ts`, `packages/durak/src/fixtures.ts`
- Test: `packages/durak/src/deal.test.ts`, `packages/durak/src/reducer.test.ts`

**Interfaces:**
- Produces:
  - `type HandSizes = Readonly<Record<PlayerId, number>>`
  - `const DEFAULT_HAND_SIZES: HandSizes = { player: 6, enemy: 6 }`
  - `RoundState.handSizes: HandSizes`
  - `dealRound(rng: RngState, handSizes?: HandSizes): readonly [RoundState, RngState]` — игроку первые `handSizes.player` карт колоды, сопернику следующие `handSizes.enemy`, козырь — последняя карта остатка.

- [ ] **Step 1: Падающие тесты**

Дописать в конец `packages/durak/src/deal.test.ts`:
```ts
describe('dealRound with custom hand sizes', () => {
  it('deals each side its own hand size and remembers it', () => {
    const [round] = dealRound(createRng(7), { player: 7, enemy: 6 });
    expect(round.hands.player).toHaveLength(7);
    expect(round.hands.enemy).toHaveLength(6);
    expect(round.deck).toHaveLength(23);
    expect(round.handSizes).toEqual({ player: 7, enemy: 6 });
  });

  it('defaults to six cards each', () => {
    const [round] = dealRound(createRng(7));
    expect(round.handSizes).toEqual({ player: 6, enemy: 6 });
  });
});
```

Дописать в конец `packages/durak/src/reducer.test.ts`:
```ts
describe('hand sizes', () => {
  it('draws up to each player own hand size', () => {
    const state = roundState({
      hands: { player: filler(5, 'spades'), enemy: filler(5, 'diamonds') },
      table: [covered],
      deck: [c(11, 'clubs'), c(12, 'clubs'), c(13, 'clubs'), c(14, 'clubs')],
      handSizes: { player: 7, enemy: 6 },
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.hands.player).toHaveLength(7);
    expect(next.hands.enemy).toHaveLength(6);
    expect(next.deck).toEqual([c(14, 'clubs')]);
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run packages/durak/src/deal.test.ts packages/durak/src/reducer.test.ts`
Expected: FAIL — `expected [...] to have a length of 7 but got 6` (и `handSizes` undefined).

- [ ] **Step 3: Реализация**

В `packages/durak/src/types.ts` после `export type Hands = ...;` добавить:
```ts
export type HandSizes = Readonly<Record<PlayerId, number>>;

export const DEFAULT_HAND_SIZES: HandSizes = { player: HAND_SIZE, enemy: HAND_SIZE };
```
и в `RoundState` последней строкой добавить поле:
```ts
  readonly handSizes: HandSizes;
```

`packages/durak/src/deal.ts` — заменить импорт и `dealRound`:
```ts
import { createDeck, shuffle, type Card, type RngState, type Suit } from '@game/core';
import { DEFAULT_HAND_SIZES, type HandSizes, type Hands, type PlayerId, type RoundState } from './types';
```
```ts
export function dealRound(rng: RngState, handSizes: HandSizes = DEFAULT_HAND_SIZES): readonly [RoundState, RngState] {
  const [deck, nextRng] = shuffle(createDeck(DURAK_MIN_RANK), rng);
  const dealtCount = handSizes.player + handSizes.enemy;
  const hands: Hands = {
    player: deck.slice(0, handSizes.player),
    enemy: deck.slice(handSizes.player, dealtCount),
  };
  const rest = deck.slice(dealtCount);
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
    lastBout: null,
    handSizes,
  };
  return [round, nextRng];
}
```

`packages/durak/src/reducer.ts` — в `drawAll` заменить строку `const need = Math.max(0, HAND_SIZE - current.hands[id].length);` на:
```ts
    const need = Math.max(0, current.handSizes[id] - current.hands[id].length);
```
и убрать `HAND_SIZE,` из импорта `./types` (больше не используется).

`packages/durak/src/fixtures.ts` — импорт `import { DEFAULT_HAND_SIZES, type RoundState } from './types';` и в объект `roundState` перед `...overrides` добавить `handSizes: DEFAULT_HAND_SIZES,`.

- [ ] **Step 4: Тесты и typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: всё PASS, без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: track hand size per player in durak rounds"
```

---

### Task 2: Итог отбоя хранит взятые атакующие карты

**Files:**
- Modify: `packages/durak/src/types.ts`, `packages/durak/src/reducer.ts`, `packages/durak/src/fight.ts`
- Test: `packages/durak/src/reducer.test.ts`

**Interfaces:**
- Produces: `type BoutResult = { readonly damaged: PlayerId; readonly attackCards: readonly Card[] }` — поле `amount` удаляется; урон считает бой (Task 4) из `attackCards`.

- [ ] **Step 1: Обновить тесты на новую форму (RED)**

В `packages/durak/src/reducer.test.ts`, describe `'bout damage'`:
- в тесте `'taking hurts the defender by every attack card taken, including late throw-ins'` заменить ожидание на:
```ts
    expect(done.lastBout).toEqual({ damaged: 'enemy', attackCards: [c(7, 'clubs'), c(7, 'spades')] });
```
- в тесте `'a fully beaten bout costs nobody anything, even with throw-ins'` заменить `lastBout: { damaged: 'enemy', amount: 1 },` на `lastBout: { damaged: 'enemy', attackCards: [c(6, 'clubs')] },`
- в тесте `'non-bout actions keep the previous bout result untouched'` заменить объявление `previous` на:
```ts
    const previous = { damaged: 'enemy' as const, attackCards: [c(6, 'clubs')] };
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run packages/durak/src/reducer.test.ts`
Expected: FAIL в `'taking hurts the defender…'` — `expected { damaged: 'enemy', amount: 2 } to deeply equal { damaged: 'enemy', attackCards: [...] }`.

- [ ] **Step 3: Реализация**

`packages/durak/src/types.ts` — заменить `BoutResult`:
```ts
/** The last bout the defender took: who took it and which attack cards; a bout that ended in «Бито» leaves it null. */
export type BoutResult = {
  readonly damaged: PlayerId;
  readonly attackCards: readonly Card[];
};
```

`packages/durak/src/reducer.ts` — заменить `boutResult`:
```ts
/** Records a take: the defender and every attack card it takes; a beaten bout records nothing. */
function boutResult(state: RoundState): BoutResult | null {
  return state.defenderTaking
    ? { damaged: defenderOf(state), attackCards: state.table.map((pair) => pair.attack) }
    : null;
}
```

`packages/durak/src/fight.ts` — заменить тело `takenHit`:
```ts
function takenHit(previous: RoundState, next: RoundState): Hit | null {
  const bout = next.lastBout;
  if (!bout || bout === previous.lastBout || bout.attackCards.length === 0) return null;
  return { target: bout.damaged, amount: bout.attackCards.length };
}
```

- [ ] **Step 4: Тесты и typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "refactor: bout result keeps the taken attack cards instead of a precomputed amount"
```

---

### Task 3: Перки — данные и хуки

**Files:**
- Create: `packages/durak/src/perks.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/perks.test.ts`

**Interfaces:**
- Consumes: `Card`, `Suit` из `@game/core`; `HandSizes`, `DEFAULT_HAND_SIZES`, `PlayerId` из `./types`.
- Produces:
  ```ts
  const PERK_IDS = ['throwMaster','thickSkin','longArms','cardSharp','looter','piggyBank','trumpLover','cleanHands'] as const;
  type PerkId = (typeof PERK_IDS)[number];
  type TakeContext = { taker: PlayerId; attackCards: readonly Card[]; trumpSuit: Suit; takerTakesThisRound: number };
  type FightSummary = { playerTakes: number; enemyTakes: number };
  type PerkHooks = { takeDamage?; handSizes?; interestCap?; fightCoins?; revealsTopCard? };
  type PerkDef = { id; name; description; price; hooks };
  const PERKS: Readonly<Record<PerkId, PerkDef>>;
  perkTakeDamage(perks: readonly PerkId[], ctx: TakeContext): number   // база = attackCards.length, не меньше 0
  perkHandSizes(perks: readonly PerkId[]): HandSizes
  perkInterestCap(perks: readonly PerkId[], baseCap: number): number
  perkFightCoins(perks: readonly PerkId[], summary: FightSummary): number
  revealsTopCard(perks: readonly PerkId[]): boolean
  ```
- Перки принадлежат игроку; хуки применяются в порядке покупки.

- [ ] **Step 1: Падающий тест**

`packages/durak/src/perks.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { c } from './fixtures';
import {
  PERK_IDS,
  PERKS,
  perkFightCoins,
  perkHandSizes,
  perkInterestCap,
  perkTakeDamage,
  revealsTopCard,
  type TakeContext,
} from './perks';

const enemyTakes: TakeContext = {
  taker: 'enemy',
  attackCards: [c(7, 'clubs'), c(7, 'hearts')],
  trumpSuit: 'hearts',
  takerTakesThisRound: 0,
};
const playerTakes: TakeContext = { ...enemyTakes, taker: 'player' };

describe('perk catalogue', () => {
  it('defines all 8 perks with a Russian name, description and positive price', () => {
    expect(PERK_IDS).toHaveLength(8);
    for (const id of PERK_IDS) {
      expect(PERKS[id].id).toBe(id);
      expect(PERKS[id].name.length).toBeGreaterThan(0);
      expect(PERKS[id].description.length).toBeGreaterThan(0);
      expect(PERKS[id].price).toBeGreaterThan(0);
    }
  });
});

describe('perkTakeDamage', () => {
  it('is the number of attack cards without perks', () => {
    expect(perkTakeDamage([], enemyTakes)).toBe(2);
  });
  it('Подкидной мастер adds 1 when the enemy takes, not when the player takes', () => {
    expect(perkTakeDamage(['throwMaster'], enemyTakes)).toBe(3);
    expect(perkTakeDamage(['throwMaster'], playerTakes)).toBe(2);
  });
  it('Толстая кожа softens only the first player take of the round', () => {
    expect(perkTakeDamage(['thickSkin'], playerTakes)).toBe(1);
    expect(perkTakeDamage(['thickSkin'], { ...playerTakes, takerTakesThisRound: 1 })).toBe(2);
    expect(perkTakeDamage(['thickSkin'], enemyTakes)).toBe(2);
  });
  it('Козырной adds 1 per trump attack card taken by the enemy', () => {
    expect(perkTakeDamage(['trumpLover'], enemyTakes)).toBe(3);
    expect(perkTakeDamage(['trumpLover'], playerTakes)).toBe(2);
  });
  it('never goes below zero', () => {
    expect(perkTakeDamage(['thickSkin'], { ...playerTakes, attackCards: [] })).toBe(0);
  });
  it('stacks perks', () => {
    expect(perkTakeDamage(['throwMaster', 'trumpLover'], enemyTakes)).toBe(4);
  });
});

describe('other hooks', () => {
  it('Длинные руки gives the player a 7-card hand', () => {
    expect(perkHandSizes([])).toEqual({ player: 6, enemy: 6 });
    expect(perkHandSizes(['longArms'])).toEqual({ player: 7, enemy: 6 });
  });
  it('Копилка raises the interest cap by 3', () => {
    expect(perkInterestCap([], 5)).toBe(5);
    expect(perkInterestCap(['piggyBank'], 5)).toBe(8);
  });
  it('Мародёр pays per enemy take, Чистюля pays 3 for a clean fight', () => {
    expect(perkFightCoins([], { playerTakes: 0, enemyTakes: 4 })).toBe(0);
    expect(perkFightCoins(['looter'], { playerTakes: 2, enemyTakes: 4 })).toBe(4);
    expect(perkFightCoins(['cleanHands'], { playerTakes: 0, enemyTakes: 4 })).toBe(3);
    expect(perkFightCoins(['cleanHands'], { playerTakes: 1, enemyTakes: 4 })).toBe(0);
  });
  it('Шулер reveals the top card', () => {
    expect(revealsTopCard([])).toBe(false);
    expect(revealsTopCard(['cardSharp'])).toBe(true);
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run packages/durak/src/perks.test.ts`
Expected: FAIL — `Cannot find module './perks'`.

- [ ] **Step 3: Реализация**

`packages/durak/src/perks.ts`:
```ts
import type { Card, Suit } from '@game/core';
import { DEFAULT_HAND_SIZES, type HandSizes, type PlayerId } from './types';

export const PERK_IDS = [
  'throwMaster',
  'thickSkin',
  'longArms',
  'cardSharp',
  'looter',
  'piggyBank',
  'trumpLover',
  'cleanHands',
] as const;

export type PerkId = (typeof PERK_IDS)[number];

/** A take about to be charged; `takerTakesThisRound` counts earlier takes by the same side in this round. */
export type TakeContext = {
  readonly taker: PlayerId;
  readonly attackCards: readonly Card[];
  readonly trumpSuit: Suit;
  readonly takerTakesThisRound: number;
};

export type FightSummary = { readonly playerTakes: number; readonly enemyTakes: number };

/** Each hook transforms a value; the player's perks apply in the order they were bought. */
export type PerkHooks = {
  readonly takeDamage?: (damage: number, ctx: TakeContext) => number;
  readonly handSizes?: (sizes: HandSizes) => HandSizes;
  readonly interestCap?: (cap: number) => number;
  readonly fightCoins?: (coins: number, summary: FightSummary) => number;
  readonly revealsTopCard?: boolean;
};

export type PerkDef = {
  readonly id: PerkId;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly hooks: PerkHooks;
};

const THICK_SKIN_REDUCTION = 1;
const PIGGY_BANK_EXTRA_CAP = 3;
const CLEAN_HANDS_BONUS = 3;

export const PERKS: Readonly<Record<PerkId, PerkDef>> = {
  throwMaster: {
    id: 'throwMaster',
    name: 'Подкидной мастер',
    description: 'Каждый «Беру» соперника стоит ему +1 HP',
    price: 6,
    hooks: { takeDamage: (damage, ctx) => (ctx.taker === 'enemy' ? damage + 1 : damage) },
  },
  thickSkin: {
    id: 'thickSkin',
    name: 'Толстая кожа',
    description: 'Твой первый «Беру» в каждой раздаче стоит на 1 HP меньше',
    price: 5,
    hooks: {
      takeDamage: (damage, ctx) =>
        ctx.taker === 'player' && ctx.takerTakesThisRound === 0 ? damage - THICK_SKIN_REDUCTION : damage,
    },
  },
  longArms: {
    id: 'longArms',
    name: 'Длинные руки',
    description: 'Добираешь до 7 карт',
    price: 7,
    hooks: { handSizes: (sizes) => ({ ...sizes, player: sizes.player + 1 }) },
  },
  cardSharp: {
    id: 'cardSharp',
    name: 'Шулер',
    description: 'Верхняя карта колоды открыта',
    price: 4,
    hooks: { revealsTopCard: true },
  },
  looter: {
    id: 'looter',
    name: 'Мародёр',
    description: '+1 монета каждый раз, когда соперник берёт',
    price: 5,
    hooks: { fightCoins: (coins, summary) => coins + summary.enemyTakes },
  },
  piggyBank: {
    id: 'piggyBank',
    name: 'Копилка',
    description: 'Предел процентов +3 (до 8 монет)',
    price: 4,
    hooks: { interestCap: (cap) => cap + PIGGY_BANK_EXTRA_CAP },
  },
  trumpLover: {
    id: 'trumpLover',
    name: 'Козырной',
    description: 'Твои козыри, взятые соперником, стоят ему +1 HP каждый',
    price: 6,
    hooks: {
      takeDamage: (damage, ctx) =>
        ctx.taker === 'enemy' ? damage + ctx.attackCards.filter((card) => card.suit === ctx.trumpSuit).length : damage,
    },
  },
  cleanHands: {
    id: 'cleanHands',
    name: 'Чистюля',
    description: '+3 монеты за бой, в котором ты ни разу не взял',
    price: 5,
    hooks: { fightCoins: (coins, summary) => (summary.playerTakes === 0 ? coins + CLEAN_HANDS_BONUS : coins) },
  },
};

export function perkTakeDamage(perks: readonly PerkId[], ctx: TakeContext): number {
  const damage = perks.reduce((total, id) => PERKS[id].hooks.takeDamage?.(total, ctx) ?? total, ctx.attackCards.length);
  return Math.max(0, damage);
}

export function perkHandSizes(perks: readonly PerkId[]): HandSizes {
  return perks.reduce((sizes, id) => PERKS[id].hooks.handSizes?.(sizes) ?? sizes, DEFAULT_HAND_SIZES);
}

export function perkInterestCap(perks: readonly PerkId[], baseCap: number): number {
  return perks.reduce((cap, id) => PERKS[id].hooks.interestCap?.(cap) ?? cap, baseCap);
}

export function perkFightCoins(perks: readonly PerkId[], summary: FightSummary): number {
  return perks.reduce((coins, id) => PERKS[id].hooks.fightCoins?.(coins, summary) ?? coins, 0);
}

export function revealsTopCard(perks: readonly PerkId[]): boolean {
  return perks.some((id) => PERKS[id].hooks.revealsTopCard === true);
}
```

В `packages/durak/src/index.ts` добавить строку `export * from './perks';` (в алфавитном порядке после `./fight`).

- [ ] **Step 4: Тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: add 8 durak perks as data with take, hand, coin and reveal hooks"
```

---

### Task 4: Бой применяет перки и считает «Беру»

**Files:**
- Modify: `packages/durak/src/fight.ts`
- Test: `packages/durak/src/fight.test.ts`

**Interfaces:**
- Consumes: `perkTakeDamage`, `perkHandSizes`, `PerkId` из `./perks`; `BoutResult` из `./types`.
- Produces:
  - `FightConfig = { seed; playerHp; enemyHp; perks?: readonly PerkId[] }`
  - `FightState` + `perks: readonly PerkId[]`, `roundTakes: PerPlayer` (сбрасывается на новой раздаче), `fightTakes: PerPlayer` (за весь бой); экспортируется `type PerPlayer = Readonly<Record<PlayerId, number>>`.
  - Урон за «Беру» = `perkTakeDamage(perks, { taker, attackCards, trumpSuit, takerTakesThisRound: roundTakes[taker] })`; счётчики растут на каждый «Беру», даже если урон 0.

- [ ] **Step 1: Падающие тесты**

Дописать в конец `packages/durak/src/fight.test.ts`:
```ts
describe('perks in a fight', () => {
  const playerTaking = roundState({
    attacker: 'enemy',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(8, 'clubs'), defense: null }],
    defenderTaking: true,
    deck: filler(6, 'hearts').slice(2),
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

  it('Подкидной мастер makes enemy takes cost 1 more', () => {
    const fight = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['throwMaster'] }), round: takingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hp.enemy).toBe(7);
    expect(next.hits).toEqual([{ target: 'enemy', amount: 3 }]);
  });

  it('Толстая кожа softens only the first player take in a round', () => {
    const start = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['thickSkin'] }), round: playerTaking };
    const first = expectOk(applyFightAction(start, 'enemy', { type: 'endAttack' }));
    expect(first.hp.player).toBe(9);
    const second = expectOk(applyFightAction({ ...first, round: playerTaking }, 'enemy', { type: 'endAttack' }));
    expect(second.hp.player).toBe(7);
  });

  it('a zero-damage take still counts as a take', () => {
    const single = { ...playerTaking, table: [{ attack: c(7, 'clubs'), defense: null }] };
    const start = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['thickSkin'] }), round: single };
    const next = expectOk(applyFightAction(start, 'enemy', { type: 'endAttack' }));
    expect(next.hp.player).toBe(10);
    expect(next.hits).toEqual([]);
    expect(next.roundTakes.player).toBe(1);
  });

  it('Длинные руки deals and keeps a 7-card player hand', () => {
    const fight = createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['longArms'] });
    expect(fight.round.hands.player).toHaveLength(7);
    expect(fight.round.handSizes).toEqual({ player: 7, enemy: 6 });
    expect(fight.perks).toEqual(['longArms']);
  });

  it('Козырной charges the enemy for every trump it takes', () => {
    const fight = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['trumpLover'] }), round: takingRound };
    const next = expectOk(applyFightAction(fight, 'player', { type: 'endAttack' }));
    expect(next.hits).toEqual([{ target: 'enemy', amount: 3 }]);
  });
});
```

Также в `describe('createFight')` дополнить тест `'starts round 1 with full HP and no winner'` строками:
```ts
    expect(base.perks).toEqual([]);
    expect(base.roundTakes).toEqual({ player: 0, enemy: 0 });
    expect(base.fightTakes).toEqual({ player: 0, enemy: 0 });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run packages/durak/src/fight.test.ts`
Expected: FAIL — `roundTakes` undefined, урон без перков.

- [ ] **Step 3: Реализация**

`packages/durak/src/fight.ts` (полная замена):
```ts
import { createRng, err, ok, type Result, type RngState, type Suit } from '@game/core';
import { dealRound } from './deal';
import { perkHandSizes, perkTakeDamage, type PerkId } from './perks';
import { applyRoundAction } from './reducer';
import {
  opponentOf,
  type BoutResult,
  type DurakError,
  type PlayerId,
  type RoundAction,
  type RoundState,
} from './types';

export type FightConfig = {
  readonly seed: number;
  readonly playerHp: number;
  readonly enemyHp: number;
  readonly perks?: readonly PerkId[];
};

export const DEFAULT_FIGHT_CONFIG = { playerHp: 10, enemyHp: 7 } as const;

/** HP lost by the side that took the table in the last action. */
export type Hit = {
  readonly target: PlayerId;
  readonly amount: number;
};

export type PerPlayer = Readonly<Record<PlayerId, number>>;

export type FightState = {
  readonly round: RoundState;
  readonly hp: PerPlayer;
  readonly maxHp: PerPlayer;
  readonly rng: RngState;
  readonly roundNumber: number;
  readonly winner: PlayerId | null;
  /** Hits caused by the most recent action (empty if it dealt no damage). */
  readonly hits: readonly Hit[];
  /** Increments whenever an action deals damage; lets the UI replay hit animations. */
  readonly hitSeq: number;
  /** The player's perks for this fight, in purchase order. */
  readonly perks: readonly PerkId[];
  /** Takes per side in the current round (reset on a new round). */
  readonly roundTakes: PerPlayer;
  /** Takes per side over the whole fight (used for rewards). */
  readonly fightTakes: PerPlayer;
};

export type FightAction = RoundAction | { readonly type: 'nextRound' };

export type FightError = DurakError | 'fightOver' | 'roundInProgress';

const NO_TAKES: PerPlayer = { player: 0, enemy: 0 };

export function createFight(config: FightConfig): FightState {
  const perks = config.perks ?? [];
  const [round, rng] = dealRound(createRng(config.seed), perkHandSizes(perks));
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
    perks,
    roundTakes: NO_TAKES,
    fightTakes: NO_TAKES,
  };
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
  const next: FightState = { ...state, round: result.value, hits: [] };
  const bout = newBout(state.round, result.value);
  return ok(bout ? chargeTake(next, bout, state.round.trumpSuit) : next);
}

function nextRound(state: FightState): Result<FightState, FightError> {
  if (!state.round.outcome) return err('roundInProgress');
  const [round, rng] = dealRound(state.rng, perkHandSizes(state.perks));
  return ok({ ...state, round, rng, roundNumber: state.roundNumber + 1, hits: [], roundTakes: NO_TAKES });
}

function newBout(previous: RoundState, next: RoundState): BoutResult | null {
  const bout = next.lastBout;
  return bout && bout !== previous.lastBout ? bout : null;
}

/** Only taking the table hurts; perks adjust the amount, and every take is counted even at 0 damage. */
function chargeTake(state: FightState, bout: BoutResult, trumpSuit: Suit): FightState {
  const taker = bout.damaged;
  const amount = perkTakeDamage(state.perks, {
    taker,
    attackCards: bout.attackCards,
    trumpSuit,
    takerTakesThisRound: state.roundTakes[taker],
  });
  const counted: FightState = {
    ...state,
    roundTakes: increment(state.roundTakes, taker),
    fightTakes: increment(state.fightTakes, taker),
  };
  return amount > 0 ? applyHit(counted, { target: taker, amount }) : counted;
}

function increment(counts: PerPlayer, id: PlayerId): PerPlayer {
  return id === 'player' ? { ...counts, player: counts.player + 1 } : { ...counts, enemy: counts.enemy + 1 };
}

function applyHit(state: FightState, hit: Hit): FightState {
  const remaining = Math.max(0, state.hp[hit.target] - hit.amount);
  const hp = hit.target === 'player' ? { ...state.hp, player: remaining } : { ...state.hp, enemy: remaining };
  return {
    ...state,
    hp,
    hits: [hit],
    hitSeq: state.hitSeq + 1,
    winner: remaining === 0 ? opponentOf(hit.target) : null,
  };
}
```

- [ ] **Step 4: Тесты, покрытие, typecheck**

Run: `npm run coverage && npm run typecheck`
Expected: PASS, покрытие ≥ 80%.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: apply player perks to takes and hand size inside a fight"
```

---

### Task 5: Награда за бой

**Files:**
- Create: `packages/durak/src/run/economy.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/run/economy.test.ts`

**Interfaces:**
- Consumes: `perkFightCoins`, `perkInterestCap`, `PerkId` из `../perks`.
- Produces:
  ```ts
  type EnemyTier = 'normal' | 'strong' | 'boss';
  const FIGHT_BASE_COINS: Readonly<Record<EnemyTier, number>>; // 3 / 4 / 5
  const HP_PER_BONUS_COIN = 2; const COINS_PER_INTEREST = 5; const BASE_INTEREST_CAP = 5;
  type FightReward = { base; hpBonus; interest; perkBonus; total: number };
  type RewardInput = { tier; playerHp; coinsBefore; perks; playerTakes; enemyTakes };
  fightReward(input: RewardInput): FightReward
  ```

- [ ] **Step 1: Падающий тест**

`packages/durak/src/run/economy.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fightReward, type RewardInput } from './economy';

const input: RewardInput = { tier: 'normal', playerHp: 10, coinsBefore: 0, perks: [], playerTakes: 1, enemyTakes: 3 };

describe('fightReward', () => {
  it('pays base + 1 per 2 HP left', () => {
    expect(fightReward(input)).toEqual({ base: 3, hpBonus: 5, interest: 0, perkBonus: 0, total: 8 });
  });

  it('pays more for stronger enemies and rounds HP bonus down', () => {
    expect(fightReward({ ...input, tier: 'strong', playerHp: 7 }).total).toBe(4 + 3);
    expect(fightReward({ ...input, tier: 'boss', playerHp: 1 }).total).toBe(5 + 0);
  });

  it('pays 1 interest per 5 coins held before the reward, capped at 5', () => {
    expect(fightReward({ ...input, coinsBefore: 23 }).interest).toBe(4);
    expect(fightReward({ ...input, coinsBefore: 40 }).interest).toBe(5);
  });

  it('Копилка lifts the interest cap to 8', () => {
    expect(fightReward({ ...input, coinsBefore: 40, perks: ['piggyBank'] }).interest).toBe(8);
  });

  it('adds perk coins', () => {
    expect(fightReward({ ...input, perks: ['looter'] }).perkBonus).toBe(3);
    expect(fightReward({ ...input, perks: ['cleanHands'], playerTakes: 0 }).perkBonus).toBe(3);
    expect(fightReward({ ...input, perks: ['cleanHands'] }).perkBonus).toBe(0);
  });

  it('never pays negative amounts for broken inputs', () => {
    const reward = fightReward({ ...input, playerHp: -3, coinsBefore: -10 });
    expect(reward.hpBonus).toBe(0);
    expect(reward.interest).toBe(0);
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run packages/durak/src/run/economy.test.ts`
Expected: FAIL — `Cannot find module './economy'`.

- [ ] **Step 3: Реализация**

`packages/durak/src/run/economy.ts`:
```ts
import { perkFightCoins, perkInterestCap, type PerkId } from '../perks';

export type EnemyTier = 'normal' | 'strong' | 'boss';

export const FIGHT_BASE_COINS: Readonly<Record<EnemyTier, number>> = { normal: 3, strong: 4, boss: 5 };
export const HP_PER_BONUS_COIN = 2;
export const COINS_PER_INTEREST = 5;
export const BASE_INTEREST_CAP = 5;

export type FightReward = {
  readonly base: number;
  readonly hpBonus: number;
  readonly interest: number;
  readonly perkBonus: number;
  readonly total: number;
};

export type RewardInput = {
  readonly tier: EnemyTier;
  readonly playerHp: number;
  /** Coins held before this reward; interest is paid on them (like Balatro). */
  readonly coinsBefore: number;
  readonly perks: readonly PerkId[];
  readonly playerTakes: number;
  readonly enemyTakes: number;
};

export function fightReward(input: RewardInput): FightReward {
  const base = FIGHT_BASE_COINS[input.tier];
  const hpBonus = Math.floor(Math.max(0, input.playerHp) / HP_PER_BONUS_COIN);
  const cap = perkInterestCap(input.perks, BASE_INTEREST_CAP);
  const interest = Math.min(Math.floor(Math.max(0, input.coinsBefore) / COINS_PER_INTEREST), cap);
  const perkBonus = perkFightCoins(input.perks, { playerTakes: input.playerTakes, enemyTakes: input.enemyTakes });
  return { base, hpBonus, interest, perkBonus, total: base + hpBonus + interest + perkBonus };
}
```

В `packages/durak/src/index.ts` добавить `export * from './run/economy';`.

- [ ] **Step 4: Тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: compute fight rewards with HP bonus, interest and perk coins"
```

---

### Task 6: Магазин

**Files:**
- Create: `packages/durak/src/run/shop.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/run/shop.test.ts`

**Interfaces:**
- Consumes: `err`, `ok`, `shuffle`, `Result`, `RngState` из `@game/core`; `PERK_IDS`, `PERKS`, `PerkId` из `../perks`.
- Produces:
  ```ts
  const SHOP_OFFER_COUNT = 2; const BASE_REROLL_COST = 2; const MAX_PERKS = 3;
  type ShopOffer = { perkId: PerkId; price: number };
  type ShopState = { offers: readonly (ShopOffer | null)[]; rerollCost: number };  // null = куплено
  type Wallet = { coins: number; perks: readonly PerkId[] };
  type ShopError = 'noOffer' | 'notEnoughCoins' | 'perkSlotsFull' | 'perkNotOwned';
  createShop(rng: RngState, owned: readonly PerkId[]): readonly [ShopState, RngState]
  sellPrice(perkId: PerkId): number
  buyPerk(shop, wallet, index): Result<{ shop: ShopState; wallet: Wallet }, ShopError>
  sellPerk(wallet, perkId): Result<Wallet, ShopError>
  rerollShop(shop, wallet, rng): Result<{ shop: ShopState; wallet: Wallet; rng: RngState }, ShopError>
  ```
- Предложения — разные перки, которых у игрока нет. Порядок проверок покупки: `noOffer` → `perkSlotsFull` → `notEnoughCoins`.

- [ ] **Step 1: Падающий тест**

`packages/durak/src/run/shop.test.ts`:
```ts
import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { PERKS } from '../perks';
import { buyPerk, createShop, MAX_PERKS, rerollShop, sellPerk, sellPrice, type ShopState, type Wallet } from './shop';

const shop: ShopState = {
  offers: [
    { perkId: 'looter', price: 5 },
    { perkId: 'cardSharp', price: 4 },
  ],
  rerollCost: 2,
};
const rich: Wallet = { coins: 20, perks: [] };

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe('createShop', () => {
  it('offers two different perks the player does not own, at catalogue prices', () => {
    const [created] = createShop(createRng(3), ['looter', 'thickSkin']);
    expect(created.offers).toHaveLength(2);
    expect(created.rerollCost).toBe(2);
    const ids = created.offers.map((offer) => offer?.perkId);
    expect(new Set(ids).size).toBe(2);
    for (const offer of created.offers) {
      expect(offer).not.toBeNull();
      expect(['looter', 'thickSkin']).not.toContain(offer!.perkId);
      expect(offer!.price).toBe(PERKS[offer!.perkId].price);
    }
  });

  it('is deterministic per seed', () => {
    expect(createShop(createRng(3), [])[0]).toEqual(createShop(createRng(3), [])[0]);
  });
});

describe('buyPerk', () => {
  it('moves the perk into the wallet, takes the price and empties the slot', () => {
    const { shop: after, wallet } = expectOk(buyPerk(shop, rich, 0));
    expect(wallet).toEqual({ coins: 15, perks: ['looter'] });
    expect(after.offers).toEqual([null, { perkId: 'cardSharp', price: 4 }]);
  });

  it('works with exactly enough coins', () => {
    expect(expectOk(buyPerk(shop, { coins: 5, perks: [] }, 0)).wallet.coins).toBe(0);
  });

  it('rejects a missing or sold offer', () => {
    expect(buyPerk(shop, rich, 5)).toEqual({ ok: false, error: 'noOffer' });
    const { shop: after } = expectOk(buyPerk(shop, rich, 0));
    expect(buyPerk(after, rich, 0)).toEqual({ ok: false, error: 'noOffer' });
  });

  it('rejects when coins are short', () => {
    expect(buyPerk(shop, { coins: 4, perks: [] }, 0)).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('reports full slots before missing coins', () => {
    const full: Wallet = { coins: 0, perks: ['thickSkin', 'longArms', 'piggyBank'] };
    expect(full.perks).toHaveLength(MAX_PERKS);
    expect(buyPerk(shop, full, 0)).toEqual({ ok: false, error: 'perkSlotsFull' });
  });
});

describe('sellPerk', () => {
  it('removes the perk and pays half its price rounded down', () => {
    expect(sellPrice('looter')).toBe(2);
    expect(expectOk(sellPerk({ coins: 1, perks: ['looter', 'cardSharp'] }, 'looter'))).toEqual({
      coins: 3,
      perks: ['cardSharp'],
    });
  });

  it('rejects a perk the player does not own', () => {
    expect(sellPerk(rich, 'looter')).toEqual({ ok: false, error: 'perkNotOwned' });
  });
});

describe('rerollShop', () => {
  it('charges the reroll cost, raises it by 1 and offers perks the player does not own', () => {
    const wallet: Wallet = { coins: 5, perks: ['looter'] };
    const { shop: after, wallet: paid } = expectOk(rerollShop(shop, wallet, createRng(9)));
    expect(paid.coins).toBe(3);
    expect(after.rerollCost).toBe(3);
    expect(after.offers.map((offer) => offer?.perkId)).not.toContain('looter');
  });

  it('rejects when coins are short', () => {
    expect(rerollShop(shop, { coins: 1, perks: [] }, createRng(9))).toEqual({ ok: false, error: 'notEnoughCoins' });
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run packages/durak/src/run/shop.test.ts`
Expected: FAIL — `Cannot find module './shop'`.

- [ ] **Step 3: Реализация**

`packages/durak/src/run/shop.ts`:
```ts
import { err, ok, shuffle, type Result, type RngState } from '@game/core';
import { PERK_IDS, PERKS, type PerkId } from '../perks';

export const SHOP_OFFER_COUNT = 2;
export const BASE_REROLL_COST = 2;
export const MAX_PERKS = 3;

export type ShopOffer = { readonly perkId: PerkId; readonly price: number };

/** A `null` offer has been bought this visit. */
export type ShopState = { readonly offers: readonly (ShopOffer | null)[]; readonly rerollCost: number };

export type Wallet = { readonly coins: number; readonly perks: readonly PerkId[] };

export type ShopError = 'noOffer' | 'notEnoughCoins' | 'perkSlotsFull' | 'perkNotOwned';

function rollOffers(rng: RngState, owned: readonly PerkId[]): readonly [readonly ShopOffer[], RngState] {
  const pool = PERK_IDS.filter((id) => !owned.includes(id));
  const [shuffled, next] = shuffle(pool, rng);
  const offers = shuffled.slice(0, SHOP_OFFER_COUNT).map((perkId) => ({ perkId, price: PERKS[perkId].price }));
  return [offers, next];
}

export function createShop(rng: RngState, owned: readonly PerkId[]): readonly [ShopState, RngState] {
  const [offers, next] = rollOffers(rng, owned);
  return [{ offers, rerollCost: BASE_REROLL_COST }, next];
}

export function sellPrice(perkId: PerkId): number {
  return Math.floor(PERKS[perkId].price / 2);
}

export function buyPerk(
  shop: ShopState,
  wallet: Wallet,
  index: number,
): Result<{ readonly shop: ShopState; readonly wallet: Wallet }, ShopError> {
  const offer = shop.offers[index];
  if (!offer) return err('noOffer');
  if (wallet.perks.length >= MAX_PERKS) return err('perkSlotsFull');
  if (wallet.coins < offer.price) return err('notEnoughCoins');
  return ok({
    shop: { ...shop, offers: shop.offers.map((current, i) => (i === index ? null : current)) },
    wallet: { coins: wallet.coins - offer.price, perks: [...wallet.perks, offer.perkId] },
  });
}

export function sellPerk(wallet: Wallet, perkId: PerkId): Result<Wallet, ShopError> {
  if (!wallet.perks.includes(perkId)) return err('perkNotOwned');
  return ok({ coins: wallet.coins + sellPrice(perkId), perks: wallet.perks.filter((id) => id !== perkId) });
}

export function rerollShop(
  shop: ShopState,
  wallet: Wallet,
  rng: RngState,
): Result<{ readonly shop: ShopState; readonly wallet: Wallet; readonly rng: RngState }, ShopError> {
  if (wallet.coins < shop.rerollCost) return err('notEnoughCoins');
  const [offers, next] = rollOffers(rng, wallet.perks);
  return ok({
    shop: { offers, rerollCost: shop.rerollCost + 1 },
    wallet: { ...wallet, coins: wallet.coins - shop.rerollCost },
    rng: next,
  });
}
```

В `packages/durak/src/index.ts` добавить `export * from './run/shop';`.

- [ ] **Step 4: Тесты**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: add perk shop with buying, selling at half price and rising reroll cost"
```

---

### Task 7: Забег — соперники и редьюсер

**Files:**
- Create: `packages/durak/src/content/enemies.ts`, `packages/durak/src/run/run.ts`
- Modify: `packages/durak/src/index.ts`
- Test: `packages/durak/src/run/run.test.ts`, `packages/durak/src/run/simulation.test.ts`

**Interfaces:**
- Consumes: всё из Task 4–6, `AiStyle`, `chooseAction` (тест), `currentActor` (тест).
- Produces:
  ```ts
  type EnemySpec = { name: string; tier: EnemyTier; hp: number; style: AiStyle };
  const RUN_SCHEDULE: readonly EnemySpec[];      // 6 боёв
  const PLAYER_HP = 10; const FIGHTS_PER_CIRCLE = 3;
  type RunPhase =
    | { kind: 'fight'; fight: FightState }
    | { kind: 'shop'; shop: ShopState; reward: FightReward }
    | { kind: 'over'; won: boolean };
  type RunState = { seed: number; rng: RngState; stage: number; coins: number; perks: readonly PerkId[]; phase: RunPhase };
  type RunAction =
    | { type: 'fight'; actor: PlayerId; action: FightAction }
    | { type: 'leaveFight' } | { type: 'buyPerk'; index: number } | { type: 'sellPerk'; perkId: PerkId }
    | { type: 'reroll' } | { type: 'leaveShop' };
  type RunError = FightError | ShopError | 'wrongPhase' | 'fightNotOver';
  createRun(seed: number): RunState
  applyRunAction(state: RunState, action: RunAction): Result<RunState, RunError>
  enemyAt(stage: number): EnemySpec          // RangeError за пределами расписания
  stageLabel(stage: number): { circle: number; fight: number }
  ```
- `leaveFight` после победы игрока: награда в монеты; на последнем бою → `over/won`, иначе магазин. После победы соперника → `over/lost`.

- [ ] **Step 1: Падающие тесты**

`packages/durak/src/run/run.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RUN_SCHEDULE } from '../content/enemies';
import { applyRunAction, createRun, enemyAt, PLAYER_HP, stageLabel, type RunState } from './run';

function expectOk(result: ReturnType<typeof applyRunAction>): RunState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

function withFightWinner(run: RunState, winner: 'player' | 'enemy', playerHp = PLAYER_HP): RunState {
  if (run.phase.kind !== 'fight') throw new Error('not in a fight');
  const fight = { ...run.phase.fight, winner, hp: { ...run.phase.fight.hp, player: playerHp } };
  return { ...run, phase: { kind: 'fight', fight } };
}

function inShop(run: RunState): RunState {
  return expectOk(applyRunAction(withFightWinner(run, 'player'), { type: 'leaveFight' }));
}

describe('schedule', () => {
  it('has 2 circles of normal → strong → boss', () => {
    expect(RUN_SCHEDULE.map((enemy) => enemy.tier)).toEqual(['normal', 'strong', 'boss', 'normal', 'strong', 'boss']);
    expect(stageLabel(0)).toEqual({ circle: 1, fight: 1 });
    expect(stageLabel(5)).toEqual({ circle: 2, fight: 3 });
    expect(() => enemyAt(6)).toThrow(RangeError);
  });
});

describe('createRun', () => {
  it('starts the first fight with full player HP and no coins or perks', () => {
    const run = createRun(1);
    expect(run.stage).toBe(0);
    expect(run.coins).toBe(0);
    expect(run.perks).toEqual([]);
    expect(run.phase.kind).toBe('fight');
    if (run.phase.kind !== 'fight') return;
    expect(run.phase.fight.hp).toEqual({ player: PLAYER_HP, enemy: enemyAt(0).hp });
  });

  it('is deterministic per seed', () => {
    expect(createRun(5)).toEqual(createRun(5));
  });
});

describe('fight phase', () => {
  it('passes fight actions through', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const actor = run.phase.fight.round.attacker;
    const cardId = run.phase.fight.round.hands[actor][0]!.id;
    const next = expectOk(applyRunAction(run, { type: 'fight', actor, action: { type: 'attack', cardId } }));
    expect(next.phase.kind === 'fight' && next.phase.fight.round.table).toHaveLength(1);
  });

  it('rejects shop actions during a fight', () => {
    const run = createRun(1);
    expect(applyRunAction(run, { type: 'reroll' })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(run, { type: 'sellPerk', perkId: 'looter' })).toEqual({ ok: false, error: 'wrongPhase' });
    expect(applyRunAction(run, { type: 'leaveShop' })).toEqual({ ok: false, error: 'wrongPhase' });
  });

  it('cannot leave a fight that is not over', () => {
    expect(applyRunAction(createRun(1), { type: 'leaveFight' })).toEqual({ ok: false, error: 'fightNotOver' });
  });

  it('a won fight pays the reward and opens the shop', () => {
    const shop = inShop(createRun(1));
    expect(shop.coins).toBe(8);
    expect(shop.phase.kind).toBe('shop');
    if (shop.phase.kind !== 'shop') return;
    expect(shop.phase.reward.total).toBe(8);
    expect(shop.phase.shop.offers).toHaveLength(2);
  });

  it('a lost fight ends the run', () => {
    const over = expectOk(applyRunAction(withFightWinner(createRun(1), 'enemy'), { type: 'leaveFight' }));
    expect(over.phase).toEqual({ kind: 'over', won: false });
  });

  it('winning the last fight wins the run without a shop', () => {
    const last = { ...withFightWinner(createRun(1), 'player'), stage: RUN_SCHEDULE.length - 1 };
    const over = expectOk(applyRunAction(last, { type: 'leaveFight' }));
    expect(over.phase).toEqual({ kind: 'over', won: true });
  });
});

describe('shop phase', () => {
  it('buying a perk spends coins and carries the perk into the next fight', () => {
    const shop = inShop(createRun(1));
    if (shop.phase.kind !== 'shop') throw new Error('not in shop');
    const offer = shop.phase.shop.offers[0]!;
    const bought = expectOk(applyRunAction(shop, { type: 'buyPerk', index: 0 }));
    expect(bought.perks).toEqual([offer.perkId]);
    expect(bought.coins).toBe(shop.coins - offer.price);
    const next = expectOk(applyRunAction(bought, { type: 'leaveShop' }));
    expect(next.stage).toBe(1);
    expect(next.phase.kind === 'fight' && next.phase.fight.perks).toEqual([offer.perkId]);
    expect(next.phase.kind === 'fight' && next.phase.fight.hp).toEqual({ player: PLAYER_HP, enemy: enemyAt(1).hp });
  });

  it('selling and rerolling update coins', () => {
    const shop = { ...inShop(createRun(1)), perks: ['looter' as const] };
    const sold = expectOk(applyRunAction(shop, { type: 'sellPerk', perkId: 'looter' }));
    expect(sold.perks).toEqual([]);
    expect(sold.coins).toBe(shop.coins + 2);
    const rerolled = expectOk(applyRunAction(sold, { type: 'reroll' }));
    expect(rerolled.coins).toBe(sold.coins - 2);
  });

  it('passes shop errors through', () => {
    const broke = { ...inShop(createRun(1)), coins: 0 };
    expect(applyRunAction(broke, { type: 'buyPerk', index: 0 })).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('rejects fight actions in the shop', () => {
    const shop = inShop(createRun(1));
    expect(applyRunAction(shop, { type: 'fight', actor: 'enemy', action: { type: 'take' } })).toEqual({
      ok: false,
      error: 'wrongPhase',
    });
    expect(applyRunAction(shop, { type: 'leaveFight' })).toEqual({ ok: false, error: 'wrongPhase' });
  });
});
```

`packages/durak/src/run/simulation.test.ts`:
```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { chooseAction } from '../ai';
import { currentActor } from '../rules';
import { MAX_PERKS } from './shop';
import { applyRunAction, createRun, enemyAt, type RunAction, type RunState } from './run';

const MAX_STEPS = 300_000;

/** Bot policy: aggressive AI in fights, buys the first affordable offer, then moves on. */
function nextAction(run: RunState): RunAction {
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
    return index >= 0 && run.perks.length < MAX_PERKS ? { type: 'buyPerk', index } : { type: 'leaveShop' };
  }
  throw new Error('run is over');
}

describe('run simulation', () => {
  it('every run ends; coins stay non-negative; perks stay unique and within 3 slots', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        let run = createRun(seed);
        for (let step = 0; step < MAX_STEPS && run.phase.kind !== 'over'; step++) {
          const result = applyRunAction(run, nextAction(run));
          if (!result.ok) throw new Error(`illegal bot move: ${result.error}`);
          run = result.value;
          expect(run.coins).toBeGreaterThanOrEqual(0);
          expect(run.perks.length).toBeLessThanOrEqual(MAX_PERKS);
          expect(new Set(run.perks).size).toBe(run.perks.length);
        }
        expect(run.phase.kind).toBe('over');
      }),
      { numRuns: 30 },
    );
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run packages/durak/src/run`
Expected: FAIL — `Cannot find module './run'` / `'../content/enemies'`.

- [ ] **Step 3: Реализация**

`packages/durak/src/content/enemies.ts`:
```ts
import type { AiStyle } from '../ai';
import type { EnemyTier } from '../run/economy';

export type EnemySpec = {
  readonly name: string;
  readonly tier: EnemyTier;
  readonly hp: number;
  readonly style: AiStyle;
};

/** 2 circles × (normal → strong → boss). Boss rules arrive in Plan 2b; for now bosses are just tougher. */
export const RUN_SCHEDULE: readonly EnemySpec[] = [
  { name: 'Скупой', tier: 'normal', hp: 6, style: 'stingy' },
  { name: 'Задира', tier: 'strong', hp: 8, style: 'aggressive' },
  { name: 'Ведьма', tier: 'boss', hp: 10, style: 'aggressive' },
  { name: 'Скряга', tier: 'normal', hp: 8, style: 'stingy' },
  { name: 'Громила', tier: 'strong', hp: 10, style: 'aggressive' },
  { name: 'Генерал', tier: 'boss', hp: 12, style: 'aggressive' },
];
```

`packages/durak/src/run/run.ts`:
```ts
import { createRng, err, nextInt, ok, type Result, type RngState } from '@game/core';
import { RUN_SCHEDULE, type EnemySpec } from '../content/enemies';
import { applyFightAction, createFight, type FightAction, type FightError, type FightState } from '../fight';
import type { PerkId } from '../perks';
import type { PlayerId } from '../types';
import { fightReward, type FightReward } from './economy';
import { buyPerk, createShop, rerollShop, sellPerk, type ShopError, type ShopState, type Wallet } from './shop';

export const PLAYER_HP = 10;
export const FIGHTS_PER_CIRCLE = 3;
const FIGHT_SEED_RANGE = 0x100000000;

export type RunPhase =
  | { readonly kind: 'fight'; readonly fight: FightState }
  | { readonly kind: 'shop'; readonly shop: ShopState; readonly reward: FightReward }
  | { readonly kind: 'over'; readonly won: boolean };

export type RunState = {
  readonly seed: number;
  readonly rng: RngState;
  /** Index into RUN_SCHEDULE of the current (or just finished) fight. */
  readonly stage: number;
  readonly coins: number;
  readonly perks: readonly PerkId[];
  readonly phase: RunPhase;
};

export type RunAction =
  | { readonly type: 'fight'; readonly actor: PlayerId; readonly action: FightAction }
  | { readonly type: 'leaveFight' }
  | { readonly type: 'buyPerk'; readonly index: number }
  | { readonly type: 'sellPerk'; readonly perkId: PerkId }
  | { readonly type: 'reroll' }
  | { readonly type: 'leaveShop' };

export type RunError = FightError | ShopError | 'wrongPhase' | 'fightNotOver';

type RunResult = Result<RunState, RunError>;
type ShopPhase = Extract<RunPhase, { kind: 'shop' }>;

export function enemyAt(stage: number): EnemySpec {
  const enemy = RUN_SCHEDULE[stage];
  if (!enemy) throw new RangeError(`No enemy scheduled at stage ${stage}`);
  return enemy;
}

export function stageLabel(stage: number): { readonly circle: number; readonly fight: number } {
  return { circle: Math.floor(stage / FIGHTS_PER_CIRCLE) + 1, fight: (stage % FIGHTS_PER_CIRCLE) + 1 };
}

export function createRun(seed: number): RunState {
  const rng = createRng(seed);
  return startFight({ seed: rng.seed, rng, stage: 0, coins: 0, perks: [], phase: { kind: 'over', won: false } });
}

export function applyRunAction(state: RunState, action: RunAction): RunResult {
  switch (action.type) {
    case 'fight':
      return fightAction(state, action.actor, action.action);
    case 'leaveFight':
      return leaveFight(state);
    case 'buyPerk':
      return inShop(state, (phase) => {
        const result = buyPerk(phase.shop, wallet(state), action.index);
        if (!result.ok) return result;
        return ok({ ...state, ...result.value.wallet, phase: { ...phase, shop: result.value.shop } });
      });
    case 'sellPerk':
      return inShop(state, () => {
        const result = sellPerk(wallet(state), action.perkId);
        return result.ok ? ok({ ...state, ...result.value }) : result;
      });
    case 'reroll':
      return inShop(state, (phase) => {
        const result = rerollShop(phase.shop, wallet(state), state.rng);
        if (!result.ok) return result;
        const { shop, wallet: paid, rng } = result.value;
        return ok({ ...state, ...paid, rng, phase: { ...phase, shop } });
      });
    case 'leaveShop':
      return inShop(state, () => ok(startFight({ ...state, stage: state.stage + 1 })));
  }
}

function wallet(state: RunState): Wallet {
  return { coins: state.coins, perks: state.perks };
}

function inShop(state: RunState, run: (phase: ShopPhase) => RunResult): RunResult {
  return state.phase.kind === 'shop' ? run(state.phase) : err('wrongPhase');
}

function startFight(state: RunState): RunState {
  const [fightSeed, rng] = nextInt(state.rng, FIGHT_SEED_RANGE);
  const fight = createFight({ seed: fightSeed, playerHp: PLAYER_HP, enemyHp: enemyAt(state.stage).hp, perks: state.perks });
  return { ...state, rng, phase: { kind: 'fight', fight } };
}

function fightAction(state: RunState, actor: PlayerId, action: FightAction): RunResult {
  if (state.phase.kind !== 'fight') return err('wrongPhase');
  const result = applyFightAction(state.phase.fight, actor, action);
  return result.ok ? ok({ ...state, phase: { kind: 'fight', fight: result.value } }) : result;
}

function leaveFight(state: RunState): RunResult {
  if (state.phase.kind !== 'fight') return err('wrongPhase');
  const { fight } = state.phase;
  if (!fight.winner) return err('fightNotOver');
  if (fight.winner === 'enemy') return ok({ ...state, phase: { kind: 'over', won: false } });
  const reward = fightReward({
    tier: enemyAt(state.stage).tier,
    playerHp: fight.hp.player,
    coinsBefore: state.coins,
    perks: state.perks,
    playerTakes: fight.fightTakes.player,
    enemyTakes: fight.fightTakes.enemy,
  });
  const coins = state.coins + reward.total;
  if (state.stage >= RUN_SCHEDULE.length - 1) return ok({ ...state, coins, phase: { kind: 'over', won: true } });
  const [shop, rng] = createShop(state.rng, state.perks);
  return ok({ ...state, coins, rng, phase: { kind: 'shop', shop, reward } });
}
```

В `packages/durak/src/index.ts` добавить:
```ts
export * from './content/enemies';
export * from './run/run';
```

- [ ] **Step 4: Тесты, покрытие**

Run: `npm run coverage && npm run typecheck`
Expected: PASS, покрытие ≥ 80%.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: add durak run reducer — 2 circles, rewards, shop between fights"
```

---

### Task 8: Сохранение забега (web)

**Files:**
- Create: `apps/web/src/games/durak/runSchema.ts`, `apps/web/src/games/durak/runStorage.ts`
- Test: `apps/web/src/games/durak/runStorage.test.ts`

**Interfaces:**
- Consumes: `RANKS`, `SUITS`, `Rank` из `@game/core`; `PERK_IDS`, `RUN_SCHEDULE`, `MAX_PERKS`, `RunState`, `createRun`, `applyRunAction` из `@game/durak`.
- Produces:
  - `SAVE_VERSION = 1`, `parseSave(raw: unknown): RunState | null`
  - `RUN_STORAGE_KEY = 'thegame.durak.run'`
  - `type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`
  - `type LoadResult = { status: 'none' } | { status: 'ok'; run: RunState } | { status: 'invalid' }`
  - `saveRun(store, run): boolean`, `loadRun(store): LoadResult`, `clearRun(store): void`, `browserStore(): KeyValueStore | null`

- [ ] **Step 1: Установить zod**

Run: `npm install -w @game/web zod && npx vitest run 2>&1 | tail -3`
Expected: тесты запускаются. Если `Cannot find native binding` — пересоздать lockfile (см. Global Constraints) и повторить.

- [ ] **Step 2: Падающий тест**

`apps/web/src/games/durak/runStorage.test.ts`:
```ts
import { applyRunAction, createRun, type RunState } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from './runSchema';
import { clearRun, loadRun, RUN_STORAGE_KEY, saveRun, type KeyValueStore } from './runStorage';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

function shopRun(): RunState {
  const run = createRun(1);
  if (run.phase.kind !== 'fight') throw new Error('not in a fight');
  const won = { ...run, phase: { kind: 'fight' as const, fight: { ...run.phase.fight, winner: 'player' as const } } };
  const result = applyRunAction(won, { type: 'leaveFight' });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('run storage', () => {
  it('reports no save on an empty store', () => {
    expect(loadRun(memoryStore())).toEqual({ status: 'none' });
  });

  it('round-trips a fight run and a shop run', () => {
    for (const run of [createRun(42), shopRun()]) {
      const store = memoryStore();
      expect(saveRun(store, run)).toBe(true);
      expect(loadRun(store)).toEqual({ status: 'ok', run });
    }
  });

  it('clears the save', () => {
    const store = memoryStore();
    saveRun(store, createRun(1));
    clearRun(store);
    expect(loadRun(store)).toEqual({ status: 'none' });
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: SAVE_VERSION + 1, run: {} })],
    ['wrong shape', JSON.stringify({ version: SAVE_VERSION, run: { stage: 'x' } })],
  ])('treats %s as invalid', (_label, raw) => {
    expect(loadRun(memoryStore({ [RUN_STORAGE_KEY]: raw }))).toEqual({ status: 'invalid' });
  });

  it('rejects tampered saves: 4 perks or negative coins', () => {
    const run = createRun(1);
    const tampered = [
      { ...run, perks: ['looter', 'cardSharp', 'piggyBank', 'thickSkin'] },
      { ...run, coins: -5 },
    ];
    for (const bad of tampered) {
      const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: SAVE_VERSION, run: bad }) });
      expect(loadRun(store)).toEqual({ status: 'invalid' });
    }
  });

  it('survives a storage that throws', () => {
    expect(saveRun(brokenStore, createRun(1))).toBe(false);
    expect(loadRun(brokenStore)).toEqual({ status: 'invalid' });
    expect(() => clearRun(brokenStore)).not.toThrow();
  });
});
```

- [ ] **Step 3: Убедиться, что падает**

Run: `npx vitest run apps/web/src/games/durak/runStorage.test.ts`
Expected: FAIL — `Cannot find module './runSchema'`.

- [ ] **Step 4: Реализация**

`apps/web/src/games/durak/runSchema.ts`:
```ts
import { RANKS, SUITS, type Rank } from '@game/core';
import { MAX_PERKS, PERK_IDS, RUN_SCHEDULE, type RunState } from '@game/durak';
import { z } from 'zod';

export const SAVE_VERSION = 1;

const count = z.number().int().min(0);
const rank = z.custom<Rank>((value) => typeof value === 'number' && (RANKS as readonly number[]).includes(value));
const suit = z.enum(SUITS);
const player = z.enum(['player', 'enemy']);
const perk = z.enum(PERK_IDS);
const card = z.object({ id: z.string(), suit, rank });
const perPlayer = z.object({ player: count, enemy: count });
const rng = z.object({ seed: z.number().int() });

const round = z.object({
  deck: z.array(card),
  trumpSuit: suit,
  trumpCard: card,
  hands: z.object({ player: z.array(card), enemy: z.array(card) }),
  table: z.array(z.object({ attack: card, defense: card.nullable() })),
  attacker: player,
  defenderTaking: z.boolean(),
  discardCount: count,
  outcome: z.object({ loser: player.nullable(), cardsLeft: count }).nullable(),
  lastBout: z.object({ damaged: player, attackCards: z.array(card) }).nullable(),
  handSizes: perPlayer,
});

const fight = z.object({
  round,
  hp: perPlayer,
  maxHp: perPlayer,
  rng,
  roundNumber: z.number().int().min(1),
  winner: player.nullable(),
  hits: z.array(z.object({ target: player, amount: count })),
  hitSeq: count,
  perks: z.array(perk).max(MAX_PERKS),
  roundTakes: perPlayer,
  fightTakes: perPlayer,
});

const reward = z.object({ base: count, hpBonus: count, interest: count, perkBonus: count, total: count });
const shop = z.object({
  offers: z.array(z.object({ perkId: perk, price: count }).nullable()),
  rerollCost: count,
});

const phase = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fight'), fight }),
  z.object({ kind: z.literal('shop'), shop, reward }),
  z.object({ kind: z.literal('over'), won: z.boolean() }),
]);

const run = z.object({
  seed: z.number().int(),
  rng,
  stage: z.number().int().min(0).max(RUN_SCHEDULE.length - 1),
  coins: count,
  perks: z.array(perk).max(MAX_PERKS),
  phase,
});

const saveFile = z.object({ version: z.literal(SAVE_VERSION), run });

export function parseSave(raw: unknown): RunState | null {
  const result = saveFile.safeParse(raw);
  return result.success ? result.data.run : null;
}
```

`apps/web/src/games/durak/runStorage.ts`:
```ts
import type { RunState } from '@game/durak';
import { parseSave, SAVE_VERSION } from './runSchema';

export const RUN_STORAGE_KEY = 'thegame.durak.run';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadResult =
  | { readonly status: 'none' }
  | { readonly status: 'ok'; readonly run: RunState }
  | { readonly status: 'invalid' };

export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('localStorage is unavailable; the run will not be saved', error);
    return null;
  }
}

export function saveRun(store: KeyValueStore, run: RunState): boolean {
  try {
    store.setItem(RUN_STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, run }));
    return true;
  } catch (error) {
    console.warn('Could not save the run', error);
    return false;
  }
}

export function loadRun(store: KeyValueStore): LoadResult {
  try {
    const raw = store.getItem(RUN_STORAGE_KEY);
    if (raw === null) return { status: 'none' };
    const run = parseSave(JSON.parse(raw));
    return run ? { status: 'ok', run } : { status: 'invalid' };
  } catch (error) {
    console.warn('Could not load the saved run', error);
    return { status: 'invalid' };
  }
}

export function clearRun(store: KeyValueStore): void {
  try {
    store.removeItem(RUN_STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear the saved run', error);
  }
}
```

- [ ] **Step 5: Тесты и typecheck**

Run: `npx vitest run apps/web && npm run typecheck`
Expected: PASS. Если typecheck ругается, что тип `parseSave` не совпадает с `RunState`, — привести схему к типу (не наоборот).

- [ ] **Step 6: Commit**

```bash
git add apps/web package.json package-lock.json
git commit -m "feat: save and load durak runs in localStorage with zod validation"
```

---

### Task 9: UI забега — бой, магазин, итоги, меню

**Files:**
- Create: `apps/web/src/games/durak/useDurakRun.ts`, `RunHeader.tsx`, `ShopScreen.tsx`, `RunOverScreen.tsx`, `DurakRunScreen.tsx`
- Modify: `apps/web/src/games/durak/messages.ts`, `DurakFightScreen.tsx`, `FightOverlay.tsx`, `DeckView.tsx`, `apps/web/src/screens/MenuScreen.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`
- Delete: `apps/web/src/games/durak/useDurakFight.ts`
- Test: `apps/web/src/games/durak/messages.test.ts`

**Interfaces:**
- Consumes: `applyRunAction`, `createRun`, `enemyAt`, `stageLabel`, `chooseAction`, `currentActor`, `legalActions`, `revealsTopCard`, `PERKS`, `sellPrice`, `MAX_PERKS`, `FIGHTS_PER_CIRCLE`, `RUN_SCHEDULE`, типы `RunState`, `RunAction`, `RunError`, `FightState`, `FightAction`, `FightReward`, `ShopState` из `@game/durak`; `saveRun`, `loadRun`, `clearRun`, `browserStore`, `LoadResult` из `./runStorage`; `seedFromUrl`, `randomSeed` из `../../seed`.
- Produces: `useDurakRun(initial: RunState): { run; error: string | null; act(action: RunAction): void }`; `errorMessage(error: RunError): string`.

- [ ] **Step 1: Падающий тест сообщений**

`apps/web/src/games/durak/messages.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { errorMessage } from './messages';

describe('errorMessage', () => {
  it('explains shop errors in Russian', () => {
    expect(errorMessage('notEnoughCoins')).toBe('Не хватает монет');
    expect(errorMessage('perkSlotsFull')).toBe('Все 3 слота заняты — сначала продай перк');
    expect(errorMessage('wrongPhase')).toBe('Сейчас это недоступно');
  });
  it('keeps fight errors', () => {
    expect(errorMessage('cannotBeat')).toBe('Эта карта не бьёт');
  });
});
```

Run: `npx vitest run apps/web/src/games/durak/messages.test.ts`
Expected: FAIL — `expected undefined to be 'Не хватает монет'`.

- [ ] **Step 2: Сообщения**

`apps/web/src/games/durak/messages.ts` (полная замена):
```ts
import type { RunError } from '@game/durak';

const ERROR_MESSAGES: Readonly<Record<RunError, string>> = {
  roundOver: 'Раздача уже окончена',
  notYourTurn: 'Сейчас не твой ход',
  cardNotInHand: 'Этой карты нет в руке',
  cannotThrowIn: 'Эту карту нельзя подкинуть',
  cannotBeat: 'Эта карта не бьёт',
  cannotEndAttack: 'Сначала сходи картой',
  fightOver: 'Бой окончен',
  roundInProgress: 'Раздача ещё идёт',
  noOffer: 'Этот товар уже куплен',
  notEnoughCoins: 'Не хватает монет',
  perkSlotsFull: 'Все 3 слота заняты — сначала продай перк',
  perkNotOwned: 'Такого перка нет',
  wrongPhase: 'Сейчас это недоступно',
  fightNotOver: 'Бой ещё идёт',
};

export function errorMessage(error: RunError): string {
  return ERROR_MESSAGES[error];
}
```

Run: `npx vitest run apps/web` → PASS.

- [ ] **Step 3: Хук забега**

Удалить `apps/web/src/games/durak/useDurakFight.ts` (`git rm`).

`apps/web/src/games/durak/useDurakRun.ts`:
```ts
import { applyRunAction, chooseAction, currentActor, enemyAt, type RunAction, type RunState } from '@game/durak';
import { useEffect, useState } from 'react';
import { errorMessage } from './messages';
import { browserStore, clearRun, saveRun } from './runStorage';

const ENEMY_DELAY_MS = 700;

export type DurakRun = {
  readonly run: RunState;
  readonly error: string | null;
  readonly act: (action: RunAction) => void;
};

export function useDurakRun(initial: RunState): DurakRun {
  const [run, setRun] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const act = (action: RunAction): void => {
    const result = applyRunAction(run, action);
    if (result.ok) {
      setRun(result.value);
      setError(null);
    } else {
      setError(errorMessage(result.error));
    }
  };

  useEffect(() => {
    const store = browserStore();
    if (!store) return;
    if (run.phase.kind === 'over') clearRun(store);
    else saveRun(store, run);
  }, [run]);

  useEffect(() => {
    if (run.phase.kind !== 'fight') return undefined;
    const { fight } = run.phase;
    if (fight.winner || currentActor(fight.round) !== 'enemy') return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseAction(fight.round, 'enemy', enemyAt(run.stage).style);
      if (!action) {
        console.error('AI returned no action', { stage: run.stage });
        return;
      }
      const result = applyRunAction(run, { type: 'fight', actor: 'enemy', action });
      if (result.ok) setRun(result.value);
      else console.error('AI chose an illegal action', { action, error: result.error });
    }, ENEMY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [run]);

  return { run, error, act };
}
```

- [ ] **Step 4: Шапка, колода, оверлей, экран боя**

`apps/web/src/games/durak/RunHeader.tsx`:
```tsx
import { enemyAt, FIGHTS_PER_CIRCLE, PERKS, stageLabel, type RunState } from '@game/durak';

const TIER_LABELS = { normal: 'соперник', strong: 'сильный соперник', boss: 'босс' } as const;

export function RunHeader({ run }: { readonly run: RunState }) {
  const { circle, fight } = stageLabel(run.stage);
  const enemy = enemyAt(run.stage);
  return (
    <div className="run-header" data-testid="run-header">
      <span>
        Круг {circle} · бой {fight}/{FIGHTS_PER_CIRCLE} — {enemy.name} ({TIER_LABELS[enemy.tier]})
      </span>
      <span>
        Монеты: {run.coins} · Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}
      </span>
    </div>
  );
}
```

`apps/web/src/games/durak/DeckView.tsx` (полная замена):
```tsx
import { SUIT_SYMBOLS } from '@game/core';
import type { RoundState } from '@game/durak';
import { CardBack, CardView } from '../../components/CardView';

type DeckViewProps = { readonly round: RoundState; readonly revealTop: boolean };

export function DeckView({ round, revealTop }: DeckViewProps) {
  const top = round.deck[0];
  const showTopFaceUp = revealTop && round.deck.length > 1 && top !== undefined;
  return (
    <div className="deck" data-testid="deck">
      {round.deck.length > 1 && (showTopFaceUp ? <CardView card={top} /> : <CardBack />)}
      {round.deck.length > 0 && <CardView card={round.trumpCard} trump />}
      <span className="deck__count">{round.deck.length > 0 ? `Колода: ${round.deck.length}` : 'Колода пуста'}</span>
      <span className="deck__trump">Козырь {SUIT_SYMBOLS[round.trumpSuit]}</span>
    </div>
  );
}
```

`apps/web/src/games/durak/FightOverlay.tsx` (полная замена):
```tsx
import type { FightState, RoundOutcome } from '@game/durak';

type FightOverlayProps = {
  readonly state: FightState;
  readonly onNextRound: () => void;
  readonly onLeaveFight: () => void;
};

function roundTitle(outcome: RoundOutcome): string {
  if (outcome.loser === null) return 'Ничья';
  return outcome.loser === 'player' ? 'Ты остался в дураках' : 'Соперник в дураках';
}

function roundDetails(outcome: RoundOutcome): string {
  if (outcome.loser === null) return 'Оба вышли одновременно';
  return outcome.loser === 'player'
    ? `У тебя осталось карт: ${outcome.cardsLeft}`
    : `У соперника осталось карт: ${outcome.cardsLeft}`;
}

export function FightOverlay({ state, onNextRound, onLeaveFight }: FightOverlayProps) {
  if (state.winner) {
    const won = state.winner === 'player';
    return (
      <div className="overlay" role="dialog" aria-modal="true">
        <div className="overlay__panel">
          <h2>{won ? 'Победа!' : 'Поражение'}</h2>
          <p>Раздач сыграно: {state.roundNumber}</p>
          <button type="button" className="btn btn--primary" onClick={onLeaveFight}>
            {won ? 'Забрать награду' : 'К итогам'}
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

`apps/web/src/games/durak/DurakFightScreen.tsx` (полная замена):
```tsx
import type { Card } from '@game/core';
import { currentActor, legalActions, revealsTopCard, type FightAction, type FightState } from '@game/durak';
import { LayoutGroup } from 'motion/react';
import type { ReactNode } from 'react';
import { CardBack, CardView } from '../../components/CardView';
import { HpBar } from '../../components/HpBar';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { FightOverlay } from './FightOverlay';
import { hitLabelFor } from './hits';
import { statusText } from './status';
import { TableView } from './TableView';

type DurakFightScreenProps = {
  readonly fight: FightState;
  readonly error: string | null;
  readonly header: ReactNode;
  readonly onFightAction: (action: FightAction) => void;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
};

export function DurakFightScreen({ fight, error, header, onFightAction, onLeaveFight, onExit }: DurakFightScreenProps) {
  const { round } = fight;
  const myTurn = !fight.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const playableIds = new Set(
    legalActions(round, 'player').flatMap((action) => ('cardId' in action ? [action.cardId] : [])),
  );

  const onCardTap = (card: Card): void =>
    onFightAction(defending ? { type: 'defend', cardId: card.id } : { type: 'attack', cardId: card.id });

  return (
    <LayoutGroup>
      <main className="screen fight">
        <header className="fight__header">
          <button type="button" className="btn btn--small" onClick={onExit}>
            Меню
          </button>
          <span className="fight__round">Раздача {fight.roundNumber}</span>
        </header>
        {header}

        <HpBar
          label="Соперник"
          hp={fight.hp.enemy}
          maxHp={fight.maxHp.enemy}
          hitLabel={hitLabelFor(fight.hits, 'enemy')}
          hitKey={fight.hitSeq}
        />
        <div className="hand hand--enemy" data-testid="enemy-hand">
          {round.hands.enemy.map((card) => (
            <CardBack key={card.id} layoutId={card.id} />
          ))}
        </div>

        <div className="fight__middle">
          <DeckView round={round} revealTop={revealsTopCard(fight.perks)} />
          <TableView table={round.table} />
        </div>

        <p className="fight__status" role="status">
          {error ?? statusText(fight)}
        </p>
        <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} />

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
        <HpBar
          label="Ты"
          hp={fight.hp.player}
          maxHp={fight.maxHp.player}
          hitLabel={hitLabelFor(fight.hits, 'player')}
          hitKey={fight.hitSeq}
        />
      </main>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
    </LayoutGroup>
  );
}
```

- [ ] **Step 5: Магазин, итоги, экран забега**

`apps/web/src/games/durak/ShopScreen.tsx`:
```tsx
import {
  enemyAt,
  MAX_PERKS,
  PERKS,
  sellPrice,
  stageLabel,
  type FightReward,
  type RunAction,
  type RunState,
  type ShopState,
} from '@game/durak';

type ShopScreenProps = {
  readonly run: RunState;
  readonly shop: ShopState;
  readonly reward: FightReward;
  readonly error: string | null;
  readonly onAct: (action: RunAction) => void;
  readonly onExit: () => void;
};

export function ShopScreen({ run, shop, reward, error, onAct, onExit }: ShopScreenProps) {
  const next = enemyAt(run.stage + 1);
  return (
    <main className="screen shop" data-testid="shop">
      <header className="fight__header">
        <button type="button" className="btn btn--small" onClick={onExit}>
          Меню
        </button>
        <span className="fight__round">Магазин · круг {stageLabel(run.stage).circle}</span>
      </header>

      <section className="shop__panel">
        <h2 className="shop__title">Награда за бой: +{reward.total}</h2>
        <ul className="shop__reward">
          <li>За победу: {reward.base}</li>
          <li>За оставшиеся HP: {reward.hpBonus}</li>
          <li>Проценты: {reward.interest}</li>
          {reward.perkBonus > 0 && <li>Перки: {reward.perkBonus}</li>}
        </ul>
        <p className="shop__coins">Монеты: {run.coins}</p>
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">
          Твои перки ({run.perks.length}/{MAX_PERKS})
        </h3>
        {run.perks.length === 0 && <p className="shop__empty">Пока нет</p>}
        {run.perks.map((id) => (
          <div key={id} className="shop__item">
            <div>
              <strong>{PERKS[id].name}</strong>
              <p>{PERKS[id].description}</p>
            </div>
            <button type="button" className="btn btn--small" onClick={() => onAct({ type: 'sellPerk', perkId: id })}>
              Продать +{sellPrice(id)}
            </button>
          </div>
        ))}
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">Товары</h3>
        {shop.offers.map((offer, index) =>
          offer ? (
            <div key={offer.perkId} className="shop__item">
              <div>
                <strong>{PERKS[offer.perkId].name}</strong>
                <p>{PERKS[offer.perkId].description}</p>
              </div>
              <button type="button" className="btn btn--small btn--primary" onClick={() => onAct({ type: 'buyPerk', index })}>
                Купить за {offer.price}
              </button>
            </div>
          ) : (
            <div key={`sold-${index}`} className="shop__item shop__item--sold">
              Продано
            </div>
          ),
        )}
      </section>

      <p className="fight__status" role="status">
        {error ?? ''}
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={() => onAct({ type: 'reroll' })}>
          Рерол ({shop.rerollCost})
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onAct({ type: 'leaveShop' })}>
          В бой: {next.name}
        </button>
      </div>
    </main>
  );
}
```

`apps/web/src/games/durak/RunOverScreen.tsx`:
```tsx
import { PERKS, RUN_SCHEDULE, type RunState } from '@game/durak';

type RunOverScreenProps = {
  readonly run: RunState;
  readonly won: boolean;
  readonly onNewRun: () => void;
  readonly onExit: () => void;
};

export function RunOverScreen({ run, won, onNewRun, onExit }: RunOverScreenProps) {
  const fightsWon = won ? RUN_SCHEDULE.length : run.stage;
  return (
    <main className="screen menu" data-testid="run-over">
      <h1 className="menu__title">{won ? 'Забег пройден!' : 'Забег окончен'}</h1>
      <p className="menu__subtitle">
        Боёв выиграно: {fightsWon} из {RUN_SCHEDULE.length} · Монеты: {run.coins}
      </p>
      <p className="menu__rules">
        Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}
      </p>
      <button type="button" className="btn btn--primary" onClick={onNewRun}>
        Новый забег
      </button>
      <button type="button" className="btn" onClick={onExit}>
        В меню
      </button>
    </main>
  );
}
```

`apps/web/src/games/durak/DurakRunScreen.tsx`:
```tsx
import type { RunState } from '@game/durak';
import { DurakFightScreen } from './DurakFightScreen';
import { RunHeader } from './RunHeader';
import { RunOverScreen } from './RunOverScreen';
import { ShopScreen } from './ShopScreen';
import { useDurakRun } from './useDurakRun';

type DurakRunScreenProps = {
  readonly initialRun: RunState;
  readonly onExit: () => void;
  readonly onNewRun: () => void;
};

export function DurakRunScreen({ initialRun, onExit, onNewRun }: DurakRunScreenProps) {
  const { run, error, act } = useDurakRun(initialRun);
  const { phase } = run;
  switch (phase.kind) {
    case 'fight':
      return (
        <DurakFightScreen
          fight={phase.fight}
          error={error}
          header={<RunHeader run={run} />}
          onFightAction={(action) => act({ type: 'fight', actor: 'player', action })}
          onLeaveFight={() => act({ type: 'leaveFight' })}
          onExit={onExit}
        />
      );
    case 'shop':
      return <ShopScreen run={run} shop={phase.shop} reward={phase.reward} error={error} onAct={act} onExit={onExit} />;
    case 'over':
      return <RunOverScreen run={run} won={phase.won} onNewRun={onNewRun} onExit={onExit} />;
  }
}
```

- [ ] **Step 6: Меню и App**

`apps/web/src/screens/MenuScreen.tsx` (полная замена):
```tsx
type MenuScreenProps = {
  readonly canContinue: boolean;
  readonly saveInvalid: boolean;
  readonly onNewRun: () => void;
  readonly onContinue: () => void;
};

export function MenuScreen({ canContinue, saveInvalid, onNewRun, onContinue }: MenuScreenProps) {
  return (
    <main className="screen menu">
      <h1 className="menu__title">Карточный рогалик</h1>
      <p className="menu__subtitle">Дурак: 2 круга по 3 боя, магазин между боями</p>
      {canContinue && (
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          Продолжить забег
        </button>
      )}
      <button type="button" className={canContinue ? 'btn' : 'btn btn--primary'} onClick={onNewRun}>
        Новый забег
      </button>
      {saveInvalid && (
        <p className="menu__notice" role="alert">
          Сохранение повреждено — начни новый забег
        </p>
      )}
      <p className="menu__rules">
        Заставил соперника взять — он теряет HP за каждую карту. Победа приносит монеты, в магазине — перки (до 3).
      </p>
      <button type="button" className="btn" disabled>
        TriPeaks — скоро
      </button>
    </main>
  );
}
```

`apps/web/src/App.tsx` (полная замена):
```tsx
import { createRun, type RunState } from '@game/durak';
import { useRef, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DurakRunScreen } from './games/durak/DurakRunScreen';
import { browserStore, clearRun, loadRun, type LoadResult } from './games/durak/runStorage';
import { MenuScreen } from './screens/MenuScreen';
import { randomSeed, seedFromUrl } from './seed';

type Screen = { readonly name: 'menu' } | { readonly name: 'run'; readonly run: RunState; readonly key: number };

function loadSaved(): LoadResult {
  const store = browserStore();
  return store ? loadRun(store) : { status: 'none' };
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [saved, setSaved] = useState<LoadResult>(loadSaved);
  const runKey = useRef(0);

  const openRun = (run: RunState): void => {
    runKey.current += 1;
    setScreen({ name: 'run', run, key: runKey.current });
  };
  const startNewRun = (seed: number): void => {
    const store = browserStore();
    if (store) clearRun(store);
    openRun(createRun(seed));
  };
  const toMenu = (): void => {
    setSaved(loadSaved());
    setScreen({ name: 'menu' });
  };

  return (
    <ErrorBoundary onReset={toMenu}>
      {screen.name === 'run' ? (
        <DurakRunScreen key={screen.key} initialRun={screen.run} onExit={toMenu} onNewRun={() => startNewRun(randomSeed())} />
      ) : (
        <MenuScreen
          canContinue={saved.status === 'ok'}
          saveInvalid={saved.status === 'invalid'}
          onNewRun={() => startNewRun(seedFromUrl(window.location.search))}
          onContinue={() => {
            if (saved.status === 'ok') openRun(saved.run);
          }}
        />
      )}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 7: Стили**

Дописать в конец `apps/web/src/styles.css`:
```css
.run-header { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; opacity: 0.85; text-align: center; }
.menu__notice { margin: 0; color: #fca5a5; }

.shop { overflow-y: auto; }
.shop__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgb(255 255 255 / 15%);
  background: rgb(0 0 0 / 20%);
}
.shop__title { margin: 0; font-size: 1rem; }
.shop__reward { margin: 0; padding-left: 18px; font-size: 0.9rem; }
.shop__coins { margin: 0; font-weight: 700; color: var(--accent); }
.shop__empty { margin: 0; opacity: 0.6; font-size: 0.9rem; }
.shop__item { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.shop__item p { margin: 2px 0 0; font-size: 0.8rem; opacity: 0.8; }
.shop__item--sold { opacity: 0.5; font-style: italic; }
```

- [ ] **Step 8: Проверка сборки**

Run: `npm run typecheck && npm test && npm run build`
Expected: всё PASS; в `apps/web` больше нет ссылок на `useDurakFight` (`grep -r useDurakFight apps/web/src` пусто).

- [ ] **Step 9: Ручная проверка в браузере**

Run: `npm run dev`; Chrome DevTools, viewport 390×844 mobile.
1. Меню: «Новый забег», без «Продолжить» при пустом хранилище.
2. Бой: шапка «Круг 1 · бой 1/3 — Скупой (соперник)», «Монеты: 0 · Перки: —»; бой играется как раньше.
3. Через DevTools выиграть бой без ручной игры: в `localStorage['thegame.durak.run']` выставить `run.phase.fight.winner = "player"`, перезагрузить, «Продолжить забег» → оверлей «Победа!» → «Забрать награду».
4. Магазин: награда «+8» с разбивкой, 2 товара, «Купить» списывает монеты, перк появляется в «Твои перки», «Продать» возвращает половину, рерол дорожает на 1, при нехватке монет — «Не хватает монет».
5. «В бой: Задира» → шапка «бой 2/3», купленный перк в шапке; с «Шулером» верхняя карта колоды открыта; с «Длинными руками» в руке 7 карт.
6. Перезагрузка посреди боя → «Продолжить забег» восстанавливает тот же бой.
7. Через `localStorage` выставить `run.phase.fight.winner = "enemy"` → «К итогам» → «Забег окончен», сохранение очищено (в меню нет «Продолжить»).
8. Испортить сохранение (`localStorage['thegame.durak.run'] = '{'`) → меню показывает «Сохранение повреждено — начни новый забег».
9. Консоль без ошибок.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat: play durak as a run — shop, perks, run over screen and continue from save"
```

---

### Task 10: E2E и README

**Files:**
- Modify: `e2e/durak.spec.ts`, `README.md`

- [ ] **Step 1: Обновить e2e**

`e2e/durak.spec.ts` (полная замена):
```ts
import { expect, test } from '@playwright/test';

test('a new run starts the first fight of circle 1', async ({ page }) => {
  await page.goto('/?seed=42');
  await expect(page.getByRole('button', { name: 'Продолжить забег' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('run-header')).toContainText('Круг 1 · бой 1/3');
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('meter', { name: 'Ты' })).toBeVisible();
  await expect(page.getByTestId('deck')).toContainText('Козырь');
});

test('the player can make a move on their turn', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
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

test('a reload offers to continue the same run', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('run-header')).toContainText('Круг 1 · бой 1/3');
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('run-header')).toContainText('Круг 1 · бой 1/3');
  await expect(page.getByTestId('player-hand').getByRole('button')).not.toHaveCount(0);
});

test('a corrupted save is reported and a new run still starts', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.setItem('thegame.durak.run', '{'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Сохранение повреждено');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('run-header')).toBeVisible();
});

test('garbage seed in the URL still starts a run', async ({ page }) => {
  await page.goto('/?seed=abc');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
});

test('menu button returns to the menu with the run saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await page.getByRole('button', { name: 'Меню' }).click();
  await expect(page.getByRole('heading', { name: 'Карточный рогалик' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Продолжить забег' })).toBeVisible();
});
```

- [ ] **Step 2: Запустить e2e**

Run: `npm run e2e`
Expected: `6 passed`.

- [ ] **Step 3: README**

В `README.md` после раздела «Запуск» добавить:
```markdown
## Как играть (дурак)

- Забег: 2 круга по 3 боя (обычный → сильный → босс). Проиграл бой — забег окончен.
- Урон: заставил соперника взять — он теряет 1 HP за каждую атакующую карту. HP восстанавливаются перед каждым боем.
- После победы — монеты (база + за оставшиеся HP + проценты) и магазин: 2 перка, рерол, продажа за полцены. Перков одновременно не больше 3.
- Забег сохраняется в браузере: закрыл вкладку — «Продолжить забег» в меню.
```

- [ ] **Step 4: Финальная проверка**

Run: `npm run typecheck && npm run coverage && npm run build && npm run e2e`
Expected: всё зелёное, покрытие ≥ 80%, `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test: cover run start, continue and corrupted save in e2e; document how to play"
```
