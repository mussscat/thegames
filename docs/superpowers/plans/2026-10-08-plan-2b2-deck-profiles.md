# План 2b-2: Профили колоды и усиления карт — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сборка колоды по спеке 4.4–4.6: у игрока и соперников есть профили (какое усиление на какой из 36 карт), 5 усилений работают по модели происхождения карт, усиления покупаются в магазине, карта с двумя усилениями рисуется по диагонали и разыгрывается тапом по половине.

**Architecture:** `enhancements.ts` — каталог и профили; `RoundState.profiles` и `RoundState.foreign` (какой стороне принадлежит «принесённое» усиление взятой карты); `origin.ts` вычисляет доступные усиления карты и разрешает выбор `use: 'own' | 'foreign'` в действиях `attack`/`defend`. Правила (`canBeatWith`, `canThrowIn`) учитывают «Острую» и «Тяжёлую»; бой — «Золотую», «Крепкую», «Монетную». Магазин продаёт усиления на одну из 3 предложенных карт. Схема сохранения обновляется в той же задаче, что и состояние.

**Tech Stack:** как раньше.

**Spec:** `docs/superpowers/specs/2026-10-07-card-roguelike-prototypes-design.md` — 4.4, 4.5, 4.6 (усиления в магазине).

## Global Constraints

- Профиль — `cardId → усиление`; на карте в одном профиле не больше одного усиления, новое заменяет старое.
- Происхождение: добранная карта — только усиление владельца руки; карта, взятая со стола («Беру»), приносит усиление из профиля того, кто её сыграл (`foreign`), и у взявшего доступны оба (своё и принесённое). Сыгранная карта теряет пометку `foreign`; «Бито» тоже стирает пометки.
- Выбор при двух усилениях — при розыгрыше (`use`); без `use` применяется своё, а при отсутствии своего — принесённое.
- Эффекты действуют у того, кто разыгрывает карту с усилением:
  - Золотая — сыграна в атаку и забрана соперником («Беру») → +1 урон;
  - Острая — при защите бьёт карту любой масти, если старше по рангу (с учётом разрыва Генерала);
  - Тяжёлая — отбился ею → к её рангу нельзя подкинуть;
  - Крепкая — отбился ею → следующий «Беру» этого игрока стоит на 1 HP меньше (заряд);
  - Монетная — отбился ею → +1 монета (в награде за бой).
- Порядок урона за «Беру»: перки → +Золотые → −1 за заряд «Крепкой»; не меньше 0.
- Магазин: 2 усиления (цена из каталога), у каждого 3 случайные разные карты на выбор; рерол обновляет и перки, и усиления.
- Сохранение — версия 3. Тексты UI — русские; цвета: твоё усиление — синее, соперника — красное.

## Review Focus

1. Карта, взятая назад тем, кто её сыграл (атакующий подкинул бывшую карту защитника), — пометка `foreign` указывает на сыгравшего, а не застревает. Тест — Task 2.
2. `use: 'foreign'` без принесённого усиления и `use: 'own'` без своего → `enhancementUnavailable`, состояние не меняется. Тест — Task 2.
3. «Острая» против козыря и под Генералом (разрыв 2). Тест — Task 3.
4. «Крепкая» не уводит урон в минус и тратит ровно один заряд. Тест — Task 4.
5. Покупка усиления на карту, которой нет среди трёх предложенных → `cardNotOffered`. Тест — Task 5.

---

### Task 0: Ветка

- [ ] `git branch --show-current` → `feat/deck-profiles`.

---

### Task 1: Каталог усилений и профили

**Files:** Create `packages/durak/src/enhancements.ts`, test `packages/durak/src/enhancements.test.ts`; Modify `packages/durak/src/index.ts`.

**Produces:** `ENHANCEMENT_IDS`, `EnhancementId`, `DeckProfile`, `Profiles`, `EMPTY_PROFILES`, `EnhancementDef`, `ENHANCEMENTS`, `withEnhancement(profile, cardId, id)`.

- [ ] **Step 1: Падающий тест** — `packages/durak/src/enhancements.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ENHANCEMENT_IDS, ENHANCEMENTS, withEnhancement } from './enhancements';

describe('enhancements', () => {
  it('defines 5 enhancements with names, short labels, descriptions and prices', () => {
    expect(ENHANCEMENT_IDS).toEqual(['golden', 'sharp', 'heavy', 'sturdy', 'coin']);
    for (const id of ENHANCEMENT_IDS) {
      expect(ENHANCEMENTS[id].id).toBe(id);
      expect(ENHANCEMENTS[id].name.length).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].short.length).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].description.length).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].price).toBeGreaterThan(0);
    }
  });

  it('withEnhancement adds or replaces without mutating the profile', () => {
    const profile = { 'clubs-7': 'golden' as const };
    expect(withEnhancement(profile, 'clubs-7', 'sharp')).toEqual({ 'clubs-7': 'sharp' });
    expect(withEnhancement(profile, 'hearts-6', 'coin')).toEqual({ 'clubs-7': 'golden', 'hearts-6': 'coin' });
    expect(profile).toEqual({ 'clubs-7': 'golden' });
  });
});
```
Run: `npx vitest run packages/durak/src/enhancements.test.ts` → FAIL (`Cannot find module './enhancements'`).

- [ ] **Step 2: Реализация** — `packages/durak/src/enhancements.ts`:
```ts
import type { PlayerId } from './types';

export const ENHANCEMENT_IDS = ['golden', 'sharp', 'heavy', 'sturdy', 'coin'] as const;

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
  golden: { id: 'golden', name: 'Золотая', short: 'Зол', description: 'Соперник забрал её («Беру») — +1 урон', price: 4 },
  sharp: { id: 'sharp', name: 'Острая', short: 'Остр', description: 'Бьёт карту любой масти, если старше по рангу', price: 5 },
  heavy: { id: 'heavy', name: 'Тяжёлая', short: 'Тяж', description: 'Отбился ею — к её рангу нельзя подкинуть', price: 3 },
  sturdy: { id: 'sturdy', name: 'Крепкая', short: 'Креп', description: 'Отбился ею — твой следующий «Беру» на 1 HP дешевле', price: 4 },
  coin: { id: 'coin', name: 'Монетная', short: 'Мон', description: 'Отбился ею — +1 монета в награде за бой', price: 3 },
};

export function withEnhancement(profile: DeckProfile, cardId: string, id: EnhancementId): DeckProfile {
  return { ...profile, [cardId]: id };
}
```
В `packages/durak/src/index.ts` добавить `export * from './enhancements';`.

- [ ] **Step 3:** `npx vitest run && npm run typecheck` → PASS. Commit: `feat: add card enhancement catalogue and deck profiles`.

---

### Task 2: Профили и происхождение карт в раздаче

**Files:** Create `packages/durak/src/origin.ts`; Modify `types.ts`, `deal.ts`, `fixtures.ts`, `reducer.ts` (полная замена), `rules.ts` (только `legalActions` — варианты без эффектов, эффекты в Task 3), `apps/web/src/games/durak/runSchema.ts`, `apps/web/src/games/durak/messages.ts`; Test `packages/durak/src/reducer.test.ts`, `packages/durak/src/deal.test.ts`.

