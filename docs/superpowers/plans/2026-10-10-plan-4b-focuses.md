# Focuses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-fight consumables («фокусы»): 2 slots carried through the run, played on the player's own turn for free; 10 effects (peeks, redeal, swap, suit shift, coins, and hit charges shown on the scoring board); bought from the shelf or a new «Фокусы» pack.

**Architecture:** `packages/durak/src/focus/` holds the catalogue and `applyFocus(fight, id, targets)`, a pure fight transform. The fight gains `focusCharges` (chips, mult, times, shield) consumed by `scoreTake` as new `focus` steps, and `reveal` (enemy hand, top cards) reset each deal. The run gains `focuses` and the actions `useFocus` / `sellFocus`; the shop gains a `focus` item kind and a `focuses` pack kind. Save v9. The web app gets a focus bar in the fight, hand targeting, reveals, charge badges, and shop/pack support.

**Tech Stack:** TypeScript strict monorepo, React 19, motion/react, zod 4, Vitest (node env), Playwright (Pixel 7).

**Spec:** `docs/superpowers/specs/2026-10-10-focuses-design.md`

## Global Constraints

- 2 focus slots; focuses carry between fights; only the player has them.
- Played only on the player's own turn (attack or defense), free, before a card move / «Беру» / «Бито»; never when the deal or the fight is over.
- Catalogue (id · name · rarity · price · effect · targets): peek · Подглядывание · common · 3 · enemy hand face up until the deal ends · 0; foresight · Прорицание · common · 3 · top 3 deck cards visible until the deal ends · 0; redeal · Пересдача · common · 3 · discard 1–2 hand cards, draw as many (fewer if the deck is short) · 1–2; boost · Разгон · common · 3 · +3 mult on your next hit · 0; pad · Набивка · common · 3 · +8 chips on your next hit · 0; shield · Щит · common · 3 · next hit on you ×0.5 · 0; piggy · Копилочка · common · 2 · +4 coins now · 0; swap · Подмена · rare · 5 · swap a hand card with the card under the deck, trump suit unchanged · 1; doubler · Удвоитель · rare · 5 · ×2 on your next hit · 0; suitShift · Смена масти · legendary · 7 · until the deal ends the trump is the chosen hand card's suit · 1.
- Unavailable: redeal — empty deck; swap — no card under the deck, or the chosen card is a trump; suitShift — the chosen card is already the trump suit; any — not your turn, deal over, fight over.
- Charges stack; mult/chips/times apply on your next hit (when the enemy takes), after the cards and before jokers (+ before ×); shield is the last step of the next hit on you; unused charges burn at the end of the fight. Peek, foresight and suit shift last until the deal ends.
- Shop: item kind weights joker 50 / tarot 20 / focus 20 / card 10; pack kinds Джокеры 35 / Таро 30 / Фокусы 20 / Колода 15; focus packs use the same sizes, no repeats, rarity weights; full slots — «Мало места» on the shelf, sell on the opening screen, sell in the shop by tapping a focus slot (half price).
- Save version 9; v8 saves invalid.
- Balance target: plain bot clears circle 1 in 35–45% of runs.
- Russian UI copy; code, comments, commits in English; conventional commits; immutability; files < 400 lines.
- Out of scope: enemy focuses, reactions on the enemy's turn, vouchers, joker drag-and-drop, UI polish.

## Review Focus

- A focus pressed while it is not the player's turn, or while the scoring board plays: «Сыграть» disabled and the engine refuses — pinned in Task 1 (unit) and Task 6 (`myTurn` gate).
- Пересдача / Подмена near the end of the deck (1 card left, only the trump card left, empty deck): no lost or duplicated cards — pinned in Task 1 with card-count invariants.
- Charges across deals and fights: survive a new deal, burn when the fight ends, never apply to the enemy's hits — pinned in Task 2.
- Reload with charges / reveals / focuses in the save: everything comes back — pinned by the v9 round-trip in Task 4.
- Full focus slots in a focus pack: the pick is refused, selling a focus on the opening screen makes it possible — pinned in Task 3 (unit) and Task 5 (`canTake`).

---

### Task 1: Focus catalogue and `applyFocus`

**Files:**
- Create: `packages/durak/src/focus/catalog.ts`, `packages/durak/src/focus/apply.ts`, `packages/durak/src/focus/apply.test.ts`
- Modify: `packages/durak/src/fight.ts` (fields `focusCharges`, `reveal`; reset `reveal` in `nextRound`), `packages/durak/src/fight.test.ts`
- Modify: `packages/durak/src/index.ts` (`export * from './focus/catalog'; export * from './focus/apply';`)

**Interfaces:**
- Produces:

```ts
// catalog.ts
export const FOCUS_IDS = ['peek', 'foresight', 'redeal', 'boost', 'pad', 'shield', 'piggy', 'swap', 'doubler', 'suitShift'] as const;
export type FocusId = (typeof FOCUS_IDS)[number];
export type FocusDef = { readonly id: FocusId; readonly name: string; readonly description: string; readonly rarity: Rarity; readonly price: number; readonly minTargets: number; readonly maxTargets: number };
export const FOCUSES: Readonly<Record<FocusId, FocusDef>>;
export const MAX_FOCUSES = 2; export const BOOST_MULT = 3; export const PAD_CHIPS = 8; export const SHIELD_TIMES = 0.5; export const DOUBLER_TIMES = 2; export const PIGGY_COINS = 4; export const FORESIGHT_CARDS = 3;
export const focusWeight: (id: FocusId) => number;
// fight.ts
export type FocusCharges = { readonly chips: number; readonly mult: number; readonly times: number; readonly shield: number };
export const NO_CHARGES: FocusCharges; // { chips: 0, mult: 0, times: 1, shield: 1 }
export type Reveal = { readonly enemyHand: boolean; readonly topCards: number };
export const NO_REVEAL: Reveal; // { enemyHand: false, topCards: 0 }
// FightState gains: readonly focusCharges: FocusCharges; readonly reveal: Reveal;
// apply.ts
export type FocusError = 'notYourTurn' | 'fightOver' | 'roundOver' | 'badTargets' | 'focusUnavailable';
export type FocusOutcome = { readonly fight: FightState; readonly coins: number };
export function focusReady(fight: FightState, id: FocusId): boolean; // turn + deck conditions, ignoring targets
export function applyFocus(fight: FightState, id: FocusId, targets: readonly string[]): Result<FocusOutcome, FocusError>;
```

- [ ] **Step 1: Write the failing tests** — `apply.test.ts`:

