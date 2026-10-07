# План 2b-1: Боссы с правилами — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Босс каждого круга ломает правило: Ведьма (дамы — козыри), Генерал (игрок отбивается только картой на 2+ ранга старше), Фокусник (козырь меняется после каждого «Бито»). Босс круга выбирается случайно, без повторов.

**Architecture:** `RoundState.boss` хранит правило; `beats`/`isTrumpCard` в `rules.ts` учитывают его, поэтому редьюсер, `legalActions` и ИИ получают правило бесплатно. Смена козыря Фокусника — в `fight.ts` (там RNG боя). Забег выбирает 2 разных босса при создании (`RunState.bosses`), `stageEnemy` даёт имя и правило для UI. Сохранение — версия 2.

**Tech Stack:** как в Плане 2a.

**Spec:** `docs/superpowers/specs/2026-10-07-card-roguelike-prototypes-design.md` — 4.7 (боссы).

## Global Constraints

- Боссы: «Ведьма» — все дамы считаются козырями; «Генерал» — отбиваться можно только картой на 2+ ранга старше (ограничивает только игрока; козырь по-прежнему бьёт некозырь, но козырь на козырь — тоже с разницей 2+); «Фокусник» — после каждого «Бито» козырь меняется на случайную другую масть (от сида боя).
- Две козырные карты сравниваются по рангу (в т.ч. дама-козырь Ведьмы против карты козырной масти).
- Босс круга — случайный из трёх, в двух кругах боссы разные.
- Имя босса «Фокусник» (не «Шулер» — так называется перк).
- Сохранение версии 1 считается невалидным (новые поля) — игрок начинает новый забег.
- Остальные ограничения — как в Плане 2a.

## Review Focus

1. Ведьма: дама некозырной масти против туза козырной масти и против короля своей масти. Тесты — Task 1.
2. Генерал: правило не мешает ИИ-защитнику и не ломает «козырь бьёт некозырь». Тесты — Task 1.
3. Фокусник: козырь не меняется после «Беру» и после конца раздачи, только после «Бито»; меняется на другую масть. Тесты — Task 3.
4. ИИ под Ведьмой не тратит дам как дешёвые карты (они козыри). Тест — Task 2.
5. Старое сохранение (версия 1) → `invalid`, без падения. Тест — Task 5.

---

### Task 0: Ветка

- [ ] **Step 1:** `git branch --show-current` → `feat/bosses`.

---

### Task 1: Правило босса в раздаче и в `beats`

**Files:**
- Modify: `packages/durak/src/types.ts`, `packages/durak/src/rules.ts`, `packages/durak/src/deal.ts`, `packages/durak/src/reducer.ts`, `packages/durak/src/fixtures.ts`
- Test: `packages/durak/src/rules.test.ts`, `packages/durak/src/deal.test.ts`

**Interfaces:**
- Produces:
  - `BOSS_RULES = ['witch', 'general', 'shuffler'] as const`, `type BossRule`
  - `RoundState.boss: BossRule | null`
  - `isTrumpCard(card: Card, trump: Suit, boss?: BossRule | null): boolean`
  - `beats(attack: Card, defense: Card, trump: Suit, boss?: BossRule | null, defender?: PlayerId): boolean` — по умолчанию `boss = null`, `defender = 'enemy'`
  - `dealRound(rng, handSizes?, boss?: BossRule | null)`

- [ ] **Step 1: Падающие тесты**