**Produces:**
- `types.ts`: `TablePair` + `readonly attackEnh?: EnhancementId; readonly defenseEnh?: EnhancementId`; `type EnhancementSource = 'own' | 'foreign'`; `RoundAction` `attack`/`defend` + `readonly use?: EnhancementSource`; `type Foreign = Readonly<Partial<Record<string, PlayerId>>>`; `RoundState` + `readonly profiles: Profiles; readonly foreign: Foreign`; `DurakError` + `'enhancementUnavailable'`.
- `origin.ts`: `type CardEnhancements = { own?: EnhancementId; foreign?: EnhancementId }`, `type EnhancementVariant = { use?: EnhancementSource; enhancement?: EnhancementId }`, `cardEnhancements(state, holder, card)`, `enhancementVariants(options)`, `resolveEnhancement(options, use?)`.
- `dealRound(rng, handSizes?, boss?, profiles?)`.

- [ ] **Step 1: Падающие тесты** — дописать в конец `packages/durak/src/reducer.test.ts`:
```ts
describe('enhancements and card origin', () => {
  it('a played card carries its holder enhancement onto the table', () => {
    const state = roundState({
      hands: { player: [c(7, 'clubs')], enemy: filler(6) },
      profiles: { player: { 'clubs-7': 'golden' }, enemy: {} },
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' }));
    expect(next.table).toEqual([{ attack: c(7, 'clubs'), defense: null, attackEnh: 'golden' }]);
  });

  it('a taken card brings the enhancement of whoever played it', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(9, 'clubs')] },
      table: [uncovered],
      foreign: { 'clubs-9': 'player' },
      profiles: { player: { 'clubs-9': 'coin' }, enemy: {} },
    });
    const next = expectOk(applyRoundAction(state, 'enemy', { type: 'defend', cardId: 'clubs-9' }));
    expect(next.table[0]?.defenseEnh).toBe('coin');
    expect(next.foreign).toEqual({});
  });

  it('with two enhancements the default is own and use picks the other', () => {
    const state = roundState({
      hands: { player: [c(7, 'clubs')], enemy: filler(6) },
      foreign: { 'clubs-7': 'enemy' },
      profiles: { player: { 'clubs-7': 'heavy' }, enemy: { 'clubs-7': 'golden' } },
    });
    const own = expectOk(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7' }));
    expect(own.table[0]?.attackEnh).toBe('heavy');
    const foreign = expectOk(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7', use: 'foreign' }));
    expect(foreign.table[0]?.attackEnh).toBe('golden');
  });

  it('asking for a missing enhancement is rejected', () => {
    const state = roundState({ hands: { player: [c(7, 'clubs')], enemy: filler(6) } });
    expect(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7', use: 'foreign' })).toEqual({
      ok: false,
      error: 'enhancementUnavailable',
    });
    expect(applyRoundAction(state, 'player', { type: 'attack', cardId: 'clubs-7', use: 'own' })).toEqual({
      ok: false,
      error: 'enhancementUnavailable',
    });
  });

  it('taking marks attack cards as brought by the attacker and clears marks on defenses', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: filler(4, 'diamonds') },
      table: [covered, { attack: c(7, 'spades'), defense: null }],
      defenderTaking: true,
      foreign: { 'clubs-9': 'player' },
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.foreign).toEqual({ 'clubs-7': 'player', 'spades-7': 'player' });
  });

  it('«Бито» clears marks of every table card', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: filler(5, 'diamonds') },
      table: [covered],
      foreign: { 'clubs-7': 'enemy', 'hearts-6': 'enemy' },
      deck: filler(6, 'hearts').slice(2),
    });
    const next = expectOk(applyRoundAction(state, 'player', { type: 'endAttack' }));
    expect(next.foreign).toEqual({ 'hearts-6': 'enemy' });
  });
});
```
Дописать в конец `packages/durak/src/deal.test.ts`:
```ts
describe('dealRound with profiles', () => {
  it('stores profiles and starts with no foreign marks', () => {
    const profiles = { player: { 'clubs-7': 'golden' as const }, enemy: {} };
    const [round] = dealRound(createRng(7), undefined, null, profiles);
    expect(round.profiles).toEqual(profiles);
    expect(round.foreign).toEqual({});
    expect(dealRound(createRng(7))[0].profiles).toEqual({ player: {}, enemy: {} });
  });
});
```
Run: `npx vitest run packages/durak/src/reducer.test.ts packages/durak/src/deal.test.ts` → FAIL.

- [ ] **Step 2: Типы.** В `packages/durak/src/types.ts`:
- импорт `import type { EnhancementId, Profiles } from './enhancements';`
- заменить `TablePair`:
```ts
/** attackEnh/defenseEnh: the enhancement the card was played with (if any). */
export type TablePair = {
  readonly attack: Card;
  readonly defense: Card | null;
  readonly attackEnh?: EnhancementId;
  readonly defenseEnh?: EnhancementId;
};

/** own — the holder's profile; foreign — the profile of whoever played the card before it was taken. */
export type EnhancementSource = 'own' | 'foreign';

/** cardId → the side whose enhancement the card brought when it was taken from the table. */
export type Foreign = Readonly<Partial<Record<string, PlayerId>>>;
```
- в `RoundState` после `boss` добавить `readonly profiles: Profiles;` и `readonly foreign: Foreign;`
- `RoundAction`: `| { readonly type: 'attack'; readonly cardId: string; readonly use?: EnhancementSource }` и так же для `defend`;
- `DurakError` + `| 'enhancementUnavailable'`.

- [ ] **Step 3: origin.ts** — `packages/durak/src/origin.ts`:
```ts
import { err, ok, type Card, type Result } from '@game/core';
import type { EnhancementId } from './enhancements';
import type { EnhancementSource, PlayerId, RoundState } from './types';

export type CardEnhancements = { readonly own?: EnhancementId; readonly foreign?: EnhancementId };

export type EnhancementVariant = { readonly use?: EnhancementSource; readonly enhancement?: EnhancementId };

/** Own enhancement always; a brought one only if the card was taken from someone else's play. */
export function cardEnhancements(state: RoundState, holder: PlayerId, card: Card): CardEnhancements {
  const own = state.profiles[holder][card.id];
  const from = state.foreign[card.id];
  const foreign = from && from !== holder ? state.profiles[from][card.id] : undefined;
  return { ...(own ? { own } : {}), ...(foreign ? { foreign } : {}) };
}

/** Two enhancements → two explicit choices; otherwise a single implicit one. */
export function enhancementVariants(options: CardEnhancements): readonly EnhancementVariant[] {
  if (options.own && options.foreign) {
    return [
      { use: 'own', enhancement: options.own },
      { use: 'foreign', enhancement: options.foreign },
    ];
  }
  return [{ enhancement: options.own ?? options.foreign }];
}

export function resolveEnhancement(
  options: CardEnhancements,
  use?: EnhancementSource,
): Result<EnhancementId | undefined, 'enhancementUnavailable'> {
  if (use === 'own') return options.own ? ok(options.own) : err('enhancementUnavailable');
  if (use === 'foreign') return options.foreign ? ok(options.foreign) : err('enhancementUnavailable');
  return ok(options.own ?? options.foreign);
}
```