```ts
import { makeCard, type Card } from '@game/core';
import { describe, expect, it } from 'vitest';
import { createFight, NO_CHARGES, NO_REVEAL, type FightState } from '../fight';
import type { RoundState } from '../types';
import { applyFocus, focusReady } from './apply';
import { FOCUS_IDS, FOCUSES } from './catalog';

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

const c = (suit: Card['suit'], rank: Card['rank']): Card => makeCard(suit, rank);

/** A fight on the player's attack with a known hand, deck and trump. */
function fightWith(round: Partial<RoundState> = {}): FightState {
  const base = createFight({ seed: 1, playerHp: 40, enemyHp: 15 });
  const trumpCard = c('spades', 6);
  return {
    ...base,
    round: {
      ...base.round,
      hands: { player: [c('hearts', 7), c('clubs', 9), c('spades', 12)], enemy: [c('diamonds', 8), c('hearts', 10)] },
      deck: [c('clubs', 6), c('diamonds', 11), c('hearts', 14), c('clubs', 13), trumpCard],
      trumpCard,
      trumpSuit: 'spades',
      table: [],
      attacker: 'player',
      outcome: null,
      ...round,
    },
  };
}

const cardCount = (f: FightState): number => f.round.hands.player.length + f.round.hands.enemy.length + f.round.deck.length + f.round.discardCount;

describe('focus catalogue', () => {
  it('has the 10 focuses of the spec with their rarities and prices', () => {
    expect(FOCUS_IDS).toHaveLength(10);
    expect(FOCUSES.piggy.price).toBe(2);
    expect(FOCUSES.swap.rarity).toBe('rare');
    expect(FOCUSES.doubler.rarity).toBe('rare');
    expect(FOCUSES.suitShift.rarity).toBe('legendary');
    expect(FOCUSES.suitShift.price).toBe(7);
  });
});

describe('a new fight', () => {
  it('starts with no charges and nothing revealed', () => {
    const fight = createFight({ seed: 1, playerHp: 40, enemyHp: 15 });
    expect(fight.focusCharges).toEqual(NO_CHARGES);
    expect(fight.reveal).toEqual(NO_REVEAL);
  });
});

describe('when a focus can be played', () => {
  it('only on the player turn, in a live deal and fight', () => {
    expect(focusReady(fightWith(), 'boost')).toBe(true);
    expect(applyFocus(fightWith({ attacker: 'enemy' }), 'boost', [])).toEqual({ ok: false, error: 'notYourTurn' });
    expect(applyFocus(fightWith({ outcome: { loser: 'enemy', cardsLeft: 2 } }), 'boost', [])).toEqual({ ok: false, error: 'roundOver' });
    expect(applyFocus({ ...fightWith(), winner: 'player' }, 'boost', [])).toEqual({ ok: false, error: 'fightOver' });
  });

  it('refuses targets of the wrong count, repeated, or not in the hand', () => {
    expect(applyFocus(fightWith(), 'redeal', [])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'redeal', ['hearts-7', 'clubs-9', 'spades-12'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'redeal', ['hearts-7', 'hearts-7'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'swap', ['diamonds-8'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyFocus(fightWith(), 'boost', ['hearts-7'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('information focuses', () => {
  it('Подглядывание opens the enemy hand, Прорицание the top 3 cards', () => {
    expect(expectOk(applyFocus(fightWith(), 'peek', [])).fight.reveal).toEqual({ enemyHand: true, topCards: 0 });
    expect(expectOk(applyFocus(fightWith(), 'foresight', [])).fight.reveal).toEqual({ enemyHand: false, topCards: 3 });
  });
});

describe('Пересдача', () => {
  it('discards the chosen cards and draws as many from the top', () => {
    const { fight } = expectOk(applyFocus(fightWith(), 'redeal', ['hearts-7', 'clubs-9']));
    expect(fight.round.hands.player.map((card) => card.id)).toEqual(['spades-12', 'clubs-6', 'diamonds-11']);
    expect(fight.round.deck.map((card) => card.id)).toEqual(['hearts-14', 'clubs-13', 'spades-6']);
    expect(fight.round.discardCount).toBe(2);
    expect(cardCount(fight)).toBe(cardCount(fightWith()));
  });

  it('draws fewer when the deck is short, taking the trump card last', () => {
    const short = fightWith({ deck: [c('spades', 6)] });
    const { fight } = expectOk(applyFocus(short, 'redeal', ['hearts-7', 'clubs-9']));
    expect(fight.round.hands.player.map((card) => card.id)).toEqual(['spades-12', 'spades-6']);
    expect(fight.round.deck).toEqual([]);
    expect(cardCount(fight)).toBe(cardCount(short));
  });

  it('is unavailable with an empty deck', () => {
    expect(focusReady(fightWith({ deck: [] }), 'redeal')).toBe(false);
    expect(applyFocus(fightWith({ deck: [] }), 'redeal', ['hearts-7'])).toEqual({ ok: false, error: 'focusUnavailable' });
  });
});

describe('Подмена', () => {
  it('swaps a hand card with the card under the deck, keeping the trump suit', () => {
    const { fight } = expectOk(applyFocus(fightWith(), 'swap', ['hearts-7']));
    expect(fight.round.hands.player.map((card) => card.id)).toEqual(['spades-6', 'clubs-9', 'spades-12']);
    expect(fight.round.deck.at(-1)?.id).toBe('hearts-7');
    expect(fight.round.trumpCard.id).toBe('hearts-7');
    expect(fight.round.trumpSuit).toBe('spades');
    expect(cardCount(fight)).toBe(cardCount(fightWith()));
  });

  it('is unavailable with no card under the deck, or for a trump', () => {
    expect(applyFocus(fightWith({ deck: [] }), 'swap', ['hearts-7'])).toEqual({ ok: false, error: 'focusUnavailable' });
    expect(applyFocus(fightWith(), 'swap', ['spades-12'])).toEqual({ ok: false, error: 'focusUnavailable' });
  });
});

describe('Смена масти', () => {
  it('makes the chosen card suit the trump until the deal ends', () => {
    expect(expectOk(applyFocus(fightWith(), 'suitShift', ['hearts-7'])).fight.round.trumpSuit).toBe('hearts');
  });

  it('is unavailable for a card already of the trump suit', () => {
    expect(applyFocus(fightWith(), 'suitShift', ['spades-12'])).toEqual({ ok: false, error: 'focusUnavailable' });
  });
});

describe('charges and coins', () => {
  it('Разгон, Набивка, Удвоитель and Щит charge the next hits and stack', () => {
    const once = expectOk(applyFocus(fightWith(), 'boost', [])).fight;
    const twice = expectOk(applyFocus(once, 'boost', [])).fight;
    expect(twice.focusCharges.mult).toBe(6);
    expect(expectOk(applyFocus(fightWith(), 'pad', [])).fight.focusCharges.chips).toBe(8);
    const doubled = expectOk(applyFocus(expectOk(applyFocus(fightWith(), 'doubler', [])).fight, 'doubler', [])).fight;
    expect(doubled.focusCharges.times).toBe(4);
    expect(expectOk(applyFocus(fightWith(), 'shield', [])).fight.focusCharges.shield).toBe(0.5);
  });

  it('Копилочка gives 4 coins and leaves the fight as it was', () => {
    const before = fightWith();
    const out = expectOk(applyFocus(before, 'piggy', []));
    expect(out.coins).toBe(4);
    expect(out.fight).toEqual(before);
  });

  it('a played focus costs no turn', () => {
    expect(expectOk(applyFocus(fightWith(), 'peek', [])).fight.round.attacker).toBe('player');
  });
});
```

Add to `packages/durak/src/fight.test.ts` (reuse its imports; add `NO_REVEAL` and `applyFightAction` if missing):

```ts
describe('reveals', () => {
  it('end with the deal', () => {
    const fight = createFight({ seed: 3, playerHp: 40, enemyHp: 15 });
    const revealed = { ...fight, reveal: { enemyHand: true, topCards: 3 }, round: { ...fight.round, outcome: { loser: 'enemy' as const, cardsLeft: 1 } } };
    const result = applyFightAction(revealed, 'player', { type: 'nextRound' });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.reveal).toEqual(NO_REVEAL);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak/src/focus packages/durak/src/fight.test.ts`
Expected: FAIL — cannot resolve `./apply` / `./catalog`; `NO_REVEAL` not exported.

- [ ] **Step 3: Implement** — `catalog.ts`:

```ts
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
```

In `fight.ts` add (exported) and wire:

```ts
/** Focus charges waiting for the next hit: chips / mult / × on the player's next hit, shield on the next hit on the player. */
export type FocusCharges = { readonly chips: number; readonly mult: number; readonly times: number; readonly shield: number };
export const NO_CHARGES: FocusCharges = { chips: 0, mult: 0, times: 1, shield: 1 };
/** What the player sees until the deal ends (Подглядывание, Прорицание). */
export type Reveal = { readonly enemyHand: boolean; readonly topCards: number };
export const NO_REVEAL: Reveal = { enemyHand: false, topCards: 0 };
```

`FightState` gains `readonly focusCharges: FocusCharges;` and `readonly reveal: Reveal;`; `createFight` sets `focusCharges: NO_CHARGES, reveal: NO_REVEAL`; `nextRound` returns `{ ...state, …, reveal: NO_REVEAL }`.

`apply.ts`:

```ts
import { err, ok, type Card, type Result } from '@game/core';
import type { FightState } from '../fight';
import { currentActor } from '../rules';
import { BOOST_MULT, DOUBLER_TIMES, FOCUSES, FORESIGHT_CARDS, PAD_CHIPS, PIGGY_COINS, SHIELD_TIMES, type FocusId } from './catalog';

export type FocusError = 'notYourTurn' | 'fightOver' | 'roundOver' | 'badTargets' | 'focusUnavailable';
export type FocusOutcome = { readonly fight: FightState; readonly coins: number };

const NEEDS_DECK: ReadonlySet<FocusId> = new Set(['redeal', 'swap']);

function turnError(fight: FightState): FocusError | null {
  if (fight.winner) return 'fightOver';
  if (fight.round.outcome) return 'roundOver';
  return currentActor(fight.round) === 'player' ? null : 'notYourTurn';
}

/** Whether the focus can be played now, before any target is chosen. */
export function focusReady(fight: FightState, id: FocusId): boolean {
  return turnError(fight) === null && (!NEEDS_DECK.has(id) || fight.round.deck.length > 0);
}

function pickTargets(fight: FightState, id: FocusId, targets: readonly string[]): readonly Card[] | null {
  const { minTargets, maxTargets } = FOCUSES[id];
  if (targets.length < minTargets || targets.length > maxTargets || new Set(targets).size !== targets.length) return null;
  const hand = fight.round.hands.player;
  const cards = targets.map((cardId) => hand.find((card) => card.id === cardId));
  return cards.every((card): card is Card => card !== undefined) ? cards : null;
}

const done = (fight: FightState, coins = 0): Result<FocusOutcome, FocusError> => ok({ fight, coins });

function redeal(fight: FightState, cards: readonly Card[]): Result<FocusOutcome, FocusError> {
  const { round } = fight;
  const ids = new Set(cards.map((card) => card.id));
  const drawn = round.deck.slice(0, cards.length);
  const hand = [...round.hands.player.filter((card) => !ids.has(card.id)), ...drawn];
  return done({
    ...fight,
    round: { ...round, hands: { ...round.hands, player: hand }, deck: round.deck.slice(drawn.length), discardCount: round.discardCount + cards.length },
  });
}

function swap(fight: FightState, card: Card): Result<FocusOutcome, FocusError> {
  const { round } = fight;
  const bottom = round.deck.at(-1);
  if (!bottom || card.suit === round.trumpSuit) return err('focusUnavailable');
  const hand = round.hands.player.map((own) => (own.id === card.id ? bottom : own));
  const deck = [...round.deck.slice(0, -1), card];
  return done({ ...fight, round: { ...round, hands: { ...round.hands, player: hand }, deck, trumpCard: card } });
}

/** Plays a focus for the player on their own turn; `coins` — coins it earns for the run (Копилочка). */
export function applyFocus(fight: FightState, id: FocusId, targets: readonly string[]): Result<FocusOutcome, FocusError> {
  const blocked = turnError(fight);
  if (blocked) return err(blocked);
  const cards = pickTargets(fight, id, targets);
  if (!cards) return err('badTargets');
  if (NEEDS_DECK.has(id) && fight.round.deck.length === 0) return err('focusUnavailable');
  const charges = fight.focusCharges;
  switch (id) {
    case 'peek':
      return done({ ...fight, reveal: { ...fight.reveal, enemyHand: true } });
    case 'foresight':
      return done({ ...fight, reveal: { ...fight.reveal, topCards: FORESIGHT_CARDS } });
    case 'redeal':
      return redeal(fight, cards);
    case 'boost':
      return done({ ...fight, focusCharges: { ...charges, mult: charges.mult + BOOST_MULT } });
    case 'pad':
      return done({ ...fight, focusCharges: { ...charges, chips: charges.chips + PAD_CHIPS } });
    case 'shield':
      return done({ ...fight, focusCharges: { ...charges, shield: charges.shield * SHIELD_TIMES } });
    case 'piggy':
      return done(fight, PIGGY_COINS);
    case 'doubler':
      return done({ ...fight, focusCharges: { ...charges, times: charges.times * DOUBLER_TIMES } });
    case 'swap':
      return swap(fight, cards[0] as Card);
    case 'suitShift': {
      const card = cards[0] as Card;
      if (card.suit === fight.round.trumpSuit) return err('focusUnavailable');
      return done({ ...fight, round: { ...fight.round, trumpSuit: card.suit } });
    }
  }
}
```

Add the two exports to `packages/durak/src/index.ts`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run packages/durak && npm run typecheck`
Expected: unit tests PASS. Typecheck may flag web code that builds a `FightState` literal or reads the save (`runSchema.ts` gains the new fields in Task 4) — ledger any such error and leave it for Task 4.

- [ ] **Step 5: Commit**

```bash
git add packages/durak/src/focus packages/durak/src/fight.ts packages/durak/src/fight.test.ts packages/durak/src/index.ts
git commit -m "feat(durak): focus catalogue and applyFocus — peeks, redeal, swap, suit shift, coins, hit charges"
```

---

### Task 2: Charges in the hit score

**Files:**
- Modify: `packages/durak/src/jokers/score.ts`, `packages/durak/src/jokers/score.test.ts`
- Modify: `packages/durak/src/fight.ts` (`chargeTake` passes and consumes charges), `packages/durak/src/fight.test.ts`

**Interfaces:**
- Consumes: `FocusCharges`, `NO_CHARGES` (Task 1), `FocusId`.
- Produces: `StepSource` gains `{ readonly kind: 'focus'; readonly focus: FocusId }`; `ScoreInput` gains optional `boost?: { readonly chips: number; readonly mult: number; readonly times: number }` (the attacker's charges) and `shield?: number` (the taker's ×, default 1).

- [ ] **Step 1: Write the failing tests** — in `score.test.ts`:

```ts
describe('focus charges', () => {
  it('chips and mult come after the cards and before the jokers, × after them', () => {
    const score = scoreTake(input([t(c(7, 'clubs'))], { boost: { chips: 8, mult: 3, times: 2 } }, ['clubs']));
    const sources = score.steps.map((step) => (step.source.kind === 'focus' ? `focus:${step.source.focus}` : step.source.kind));
    expect(sources).toEqual(['card', 'joker', 'focus:pad', 'focus:boost', 'focus:doubler']);
    // (1 + 3 Трефовик + 8) chips × (1 + 3) mult × 2
    expect(score.damage).toBe(12 * 4 * 2);
  });

  it('neutral charges add no steps', () => {
    const score = scoreTake(input([t(c(7, 'clubs'))], { boost: { chips: 0, mult: 0, times: 1 }, shield: 1 }));
    expect(score.steps.map((step) => step.source.kind)).toEqual(['card']);
  });

  it('a shield is the last step of a hit on the shielded side', () => {
    const score = scoreTake(input([t(c(14, 'clubs')), t(c(14, 'hearts'))], { shield: 0.5 }));
    expect(score.steps.at(-1)?.source).toEqual({ kind: 'focus', focus: 'shield' });
    expect(score.damage).toBe(3);
  });
});
```

The per-card joker Трефовик acts in the card pass, so it precedes the focus steps; the expected source list reflects that.

In `fight.test.ts` add a helper and a test:

```ts
/** Plays one attack card from the attacker and lets `taker` take it. */
function takeBy(fight: FightState, taker: 'player' | 'enemy'): FightState {
  const attacker = taker === 'player' ? 'enemy' : 'player';
  const card = fight.round.hands[attacker][0];
  if (!card) throw new Error('no card to attack with');
  const setUp: FightState = { ...fight, round: { ...fight.round, attacker, table: [], defenderTaking: false, outcome: null } };
  const steps: readonly (readonly [PlayerId, FightAction])[] = [
    [attacker, { type: 'attack', cardId: card.id }],
    [taker, { type: 'take' }],
    [attacker, { type: 'endAttack' }],
  ];
  return steps.reduce((current, [actor, action]) => {
    const result = applyFightAction(current, actor, action);
    if (!result.ok) throw new Error(`${actor} ${action.type}: ${result.error}`);
    return result.value;
  }, setUp);
}

describe('focus charges in a fight', () => {
  it('are spent on the player hit, and the shield on the enemy hit', () => {
    const base = createFight({ seed: 5, playerHp: 40, enemyHp: 50 });
    const charged: FightState = { ...base, focusCharges: { chips: 8, mult: 3, times: 2, shield: 0.5 } };
    const afterPlayerHit = takeBy(charged, 'enemy');
    expect(afterPlayerHit.focusCharges).toEqual({ chips: 0, mult: 0, times: 1, shield: 0.5 });
    expect(afterPlayerHit.lastScore?.steps.some((step) => step.source.kind === 'focus')).toBe(true);
    const afterEnemyHit = takeBy(afterPlayerHit, 'player');
    expect(afterEnemyHit.focusCharges).toEqual(NO_CHARGES);
  });

  it('survive a new deal', () => {
    const base = createFight({ seed: 5, playerHp: 40, enemyHp: 50 });
    const ended: FightState = { ...base, focusCharges: { chips: 8, mult: 0, times: 1, shield: 1 }, round: { ...base.round, outcome: { loser: 'enemy', cardsLeft: 1 } } };
    const result = applyFightAction(ended, 'player', { type: 'nextRound' });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.focusCharges.chips).toBe(8);
  });
});
```

(Import `PlayerId`, `FightAction`, `NO_CHARGES` as needed. If the reducer resolves a take without the attacker's `endAttack` — check `reducer.ts` — drop that step and ledger it.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak/src/jokers/score.test.ts packages/durak/src/fight.test.ts`
Expected: FAIL — no focus steps, `boost`/`shield` ignored, charges not consumed.

- [ ] **Step 3: Implement** — in `score.ts` add `import type { FocusId } from '../focus/catalog';`; `StepSource` gains `| { readonly kind: 'focus'; readonly focus: FocusId }`; `ScoreInput` gains:

```ts
  /** The attacker's focus charges (only the player has them). */
  readonly boost?: { readonly chips: number; readonly mult: number; readonly times: number };
  /** The taker's Щит: × on the final mult (1 — none). */
  readonly shield?: number;
```

`scoreTake` becomes:

```ts
export function scoreTake(input: ScoreInput): TakeScore {
  const start = apply({ chips: 0, mult: 1, steps: [] }, { kind: 'tier' }, times(input.baseMult));
  const afterCards = input.taken.reduce((tally, taken) => scoreCard(tally, taken, input), start);
  const boost = input.boost ?? { chips: 0, mult: 0, times: 1 };
  const afterPad = apply(afterCards, { kind: 'focus', focus: 'pad' }, chips(boost.chips));
  const afterBoost = apply(afterPad, { kind: 'focus', focus: 'boost' }, mult(boost.mult));
  const afterAttack = jokerPass(afterBoost, input.attacker.jokers, 'attacker', (acting) => takeEffect(acting, input));
  const afterDoubler = apply(afterAttack, { kind: 'focus', focus: 'doubler' }, times(boost.times));
  const afterDefense = jokerPass(afterDoubler, input.defender.jokers, 'defender', defenseEffect);
  const final = apply(afterDefense, { kind: 'focus', focus: 'shield' }, times(input.shield ?? 1));
  const damage = Math.max(0, Math.floor(final.chips * final.mult + EPSILON));
  return { chips: final.chips, mult: final.mult, damage, steps: final.steps };
}
```

The × charge (Удвоитель) sits right after the attacker's jokers so additive jokers still count before it — Balatro's «+ before ×»; the test pins this order.

In `fight.ts` `chargeTake`: pass `boost: attacker === 'player' ? state.focusCharges : undefined` and `shield: taker === 'player' ? state.focusCharges.shield : 1` into `scoreTake`, and in `counted` set

```ts
    focusCharges:
      attacker === 'player'
        ? { ...state.focusCharges, chips: 0, mult: 0, times: 1 }
        : { ...state.focusCharges, shield: 1 },
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run packages/durak`
Expected: PASS (existing score and fight tests unchanged).

- [ ] **Step 5: Commit**

```bash
git add packages/durak/src/jokers packages/durak/src/fight.ts packages/durak/src/fight.test.ts
git commit -m "feat(durak): focus charges as scoring steps — chips and mult before jokers, × after, shield last"
```

---

### Task 3: Focuses in the run and the shop

**Files:**
- Modify: `packages/durak/src/shop/packs.ts`, `packages/durak/src/shop/packs.test.ts`
- Modify: `packages/durak/src/run/shop.ts`, `packages/durak/src/run/shop.test.ts`
- Modify: `packages/durak/src/run/run.ts`, `packages/durak/src/run/run.test.ts`

**Interfaces:**
- Consumes: Task 1 (`FOCUS_IDS`, `FOCUSES`, `MAX_FOCUSES`, `focusWeight`, `FocusId`, `applyFocus`, `FocusError`).
- Produces:
  - `PackCard` gains `{ readonly kind: 'focus'; readonly focusId: FocusId }`; `PACK_KINDS = ['jokers', 'arcana', 'focuses', 'deck']`; `PACK_KIND_WEIGHT = { jokers: 35, arcana: 30, focuses: 20, deck: 15 }`.
  - `ITEM_KIND_WEIGHT = { joker: 50, tarot: 20, focus: 20, card: 10 }`.
  - `Purse = TarotSubject & { readonly focuses: readonly FocusId[] }`.
  - `ShopError` gains `'focusSlotsFull' | 'focusNotOwned'`.
  - `export function focusSellPrice(id: FocusId): number; export function sellFocus(purse: Purse, slot: number): Result<Purse, ShopError>;`
  - `RunState` gains `readonly focuses: readonly FocusId[]`; `RunAction` gains `{ type: 'useFocus'; slot: number; targets: readonly string[] }` (fight phase) and `{ type: 'sellFocus'; slot: number }` (shop phase); `RunError` gains `FocusError`.

- [ ] **Step 1: Write the failing tests.** `packs.test.ts` — change the kind-weight test's deck share bounds to `> 0.1` and `< 0.2`, add `{ kind: 'focus', focusId: 'suitShift' }` → `'legendary'` to the `packCardRarity` list and expectation, and add:

```ts
  it('a focus pack holds different focuses', () => {
    const [cards] = rollPackCards(createRng(4), pack({ kind: 'focuses', size: 'big' }), [], {});
    expect(cards.every((card) => card.kind === 'focus')).toBe(true);
    expect(new Set(cards.map((card) => (card.kind === 'focus' ? card.focusId : ''))).size).toBe(5);
  });
```

`shop.test.ts` — the `purse` helper gains `focuses: []`; the «keeps the purse shape» expectation becomes `['coins', 'focuses', 'jokers', 'profile', 'rng']`; add `focusSellPrice`, `sellFocus` to the import from `./shop`; add:

```ts
describe('focuses in the shop', () => {
  it('a shelf focus goes into a free slot, at its catalogue price', () => {
    const focusShop: ShopState = { ...shop, items: [{ card: { kind: 'focus', focusId: 'boost' }, price: 3 }, null] };
    expect(priceOf({ kind: 'focus', focusId: 'boost' })).toBe(3);
    const { purse: paid } = expectOk(buyItem(focusShop, purse(), 0));
    expect(paid.focuses).toEqual(['boost']);
    expect(paid.coins).toBe(17);
    expect(buyItem(focusShop, purse({ focuses: ['peek', 'pad'] }), 0)).toEqual({ ok: false, error: 'focusSlotsFull' });
  });

  it('a focus pack pick needs a free slot; selling one frees it', () => {
    const focusPack = opened({ kind: 'focuses', cards: [{ kind: 'focus', focusId: 'shield' }] });
    const full = purse({ focuses: ['peek', 'pad'] });
    expect(pickFromPack(focusPack, full, 0, [])).toEqual({ ok: false, error: 'focusSlotsFull' });
    const sold = expectOk(sellFocus(full, 0));
    expect(sold.focuses).toEqual(['pad']);
    expect(sold.coins).toBe(20 + focusSellPrice('peek'));
    expect(expectOk(pickFromPack(focusPack, sold, 0, [])).purse.focuses).toEqual(['pad', 'shield']);
    expect(sellFocus(purse(), 0)).toEqual({ ok: false, error: 'focusNotOwned' });
  });

  it('a tarot cast keeps the focuses', () => {
    const arcana = opened({ kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'hermit' }], hand: HAND });
    expect(expectOk(pickFromPack(arcana, purse({ focuses: ['peek'] }), 0, [])).purse.focuses).toEqual(['peek']);
  });
});
```

`run.test.ts` — add:

```ts
describe('focuses in the run', () => {
  const inFight = (focuses: RunState['focuses'], attacker: 'player' | 'enemy'): RunState => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    return { ...run, focuses, phase: { kind: 'fight', fight: { ...run.phase.fight, round: { ...run.phase.fight.round, attacker, table: [] } } } };
  };

  it('a new run has no focuses', () => {
    expect(createRun(1).focuses).toEqual([]);
  });

  it('a focus is played in the fight, leaves its slot, and Копилочка pays the run', () => {
    const myTurn = inFight(['piggy', 'boost'], 'player');
    const used = expectOk(applyRunAction(myTurn, { type: 'useFocus', slot: 0, targets: [] }));
    expect(used.focuses).toEqual(['boost']);
    expect(used.coins).toBe(myTurn.coins + 4);
    const boosted = expectOk(applyRunAction(used, { type: 'useFocus', slot: 0, targets: [] }));
    expect(boosted.focuses).toEqual([]);
    expect(boosted.phase.kind === 'fight' && boosted.phase.fight.focusCharges.mult).toBe(3);
    expect(applyRunAction(boosted, { type: 'useFocus', slot: 0, targets: [] })).toEqual({ ok: false, error: 'focusNotOwned' });
  });

  it('refuses to play a focus on the enemy turn and keeps it', () => {
    expect(applyRunAction(inFight(['peek'], 'enemy'), { type: 'useFocus', slot: 0, targets: [] })).toEqual({ ok: false, error: 'notYourTurn' });
  });

  it('a focus can be sold in the shop, and focuses carry into the next fight', () => {
    const shop = { ...inShop(createRun(1)), focuses: ['shield' as const] };
    expect(expectOk(applyRunAction(shop, { type: 'sellFocus', slot: 0 })).focuses).toEqual([]);
    expect(expectOk(applyRunAction(shop, { type: 'leaveShop' })).focuses).toEqual(['shield']);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak`
Expected: FAIL — `focus` card kind, `sellFocus`, `useFocus`, `focuses` unknown.

- [ ] **Step 3: Implement `packs.ts`:** import `FOCUS_IDS, FOCUSES, focusWeight, type FocusId` from `../focus/catalog`; `PACK_KINDS = ['jokers', 'arcana', 'focuses', 'deck'] as const`; `PACK_KIND_WEIGHT = { jokers: 35, arcana: 30, focuses: 20, deck: 15 }`; `PackCard` gains `| { readonly kind: 'focus'; readonly focusId: FocusId }`; `packCardRarity` gains `case 'focus': return FOCUSES[card.focusId].rarity;`; `rollPackCards` gains:

```ts
    case 'focuses': {
      const [ids, next] = drawUnique(FOCUS_IDS, count, focusWeight, rng);
      return [ids.map((focusId) => ({ kind: 'focus' as const, focusId })), next];
    }
```

- [ ] **Step 4: Implement `run/shop.ts`:** import `FOCUS_IDS, FOCUSES, focusWeight, MAX_FOCUSES, type FocusId` from `../focus/catalog`;
  - `ITEM_KINDS = ['joker', 'tarot', 'focus', 'card'] as const`; `ITEM_KIND_WEIGHT = { joker: 50, tarot: 20, focus: 20, card: 10 }`;
  - `export type Purse = TarotSubject & { readonly focuses: readonly FocusId[] };`
  - `ShopError` gains `| 'focusSlotsFull' | 'focusNotOwned'`;
  - `priceOf` gains `case 'focus': return FOCUSES[card.focusId].price;`;
  - `rollItemCard` gains, before the final tarot fallback:

```ts
  if (kind === 'focus') {
    const [focusId, next] = pickWeighted(FOCUS_IDS, focusWeight, afterKind);
    return [focusId ? { kind: 'focus', focusId } : null, next];
  }
```

  - `take` gains:

```ts
  if (card.kind === 'focus') {
    if (purse.focuses.length >= MAX_FOCUSES) return err('focusSlotsFull');
    return ok({ ...purse, focuses: [...purse.focuses, card.focusId] });
  }
```

  - `castTarot` returns `ok({ ...purse, coins, jokers, profile, rng })` (keeps `focuses`);
  - add:

```ts
export function focusSellPrice(id: FocusId): number {
  return Math.floor(FOCUSES[id].price / 2);
}

export function sellFocus(purse: Purse, slot: number): Result<Purse, ShopError> {
  const id = purse.focuses[slot];
  if (id === undefined) return err('focusNotOwned');
  return ok({ ...purse, coins: purse.coins + focusSellPrice(id), focuses: purse.focuses.filter((_, i) => i !== slot) });
}
```

- [ ] **Step 5: Implement `run.ts`:**
  - imports: `applyFocus, type FocusError` from `../focus/apply`; `type FocusId` from `../focus/catalog`; `sellFocus` from `./shop`;
  - `RunState` gains `/** The player's focuses, ≤ MAX_FOCUSES, carried between fights. */ readonly focuses: readonly FocusId[];`; `createRun` sets `focuses: []`;
  - `RunAction` gains `| { readonly type: 'useFocus'; readonly slot: number; readonly targets: readonly string[] } | { readonly type: 'sellFocus'; readonly slot: number }`;
  - `RunError` becomes `FightError | ShopError | FocusError | 'wrongPhase' | 'fightNotOver'`;
  - `purse(state)` adds `focuses: state.focuses`;
  - cases:

```ts
    case 'useFocus':
      return playFocus(state, action.slot, action.targets);
    case 'sellFocus':
      return inShop(state, () => {
        const result = sellFocus(purse(state), action.slot);
        return result.ok ? ok({ ...state, ...result.value }) : result;
      });
```

```ts
function playFocus(state: RunState, slot: number, targets: readonly string[]): RunResult {
  if (state.phase.kind !== 'fight') return err('wrongPhase');
  const id = state.focuses[slot];
  if (id === undefined) return err('focusNotOwned');
  const result = applyFocus(state.phase.fight, id, targets);
  if (!result.ok) return result;
  const { fight, coins } = result.value;
  return ok({ ...state, coins: state.coins + coins, focuses: state.focuses.filter((_, i) => i !== slot), phase: { kind: 'fight', fight } });
}
```

- [ ] **Step 6: Run to verify**

Run: `npx vitest run packages/durak`
Expected: PASS (the fast-check simulation still passes — the bot ignores focuses until Task 4).

- [ ] **Step 7: Commit**

```bash
git add packages/durak
git commit -m "feat(durak): focuses in the run and the shop — shelf item, focus pack, slots, play and sell actions"
```

---

### Task 4: Bot, save v9 and error copy

**Files:**
- Modify: `packages/durak/src/sim/simulate.ts`, `packages/durak/src/sim/simulate.test.ts`
- Modify: `apps/web/src/games/durak/runSchema.ts`, `apps/web/src/games/durak/runStorage.test.ts`, `apps/web/src/games/durak/messages.ts`

**Interfaces:**
- Produces: `export function botFocus(run: RunState): RunAction | null;` in `sim/simulate.ts`; `SAVE_VERSION = 9`.

- [ ] **Step 1: Write the failing tests** — `simulate.test.ts` (add `botFocus` to the import from `./simulate`; import `createRun, type RunState` from `../run/run`):

```ts
describe('botFocus', () => {
  const inFight = (focuses: RunState['focuses'], attacker: 'player' | 'enemy'): RunState => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    return { ...run, focuses, phase: { kind: 'fight', fight: { ...run.phase.fight, round: { ...run.phase.fight.round, attacker, table: [] } } } };
  };

  it('plays Копилочка at once and boosts at the start of an attack', () => {
    expect(botFocus(inFight(['peek', 'piggy'], 'player'))).toEqual({ type: 'useFocus', slot: 1, targets: [] });
    expect(botFocus(inFight(['boost'], 'player'))).toEqual({ type: 'useFocus', slot: 0, targets: [] });
  });

  it('does nothing on the enemy turn or with focuses it does not play', () => {
    expect(botFocus(inFight(['piggy'], 'enemy'))).toBeNull();
    expect(botFocus(inFight(['peek', 'swap'], 'player'))).toBeNull();
  });

  it('raises a shield when it is its turn to defend', () => {
    const run = inFight(['shield'], 'enemy');
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const { round } = run.phase.fight;
    const card = round.hands.enemy[0];
    if (!card) throw new Error('no enemy card');
    const defending: RunState = {
      ...run,
      phase: { kind: 'fight', fight: { ...run.phase.fight, round: { ...round, table: [{ attack: card, defense: null }], hands: { ...round.hands, enemy: round.hands.enemy.slice(1) } } } },
    };
    expect(botFocus(defending)).toEqual({ type: 'useFocus', slot: 0, targets: [] });
  });
});
```

`runStorage.test.ts` — add:

```ts
  it('round-trips focuses, charges and reveals', () => {
    const run = createRun(7);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const rich: RunState = {
      ...run,
      focuses: ['boost', 'suitShift'],
      phase: { kind: 'fight', fight: { ...run.phase.fight, focusCharges: { chips: 8, mult: 3, times: 2, shield: 0.5 }, reveal: { enemyHand: true, topCards: 3 } } },
    };
    const store = memoryStore();
    saveRun(store, rich);
    expect(loadRun(store)).toEqual({ status: 'ok', run: rich });
  });

  it('rejects saves from version 8', () => {
    const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: 8, run: createRun(1) }) });
    expect(loadRun(store)).toEqual({ status: 'invalid' });
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/durak/src/sim apps/web/src/games/durak/runStorage.test.ts`
Expected: FAIL — `botFocus` missing; v9 fields stripped / v8 accepted.

- [ ] **Step 3: Implement the bot** in `simulate.ts` (import `currentActor` if not imported, `MAX_FOCUSES`, `type FocusId`):

```ts
const ATTACK_FOCUSES: ReadonlySet<FocusId> = new Set(['boost', 'pad', 'doubler']);

/** Plain focus policy: Копилочка at once, Щит when defending, hit boosters at the start of an attack. */
export function botFocus(run: RunState): RunAction | null {
  if (run.phase.kind !== 'fight') return null;
  const { fight } = run.phase;
  const { round } = fight;
  if (fight.winner || round.outcome || currentActor(round) !== 'player') return null;
  const attacking = round.attacker === 'player';
  const slot = run.focuses.findIndex(
    (id) => id === 'piggy' || (id === 'shield' && !attacking) || (attacking && round.table.length === 0 && ATTACK_FOCUSES.has(id)),
  );
  return slot >= 0 ? { type: 'useFocus', slot, targets: [] } : null;
}
```

In `botAction`'s fight branch, right after computing `actor`: `if (actor === 'player') { const focus = botFocus(run); if (focus) return focus; }`. In `shopAction`, after the joker item check and before the packs:

```ts
  const focusItem = shop.items.findIndex((entry) => entry !== null && entry.card.kind === 'focus' && run.focuses.length < MAX_FOCUSES && entry.price <= run.coins);
  if (focusItem >= 0) return { type: 'buyItem', index: focusItem };
```

and in `packAction` add `if (card.kind === 'focus') return run.focuses.length < MAX_FOCUSES ? [{ type: 'pickFromPack', index, targets: [] }] : [];`.