Дописать в конец `packages/durak/src/rules.test.ts`:
```ts
describe('boss rules', () => {
  it('Ведьма: a queen of any suit is a trump', () => {
    expect(isTrumpCard(c(12, 'clubs'), 'hearts', 'witch')).toBe(true);
    expect(isTrumpCard(c(12, 'clubs'), 'hearts', null)).toBe(false);
    expect(beats(c(14, 'spades'), c(12, 'clubs'), 'hearts', 'witch')).toBe(true);
    expect(beats(c(12, 'clubs'), c(13, 'clubs'), 'hearts', 'witch')).toBe(false);
    expect(beats(c(12, 'clubs'), c(14, 'hearts'), 'hearts', 'witch')).toBe(true);
    expect(beats(c(14, 'hearts'), c(12, 'clubs'), 'hearts', 'witch')).toBe(false);
  });

  it('Генерал: the player must beat by 2+ ranks, the enemy is unaffected', () => {
    expect(beats(c(8, 'clubs'), c(9, 'clubs'), 'hearts', 'general', 'player')).toBe(false);
    expect(beats(c(8, 'clubs'), c(10, 'clubs'), 'hearts', 'general', 'player')).toBe(true);
    expect(beats(c(8, 'clubs'), c(9, 'clubs'), 'hearts', 'general', 'enemy')).toBe(true);
    expect(beats(c(14, 'clubs'), c(6, 'hearts'), 'hearts', 'general', 'player')).toBe(true);
    expect(beats(c(7, 'hearts'), c(8, 'hearts'), 'hearts', 'general', 'player')).toBe(false);
  });

  it('legal defenses follow the boss rule', () => {
    const state = roundState({
      attacker: 'enemy',
      boss: 'general',
      hands: { player: [c(9, 'clubs'), c(10, 'clubs')], enemy: filler(5) },
      table: [{ attack: c(8, 'clubs'), defense: null }],
    });
    expect(legalActions(state, 'player')).toEqual([{ type: 'defend', cardId: 'clubs-10' }, { type: 'take' }]);
  });
});
```
и добавить `isTrumpCard` в импорт из `./rules` в начале файла.

Дописать в конец `packages/durak/src/deal.test.ts`:
```ts
describe('dealRound with a boss', () => {
  it('remembers the boss rule and defaults to none', () => {
    expect(dealRound(createRng(7))[0].boss).toBeNull();
    expect(dealRound(createRng(7), undefined, 'witch')[0].boss).toBe('witch');
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run packages/durak/src/rules.test.ts packages/durak/src/deal.test.ts`
Expected: FAIL — `isTrumpCard is not a function` / `boss` undefined.

- [ ] **Step 3: Реализация**

`packages/durak/src/types.ts` — после `export type PlayerId = ...;` добавить:
```ts
export const BOSS_RULES = ['witch', 'general', 'shuffler'] as const;

/** witch: queens are trumps; general: the player beats only by 2+ ranks; shuffler: trump changes after every «Бито». */
export type BossRule = (typeof BOSS_RULES)[number];
```
и в `RoundState` после `handSizes` добавить `readonly boss: BossRule | null;`.

`packages/durak/src/rules.ts` — заменить импорты и `beats`:
```ts
import type { Card, Rank, Suit } from '@game/core';
import {
  MAX_ATTACKS_PER_BOUT,
  opponentOf,
  type BossRule,
  type PlayerId,
  type RoundAction,
  type RoundState,
  type TablePair,
} from './types';

const QUEEN: Rank = 12;
const GENERAL_MIN_GAP = 2;

export function isTrumpCard(card: Card, trump: Suit, boss: BossRule | null = null): boolean {
  return card.suit === trump || (boss === 'witch' && card.rank === QUEEN);
}

/** `defender` matters only for the General, whose rule binds the player. Two trumps compare by rank. */
export function beats(
  attack: Card,
  defense: Card,
  trump: Suit,
  boss: BossRule | null = null,
  defender: PlayerId = 'enemy',
): boolean {
  const gap = boss === 'general' && defender === 'player' ? GENERAL_MIN_GAP : 1;
  const attackTrump = isTrumpCard(attack, trump, boss);
  const defenseTrump = isTrumpCard(defense, trump, boss);
  if (attackTrump !== defenseTrump) return defenseTrump;
  if (!attackTrump && defense.suit !== attack.suit) return false;
  return defense.rank - attack.rank >= gap;
}
```
и в `legalActions` заменить `.filter((card) => beats(pair.attack, card, state.trumpSuit))` на:
```ts
      .filter((card) => beats(pair.attack, card, state.trumpSuit, state.boss, actor))
```