- [ ] **Step 4: deal и fixtures.** `deal.ts`: сигнатура `dealRound(rng, handSizes = DEFAULT_HAND_SIZES, boss: BossRule | null = null, profiles: Profiles = EMPTY_PROFILES)`, в объект раунда после `boss,` добавить `profiles,` и `foreign: {},`; импорт `import { EMPTY_PROFILES, type Profiles } from './enhancements';`. `fixtures.ts`: перед `...overrides` добавить `profiles: EMPTY_PROFILES,` и `foreign: {},`; импорт `EMPTY_PROFILES` из `./enhancements`.

- [ ] **Step 5: reducer.ts (полная замена)**:
```ts
import { err, ok, type Card, type Result } from '@game/core';
import type { EnhancementId } from './enhancements';
import { cardEnhancements, resolveEnhancement } from './origin';
import { canBeatWith, canThrowIn, currentActor, defenderOf, uncoveredPair } from './rules';
import {
  opponentOf,
  withHand,
  type BoutResult,
  type DurakError,
  type EnhancementSource,
  type Foreign,
  type PlayerId,
  type RoundAction,
  type RoundState,
} from './types';

type RoundResult = Result<RoundState, DurakError>;
type Played = { readonly card: Card; readonly enhancement: EnhancementId | undefined };

export function applyRoundAction(state: RoundState, actor: PlayerId, action: RoundAction): RoundResult {
  if (state.outcome) return err('roundOver');
  if (currentActor(state) !== actor) return err('notYourTurn');
  switch (action.type) {
    case 'attack':
      return attack(state, actor, action.cardId, action.use);
    case 'defend':
      return defend(state, actor, action.cardId, action.use);
    case 'take':
      return take(state, actor);
    case 'endAttack':
      return endAttack(state, actor);
  }
}

function withoutCard(hand: readonly Card[], cardId: string): readonly Card[] {
  return hand.filter((card) => card.id !== cardId);
}

function withoutForeign(foreign: Foreign, cardIds: readonly string[]): Foreign {
  return Object.fromEntries(Object.entries(foreign).filter(([id]) => !cardIds.includes(id)));
}

/** Finds the card in the actor's hand and resolves which enhancement it is played with. */
function pick(state: RoundState, actor: PlayerId, cardId: string, use?: EnhancementSource): Result<Played, DurakError> {
  const card = state.hands[actor].find((candidate) => candidate.id === cardId);
  if (!card) return err('cardNotInHand');
  const enhancement = resolveEnhancement(cardEnhancements(state, actor, card), use);
  return enhancement.ok ? ok({ card, enhancement: enhancement.value }) : enhancement;
}

/** Removes the played card from hand and from foreign marks. */
function afterPlay(state: RoundState, actor: PlayerId, card: Card): RoundState {
  return {
    ...state,
    hands: withHand(state.hands, actor, withoutCard(state.hands[actor], card.id)),
    foreign: withoutForeign(state.foreign, [card.id]),
  };
}

function attack(state: RoundState, actor: PlayerId, cardId: string, use?: EnhancementSource): RoundResult {
  if (actor !== state.attacker) return err('notYourTurn');
  const played = pick(state, actor, cardId, use);
  if (!played.ok) return played;
  const { card, enhancement } = played.value;
  if (!canThrowIn(state, card)) return err('cannotThrowIn');
  const pair = { attack: card, defense: null, ...(enhancement ? { attackEnh: enhancement } : {}) };
  return ok({ ...afterPlay(state, actor, card), table: [...state.table, pair] });
}

function defend(state: RoundState, actor: PlayerId, cardId: string, use?: EnhancementSource): RoundResult {
  const pair = uncoveredPair(state);
  if (actor !== defenderOf(state) || !pair) return err('notYourTurn');
  const played = pick(state, actor, cardId, use);
  if (!played.ok) return played;
  const { card, enhancement } = played.value;
  if (!canBeatWith(pair.attack, card, enhancement, state.trumpSuit, state.boss, actor)) return err('cannotBeat');
  const covered = { ...pair, defense: card, ...(enhancement ? { defenseEnh: enhancement } : {}) };
  return ok({ ...afterPlay(state, actor, card), table: state.table.map((p) => (p === pair ? covered : p)) });
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
    lastBout: boutResult(state),
    foreign: state.defenderTaking ? takenForeign(state) : withoutForeign(state.foreign, tableCards.map((card) => card.id)),
    table: [],
    defenderTaking: false,
    attacker: state.defenderTaking ? state.attacker : defender,
  });
}

/** The defender takes attack cards that bring the attacker's enhancements; its own defense cards bring nothing. */
function takenForeign(state: RoundState): Foreign {
  const defenses = state.table.flatMap((pair) => (pair.defense ? [pair.defense.id] : []));
  const base = withoutForeign(state.foreign, defenses);
  return state.table.reduce<Foreign>((marks, pair) => ({ ...marks, [pair.attack.id]: state.attacker }), base);
}

/** Records a take: the defender and every attack card it takes; a beaten bout records nothing. */
function boutResult(state: RoundState): BoutResult | null {
  return state.defenderTaking
    ? { damaged: defenderOf(state), attackCards: state.table.map((pair) => pair.attack) }
    : null;
}

function drawAll(state: RoundState, firstDrawer: PlayerId): RoundState {
  return [firstDrawer, opponentOf(firstDrawer)].reduce<RoundState>((current, id) => {
    const need = Math.max(0, current.handSizes[id] - current.hands[id].length);
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

- [ ] **Step 6: rules.ts — `canBeatWith` и варианты в `legalActions`.** Добавить (после `beats`):
```ts
/** Plain beating; the enhancement hook (Острая) is added in Task 3. */
export function canBeatWith(
  attack: Card,
  defense: Card,
  _enhancement: EnhancementId | undefined,
  trump: Suit,
  boss: BossRule | null,
  defender: PlayerId,
): boolean {
  return beats(attack, defense, trump, boss, defender);
}
```
и заменить `legalActions`:
```ts
export function legalActions(state: RoundState, actor: PlayerId): readonly RoundAction[] {
  if (currentActor(state) !== actor) return [];
  const hand = state.hands[actor];
  const pair = uncoveredPair(state);
  const variants = (card: Card) => enhancementVariants(cardEnhancements(state, actor, card));

  if (actor !== state.attacker && pair) {
    const defends = hand.flatMap((card) =>
      variants(card)
        .filter((variant) => canBeatWith(pair.attack, card, variant.enhancement, state.trumpSuit, state.boss, actor))
        .map((variant): RoundAction => withUse({ type: 'defend', cardId: card.id }, variant.use)),
    );
    return [...defends, { type: 'take' }];
  }

  const attacks = hand
    .filter((card) => canThrowIn(state, card))
    .flatMap((card) => variants(card).map((variant): RoundAction => withUse({ type: 'attack', cardId: card.id }, variant.use)));
  return state.table.length === 0 ? attacks : [...attacks, { type: 'endAttack' }];
}