- [ ] **Step 4: Save v9** in `runSchema.ts`: `SAVE_VERSION = 9`; import `FOCUS_IDS, MAX_FOCUSES`; `const focus = z.enum(FOCUS_IDS);`; `stepSource` gains `z.object({ kind: z.literal('focus'), focus })`; `packCard` gains `z.object({ kind: z.literal('focus'), focusId: focus })`; `fight` gains

```ts
  focusCharges: z.object({ chips: z.number(), mult: z.number(), times: z.number().positive(), shield: z.number().positive() }),
  reveal: z.object({ enemyHand: z.boolean(), topCards: count }),
```

`run` gains `focuses: z.array(focus).max(MAX_FOCUSES),`. Add to `ERROR_MESSAGES` in `messages.ts`:

```ts
  focusSlotsFull: 'Оба слота фокусов заняты — продай фокус',
  focusNotOwned: 'Такого фокуса нет',
  focusUnavailable: 'Этот фокус сейчас не сыграть',
```

- [ ] **Step 5: Run to verify**

Run: `npx vitest run packages/durak apps/web/src && npm run typecheck`
Expected: PASS; fix any web literal that builds a `RunState` without `focuses` by adding `focuses: []`.

- [ ] **Step 6: Commit**

```bash
git add packages/durak apps/web/src/games/durak/runSchema.ts apps/web/src/games/durak/runStorage.test.ts apps/web/src/games/durak/messages.ts
git commit -m "feat: focus-playing bot, save v9 with focuses, charges and reveals"
```

---

### Task 5: Shop UI for focuses

**Files:**
- Modify: `apps/web/src/games/durak/shop/shopCopy.ts`, `shopCopy.test.ts`, `PackCardFace.tsx`, `PackOpening.tsx`, `opening.ts`, `opening.test.ts`, `ShopSlot.tsx`
- Create: `apps/web/src/games/durak/shop/OwnedFocuses.tsx`
- Modify: `apps/web/src/games/durak/ShopScreen.tsx`, `apps/web/src/games/durak/shop.css`, `apps/web/src/lab/PacksTab.tsx`

**Interfaces:**
- Consumes: `FOCUSES`, `MAX_FOCUSES`, `FocusId`, `focusSellPrice`, `PackCard` focus kind.
- Produces: `canTake(card, targets, profile, jokers, focuses)` (new last parameter); `PackOpening` props gain `focuses: readonly FocusId[]` and `onSellFocus: (slot: number) => void`; `ShopSlot` gains `blocked?: string | null` (disables the buy button and shows that text); `export const FOCUS_GLYPHS: Readonly<Record<FocusId, string>>` from `PackCardFace.tsx`.

- [ ] **Step 1: Write the failing tests** — `shopCopy.test.ts` (import `FOCUSES` from `@game/durak`, `PACK_NAMES` from `./shopCopy`):

```ts
  it('names and describes a focus, and the focus pack', () => {
    expect(packCardTitle({ kind: 'focus', focusId: 'boost' })).toBe('Разгон');
    expect(packCardText({ kind: 'focus', focusId: 'boost' })).toBe(FOCUSES.boost.description);
    expect(PACK_NAMES.focuses).toBe('Фокусы');
    expect(cardTipLines({ kind: 'focus', focusId: 'boost' }, {}).at(-1)).toEqual(SCORE_HELP);
  });
```

`opening.test.ts` — every `canTake(...)` call gets `[]` as the new last argument; add:

```ts
  it('needs a free focus slot for a focus', () => {
    expect(canTake({ kind: 'focus', focusId: 'peek' }, [], {}, [], [])).toBe(true);
    expect(canTake({ kind: 'focus', focusId: 'peek' }, [], {}, [], ['pad', 'shield'])).toBe(false);
  });
```

Run: `npx vitest run apps/web/src/games/durak/shop` — Expected: FAIL.

- [ ] **Step 2: Implement.**
  - `shopCopy.ts`: `PACK_NAMES` gains `focuses: 'Фокусы'`; `PACK_TEXT` gains `focuses: 'Разыгрываются в бою в свой ход'`; `packCardTitle` / `packCardText` gain `case 'focus': return FOCUSES[card.focusId].name;` / `.description`.
  - `opening.ts`: `canTake(card, targets, profile, jokers, focuses: readonly FocusId[])` gains `if (card.kind === 'focus') return focuses.length < MAX_FOCUSES;`.
  - `PackCardFace.tsx`:

```tsx
export const FOCUS_GLYPHS: Readonly<Record<FocusId, string>> = { peek: '◎', foresight: '✧', redeal: '↻', boost: '▲', pad: '◆', shield: '⬡', piggy: '¤', swap: '⇄', doubler: '×2', suitShift: '♤' };
// … in PackCardFace, before the tarot branch:
  if (card.kind === 'focus') {
    return (
      <span className={`${classes} shop-card--focus`}>
        <span className="shop-card__glyph">{FOCUS_GLYPHS[card.focusId]}</span>
        <span className="shop-card__name">{FOCUSES[card.focusId].name}</span>
      </span>
    );
  }
```

  CSS (`shop.css`): `.shop-card--focus { background: linear-gradient(180deg, #2b6b8f, #12324a); }`.
  - `PackOpening.tsx`: props `focuses`, `onSellFocus`; pass `focuses` to `canTake`; when the selected card is a focus and `focuses.length >= MAX_FOCUSES`, show `«Оба слота заняты — продай фокус:»` and one button per focus `«<name> +<focusSellPrice(id)>»` calling `onSellFocus(slot)`.
  - `ShopSlot.tsx`: `blocked?: string | null` — when set, the buy button is disabled and shows that text instead of `verb` / «Мало монет».
  - `OwnedFocuses.tsx`:

```tsx
import { FOCUSES, focusSellPrice, MAX_FOCUSES, type FocusId, type RunAction } from '@game/durak';
import type { MouseEvent } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import { PixelButton } from '../../../ui/PixelButton';
import { PackCardFace } from './PackCardFace';
import { cardTipLines } from './shopCopy';

function FocusSlot({ id, selected, onSelect }: { readonly id: FocusId; readonly selected: boolean; readonly onSelect: () => void }) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <li className={selected ? 'owned-focus owned-focus--selected' : 'owned-focus'}>
      <button type="button" className="owned__ticket" aria-label={FOCUSES[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <PackCardFace card={{ kind: 'focus', focusId: id }} />
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'focus', focusId: id }, {})} />}
    </li>
  );
}

type OwnedFocusesProps = {
  readonly focuses: readonly FocusId[];
  readonly selected: number | null;
  readonly onSelect: (slot: number | null) => void;
  readonly onAct: (action: RunAction) => void;
};

/** The player's two focus slots in the shop; a tap selects one to sell. */
export function OwnedFocuses({ focuses, selected, onSelect, onAct }: OwnedFocusesProps) {
  const stop = (event: MouseEvent): void => event.stopPropagation();
  const chosen = selected === null ? undefined : focuses[selected];
  return (
    <section className="owned owned--focuses panel" data-testid="owned-focuses" aria-label="Твои фокусы" onClick={stop}>
      <ul className="owned__list">
        {Array.from({ length: MAX_FOCUSES }, (_, slot) => {
          const id = focuses[slot];
          return id ? (
            <FocusSlot key={`${id}-${slot}`} id={id} selected={selected === slot} onSelect={() => onSelect(selected === slot ? null : slot)} />
          ) : (
            <li key={`empty-${slot}`} className="owned-focus" aria-hidden="true">
              <span className="owned__empty" />
            </li>
          );
        })}
      </ul>
      <span className="owned__count">
        {focuses.length}/{MAX_FOCUSES}
      </span>
      {chosen && selected !== null && (
        <div className="owned__actions">
          <PixelButton
            tone="orange"
            small
            onClick={() => {
              onAct({ type: 'sellFocus', slot: selected });
              onSelect(null);
            }}
          >
            Продать {FOCUSES[chosen].name} за {focusSellPrice(chosen)}
          </PixelButton>
        </div>
      )}
    </section>
  );
}
```

  CSS: `.owned--focuses { grid-area: focuses; } .owned-focus { display: flex; align-items: center; justify-content: center; width: 52px; height: 70px; } .owned-focus .shop-card { --slot-h: 66px; --slot-w: 48px; padding: 2px; gap: 1px; } .owned-focus .shop-card__name { font-size: 0.55rem; } .owned-focus--selected .shop-card { outline: 3px solid #ffffff; outline-offset: 2px; }`; `.shop` grid areas: portrait `'side' 'owned' 'focuses' 'panel' 'status'`, wide `'side owned' 'side focuses' 'side panel' 'side status'`.
  - `ShopScreen.tsx`: state `selectedFocus: number | null` (cleared by `clearSelection`; selecting a focus clears the other selections); render `<OwnedFocuses focuses={run.focuses} selected={selectedFocus} onSelect={…} onAct={onAct} />` after `<OwnedJokers>`; pass `focuses={run.focuses}` and `onSellFocus={(slot) => onAct({ type: 'sellFocus', slot })}` to `PackOpening`; for a focus item pass `blocked={item?.card.kind === 'focus' && run.focuses.length >= MAX_FOCUSES ? 'Мало места' : null}` to its `ShopSlot`.
  - `PacksTab.tsx`: bench purse gains `focuses: []`; pass `focuses={bench.purse.focuses}` and `onSellFocus={() => undefined}` to `PackOpening`.