`packages/durak/src/reducer.ts` — в `defend` заменить `if (!beats(pair.attack, card, state.trumpSuit)) return err('cannotBeat');` на:
```ts
  if (!beats(pair.attack, card, state.trumpSuit, state.boss, actor)) return err('cannotBeat');
```

`packages/durak/src/deal.ts` — сигнатура и поле:
```ts
export function dealRound(
  rng: RngState,
  handSizes: HandSizes = DEFAULT_HAND_SIZES,
  boss: BossRule | null = null,
): readonly [RoundState, RngState] {
```
в объекте раунда после `handSizes,` добавить `boss,`; в импорт `./types` добавить `type BossRule`.

`packages/durak/src/fixtures.ts` — в `roundState` перед `...overrides` добавить `boss: null,`.

- [ ] **Step 4: Тесты и typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: boss rules in durak beating — witch queens are trumps, general demands a 2-rank gap"
```

---

### Task 2: ИИ видит козыри с учётом босса

**Files:**
- Modify: `packages/durak/src/ai.ts`
- Test: `packages/durak/src/ai.test.ts`

- [ ] **Step 1: Падающий тест**

Дописать в конец `packages/durak/src/ai.test.ts`:
```ts
describe('chooseAction under a boss', () => {
  it('under the Witch a queen counts as a trump, so it is not the cheapest lead', () => {
    const state = roundState({
      boss: 'witch',
      hands: { player: [c(12, 'clubs'), c(13, 'spades')], enemy: filler(6, 'diamonds') },
    });
    expect(chooseAction(state, 'player', 'stingy')).toEqual({ type: 'attack', cardId: 'spades-13' });
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run packages/durak/src/ai.test.ts`
Expected: FAIL — выбран `clubs-12`.

- [ ] **Step 3: Реализация**

`packages/durak/src/ai.ts`: импорт `import { isTrumpCard, legalActions } from './rules';` и заменить функцию `isTrump`:
```ts
function isTrump(state: RoundState, card: Card): boolean {
  return isTrumpCard(card, state.trumpSuit, state.boss);
}
```

- [ ] **Step 4: Тесты**

Run: `npx vitest run packages/durak && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: durak AI treats boss trumps as trumps"
```

---

### Task 3: Бой — босс и смена козыря Фокусника

**Files:**
- Modify: `packages/durak/src/fight.ts`
- Test: `packages/durak/src/fight.test.ts`

**Interfaces:**
- Produces: `FightConfig.boss?: BossRule | null`, `FightState.boss: BossRule | null`. После «Бито» (стол очищен, не «Беру», раздача не закончена) при `boss === 'shuffler'` козырь меняется на случайную **другую** масть через RNG боя.

- [ ] **Step 1: Падающие тесты**

Дописать в конец `packages/durak/src/fight.test.ts`:
```ts
describe('bosses in a fight', () => {
  const shuffler = createFight({ seed: 1, playerHp: 10, enemyHp: 10, boss: 'shuffler' });
  const beatenRound = roundState({
    boss: 'shuffler',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [covered],
    deck: filler(6, 'clubs').slice(2),
  });

  it('passes the boss into every round', () => {
    expect(shuffler.boss).toBe('shuffler');
    expect(shuffler.round.boss).toBe('shuffler');
    const ended = expectOk(applyFightAction({ ...shuffler, round: { ...endingRound, boss: 'shuffler' } }, 'player', { type: 'endAttack' }));
    expect(expectOk(applyFightAction(ended, 'player', { type: 'nextRound' })).round.boss).toBe('shuffler');
  });

  it('Фокусник changes the trump to another suit after «Бито»', () => {
    const next = expectOk(applyFightAction({ ...shuffler, round: beatenRound }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).not.toBe('hearts');
    expect(next.rng).not.toEqual(shuffler.rng);
  });

  it('Фокусник keeps the trump after a take', () => {
    const taking = { ...takingRound, boss: 'shuffler' as const };
    const next = expectOk(applyFightAction({ ...shuffler, round: taking }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).toBe('hearts');
  });

  it('without the Фокусник the trump never changes', () => {
    const plain = { ...beatenRound, boss: null };
    const next = expectOk(applyFightAction({ ...base, round: plain }, 'player', { type: 'endAttack' }));
    expect(next.round.trumpSuit).toBe('hearts');
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run packages/durak/src/fight.test.ts`
Expected: FAIL — `boss` undefined, козырь не меняется.

- [ ] **Step 3: Реализация**

В `packages/durak/src/fight.ts`:
- импорты: `import { createRng, err, nextInt, ok, SUITS, type Result, type RngState, type Suit } from '@game/core';` и `type BossRule` в импорт `./types`;
- в `FightConfig` добавить `readonly boss?: BossRule | null;`;
- в `FightState` добавить `/** The boss rule of this fight, if any. */ readonly boss: BossRule | null;`;
- в `createFight`: `const boss = config.boss ?? null;`, `dealRound(createRng(config.seed), perkHandSizes(perks), boss)` и `boss,` в возвращаемом объекте;
- в `nextRound`: `dealRound(state.rng, perkHandSizes(state.perks), state.boss)`;
- в `applyFightAction` заменить последние две строки на:
```ts
  const bout = newBout(state.round, result.value);
  const charged = bout ? chargeTake(next, bout, state.round.trumpSuit) : next;
  return ok(state.boss === 'shuffler' && endedBeaten(state.round, result.value) ? shuffleTrump(charged) : charged);
```
- добавить функции:
```ts
/** A bout that ended in «Бито»: the table was cleared without a take, and the round goes on. */
function endedBeaten(previous: RoundState, next: RoundState): boolean {
  return previous.table.length > 0 && next.table.length === 0 && next.lastBout === previous.lastBout && next.outcome === null;
}

/** Фокусник: the trump moves to a random different suit, drawn from the fight RNG. */
function shuffleTrump(state: FightState): FightState {
  const others = SUITS.filter((suit) => suit !== state.round.trumpSuit);
  const [index, rng] = nextInt(state.rng, others.length);
  return { ...state, rng, round: { ...state.round, trumpSuit: others[index] as Suit } };
}
```

- [ ] **Step 4: Тесты, покрытие**

Run: `npm run coverage && npm run typecheck` → PASS, покрытие ≥ 80%.

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: boss fights — Фокусник shuffles the trump after every «Бито»"
```

---

### Task 4: Забег выбирает боссов

**Files:**
- Create: `packages/durak/src/content/bosses.ts`
- Modify: `packages/durak/src/content/enemies.ts`, `packages/durak/src/run/run.ts`, `packages/durak/src/index.ts`
- Test: `packages/durak/src/run/run.test.ts`

**Interfaces:**
- Produces:
  - `BOSSES: Readonly<Record<BossRule, { name: string; description: string }>>`
  - `RunState.bosses: readonly BossRule[]` — по одному на круг, разные
  - `stageEnemy(run: RunState, stage: number): EnemySpec & { boss: BossRule | null }` — для босс-этапа имя берётся из `BOSSES`
  - бой на босс-этапе создаётся с `boss`

- [ ] **Step 1: Падающие тесты**

Дописать в конец `packages/durak/src/run/run.test.ts`:
```ts
describe('bosses', () => {
  it('picks a different boss for each circle', () => {
    const run = createRun(1);
    expect(run.bosses).toHaveLength(2);
    expect(new Set(run.bosses).size).toBe(2);
  });

  it('boss stages fight under the circle boss rule and use its name', () => {
    const run = createRun(1);
    const boss = run.bosses[0]!;
    expect(stageEnemy(run, 2)).toMatchObject({ name: BOSSES[boss].name, tier: 'boss', boss });
    expect(stageEnemy(run, 0).boss).toBeNull();
    const atBoss = expectOk(applyRunAction({ ...inShop(createRun(1)), stage: 1 }, { type: 'leaveShop' }));
    expect(atBoss.phase.kind === 'fight' && atBoss.phase.fight.boss).toBe(boss);
  });

  it('regular stages fight without a boss rule', () => {
    const run = createRun(1);
    expect(run.phase.kind === 'fight' && run.phase.fight.boss).toBeNull();
  });
});
```
и добавить импорты: `import { BOSSES } from '../content/bosses';` и `stageEnemy` в импорт из `./run`.

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run packages/durak/src/run/run.test.ts`
Expected: FAIL — `Cannot find module '../content/bosses'`.

- [ ] **Step 3: Реализация**

`packages/durak/src/content/bosses.ts`:
```ts
import type { BossRule } from '../types';

export type BossDef = { readonly name: string; readonly description: string };

export const BOSSES: Readonly<Record<BossRule, BossDef>> = {
  witch: { name: 'Ведьма', description: 'Все дамы — козыри' },
  general: { name: 'Генерал', description: 'Отбиться можно только картой на 2+ ранга старше' },
  shuffler: { name: 'Фокусник', description: 'Козырь меняется после каждого «Бито»' },
};
```

`packages/durak/src/content/enemies.ts` — в `RUN_SCHEDULE` заменить имена боссов: `name: 'Ведьма'` → `name: 'Босс круга 1'`, `name: 'Генерал'` → `name: 'Босс круга 2'` (реальное имя даёт `stageEnemy`).

`packages/durak/src/run/run.ts`:
- импорты: `shuffle` из `@game/core`; `import { BOSSES } from '../content/bosses';`; `import { BOSS_RULES, type BossRule, type PlayerId } from '../types';` (заменить прежний `import type { PlayerId }`);
- добавить константу `const CIRCLES = RUN_SCHEDULE.length / FIGHTS_PER_CIRCLE;`
- в `RunState` после `perks` добавить `/** One boss rule per circle, all different. */ readonly bosses: readonly BossRule[];`
- заменить `createRun`:
```ts
export function createRun(seed: number): RunState {
  const start = createRng(seed);
  const [order, rng] = shuffle(BOSS_RULES, start);
  const bosses = order.slice(0, CIRCLES);
  return startFight({ seed: start.seed, rng, stage: 0, coins: 0, perks: [], bosses, phase: { kind: 'over', won: false } });
}
```
- добавить:
```ts
export type StageEnemy = EnemySpec & { readonly boss: BossRule | null };

export function stageEnemy(run: RunState, stage: number): StageEnemy {
  const spec = enemyAt(stage);
  if (spec.tier !== 'boss') return { ...spec, boss: null };
  const boss = run.bosses[stageLabel(stage).circle - 1] ?? null;
  return { ...spec, name: boss ? BOSSES[boss].name : spec.name, boss };
}
```
- в `startFight` создать бой с боссом:
```ts
  const fight = createFight({
    seed: fightSeed,
    playerHp: PLAYER_HP,
    enemyHp: enemyAt(state.stage).hp,
    perks: state.perks,
    boss: stageEnemy(state, state.stage).boss,
  });
```

`packages/durak/src/index.ts` — добавить `export * from './content/bosses';`.

- [ ] **Step 4: Тесты, покрытие**

Run: `npm run coverage && npm run typecheck` → PASS (включая симуляцию забега).

- [ ] **Step 5: Commit**

```bash
git add packages/durak
git commit -m "feat: each circle gets a random distinct boss with its own rule"
```

---

### Task 5: Сохранение v2 и UI боссов

**Files:**
- Modify: `apps/web/src/games/durak/runSchema.ts`, `RunHeader.tsx`, `ShopScreen.tsx`, `DeckView.tsx`, `DurakFightScreen.tsx`
- Test: `apps/web/src/games/durak/runStorage.test.ts`

- [ ] **Step 1: Падающий тест**

Дописать внутрь `describe('run storage', …)` в `apps/web/src/games/durak/runStorage.test.ts`:
```ts
  it('rejects saves from version 1', () => {
    const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: 1, run: createRun(1) }) });
    expect(loadRun(store)).toEqual({ status: 'invalid' });
  });
```

Run: `npx vitest run apps/web/src/games/durak/runStorage.test.ts`
Expected: FAIL — round-trip теряет `bosses`/`boss` (схема их вырезает) и версия 1 принимается.

- [ ] **Step 2: Схема**

В `apps/web/src/games/durak/runSchema.ts`:
- `export const SAVE_VERSION = 2;`
- импорт `BOSS_RULES` из `@game/durak`; `const boss = z.enum(BOSS_RULES).nullable();`
- в `round` добавить `boss,`; в `fight` добавить `boss,`; в `run` добавить `bosses: z.array(z.enum(BOSS_RULES)).max(RUN_SCHEDULE.length),`.

Run: `npx vitest run apps/web && npm run typecheck` → PASS.

- [ ] **Step 3: UI**

`RunHeader.tsx` (полная замена):
```tsx
import { BOSSES, FIGHTS_PER_CIRCLE, PERKS, stageEnemy, stageLabel, type RunState } from '@game/durak';

const TIER_LABELS = { normal: 'соперник', strong: 'сильный соперник', boss: 'босс' } as const;

export function RunHeader({ run }: { readonly run: RunState }) {
  const { circle, fight } = stageLabel(run.stage);
  const enemy = stageEnemy(run, run.stage);
  return (
    <div className="run-header" data-testid="run-header">
      <span>
        Круг {circle} · бой {fight}/{FIGHTS_PER_CIRCLE} — {enemy.name} ({TIER_LABELS[enemy.tier]})
      </span>
      {enemy.boss && <span className="run-header__boss">Правило: {BOSSES[enemy.boss].description}</span>}
      <span>
        Монеты: {run.coins} · Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}
      </span>
    </div>
  );
}
```

`ShopScreen.tsx`: заменить `enemyAt` на `stageEnemy` в импорте и строку `const next = enemyAt(run.stage + 1);` на `const next = stageEnemy(run, run.stage + 1);`.

`DeckView.tsx`: заменить строку с `deck__trump` на:
```tsx
      <span className="deck__trump">
        Козырь {SUIT_SYMBOLS[round.trumpSuit]}
        {round.boss === 'witch' && ' + дамы'}
        {round.boss === 'shuffler' && ' (меняется)'}
      </span>
```

`DurakFightScreen.tsx`: импорт `isTrumpCard` из `@game/durak` и в руке игрока `trump={card.suit === round.trumpSuit}` заменить на `trump={isTrumpCard(card, round.trumpSuit, round.boss)}`.

Дописать в `apps/web/src/styles.css`: `.run-header__boss { color: #fca5a5; font-weight: 600; }`

- [ ] **Step 4: Проверка**

Run: `npm run typecheck && npm test && npm run build && npm run e2e`
Expected: всё PASS, `6 passed`.

Ручная проверка (`npm run dev`, 390×844): через `localStorage` выставить `run.stage = 2` в фазе боя и `run.phase.fight.boss`/`round.boss` по очереди в `witch`, `general`, `shuffler` (или пройти до босса с подменой `winner`):
1. Шапка: имя босса и строка «Правило: …».
2. Ведьма: дамы в руке подсвечены как козыри, «Козырь ♥ + дамы».
3. Генерал: девяткой нельзя побить восьмёрку той же масти — «Эта карта не бьёт».
4. Фокусник: после «Бито» меняется значок козыря.
5. Консоль без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: show boss rules in the run header and mark boss trumps; save format v2"
```