function withUse<T extends { readonly type: 'attack' | 'defend'; readonly cardId: string }>(
  action: T,
  use: EnhancementSource | undefined,
): T {
  return use ? { ...action, use } : action;
}
```
Импорты в `rules.ts`: `import type { EnhancementId } from './enhancements';`, `import { cardEnhancements, enhancementVariants } from './origin';`, в импорт `./types` добавить `type EnhancementSource`.

- [ ] **Step 7: Схема и сообщения (web).** В `runSchema.ts`: `SAVE_VERSION = 3`; импорт `ENHANCEMENT_IDS`; добавить
```ts
const enhancement = z.enum(ENHANCEMENT_IDS);
const profile = z.record(z.string(), enhancement);
```
в `table` элементы — `z.object({ attack: card, defense: card.nullable(), attackEnh: enhancement.optional(), defenseEnh: enhancement.optional() })`; в `round` добавить `profiles: z.object({ player: profile, enemy: profile }),` и `foreign: z.record(z.string(), player),`. В `messages.ts` добавить `enhancementUnavailable: 'Этого усиления нет на карте',`.

- [ ] **Step 8:** `npx vitest run && npm run typecheck` → PASS. Commit: `feat: deck profiles and card origin — taken cards bring the enhancement of whoever played them`.

---

### Task 3: «Острая» и «Тяжёлая» в правилах

**Files:** Modify `packages/durak/src/rules.ts`; Test `packages/durak/src/rules.test.ts`, `packages/durak/src/ai.test.ts`.

- [ ] **Step 1: Падающие тесты** — дописать в конец `packages/durak/src/rules.test.ts`:
```ts
describe('enhancement rules', () => {
  it('Острая beats any suit when higher, also a trump, and respects the General gap', () => {
    expect(canBeatWith(c(8, 'clubs'), c(10, 'diamonds'), 'sharp', 'hearts', null, 'enemy')).toBe(true);
    expect(canBeatWith(c(8, 'hearts'), c(10, 'diamonds'), 'sharp', 'hearts', null, 'enemy')).toBe(true);
    expect(canBeatWith(c(10, 'clubs'), c(8, 'diamonds'), 'sharp', 'hearts', null, 'enemy')).toBe(false);
    expect(canBeatWith(c(8, 'clubs'), c(10, 'diamonds'), undefined, 'hearts', null, 'enemy')).toBe(false);
    expect(canBeatWith(c(8, 'clubs'), c(9, 'diamonds'), 'sharp', 'hearts', 'general', 'player')).toBe(false);
  });

  it('Тяжёлая defense blocks throw-ins of its rank', () => {
    const heavy = { attack: c(7, 'clubs'), defense: c(9, 'clubs'), defenseEnh: 'heavy' as const };
    const state = roundState({ hands: { player: [], enemy: filler(5) }, table: [heavy] });
    expect(canThrowIn(state, c(9, 'diamonds'))).toBe(false);
    expect(canThrowIn(state, c(7, 'diamonds'))).toBe(true);
  });

  it('legal defenses include a Острая card of another suit and split variants when two enhancements exist', () => {
    const state = roundState({
      attacker: 'enemy',
      hands: { player: [c(10, 'diamonds')], enemy: filler(5) },
      table: [{ attack: c(8, 'clubs'), defense: null }],
      foreign: { 'diamonds-10': 'enemy' },
      profiles: { player: { 'diamonds-10': 'coin' }, enemy: { 'diamonds-10': 'sharp' } },
    });
    expect(legalActions(state, 'player')).toEqual([
      { type: 'defend', cardId: 'diamonds-10', use: 'foreign' },
      { type: 'take' },
    ]);
  });
});
```
и добавить `canBeatWith` в импорт из `./rules`.

Дописать в конец `packages/durak/src/ai.test.ts`:
```ts
describe('chooseAction with enhancements', () => {
  it('defends with a Острая card of another suit when it is the only way', () => {
    const state = roundState({
      hands: { player: filler(5), enemy: [c(10, 'diamonds')] },
      table: [{ attack: c(8, 'clubs'), defense: null }],
      profiles: { player: {}, enemy: { 'diamonds-10': 'sharp' } },
      deck: [c(14, 'spades')],
    });
    expect(chooseAction(state, 'enemy', 'stingy')).toEqual({ type: 'defend', cardId: 'diamonds-10' });
  });
});
```
Run: `npx vitest run packages/durak/src/rules.test.ts packages/durak/src/ai.test.ts` → FAIL.

- [ ] **Step 2: Реализация** в `rules.ts`:
- выделить разрыв:
```ts
export function beatGap(boss: BossRule | null, defender: PlayerId): number {
  return boss === 'general' && defender === 'player' ? GENERAL_MIN_GAP : 1;
}
```
и в `beats` заменить вычисление `gap` на `const gap = beatGap(boss, defender);`
- заменить тело `canBeatWith`:
```ts
/** Острая also beats any suit (trumps included) when higher by the beat gap. */
export function canBeatWith(
  attack: Card,
  defense: Card,
  enhancement: EnhancementId | undefined,
  trump: Suit,
  boss: BossRule | null,
  defender: PlayerId,
): boolean {
  if (beats(attack, defense, trump, boss, defender)) return true;
  return enhancement === 'sharp' && defense.rank - attack.rank >= beatGap(boss, defender);
}
```
- в `canThrowIn` заменить условие совпадения ранга на:
```ts
  return state.table.some(
    (pair) => pair.attack.rank === card.rank || (pair.defense?.rank === card.rank && pair.defenseEnh !== 'heavy'),
  );