- [ ] **Step 3: Run to verify**

Run: `npx vitest run apps/web/src && npm run typecheck && npm run build`
Expected: PASS, no type errors, build OK.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): focuses in the shop — focus cards, pack, owned focus slots, selling"
```

---

### Task 6: Fight UI — focus bar, targeting, reveals, charges

**Files:**
- Create: `apps/web/src/games/durak/FocusBar.tsx`, `apps/web/src/games/durak/focusView.ts`, `apps/web/src/games/durak/focusView.test.ts`
- Modify: `apps/web/src/games/durak/FightHands.tsx`, `DeckView.tsx`, `DurakFightScreen.tsx`, `DurakRunScreen.tsx`, `fight.css`
- Modify: `apps/web/src/games/durak/scoreTimeline.ts`, `scoreTimeline.test.ts`

**Interfaces:**
- Consumes: `applyFocus`, `focusReady`, `FOCUSES`, `MAX_FOCUSES`, `FocusCharges`, `FocusId`, `NO_CHARGES`; `FOCUS_GLYPHS` (Task 5); `useCardTip`, `CardTip`; `cardTipLines`.
- Produces:

```ts
// focusView.ts
export function chargeBadges(charges: FocusCharges): readonly string[];
export function toggleTarget(picked: readonly string[], cardId: string, max: number): readonly string[];
export function targetHint(id: FocusId): string | null;
// FocusBar.tsx
export type FocusPick = { readonly slot: number; readonly targets: readonly string[] };
export function FocusBar(props: { focuses; fight; myTurn; pick; onPick; onPlay }): JSX.Element;
```

- [ ] **Step 1: Write the failing tests** — `focusView.test.ts`:

```ts
import { NO_CHARGES } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { chargeBadges, targetHint, toggleTarget } from './focusView';

describe('chargeBadges', () => {
  it('shows nothing without charges and each charge otherwise', () => {
    expect(chargeBadges(NO_CHARGES)).toEqual([]);
    expect(chargeBadges({ chips: 8, mult: 3, times: 2, shield: 0.5 })).toEqual(['+8 фишек', '+3 множ.', '×2', 'щит ×0.5']);
  });
});