```

- [ ] **Step 3:** `npx vitest run && npm run typecheck` → PASS. Commit: `feat: Острая beats any suit when higher, Тяжёлая blocks throw-ins of its rank`.

---

### Task 4: «Золотая», «Крепкая», «Монетная» в бою

**Files:** Modify `packages/durak/src/types.ts` (`BoutResult`), `reducer.ts` (`boutResult`), `fight.ts`, `apps/web/src/games/durak/runSchema.ts`; Test `packages/durak/src/fight.test.ts`, `packages/durak/src/reducer.test.ts`.

**Produces:** `BoutResult.goldenHits: number`; `FightConfig.profiles?: Profiles`; `FightState.sturdy: PerPlayer`, `FightState.cardCoins: PerPlayer`.

- [ ] **Step 1: Падающие тесты** — в `reducer.test.ts`, тест `'taking hurts the defender by every attack card taken, including late throw-ins'`: ожидание заменить на `toEqual({ damaged: 'enemy', attackCards: [c(7, 'clubs'), c(7, 'spades')], goldenHits: 0 })`. Дописать в конец `fight.test.ts`:
```ts
describe('enhancements in a fight', () => {
  const playerDefends = (enhancement: 'sturdy' | 'coin') =>
    roundState({
      attacker: 'enemy',
      hands: { player: [c(9, 'clubs'), ...filler(4)], enemy: filler(5, 'diamonds') },
      table: [{ attack: c(7, 'clubs'), defense: null }],
      profiles: { player: { 'clubs-9': enhancement }, enemy: {} },
      deck: filler(6, 'hearts').slice(2),
    });
  const playerTaking = roundState({
    attacker: 'enemy',
    hands: { player: filler(5), enemy: filler(5, 'diamonds') },
    table: [{ attack: c(7, 'clubs'), defense: null }, { attack: c(8, 'clubs'), defense: null }],
    defenderTaking: true,
    deck: filler(6, 'hearts').slice(2),
  });

  it('Золотая attack cards cost the taker 1 more each', () => {
    const golden = {
      ...takingRound,
      table: [{ attack: c(7, 'clubs'), defense: null, attackEnh: 'golden' as const }, { attack: c(7, 'hearts'), defense: null }],
    };
    const next = expectOk(applyFightAction({ ...base, round: golden }, 'player', { type: 'endAttack' }));
    expect(next.hits).toEqual([{ target: 'enemy', amount: 3 }]);
  });

  it('Крепкая defense gives a charge that softens the next take once', () => {
    const defended = expectOk(applyFightAction({ ...base, round: playerDefends('sturdy') }, 'player', { type: 'defend', cardId: 'clubs-9' }));
    expect(defended.sturdy).toEqual({ player: 1, enemy: 0 });
    const took = expectOk(applyFightAction({ ...defended, round: playerTaking }, 'enemy', { type: 'endAttack' }));
    expect(took.hp.player).toBe(9);
    expect(took.sturdy.player).toBe(0);
    const again = expectOk(applyFightAction({ ...took, round: playerTaking }, 'enemy', { type: 'endAttack' }));
    expect(again.hp.player).toBe(7);
  });

  it('a Крепкая charge never pushes damage below zero', () => {
    const single = { ...playerTaking, table: [{ attack: c(7, 'clubs'), defense: null }] };
    const fight = { ...createFight({ seed: 1, playerHp: 10, enemyHp: 10, perks: ['thickSkin'] }), sturdy: { player: 1, enemy: 0 }, round: single };
    const next = expectOk(applyFightAction(fight, 'enemy', { type: 'endAttack' }));
    expect(next.hp.player).toBe(10);
    expect(next.sturdy.player).toBe(0);
  });

  it('Монетная defense earns a card coin', () => {
    const defended = expectOk(applyFightAction({ ...base, round: playerDefends('coin') }, 'player', { type: 'defend', cardId: 'clubs-9' }));
    expect(defended.cardCoins).toEqual({ player: 1, enemy: 0 });
  });

  it('createFight passes profiles into every round', () => {
    const profiles = { player: { 'clubs-7': 'golden' as const }, enemy: {} };
    const fight = createFight({ seed: 1, playerHp: 10, enemyHp: 10, profiles });
    expect(fight.round.profiles).toEqual(profiles);
    expect(fight.sturdy).toEqual({ player: 0, enemy: 0 });
    expect(fight.cardCoins).toEqual({ player: 0, enemy: 0 });
  });
});
```
Run: `npx vitest run packages/durak/src/fight.test.ts packages/durak/src/reducer.test.ts` → FAIL.

- [ ] **Step 2: Реализация.**
- `types.ts`: в `BoutResult` добавить `/** Attack cards played with Золотая. */ readonly goldenHits: number;`
- `reducer.ts` `boutResult`: объект `{ damaged: defenderOf(state), attackCards: state.table.map((pair) => pair.attack), goldenHits: state.table.filter((pair) => pair.attackEnh === 'golden').length }`.
- `fight.ts`:
  - импорт `import { EMPTY_PROFILES, type EnhancementId, type Profiles } from './enhancements';`
  - `FightConfig` + `readonly profiles?: Profiles;`
  - `FightState` + `/** Крепкая charges: each softens the owner's next take by 1. */ readonly sturdy: PerPlayer;` и `/** Coins earned by Монетная defenses. */ readonly cardCoins: PerPlayer;`
  - `createFight`: `dealRound(createRng(config.seed), perkHandSizes(perks), boss, config.profiles ?? EMPTY_PROFILES)`; в объект `sturdy: NO_TAKES, cardCoins: NO_TAKES,`
  - `nextRound`: `dealRound(state.rng, perkHandSizes(state.perks), state.boss, state.round.profiles)`
  - в `applyFightAction` заменить строки от `const next` до `return`:
```ts
  const next: FightState = { ...state, round: result.value, hits: [] };
  const defense = action.type === 'defend' ? newDefenseEnhancement(state.round, result.value) : undefined;
  const credited = defense ? creditDefense(next, actor, defense) : next;
  const bout = newBout(state.round, result.value);
  const charged = bout ? chargeTake(credited, bout, state.round.trumpSuit) : credited;
  return ok(state.boss === 'shuffler' && endedBeaten(state.round, result.value) ? shuffleTrump(charged) : charged);
```
  - добавить:
```ts
/** The enhancement of the defense card the last action laid on the table, if any. */
function newDefenseEnhancement(previous: RoundState, next: RoundState): EnhancementId | undefined {
  const index = previous.table.findIndex((pair, i) => pair.defense === null && next.table[i]?.defense);
  return index >= 0 ? next.table[index]?.defenseEnh : undefined;
}

function creditDefense(state: FightState, defender: PlayerId, enhancement: EnhancementId): FightState {
  if (enhancement === 'sturdy') return { ...state, sturdy: increment(state.sturdy, defender) };
  if (enhancement === 'coin') return { ...state, cardCoins: increment(state.cardCoins, defender) };
  return state;
}

function decrement(counts: PerPlayer, id: PlayerId): PerPlayer {
  return id === 'player' ? { ...counts, player: counts.player - 1 } : { ...counts, enemy: counts.enemy - 1 };
}
```
  - в `chargeTake` заменить вычисление `amount` и `counted`:
```ts
  const perkAmount = perkTakeDamage(state.perks, {
    taker,
    attackCards: bout.attackCards,
    trumpSuit,
    boss: state.boss,
    takerTakesThisRound: state.roundTakes[taker],
  });
  const charges = state.sturdy[taker];
  const withGold = perkAmount + bout.goldenHits;
  const amount = charges > 0 ? Math.max(0, withGold - 1) : withGold;
  const counted: FightState = {
    ...state,
    roundTakes: increment(state.roundTakes, taker),
    fightTakes: increment(state.fightTakes, taker),
    sturdy: charges > 0 ? decrement(state.sturdy, taker) : state.sturdy,
  };
```
- `runSchema.ts`: `lastBout` + `goldenHits: count`; `fight` + `sturdy: perPlayer, cardCoins: perPlayer,`.

- [ ] **Step 3:** `npm run coverage && npm run typecheck` → PASS. Commit: `feat: Золотая, Крепкая and Монетная take effect in fights`.

---

### Task 5: Награда за «Монетные» и усиления в магазине

**Files:** Modify `packages/durak/src/run/economy.ts`, `packages/durak/src/run/shop.ts`, `apps/web/src/games/durak/runSchema.ts`, `messages.ts`; Test `economy.test.ts`, `shop.test.ts`.

**Produces:**
- `RewardInput.cardCoins: number`, `FightReward.cardBonus: number` (входит в `total`).
- `ENHANCEMENT_OFFER_COUNT = 2`, `ENHANCEMENT_CARD_CHOICES = 3`, `type EnhancementOffer = { enhancementId; price; cardIds: readonly string[] }`, `ShopState.enhancementOffers: readonly (EnhancementOffer | null)[]`, `ShopError` + `'cardNotOffered'`.
- `buyEnhancement(shop, coins, profile, index, cardId): Result<{ shop; coins; profile }, ShopError>`.

- [ ] **Step 1: Падающие тесты.**
`economy.test.ts`: в `input` добавить `cardCoins: 0`; первое ожидание → `{ base: 3, hpBonus: 5, interest: 0, perkBonus: 0, cardBonus: 0, total: 8 }`; дописать:
```ts
  it('pays Монетная coins earned in the fight', () => {
    const reward = fightReward({ ...input, cardCoins: 2 });
    expect(reward.cardBonus).toBe(2);
    expect(reward.total).toBe(10);
  });