describe('toggleTarget', () => {
  it('adds up to the limit and removes on a second tap', () => {
    expect(toggleTarget([], 'a', 2)).toEqual(['a']);
    expect(toggleTarget(['a'], 'b', 2)).toEqual(['a', 'b']);
    expect(toggleTarget(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    expect(toggleTarget(['a', 'b'], 'a', 2)).toEqual(['b']);
    expect(toggleTarget(['a'], 'b', 1)).toEqual(['b']);
  });
});

describe('targetHint', () => {
  it('asks for cards only when the focus needs them', () => {
    expect(targetHint('boost')).toBeNull();
    expect(targetHint('redeal')).toBe('Выбери 1–2 карты в руке');
    expect(targetHint('swap')).toBe('Выбери карту в руке');
  });
});
```

`scoreTimeline.test.ts` — add:

```ts
  it('labels a focus step with the focus name and pops it over the player bar', () => {
    const steps: ScoreStep[] = [cardStep(six, 1, 1), { source: { kind: 'focus', focus: 'boost' }, effect: { kind: 'mult', value: 3 }, chips: 1, mult: 4 }];
    const t = scoreTimeline(hit(steps, 'enemy'), 1);
    expect(t.events[1]).toMatchObject({ label: 'Разгон +3 множ.', tone: 'mult', pop: { kind: 'hp', side: 'player' }, bounce: [] });
  });
```

Run: `npx vitest run apps/web/src/games/durak/focusView.test.ts apps/web/src/games/durak/scoreTimeline.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement `focusView.ts`:**

```ts
import { FOCUSES, type FocusCharges, type FocusId } from '@game/durak';
import { formatMult } from './hits';

export function chargeBadges(charges: FocusCharges): readonly string[] {
  return [
    charges.chips > 0 ? `+${charges.chips} фишек` : null,
    charges.mult > 0 ? `+${formatMult(charges.mult)} множ.` : null,
    charges.times !== 1 ? `×${formatMult(charges.times)}` : null,
    charges.shield !== 1 ? `щит ×${formatMult(charges.shield)}` : null,
  ].filter((badge): badge is string => badge !== null);
}

/** One tap adds a card (a single-target focus swaps it), a second tap removes it. */
export function toggleTarget(picked: readonly string[], cardId: string, max: number): readonly string[] {
  if (picked.includes(cardId)) return picked.filter((id) => id !== cardId);
  if (max === 1) return [cardId];
  return picked.length < max ? [...picked, cardId] : picked;
}

export function targetHint(id: FocusId): string | null {
  const { minTargets, maxTargets } = FOCUSES[id];
  if (maxTargets === 0) return null;
  return minTargets === maxTargets ? 'Выбери карту в руке' : `Выбери ${minTargets}–${maxTargets} карты в руке`;
}
```

In `scoreTimeline.ts`: `beatOf` gains `case 'focus': return { pop: { kind: 'hp', side: 'player' }, bounce: [] };`; the event label becomes `s.source.kind === 'focus' ? `${FOCUSES[s.source.focus].name} ${labelOf(s.effect)}` : labelOf(s.effect)` (import `FOCUSES`).

Run: the two test files — Expected: PASS.

- [ ] **Step 3: Implement the UI.**
  - `FightHands.tsx`: `EnemyHand` gains `revealed?: boolean` — when true render `<CardView card={card} />` instead of `<CardBack layoutId={card.id} />` and put `data-revealed="true"` on the `.hand` element. `PlayerHand` gains `targeting?: { readonly picked: readonly string[]; readonly onPick: (card: Card) => void } | null` — when set, every card is `playable`, its `onTap` is `() => targeting.onPick(card)` (split cards included, no `onTapOption`), and the slot of a picked card gets the extra class `hand__slot--picked`.
  - `DeckView.tsx`: `peek?: number` — when `> 0`, render before the deck stack:

```tsx
      {peek > 0 && (
        <div className="deck__peek" data-testid="deck-peek">
          {round.deck.slice(0, Math.min(peek, Math.max(0, round.deck.length - 1))).map((card) => (
            <CardView key={card.id} card={card} />
          ))}
        </div>
      )}
```

  - `FocusBar.tsx`:

```tsx
import { applyFocus, FOCUSES, focusReady, MAX_FOCUSES, type FightState, type FocusId } from '@game/durak';
import { CardTip, useCardTip } from '../../components/CardTip';
import { PixelButton } from '../../ui/PixelButton';
import { targetHint } from './focusView';
import { FOCUS_GLYPHS } from './shop/PackCardFace';
import { cardTipLines } from './shop/shopCopy';

export type FocusPick = { readonly slot: number; readonly targets: readonly string[] };

function FocusChip({ id, selected, onSelect }: { readonly id: FocusId; readonly selected: boolean; readonly onSelect: () => void }) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <li className={selected ? 'focus-chip focus-chip--selected' : 'focus-chip'}>
      <button type="button" className="focus-chip__face" aria-label={FOCUSES[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <span className="focus-chip__glyph">{FOCUS_GLYPHS[id]}</span>
        <span className="focus-chip__name">{FOCUSES[id].name}</span>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'focus', focusId: id }, {})} />}
    </li>
  );
}

type FocusBarProps = {
  readonly focuses: readonly FocusId[];
  readonly fight: FightState;
  /** false while it is not the player's turn or the scoring board plays. */
  readonly myTurn: boolean;
  readonly pick: FocusPick | null;
  readonly onPick: (pick: FocusPick | null) => void;
  readonly onPlay: (pick: FocusPick) => void;
};

/** The two focus slots next to the jokers; a tap selects, «Сыграть» plays it once it is ready and its targets are chosen. */
export function FocusBar({ focuses, fight, myTurn, pick, onPick, onPlay }: FocusBarProps) {
  const id = pick ? focuses[pick.slot] : undefined;
  const ready = Boolean(id && pick && myTurn && focusReady(fight, id) && applyFocus(fight, id, pick.targets).ok);
  const hint = id ? targetHint(id) : null;
  return (
    <section className="focus-bar panel" data-testid="focus-bar" aria-label="Фокусы">
      <ul className="focus-bar__list">
        {Array.from({ length: MAX_FOCUSES }, (_, slot) => {
          const focus = focuses[slot];
          return focus ? (
            <FocusChip key={`${focus}-${slot}`} id={focus} selected={pick?.slot === slot} onSelect={() => onPick(pick?.slot === slot ? null : { slot, targets: [] })} />
          ) : (
            <li key={`empty-${slot}`} className="focus-chip focus-chip--empty" aria-hidden="true" />
          );
        })}
      </ul>
      {id && pick && (
        <div className="focus-bar__actions">
          {hint && <p className="focus-bar__hint">{hint}</p>}
          <PixelButton tone="orange" small disabled={!ready} onClick={() => onPlay(pick)}>
            Сыграть
          </PixelButton>
          <PixelButton tone="blue" small onClick={() => onPick(null)}>
            Отмена
          </PixelButton>
        </div>
      )}
    </section>
  );
}
```

  - `DurakFightScreen.tsx`: new props `focuses: readonly FocusId[]` and `onUseFocus: (slot: number, targets: readonly string[]) => void`; state `const [focusPick, setFocusPick] = useState<FocusPick | null>(null)` reset by `useEffect(() => setFocusPick(null), [fight.roundNumber])`; render `<FocusBar focuses={focuses} fight={fight} myTurn={myTurn} pick={focusPick} onPick={setFocusPick} onPlay={(pick) => { onUseFocus(pick.slot, pick.targets); setFocusPick(null); }} />` right after `<JokerPanel>`; under the player `HpBar`:

```tsx
          {chargeBadges(fight.focusCharges).length > 0 && (
            <p className="charges" data-testid="focus-charges">
              {chargeBadges(fight.focusCharges).map((badge) => (
                <span key={badge} className="chip">
                  {badge}
                </span>
              ))}
            </p>
          )}
```

  `EnemyHand revealed={fight.reveal.enemyHand}`; `DeckView peek={fight.reveal.topCards}`; `PlayerHand targeting={targeting}` where

```tsx
  const pickedId = focusPick ? focuses[focusPick.slot] : undefined;
  const targeting =
    focusPick && pickedId && FOCUSES[pickedId].maxTargets > 0
      ? { picked: focusPick.targets, onPick: (card: Card) => setFocusPick({ ...focusPick, targets: toggleTarget(focusPick.targets, card.id, FOCUSES[pickedId].maxTargets) }) }
      : null;
```

  - `DurakRunScreen.tsx`: pass `focuses={run.focuses}` and `onUseFocus={(slot, targets) => act({ type: 'useFocus', slot, targets })}`.
  - `fight.css` (add; place `.focus-bar` in the side column right under the jokers — in the portrait grid add a `focus` area row after `jokers` in `.fight`'s `grid-template-areas`, and in landscape it follows the joker panel in `.fight__side`; ledger the grid edit):

```css
.focus-bar { grid-area: focus; display: flex; flex-direction: column; gap: 6px; padding: 6px 8px; }
.focus-bar__list { display: flex; gap: 8px; margin: 0; padding: 0; list-style: none; }
.focus-chip { flex: 1; }
.focus-chip--empty { min-height: 2.4em; border: 2px dashed rgb(255 255 255 / 25%); border-radius: 6px; }
.focus-chip__face { display: flex; align-items: center; gap: 6px; width: 100%; padding: 4px 8px; border: 2px solid #000000; border-radius: 6px; background: linear-gradient(180deg, #2b6b8f, #12324a); color: #ffffff; font: inherit; cursor: pointer; }
.focus-chip--selected .focus-chip__face { outline: 3px solid #ffffff; outline-offset: 2px; }
.focus-chip__glyph { font-size: 1.2em; }
.focus-chip__name { font-size: 0.8em; font-weight: 800; }
.focus-bar__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.focus-bar__hint { flex-basis: 100%; margin: 0; font-size: 0.8em; }
.charges { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; }
.hand__slot--picked { translate: 0 -16px; }
.hand__slot--picked .card { outline: 3px solid var(--gold); outline-offset: 2px; }
.deck__peek { display: flex; gap: 4px; }
```

- [ ] **Step 4: Run to verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Manual check** (dev server, inject a v9 shop save with `focuses: ['peek', 'redeal']`, leave the shop, portrait 412×860 and 1280×800): Подглядывание → enemy cards face up; Пересдача → hand cards selectable, «Сыграть» enabled after picking → hand changes; on the enemy's turn «Сыграть» disabled; Разгон → badge «+3 множ.» and «Разгон +3 множ.» on the next scoring board. Ledger anything off.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): focus bar in the fight — tips, targeting in the hand, reveals, charge badges, focus steps on the board"
```

---

### Task 7: End-to-end tests

**Files:**
- Create: `e2e/focuses.spec.ts`
- Modify: `e2e/shop.spec.ts`, `e2e/jokers.spec.ts`, `e2e/landscape.spec.ts` (fixtures: `version: 9`, run `focuses: []`)

- [ ] **Step 1: Update fixtures** — every saved run in the e2e specs gets `focuses: []` and `version: 9`. Run `npx playwright test` — Expected: the 34 existing tests PASS.

- [ ] **Step 2: Write `e2e/focuses.spec.ts`:**

```ts
import { expect, test, type Page } from '@playwright/test';

const REWARD = { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 };

function shopRun(shop: object, patch: object = {}) {
  return {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: [], collected: 0, profile: {}, focuses: [],
    bosses: ['general', 'witch'], phase: { kind: 'shop', shop, reward: REWARD }, ...patch,
  };
}

const EMPTY_SHOP = { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null };

async function open(page: Page, run: object): Promise<void> {
  await page.goto('/');
  await page.evaluate((saved) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
}

/** Leaves the shop and waits until it is the player's turn in the next fight. */
async function toMyTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('focus-bar')).toBeVisible();
  await expect(page.getByRole('status')).not.toHaveText(/Соперник/i, { timeout: 10_000 });
}

test('a shelf focus lands in a focus slot and can be sold', async ({ page }) => {
  await open(page, shopRun({ ...EMPTY_SHOP, items: [{ card: { kind: 'focus', focusId: 'boost' }, price: 3 }, null] }));
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Разгон за 3' }).click();
  const owned = page.getByTestId('owned-focuses');
  await owned.getByRole('button', { name: 'Разгон' }).click();
  await page.getByRole('button', { name: /Продать Разгон за 1/ }).click();
  await expect(owned.getByRole('button', { name: 'Разгон' })).toHaveCount(0);
});

test('Подглядывание opens the enemy hand on the player turn', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['peek'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Подглядывание' }).click();
  await page.getByRole('button', { name: 'Сыграть' }).click();
  await expect(page.getByTestId('enemy-hand')).toHaveAttribute('data-revealed', 'true');
  await expect(page.getByTestId('focus-bar').getByRole('button', { name: 'Подглядывание' })).toHaveCount(0);
});

test('Разгон shows its charge badge', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['boost'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
  await page.getByRole('button', { name: 'Сыграть' }).click();
  await expect(page.getByTestId('focus-charges')).toContainText('+3 множ.');
});

test('Пересдача needs chosen cards before it can be played', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['redeal'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Пересдача' }).click();
  const play = page.getByRole('button', { name: 'Сыграть' });
  await expect(play).toBeDisabled();
  await page.getByTestId('player-hand').locator('.hand__slot').first().click();
  await expect(play).toBeEnabled();
  await play.click();
  await expect(page.getByTestId('focus-bar').getByRole('button', { name: 'Пересдача' })).toHaveCount(0);
});
```

- [ ] **Step 3: Run to verify**

Run: `npx playwright test`
Expected: all PASS (34 + 4). Fix UI bugs under systematic-debugging; ledger test changes.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test(e2e): focuses — buy and sell, Подглядывание, Разгон badge, Пересдача targeting"
```

---

### Task 8: Balance by simulation

**Files:**
- Modify (if numbers change): `packages/durak/src/focus/catalog.ts`, related tests
- Modify: `docs/superpowers/specs/2026-10-10-focuses-design.md` (status, tuned numbers)

- [ ] **Step 1:** Run `npm run simulate 2>&1 | grep -E "^runs|stage 4"`. Circle 1 cleared = `reached` of `stage 4`.
- [ ] **Step 2:** If above 45%, raise Разгон, Набивка, Щит to 4 and Удвоитель to 6; if below 35%, lower them by 1. Re-run after each change, at most 3 rounds; keep tests in sync; record numbers in the ledger.
- [ ] **Step 3:** Run `npm test && npm run typecheck && npx playwright test` — Expected: all PASS.
- [ ] **Step 4:** Set the spec `Статус: реализован (план 4b)` and add the tuning result under §7; commit:

```bash
git add packages/durak docs/superpowers/specs/2026-10-10-focuses-design.md
git commit -m "balance: focus prices checked by simulation"
```