```
`shop.test.ts`: в константу `shop` добавить `enhancementOffers: [{ enhancementId: 'golden', price: 4, cardIds: ['clubs-7', 'hearts-8', 'spades-9'] }, null],`; импорт `buyEnhancement`; дописать:
```ts
describe('enhancement offers', () => {
  it('createShop offers two different enhancements, each on 3 different cards', () => {
    const [created] = createShop(createRng(3), []);
    expect(created.enhancementOffers).toHaveLength(2);
    const ids = created.enhancementOffers.map((offer) => offer?.enhancementId);
    expect(new Set(ids).size).toBe(2);
    for (const offer of created.enhancementOffers) {
      expect(new Set(offer!.cardIds).size).toBe(3);
    }
  });

  it('buyEnhancement puts it on the chosen offered card and charges the price', () => {
    const bought = expectOk(buyEnhancement(shop, 10, { 'hearts-8': 'coin' }, 0, 'hearts-8'));
    expect(bought.coins).toBe(6);
    expect(bought.profile).toEqual({ 'hearts-8': 'golden' });
    expect(bought.shop.enhancementOffers[0]).toBeNull();
  });

  it('rejects a card that is not offered, a sold offer and short coins', () => {
    expect(buyEnhancement(shop, 10, {}, 0, 'diamonds-14')).toEqual({ ok: false, error: 'cardNotOffered' });
    expect(buyEnhancement(shop, 10, {}, 1, 'clubs-7')).toEqual({ ok: false, error: 'noOffer' });
    expect(buyEnhancement(shop, 3, {}, 0, 'clubs-7')).toEqual({ ok: false, error: 'notEnoughCoins' });
  });

  it('reroll also renews enhancement offers', () => {
    const { shop: after } = expectOk(rerollShop(shop, { coins: 5, perks: [] }, createRng(9)));
    expect(after.enhancementOffers).toHaveLength(2);
    expect(after.enhancementOffers.every((offer) => offer !== null)).toBe(true);
  });
});
```
Run: `npx vitest run packages/durak/src/run` → FAIL.

- [ ] **Step 2: Реализация.**
`economy.ts`: в `FightReward` добавить `readonly cardBonus: number;`; в `RewardInput` — `/** Coins earned by Монетная defenses during the fight. */ readonly cardCoins: number;`; в `fightReward`: `const cardBonus = Math.max(0, input.cardCoins);` и вернуть `{ base, hpBonus, interest, perkBonus, cardBonus, total: base + hpBonus + interest + perkBonus + cardBonus }`.

`shop.ts`:
- импорты: `createDeck` из `@game/core`; `import { ENHANCEMENT_IDS, ENHANCEMENTS, withEnhancement, type DeckProfile, type EnhancementId } from '../enhancements';`
- константы и типы:
```ts
export const ENHANCEMENT_OFFER_COUNT = 2;
export const ENHANCEMENT_CARD_CHOICES = 3;
const DURAK_MIN_RANK = 6;

export type EnhancementOffer = {
  readonly enhancementId: EnhancementId;
  readonly price: number;
  /** The player picks one of these cards to carry the enhancement. */
  readonly cardIds: readonly string[];
};
```
- `ShopState`: `{ readonly offers: …; readonly enhancementOffers: readonly (EnhancementOffer | null)[]; readonly rerollCost: number }`
- `ShopError` + `| 'cardNotOffered'`
- добавить:
```ts
function rollEnhancementOffers(rng: RngState): readonly [readonly EnhancementOffer[], RngState] {
  const [ids, afterIds] = shuffle(ENHANCEMENT_IDS, rng);
  return ids.slice(0, ENHANCEMENT_OFFER_COUNT).reduce<readonly [readonly EnhancementOffer[], RngState]>(
    ([offers, current], enhancementId) => {
      const [cards, next] = shuffle(createDeck(DURAK_MIN_RANK), current);
      const cardIds = cards.slice(0, ENHANCEMENT_CARD_CHOICES).map((card) => card.id);
      return [[...offers, { enhancementId, price: ENHANCEMENTS[enhancementId].price, cardIds }], next];
    },
    [[], afterIds],
  );
}

export function buyEnhancement(
  shop: ShopState,
  coins: number,
  profile: DeckProfile,
  index: number,
  cardId: string,
): Result<{ readonly shop: ShopState; readonly coins: number; readonly profile: DeckProfile }, ShopError> {
  const offer = shop.enhancementOffers[index];
  if (!offer) return err('noOffer');
  if (!offer.cardIds.includes(cardId)) return err('cardNotOffered');
  if (coins < offer.price) return err('notEnoughCoins');
  return ok({
    shop: { ...shop, enhancementOffers: shop.enhancementOffers.map((current, i) => (i === index ? null : current)) },
    coins: coins - offer.price,
    profile: withEnhancement(profile, cardId, offer.enhancementId),
  });
}
```
- `createShop`:
```ts
export function createShop(rng: RngState, owned: readonly PerkId[]): readonly [ShopState, RngState] {
  const [offers, afterPerks] = rollOffers(rng, owned);
  const [enhancementOffers, next] = rollEnhancementOffers(afterPerks);
  return [{ offers, enhancementOffers, rerollCost: BASE_REROLL_COST }, next];
}
```
- в `rerollShop` после `rollOffers`: `const [enhancementOffers, afterEnhancements] = rollEnhancementOffers(next);`, вернуть `shop: { offers, enhancementOffers, rerollCost: shop.rerollCost + 1 }` и `rng: afterEnhancements`.

`runSchema.ts`: `reward` + `cardBonus: count`; `shop` + `enhancementOffers: z.array(z.object({ enhancementId: enhancement, price: count, cardIds: z.array(z.string()) }).nullable()),`. `messages.ts` + `cardNotOffered: 'Эту карту нельзя выбрать',`.

`run.ts` (чтобы typecheck был зелёным): в `leaveFight` в `fightReward({...})` добавить `cardCoins: fight.cardCoins.player,`.

- [ ] **Step 3:** `npm run coverage && npm run typecheck` → PASS. Commit: `feat: shop sells enhancements on one of three offered cards; Монетная pays in rewards`.

---

### Task 6: Профили в забеге и у соперников

**Files:** Modify `packages/durak/src/content/enemies.ts`, `packages/durak/src/run/run.ts`, `apps/web/src/games/durak/runSchema.ts`; Test `packages/durak/src/run/run.test.ts`.

**Produces:** `EnemySpec.profile: DeckProfile`; `RunState.profile: DeckProfile`; `RunAction` + `{ type: 'buyEnhancement'; index: number; cardId: string }`; бой получает `profiles: { player: run.profile, enemy: spec.profile }`.

- [ ] **Step 1: Падающие тесты** — дописать в конец `run.test.ts`:
```ts
describe('deck profiles in a run', () => {
  it('starts with an empty player profile and gives every enemy its own profile', () => {
    const run = createRun(1);
    expect(run.profile).toEqual({});
    expect(run.phase.kind === 'fight' && run.phase.fight.round.profiles).toEqual({ player: {}, enemy: enemyAt(0).profile });
    expect(Object.keys(enemyAt(5).profile).length).toBeGreaterThan(Object.keys(enemyAt(0).profile).length);
  });

  it('a bought enhancement lands in the profile and in the next fight', () => {
    const shop = { ...inShop(createRun(1)), coins: 20 };
    if (shop.phase.kind !== 'shop') throw new Error('not in shop');
    const offer = shop.phase.shop.enhancementOffers[0]!;
    const cardId = offer.cardIds[1]!;
    const bought = expectOk(applyRunAction(shop, { type: 'buyEnhancement', index: 0, cardId }));
    expect(bought.profile).toEqual({ [cardId]: offer.enhancementId });
    expect(bought.coins).toBe(20 - offer.price);
    const next = expectOk(applyRunAction(bought, { type: 'leaveShop' }));
    expect(next.phase.kind === 'fight' && next.phase.fight.round.profiles.player).toEqual({ [cardId]: offer.enhancementId });
  });

  it('cannot buy enhancements during a fight', () => {
    expect(applyRunAction(createRun(1), { type: 'buyEnhancement', index: 0, cardId: 'clubs-7' })).toEqual({
      ok: false,
      error: 'wrongPhase',
    });
  });
});
```
Run: `npx vitest run packages/durak/src/run/run.test.ts` → FAIL.

- [ ] **Step 2: Реализация.**
`content/enemies.ts`: импорт `import type { DeckProfile } from '../enhancements';`; в `EnemySpec` добавить `readonly profile: DeckProfile;`; расписание:
```ts
export const RUN_SCHEDULE: readonly EnemySpec[] = [
  { name: 'Скупой', tier: 'normal', hp: 6, style: 'stingy', profile: { 'diamonds-14': 'sturdy' } },
  { name: 'Задира', tier: 'strong', hp: 8, style: 'aggressive', profile: { 'clubs-13': 'golden', 'spades-12': 'sharp' } },
  {
    name: 'Босс круга 1',
    tier: 'boss',
    hp: 10,
    style: 'aggressive',
    profile: { 'hearts-14': 'golden', 'spades-14': 'sharp', 'clubs-11': 'heavy' },
  },
  {
    name: 'Скряга',
    tier: 'normal',
    hp: 8,
    style: 'stingy',
    profile: { 'diamonds-13': 'coin', 'hearts-12': 'sturdy', 'clubs-10': 'sharp' },
  },
  {
    name: 'Громила',
    tier: 'strong',
    hp: 10,
    style: 'aggressive',
    profile: { 'spades-13': 'golden', 'spades-11': 'golden', 'diamonds-12': 'sharp', 'hearts-10': 'heavy' },
  },
  {
    name: 'Босс круга 2',
    tier: 'boss',
    hp: 12,
    style: 'aggressive',
    profile: { 'hearts-13': 'golden', 'diamonds-14': 'sharp', 'clubs-14': 'sharp', 'spades-10': 'heavy', 'hearts-11': 'sturdy' },
  },
];
```
`run/run.ts`:
- импорты: `import type { DeckProfile } from '../enhancements';`; `buyEnhancement` в импорт из `./shop`;
- `RunState` после `perks` — `/** The player's version of the shared deck. */ readonly profile: DeckProfile;`
- `RunAction` + `| { readonly type: 'buyEnhancement'; readonly index: number; readonly cardId: string }`
- `createRun`: в объект добавить `profile: {},`
- в `applyRunAction` добавить case:
```ts
    case 'buyEnhancement':
      return inShop(state, (phase) => {
        const result = buyEnhancement(phase.shop, state.coins, state.profile, action.index, action.cardId);
        if (!result.ok) return result;
        const { shop, coins, profile } = result.value;
        return ok({ ...state, coins, profile, phase: { ...phase, shop } });
      });
```
- в `startFight` в `createFight({...})` добавить `profiles: { player: state.profile, enemy: enemyAt(state.stage).profile },`.

`runSchema.ts`: в `run` добавить `profile,`.

- [ ] **Step 3:** `npm run coverage && npm run typecheck` → PASS (симуляция забега тоже). Commit: `feat: run keeps the player's deck profile; enemies bring their own enhanced cards`.

---

### Task 7: UI — значки, диагональная карта, усиления в магазине

**Files:** Modify `apps/web/src/components/CardView.tsx` (полная замена), `apps/web/src/games/durak/DurakFightScreen.tsx`, `TableView.tsx`, `ShopScreen.tsx`, `apps/web/src/screens/MenuScreen.tsx`, `apps/web/src/styles.css`.

- [ ] **Step 1: CardView** (полная замена):
```tsx
import { isRedSuit, rankLabel, SUIT_NAMES, SUIT_SYMBOLS, type Card } from '@game/core';
import { ENHANCEMENTS, type CardEnhancements, type EnhancementSource } from '@game/durak';
import { motion } from 'motion/react';

const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 35 } as const;

type CardViewProps = {
  readonly card: Card;
  readonly playable?: boolean;
  readonly trump?: boolean;
  readonly enhancements?: CardEnhancements;
  readonly onTap?: () => void;
  /** When both enhancements are available, each half of the card plays the card with that enhancement. */
  readonly onTapOption?: (use: EnhancementSource) => void;
};

function Badge({ source, short }: { readonly source: EnhancementSource; readonly short: string }) {
  return <span className={`card__badge card__badge--${source}`}>{short}</span>;
}

export function CardView({ card, playable = false, trump = false, enhancements, onTap, onTapOption }: CardViewProps) {
  const classes = [
    'card',
    isRedSuit(card.suit) ? 'card--red' : 'card--black',
    playable ? 'card--playable' : '',
    trump ? 'card--trump' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const label = `${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`;
  const own = enhancements?.own;
  const foreign = enhancements?.foreign;
  const face = (
    <>
      <span className="card__rank">{rankLabel(card.rank)}</span>
      <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </>
  );

  if (own && foreign) {
    return (
      <motion.div layoutId={card.id} transition={CARD_SPRING} className={`${classes} card--split`} aria-label={label}>
        {face}
        <button
          type="button"
          className="card__half card__half--own"
          disabled={!onTapOption}
          onClick={() => onTapOption?.('own')}
          aria-label={`${label}: ${ENHANCEMENTS[own].name} (твоё)`}
        >
          <Badge source="own" short={ENHANCEMENTS[own].short} />
        </button>
        <button
          type="button"
          className="card__half card__half--foreign"
          disabled={!onTapOption}
          onClick={() => onTapOption?.('foreign')}
          aria-label={`${label}: ${ENHANCEMENTS[foreign].name} (соперника)`}
        >
          <Badge source="foreign" short={ENHANCEMENTS[foreign].short} />
        </button>
      </motion.div>
    );
  }

  const single = own ?? foreign;
  return (
    <motion.button
      type="button"
      layoutId={card.id}
      transition={CARD_SPRING}
      className={classes}
      onClick={onTap}
      disabled={!onTap}
      aria-label={single ? `${label}: ${ENHANCEMENTS[single].name}` : label}
    >
      {face}
      {single && <Badge source={own ? 'own' : 'foreign'} short={ENHANCEMENTS[single].short} />}
    </motion.button>
  );
}

type CardBackProps = { readonly layoutId?: string };

export function CardBack({ layoutId }: CardBackProps) {
  return <motion.div layoutId={layoutId} transition={CARD_SPRING} className="card card--back" aria-hidden="true" />;
}
```
Экспортировать из `@game/durak` нужные `cardEnhancements`, `CardEnhancements`, `EnhancementSource` — `packages/durak/src/index.ts` + `export * from './origin';`.

- [ ] **Step 2: Экран боя.** В `DurakFightScreen.tsx`: импорт `cardEnhancements` и `type EnhancementSource`; заменить `onCardTap` и рендер руки:
```tsx
  const play = (card: Card, use?: EnhancementSource): void => {
    const base = defending ? { type: 'defend' as const, cardId: card.id } : { type: 'attack' as const, cardId: card.id };
    onFightAction(use ? { ...base, use } : base);
  };
```
```tsx
          {round.hands.player.map((card) => {
            const enhancements = cardEnhancements(round, 'player', card);
            const split = Boolean(enhancements.own && enhancements.foreign);
            return (
              <CardView
                key={card.id}
                card={card}
                enhancements={enhancements}
                playable={myTurn && playableIds.has(card.id)}
                trump={isTrumpCard(card, round.trumpSuit, round.boss)}
                onTap={myTurn && !split ? () => play(card) : undefined}
                onTapOption={myTurn && split ? (use) => play(card, use) : undefined}
              />
            );
          })}
```
и `TableView` вызвать как `<TableView table={round.table} attacker={round.attacker} />`.

`TableView.tsx` (полная замена):
```tsx
import type { PlayerId, TablePair } from '@game/durak';
import { CardView } from '../../components/CardView';

type TableViewProps = { readonly table: readonly TablePair[]; readonly attacker: PlayerId };

/** Badges show who played the enhancement: blue — the player, red — the enemy. */
function badge(enhancement: TablePair['attackEnh'], playedByPlayer: boolean) {
  if (!enhancement) return undefined;
  return playedByPlayer ? { own: enhancement } : { foreign: enhancement };
}

export function TableView({ table, attacker }: TableViewProps) {
  const playerAttacks = attacker === 'player';
  return (
    <div className="table" data-testid="table">
      {table.map((pair) => (
        <div key={pair.attack.id} className="table__pair">
          <CardView card={pair.attack} enhancements={badge(pair.attackEnh, playerAttacks)} />
          {pair.defense && (
            <div className="table__defense">
              <CardView card={pair.defense} enhancements={badge(pair.defenseEnh, !playerAttacks)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Магазин.** В `ShopScreen.tsx` импортировать `ENHANCEMENTS`, `makeCard` не нужен — карты берутся из id: добавить хелпер в начало файла:
```tsx
import { createDeck, rankLabel, SUIT_SYMBOLS, type Card } from '@game/core';

const CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(createDeck(6).map((card) => [card.id, card]));

function cardLabel(cardId: string): string {
  const card = CARDS_BY_ID.get(cardId);
  return card ? `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : cardId;
}
```
и после секции «Товары» добавить:
```tsx
      <section className="shop__panel">
        <h3 className="shop__title">Усиления карт</h3>
        {shop.enhancementOffers.map((offer, index) =>
          offer ? (
            <div key={offer.enhancementId} className="shop__enhancement">
              <div>
                <strong>
                  {ENHANCEMENTS[offer.enhancementId].name} — {offer.price}
                </strong>
                <p>{ENHANCEMENTS[offer.enhancementId].description}</p>
              </div>
              <div className="shop__cards">
                {offer.cardIds.map((cardId) => (
                  <button
                    key={cardId}
                    type="button"
                    className="btn btn--small"
                    onClick={() => onAct({ type: 'buyEnhancement', index, cardId })}
                  >
                    {cardLabel(cardId)}
                    {run.profile[cardId] ? ` (заменит ${ENHANCEMENTS[run.profile[cardId]!].short})` : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div key={`sold-enh-${index}`} className="shop__item shop__item--sold">
              Продано
            </div>
          ),
        )}
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">Твоя колода</h3>
        {Object.keys(run.profile).length === 0 && <p className="shop__empty">Усилений пока нет</p>}
        <div className="shop__cards">
          {Object.entries(run.profile).map(([cardId, id]) =>
            id ? (
              <span key={cardId} className="shop__chip">
                {cardLabel(cardId)} — {ENHANCEMENTS[id].name}
              </span>
            ) : null,
          )}
        </div>
      </section>
```
(`ENHANCEMENTS` добавить в импорт из `@game/durak`.)

- [ ] **Step 4: Меню и стили.** В `MenuScreen.tsx` в `menu__rules` дописать: ` Усиления карт: синие — твои, красные — соперника; карту с двумя усилениями разыгрывай тапом по нужной половине.` В `styles.css` дописать:
```css
.card { position: relative; }
.card__badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  padding: 0 3px;
  border-radius: 4px;
  font-size: calc(var(--card-w) * 0.17);
  font-weight: 700;
  color: #ffffff;
}
.card__badge--own { background: #2563eb; }
.card__badge--foreign { background: #dc2626; }
.card--split { cursor: default; }
.card__half {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.card__half:disabled { cursor: default; }
.card__half--own { clip-path: polygon(0 0, 100% 0, 0 100%); background: rgb(37 99 235 / 12%); }
.card__half--foreign { clip-path: polygon(100% 0, 100% 100%, 0 100%); background: rgb(220 38 38 / 12%); }
.card__half--own .card__badge { right: auto; left: 2px; top: auto; bottom: 2px; }
.shop__enhancement { display: flex; flex-direction: column; gap: 6px; }
.shop__enhancement p { margin: 2px 0 0; font-size: 0.8rem; opacity: 0.8; }
.shop__cards { display: flex; flex-wrap: wrap; gap: 6px; }
.shop__chip { padding: 4px 8px; border-radius: 8px; background: rgb(37 99 235 / 25%); font-size: 0.85rem; }
```

- [ ] **Step 5: Проверка.** `npm run typecheck && npm test && npm run build && npm run e2e` → PASS. Ручная проверка (390×844) через правку `localStorage`:
1. Магазин: секция «Усиления карт», 3 кнопки карт у каждого усиления; покупка списывает монеты, карта появляется в «Твоя колода».
2. Бой: карта с твоим усилением — синий значок; карта, взятая со стола с усилением соперника, — красный значок.
3. Карта с двумя усилениями (выставить `round.foreign` и оба профиля) рисуется по диагонали; тап по синей/красной половине кладёт карту с этим усилением (значок на столе соответствующего цвета).
4. «Острая» позволяет отбить карту другой масти.
5. Консоль без ошибок.
Commit: `feat: enhancement badges, split card choice and enhancement shop`.

---

### Task 8: README

- [ ] В `README.md` в «Как играть (дурак)» добавить пункт:
```markdown
- Усиления карт: в магазине покупаешь усиление и выбираешь одну из трёх карт. Добранная карта работает с твоим усилением; взятая со стола приносит усиление соперника. Если на карте оба — тапни нужную половину (синяя — твоё, красная — соперника).
```
`npm run e2e` → PASS. Commit: `docs: explain card enhancements`.
