# Visual Style (Balatro-like pixel art) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the approved card-lab look (pixel sprites, card feel, swirl background, soft sound) into the real game and restyle every screen — menu, settings, fight, shop, run over — in a Balatro-like way.

**Architecture:** Pure pixel-art and layout helpers live in `apps/web/src/ui/` (unit-tested in node, no DOM). React pieces (`CardFace`, `FeelBox`, `PixelCard`, `PixelButton`, `Backdrop`, `SettingsProvider`) are built on them and reused by the game screens and the `?lab` page. Settings (palette, sound, volume) are validated with zod and saved in `localStorage`. Game logic in `packages/*` is untouched.

**Tech Stack:** React 19, Motion (`motion/react`), Vite 8, zod 4, Vitest 5 (node env), Playwright (Pixel 7), @fontsource/pixelify-sans, @fontsource/rubik, WebGL 1, WebAudio.

**Spec:** `docs/superpowers/specs/2026-10-08-visual-style-design.md`

## Global Constraints

- Sprite 50×70 px, cached per `card id + enhancement`; `image-rendering: pixelated`.
- Card feel (owner-tuned): tilt 16°, sway 2°, spring stiffness 490 / damping 9, shadow pixel 4.
- Ranks: Rubik 700 text over the sprite, coloured like the suit. UI font: Pixelify Sans (400/700). Fonts bundled locally via @fontsource (offline PWA).
- Sound: sine waves only, attack 25 ms, master low-pass 900 Hz, default volume 0.35; on/off + volume in settings.
- No shine/glare on cards.
- Palettes: Балатро `['#3b1c32','#b4282d','#f2994a']`, Сукно `['#0b2a22','#1f6b4a','#d9b44a']`, Неон `['#1d2b53','#7e2553','#29adff']`; default Неон; background speed 0.6; without WebGL — static palette gradient.
- Buttons: blue = neutral, red = main fight action, orange = purchases, green = reroll/continue.
- Enhancement art: Золотая gold/sparkles/star, Острая light steel/diagonals/sword, Тяжёлая dark warm stone/brick/anvil, Козырная royal purple/crown, Монетная mint/coin.
- `packages/*` unchanged. Strict TS, immutable updates, files < 400 lines, functions < 50 lines.
- Existing e2e selectors must keep working: button names (`Новый забег`, `Продолжить забег`, `Беру`, `Меню`), heading `Карточный рогалик`, test ids `run-header`, `player-hand`, `enemy-hand`, `deck` (contains «Козырь»), `table`, `shop`, `run-over`, `hit-<label>`, role `status`, role `meter` named `Ты`/`Соперник`, class `.card--playable` on playable hand cards, hand cards are `button`s.

## Review Focus

1. **Huge hands** (20+ cards after several takes) — the hand must stay on screen and every card tappable; covered by `handOverlap` tests in Task 5.
2. **No WebGL / reduced motion** — the background must fall back to the palette gradient and not throw; covered by the guard in `SwirlBackground` (Task 5) and a manual check in Task 10.
3. **Corrupted or foreign settings in localStorage** (bad JSON, wrong types, out-of-range volume, unknown palette names) — must load defaults per field, never crash; covered by `settings.test.ts` (Task 4).
4. **Storage unavailable** (private mode, throwing `localStorage`) — settings still work in memory; covered by broken-store tests (Task 4).
5. **Repeated identical errors** (tapping the same illegal card twice) — the deny sound must play each time; covered by `errorSeq` in Task 8.

---

## File Map

| File | Responsibility |
|---|---|
| `apps/web/src/ui/pixel/pixelArt.ts` (+test) | Grid, colour mix, Bayer dithering, bevel stamp, outlined icon stamp, canvas → data URL |
| `apps/web/src/ui/pixel/cardSprite.ts` (+test) | Card front/back sprites, papers, enhancement icons, URL cache |
| `apps/web/src/ui/pixel/perkEmblem.ts` (+test) | 16×16 perk emblems for shop "jokers" |
| `apps/web/src/storage.ts` | `KeyValueStore`, `browserStore()` shared by run save and settings |
| `apps/web/src/ui/palettes.ts` | Palette ids, names, colours |
| `apps/web/src/ui/settings.ts` (+test) | Settings type, defaults, zod parse, load/save |
| `apps/web/src/ui/sound.ts` | WebAudio synth (moved from lab, + `hit`, `win`) |
| `apps/web/src/ui/SettingsContext.tsx` | Provider, `useSettings()` (settings, update, play) |
| `apps/web/src/ui/fan.ts` (+test) | Hand fan angle/drop and overlap |
| `apps/web/src/ui/usePrevious.ts` | Previous-render value hook |
| `apps/web/src/ui/SwirlBackground.tsx` | WebGL swirl (moved from lab) |
| `apps/web/src/ui/Backdrop.tsx` | Swirl + CRT + fallback gradient, `data-palette` |
| `apps/web/src/ui/FeelBox.tsx` | Sway / tilt / squash wrapper + `FEEL` constants |
| `apps/web/src/ui/CardFace.tsx` | Sprite(s) + rank text, single or diagonal split |
| `apps/web/src/ui/PixelCard.tsx` | Free-standing card (lab, shop): feel + flip + face + label |
| `apps/web/src/ui/PixelButton.tsx` | Coloured button with click sound |
| `apps/web/src/ui/theme.css` | Base, fonts, backdrop, panels, buttons, card face |
| `apps/web/src/screens/SettingsScreen.tsx`, `screens/menu.css` | Settings screen, menu/run-over/settings styles |
| `apps/web/src/components/hpSegments.ts` (+test) | HP segment math |
| `apps/web/src/games/durak/sounds.ts` (+test) | Which sound a state change makes |
| `apps/web/src/games/durak/PerkCard.tsx` | Perk "joker" card for the shop |
| `apps/web/src/games/durak/fight.css`, `shop.css` | Fight and shop styles |
| `apps/web/src/lab/*` | Lab rewired to `ui/`; duplicates deleted |
| `apps/web/src/styles.css` | Deleted (Task 6) |

---

### Task 1: Pixel-art core in `ui/pixel`

**Files:**
- Move: `apps/web/src/lab/pixelArt.ts` → `apps/web/src/ui/pixel/pixelArt.ts`
- Create: `apps/web/src/ui/pixel/pixelArt.test.ts`
- Modify: `apps/web/src/lab/CardSprite.tsx` (import path)

**Interfaces:**
- Produces: `type Grid`, `createGrid(w,h)`, `setPixel`, `getPixel`, `toDataUrl(grid)`, `mix(a,b,t)`, `ditherIndex(t,steps,x,y)`, `stampShaded(grid,mask,ox,oy,scale,base,light,dark,flip?)`, `stampIcon`, `stampOutlinedIcon(grid,rows,palette,ox,oy,scale,outline)` — signatures unchanged from the lab.

- [ ] **Step 1: Move the file and fix the import**

```bash
mkdir -p apps/web/src/ui/pixel
git mv apps/web/src/lab/pixelArt.ts apps/web/src/ui/pixel/pixelArt.ts
```

In `apps/web/src/lab/CardSprite.tsx` replace `from './pixelArt'` with `from '../ui/pixel/pixelArt'`.

- [ ] **Step 2: Write the tests**

`apps/web/src/ui/pixel/pixelArt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGrid, ditherIndex, getPixel, mix, setPixel, stampOutlinedIcon, stampShaded } from './pixelArt';

describe('grid', () => {
  it('ignores writes and reads outside the grid', () => {
    const grid = createGrid(2, 2);
    setPixel(grid, 5, 5, '#ffffff');
    setPixel(grid, -1, 0, '#ffffff');
    expect(grid.data.every((c) => c === null)).toBe(true);
    expect(getPixel(grid, 2, 0)).toBeNull();
  });
});

describe('mix', () => {
  it('returns the ends at 0 and 1 and the midpoint at 0.5', () => {
    expect(mix('#102030', '#f0e0d0', 0)).toBe('#102030');
    expect(mix('#102030', '#f0e0d0', 1)).toBe('#f0e0d0');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('ditherIndex', () => {
  const block = (t: number) =>
    Array.from({ length: 16 }, (_, i) => ditherIndex(t, 4, i % 4, Math.floor(i / 4)));

  it('stays on the first and last step at the ends', () => {
    expect(new Set(block(0))).toEqual(new Set([0]));
    expect(new Set(block(1))).toEqual(new Set([3]));
  });

  it('mixes two neighbouring steps in between', () => {
    expect(new Set(block(0.5))).toEqual(new Set([1, 2]));
  });
});

describe('stampShaded', () => {
  it('lights the top-left edge and shades the bottom-right edge', () => {
    const grid = createGrid(4, 4);
    stampShaded(grid, ['XX', 'XX'], 0, 0, 2, 'B', 'L', 'D');
    expect(getPixel(grid, 0, 0)).toBe('L');
    expect(getPixel(grid, 1, 1)).toBe('B');
    expect(getPixel(grid, 3, 3)).toBe('D');
  });

  it('flips the mask upside down', () => {
    const grid = createGrid(2, 2);
    stampShaded(grid, ['X.', '..'], 0, 0, 1, 'B', 'L', 'D', true);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, 1, 1)).not.toBeNull();
  });
});

describe('stampOutlinedIcon', () => {
  it('outlines the icon on painted pixels only', () => {
    const grid = createGrid(5, 5);
    for (let i = 0; i < 25; i++) setPixel(grid, i % 5, Math.floor(i / 5), '#ffffff');
    stampOutlinedIcon(grid, ['A'], { A: '#ff0000' }, 2, 2, 1, '#000000');
    expect(getPixel(grid, 2, 2)).toBe('#ff0000');
    expect([getPixel(grid, 1, 2), getPixel(grid, 3, 2), getPixel(grid, 2, 1), getPixel(grid, 2, 3)]).toEqual([
      '#000000',
      '#000000',
      '#000000',
      '#000000',
    ]);
    expect(getPixel(grid, 1, 1)).toBe('#ffffff');
  });

  it('leaves transparent pixels transparent', () => {
    const grid = createGrid(3, 3);
    stampOutlinedIcon(grid, ['A'], { A: '#ff0000' }, 1, 1, 1, '#000000');
    expect(getPixel(grid, 0, 1)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run apps/web/src/ui/pixel`
Expected: PASS (8 tests). These pin behaviour the lab already has; if any fails, the lab code is wrong — debug before going on.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck` — Expected: no errors.

```bash
git add -A apps/web/src/ui apps/web/src/lab
git commit -m "refactor: move pixel-art core to ui/pixel with tests"
```

---

### Task 2: Card sprites in `ui/pixel`

**Files:**
- Create: `apps/web/src/ui/pixel/cardSprite.ts`, `apps/web/src/ui/pixel/cardSprite.test.ts`
- Delete: `apps/web/src/lab/CardSprite.tsx`
- Modify: `apps/web/src/lab/PixelCard.tsx` (temporary import switch; replaced in Task 5)

**Interfaces:**
- Consumes: Task 1 `pixelArt.ts`.
- Produces: `SPRITE_W = 50`, `SPRITE_H = 70`, `drawFront(card: Card, enhancement?: EnhancementId): Grid` (rank corners left empty — the rank is text), `drawBack(): Grid`, `frontUrl(card, enhancement?): string`, `backUrl(): string`.

Decision recorded in the plan: the sprite-rank mode (`GLYPHS`, `drawRank`, `spriteRanks`) is dropped — the owner chose Rubik text; keeping a dead mode is YAGNI.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/ui/pixel/cardSprite.test.ts`:

```ts
import { makeCard } from '@game/core';
import { ENHANCEMENT_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { drawBack, drawFront, SPRITE_H, SPRITE_W } from './cardSprite';
import { getPixel } from './pixelArt';

const QUEEN = makeCard('hearts', 12);

describe('drawFront', () => {
  it('is 50×70 with notched corners', () => {
    const grid = drawFront(QUEEN);
    expect([grid.w, grid.h]).toEqual([SPRITE_W, SPRITE_H]);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, SPRITE_W - 1, SPRITE_H - 1)).toBeNull();
    expect(getPixel(grid, 25, 1)).not.toBeNull();
  });

  it('does not draw the rank: cards of one suit share a sprite', () => {
    expect(drawFront(makeCard('hearts', 6)).data).toEqual(drawFront(makeCard('hearts', 14)).data);
  });

  it('paints a different paper for every enhancement', () => {
    const papers = [undefined, ...ENHANCEMENT_IDS].map((id) => getPixel(drawFront(QUEEN, id), 8, 40));
    expect(new Set(papers).size).toBe(ENHANCEMENT_IDS.length + 1);
  });

  it('draws the enhancement icon in the top-right corner', () => {
    expect(getPixel(drawFront(QUEEN, 'coin'), 36, 12)).toBe('#ffd84a');
    expect(getPixel(drawFront(QUEEN), 36, 12)).not.toBe('#ffd84a');
  });

  it('draws red suits red and black suits dark', () => {
    const centre = (suit: 'hearts' | 'spades') => getPixel(drawFront(makeCard(suit, 9)), 24, 38);
    expect(centre('hearts')).not.toEqual(centre('spades'));
  });
});

describe('drawBack', () => {
  it('is 50×70 and differs from any front', () => {
    const back = drawBack();
    expect([back.w, back.h]).toEqual([SPRITE_W, SPRITE_H]);
    expect(back.data).not.toEqual(drawFront(QUEEN).data);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run apps/web/src/ui/pixel/cardSprite.test.ts`
Expected: FAIL — `Cannot find module './cardSprite'`.

- [ ] **Step 3: Create `cardSprite.ts`**

Build it from `apps/web/src/lab/CardSprite.tsx`: paste in full, unchanged, the constants and helpers `INK`, `RED`, `MINI_SUITS`, `BIG_SUITS`, `Paper`, `PAPERS`, `GOLD`, `ICONS`, `inside()`, `drawBody()`, `drawPattern()`, `suitShades()` and `drawBack()`. Drop React/JSX, `GLYPHS`, `RANK_TEXT`, `drawRank`, the `spriteRanks` parameter, `spriteUrl` and `SpriteImage`. The new and changed parts:

```ts
import type { Card, Suit } from '@game/core';
import type { EnhancementId } from '@game/durak';
import { createGrid, ditherIndex, getPixel, mix, setPixel, stampOutlinedIcon, stampShaded, toDataUrl, type Grid } from './pixelArt';

/** 50×70 pixel sprite: enough pixels for dithered gradients, bevels and shaded shapes. */
export const SPRITE_W = 50;
export const SPRITE_H = 70;

/** The rank is drawn as text by the UI, so the sprite leaves the rank corners empty. */
export function drawFront(card: Card, enhancement?: EnhancementId): Grid {
  const grid = createGrid(SPRITE_W, SPRITE_H);
  drawBody(grid, PAPERS[enhancement ?? 'plain']);
  drawPattern(grid, enhancement);
  const ink = card.suit === 'hearts' || card.suit === 'diamonds' ? RED : INK;
  const [base, light, dark] = suitShades(ink);
  stampShaded(grid, MINI_SUITS[card.suit], 5, 17, 2, base, light, dark);
  stampShaded(grid, BIG_SUITS[card.suit], 14, 26, 3, base, light, dark);
  stampShaded(grid, MINI_SUITS[card.suit], SPRITE_W - 15, SPRITE_H - 27, 2, base, light, dark, true);
  if (enhancement) {
    const icon = ICONS[enhancement];
    stampOutlinedIcon(grid, icon.rows, icon.palette, SPRITE_W - 22, 4, 2, INK);
  }
  return grid;
}

const cache = new Map<string, string>();

function cached(key: string, draw: () => Grid): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const url = toDataUrl(draw());
  cache.set(key, url);
  return url;
}

export function frontUrl(card: Card, enhancement?: EnhancementId): string {
  return cached(`${card.id}:${enhancement ?? '-'}`, () => drawFront(card, enhancement));
}

export function backUrl(): string {
  return cached('back', drawBack);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run apps/web/src/ui/pixel`
Expected: PASS (14 tests).

- [ ] **Step 5: Keep the lab compiling**

Delete `apps/web/src/lab/CardSprite.tsx`. In `apps/web/src/lab/PixelCard.tsx`: import `{ backUrl, frontUrl }` from `'../ui/pixel/cardSprite'`; replace the two `useMemo(() => spriteUrl(...))` calls with `frontUrl(card, enhancement)` and `backUrl()`; replace `<SpriteImage url={x} />` with `<img className="sprite" src={x} alt="" draggable={false} />`; text ranks render for every `rankFont` (the lab is rewritten in Task 5).

Run: `npm run typecheck` — Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/src/ui apps/web/src/lab
git commit -m "refactor: card sprites in ui/pixel; rank drawn as text only"
```

---

### Task 3: Perk emblems

**Files:**
- Create: `apps/web/src/ui/pixel/perkEmblem.ts`, `apps/web/src/ui/pixel/perkEmblem.test.ts`

**Interfaces:**
- Consumes: Task 1 `pixelArt.ts`; `PERK_IDS`, `PerkId` from `@game/durak`.
- Produces: `EMBLEM_SIZE = 16`, `drawPerkEmblem(id: PerkId): Grid`, `emblemUrl(id: PerkId): string`.

- [ ] **Step 1: Write the failing tests**

```ts
import { PERK_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { drawPerkEmblem, EMBLEM_SIZE } from './perkEmblem';
import { getPixel } from './pixelArt';

describe('drawPerkEmblem', () => {
  it('is a square tile with notched corners', () => {
    const grid = drawPerkEmblem('looter');
    expect([grid.w, grid.h]).toEqual([EMBLEM_SIZE, EMBLEM_SIZE]);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, 8, 8)).not.toBeNull();
  });

  it('gives every perk its own emblem', () => {
    const drawn = PERK_IDS.map((id) => JSON.stringify(drawPerkEmblem(id).data));
    expect(new Set(drawn).size).toBe(PERK_IDS.length);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run apps/web/src/ui/pixel/perkEmblem.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { PerkId } from '@game/durak';
import { createGrid, ditherIndex, mix, setPixel, stampShaded, toDataUrl, type Grid } from './pixelArt';

export const EMBLEM_SIZE = 16;

const INK = '#1b1426';
const GLYPH = { base: '#f4efe2', light: '#ffffff', dark: '#b8ad98' } as const;

type Emblem = { readonly mask: readonly string[]; readonly top: string; readonly bottom: string };

/** 7×7 masks drawn at ×2: a simple symbol per perk on its own colour tile. */
const EMBLEMS: Readonly<Record<PerkId, Emblem>> = {
  throwMaster: { top: '#ff7a59', bottom: '#b4282d', mask: ['...X...', '...XX..', 'XXXXXX.', 'XXXXXXX', 'XXXXXX.', '...XX..', '...X...'] },
  thickSkin: { top: '#8fa3b8', bottom: '#4a5f7d', mask: ['XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'] },
  longArms: { top: '#7fd0ff', bottom: '#2a6fb0', mask: ['.......', '.X...X.', 'XX...XX', 'XXXXXXX', 'XX...XX', '.X...X.', '.......'] },
  cardSharp: { top: '#c39bff', bottom: '#6a3fb0', mask: ['.......', '..XXX..', '.XX.XX.', 'XX.X.XX', '.XX.XX.', '..XXX..', '.......'] },
  looter: { top: '#d9a066', bottom: '#8a5a2b', mask: ['..XXX..', '...X...', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.'] },
  piggyBank: { top: '#ffb3c7', bottom: '#c2577a', mask: ['.XXXXX.', 'XXXXXXX', '.XXXXX.', 'XXXXXXX', '.XXXXX.', 'XXXXXXX', '.XXXXX.'] },
  trumpLover: { top: '#ffd84a', bottom: '#c98a12', mask: ['X..X..X', 'XX.X.XX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.......', 'XXXXXXX'] },
  cleanHands: { top: '#9ef0c8', bottom: '#2f9e6a', mask: ['...X...', '...X...', '..XXX..', 'XXXXXXX', '..XXX..', '...X...', '...X...'] },
};

function inTile(x: number, y: number): boolean {
  const last = EMBLEM_SIZE - 1;
  const corner = (x === 0 || x === last) && (y === 0 || y === last);
  return x >= 0 && y >= 0 && x <= last && y <= last && !corner;
}

export function drawPerkEmblem(id: PerkId): Grid {
  const { mask, top, bottom } = EMBLEMS[id];
  const grid = createGrid(EMBLEM_SIZE, EMBLEM_SIZE);
  const shades = [0, 0.5, 1].map((t) => mix(top, bottom, t));
  for (let y = 0; y < EMBLEM_SIZE; y++) {
    for (let x = 0; x < EMBLEM_SIZE; x++) {
      if (!inTile(x, y)) continue;
      const edge = !inTile(x - 1, y) || !inTile(x + 1, y) || !inTile(x, y - 1) || !inTile(x, y + 1);
      setPixel(grid, x, y, edge ? INK : (shades[ditherIndex(y / EMBLEM_SIZE, shades.length, x, y)] ?? top));
    }
  }
  stampShaded(grid, mask, 1, 1, 2, GLYPH.base, GLYPH.light, GLYPH.dark);
  return grid;
}

const cache = new Map<PerkId, string>();

export function emblemUrl(id: PerkId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const url = toDataUrl(drawPerkEmblem(id));
  cache.set(id, url);
  return url;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run apps/web/src/ui/pixel` — Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui/pixel
git commit -m "feat: pixel perk emblems"
```

---

### Task 4: Settings, storage, palettes, sound

**Files:**
- Create: `apps/web/src/storage.ts`, `apps/web/src/ui/palettes.ts`, `apps/web/src/ui/settings.ts`, `apps/web/src/ui/settings.test.ts`, `apps/web/src/ui/SettingsContext.tsx`
- Move: `apps/web/src/lab/sound.ts` → `apps/web/src/ui/sound.ts`
- Modify: `apps/web/src/games/durak/runStorage.ts`, `apps/web/src/lab/CardLab.tsx` (sound import)

**Interfaces:**
- Produces:
  - `storage.ts`: `type KeyValueStore`, `browserStore(): KeyValueStore | null` (moved; `runStorage.ts` re-exports both so existing imports keep working).
  - `palettes.ts`: `PALETTE_IDS = ['balatro','felt','neon'] as const`, `type PaletteId`, `type Palette`, `PALETTES: Record<PaletteId, Palette>`.
  - `settings.ts`: `type Settings = { palette: PaletteId; sound: boolean; volume: number }`, `DEFAULT_SETTINGS`, `SETTINGS_STORAGE_KEY = 'thegame.settings'`, `parseSettings(raw: unknown): Settings`, `loadSettings(store: KeyValueStore | null): Settings`, `saveSettings(store, settings): boolean`.
  - `sound.ts`: `SOUNDS` (+ `hit`, `win`), `type SoundName`, `playSound(name, enabled)`, `setVolume(v)`.
  - `SettingsContext.tsx`: `SettingsProvider`, `useSettings(): { settings; update(patch: Partial<Settings>): void; play(name: SoundName): void }`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/ui/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../storage';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_STORAGE_KEY } from './settings';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
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

describe('parseSettings', () => {
  it('defaults to the Неон palette, sound on, volume 0.35', () => {
    expect(DEFAULT_SETTINGS).toEqual({ palette: 'neon', sound: true, volume: 0.35 });
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const settings = { palette: 'felt', sound: false, volume: 0.5 };
    expect(parseSettings(settings)).toEqual(settings);
  });

  it('replaces each invalid field with its default', () => {
    expect(parseSettings({ palette: 'pink', sound: 'yes', volume: 7 })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ palette: 'balatro', volume: -1 })).toEqual({ ...DEFAULT_SETTINGS, palette: 'balatro' });
  });

  it('ignores non-object input', () => {
    expect(parseSettings('neon')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('loadSettings / saveSettings', () => {
  it('round-trips through the store', () => {
    const store = memoryStore();
    const settings = { palette: 'balatro', sound: false, volume: 0.8 } as const;
    expect(saveSettings(store, settings)).toBe(true);
    expect(loadSettings(store)).toEqual(settings);
  });

  it('falls back to defaults on missing, corrupted or unavailable storage', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore({ [SETTINGS_STORAGE_KEY]: '{' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(brokenStore)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('reports a failed save', () => {
    expect(saveSettings(brokenStore, DEFAULT_SETTINGS)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run apps/web/src/ui/settings.test.ts`
Expected: FAIL — `Cannot find module '../storage'`.

- [ ] **Step 3: Implement storage, palettes, settings**

`apps/web/src/storage.ts`:

```ts
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('localStorage is unavailable; progress and settings will not be saved', error);
    return null;
  }
}
```

In `runStorage.ts` delete its own `KeyValueStore` type and `browserStore` function and add:

```ts
import type { KeyValueStore } from '../../storage';
export { browserStore, type KeyValueStore } from '../../storage';
```

`apps/web/src/ui/palettes.ts`:

```ts
export const PALETTE_IDS = ['balatro', 'felt', 'neon'] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export type Palette = { readonly name: string; readonly colors: readonly [string, string, string] };

export const PALETTES: Readonly<Record<PaletteId, Palette>> = {
  balatro: { name: 'Балатро', colors: ['#3b1c32', '#b4282d', '#f2994a'] },
  felt: { name: 'Сукно', colors: ['#0b2a22', '#1f6b4a', '#d9b44a'] },
  neon: { name: 'Неон', colors: ['#1d2b53', '#7e2553', '#29adff'] },
};
```

`apps/web/src/ui/settings.ts`:

```ts
import { z } from 'zod';
import type { KeyValueStore } from '../storage';
import { PALETTE_IDS, type PaletteId } from './palettes';

export type Settings = { readonly palette: PaletteId; readonly sound: boolean; readonly volume: number };

export const DEFAULT_SETTINGS: Settings = { palette: 'neon', sound: true, volume: 0.35 };

export const SETTINGS_STORAGE_KEY = 'thegame.settings';

/** Each field falls back to its default on its own, so one bad value never resets the rest. */
const schema = z.object({
  palette: z.enum(PALETTE_IDS).catch(DEFAULT_SETTINGS.palette),
  sound: z.boolean().catch(DEFAULT_SETTINGS.sound),
  volume: z.number().min(0).max(1).catch(DEFAULT_SETTINGS.volume),
});

export function parseSettings(raw: unknown): Settings {
  const input = typeof raw === 'object' && raw !== null ? raw : {};
  return schema.parse(input);
}

export function loadSettings(store: KeyValueStore | null): Settings {
  if (!store) return DEFAULT_SETTINGS;
  try {
    const raw = store.getItem(SETTINGS_STORAGE_KEY);
    return raw === null ? DEFAULT_SETTINGS : parseSettings(JSON.parse(raw));
  } catch (error) {
    console.warn('Could not load settings; using defaults', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings): boolean {
  try {
    store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.warn('Could not save settings', error);
    return false;
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run apps/web/src` — Expected: PASS (all web tests, including the unchanged `runStorage.test.ts`).

- [ ] **Step 5: Move the synth and add two sounds**

```bash
git mv apps/web/src/lab/sound.ts apps/web/src/ui/sound.ts
```

In `CardLab.tsx` change `from './sound'` to `from '../ui/sound'`. In `ui/sound.ts` add to `SOUNDS` (after `coin`):

```ts
  /** Taking the table: a low, muffled thud. */
  hit: () => {
    whoosh(0.18, 0.12, 300);
    tone(110, 0.32, 'sine', 0.09, 70);
  },
  /** Winning a fight: a short rising arpeggio. */
  win: () => {
    tone(392, 0.2, 'sine', 0.045);
    tone(523, 0.2, 'sine', 0.045, undefined, 0.1);
    tone(659, 0.32, 'sine', 0.045, undefined, 0.2);
  },
```

- [ ] **Step 6: Settings context**

`apps/web/src/ui/SettingsContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { browserStore } from '../storage';
import { loadSettings, parseSettings, saveSettings, type Settings } from './settings';
import { playSound, setVolume, type SoundName } from './sound';

type SettingsApi = {
  readonly settings: Settings;
  readonly update: (patch: Partial<Settings>) => void;
  readonly play: (name: SoundName) => void;
};

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { readonly children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(browserStore()));

  useEffect(() => setVolume(settings.volume), [settings.volume]);

  const update = useCallback(
    (patch: Partial<Settings>): void => {
      const next = parseSettings({ ...settings, ...patch });
      setSettings(next);
      const store = browserStore();
      if (store) saveSettings(store, next);
    },
    [settings],
  );
  const play = useCallback((name: SoundName): void => playSound(name, settings.sound), [settings.sound]);
  const api = useMemo(() => ({ settings, update, play }), [settings, update, play]);

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const api = useContext(SettingsContext);
  if (!api) throw new Error('useSettings must be used inside <SettingsProvider>');
  return api;
}
```

- [ ] **Step 7: Typecheck, test, commit**

Run: `npm run typecheck && npx vitest run apps/web/src` — Expected: no type errors, all pass.

```bash
git add -A apps/web/src
git commit -m "feat: persisted settings (palette, sound, volume) and shared synth"
```

---

### Task 5: Shared UI pieces, theme, lab rewired

**Files:**
- Create: `apps/web/src/ui/fan.ts`, `apps/web/src/ui/fan.test.ts`, `apps/web/src/ui/usePrevious.ts`, `apps/web/src/ui/FeelBox.tsx`, `apps/web/src/ui/CardFace.tsx`, `apps/web/src/ui/PixelCard.tsx`, `apps/web/src/ui/PixelButton.tsx`, `apps/web/src/ui/Backdrop.tsx`, `apps/web/src/ui/theme.css`
- Move: `apps/web/src/lab/SwirlBackground.tsx` → `apps/web/src/ui/SwirlBackground.tsx`
- Delete: `apps/web/src/lab/PixelCard.tsx`
- Modify: `apps/web/src/lab/CardLab.tsx`, `apps/web/src/lab/lab.css`, `apps/web/src/main.tsx`

**Interfaces:**
- Consumes: Task 2 `frontUrl`, `backUrl`; Task 4 `PALETTES`, `PALETTE_IDS`, `useSettings`, `playSound`, `setVolume`.
- Produces:
  - `fan.ts`: `fanAngle(index, count): number` (deg), `fanDrop(index, count): number` (px), `handOverlap(count, fit = 6.5): number` (fraction of card width, 0..1).
  - `usePrevious<T>(value: T): T | undefined`.
  - `FeelBox`: props `{ children; idle?: boolean; swayDelay?: number; feel?: Feel; onHover?: () => void }`; exports `type Feel`, `FEEL`.
  - `CardFace`: props `{ card: Card; enhancement?: EnhancementId; split?: { own: EnhancementId; foreign: EnhancementId } }`.
  - `PixelCard`: props `{ card; width; enhancement?; faceDown?; selected?; swayDelay?; idle?; showLabel?; feel?; onTap?; onHover? }`.
  - `PixelButton`: props `{ tone?: 'blue'|'red'|'orange'|'green'; small?: boolean } & ButtonHTMLAttributes` — plays `select` then calls `onClick`.
  - `SwirlBackground`: props `{ colors: readonly [string,string,string]; pixel: number; speed: number }`.
  - `Backdrop`: no props; reads the palette from settings; root element `.backdrop[data-palette=<id>]`; exports `BACKGROUND_SPEED = 0.6`.
  - CSS classes: `.pbtn`, `.pbtn--{blue,red,orange,green}`, `.pbtn--small`, `.panel`, `.chip`, `.face*`, `.feel*`, `.pcard*`, `.sprite`, `.backdrop`, `.swirl`, `.crt`, `.screen`.

- [ ] **Step 1: Write the failing fan tests**

`apps/web/src/ui/fan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fanAngle, fanDrop, handOverlap } from './fan';

describe('fanAngle', () => {
  it('is zero for a single card and symmetric around the middle', () => {
    expect(fanAngle(0, 1)).toBe(0);
    expect(fanAngle(0, 5)).toBe(-fanAngle(4, 5));
    expect(fanAngle(2, 5)).toBe(0);
  });

  it('never spreads past ±12° however many cards there are', () => {
    expect(Math.abs(fanAngle(0, 30))).toBeCloseTo(12);
    expect(fanAngle(0, 3)).toBe(-6);
  });
});

describe('fanDrop', () => {
  it('lifts the middle and drops the edges', () => {
    expect(fanDrop(2, 5)).toBe(0);
    expect(fanDrop(0, 5)).toBeGreaterThan(fanDrop(1, 5));
    expect(fanDrop(0, 1)).toBe(0);
  });
});

describe('handOverlap', () => {
  it('does not overlap a normal hand', () => {
    expect(handOverlap(1)).toBe(0);
    expect(handOverlap(6)).toBe(0);
  });

  it('squeezes a big hand into 6.5 card widths', () => {
    for (const count of [7, 13, 24]) {
      const overlap = handOverlap(count);
      const width = 1 + (count - 1) * (1 - overlap);
      expect(width).toBeCloseTo(6.5);
      expect(overlap).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run apps/web/src/ui/fan.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement `fan.ts`**

```ts
const MAX_STEP_DEG = 6;
const MAX_SPREAD_DEG = 12;
const MAX_DROP_PX = 8;

function offset(index: number, count: number): number {
  return index - (count - 1) / 2;
}

/** Rotation of a card in a fanned hand; the whole fan never exceeds ±12°. */
export function fanAngle(index: number, count: number): number {
  if (count <= 1) return 0;
  const step = Math.min(MAX_STEP_DEG, (MAX_SPREAD_DEG * 2) / (count - 1));
  return offset(index, count) * step;
}

/** How far a card sits below the middle one, so the fan follows an arc. */
export function fanDrop(index: number, count: number): number {
  if (count <= 1) return 0;
  const t = offset(index, count) / ((count - 1) / 2);
  return Math.round(t * t * MAX_DROP_PX);
}

/** Fraction of a card width each card hides under the next, so `count` cards fit in `fit` widths. */
export function handOverlap(count: number, fit = 6.5): number {
  if (count <= Math.floor(fit)) return 0;
  return 1 - (fit - 1) / (count - 1);
}
```

Run: `npx vitest run apps/web/src/ui/fan.test.ts` — Expected: PASS (5 tests).

- [ ] **Step 4: React helpers and components**

`apps/web/src/ui/usePrevious.ts`:

```ts
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
```

`apps/web/src/ui/FeelBox.tsx` (sway + tilt + squash from the lab's `PixelCard`; squash fires on pointer-down so it needs no tap handler):

```tsx
import { motion, useSpring } from 'motion/react';
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

export type Feel = {
  readonly tilt: number;
  readonly sway: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly pixel: number;
};

/** Tuned by the owner in the card lab, 2026-10-08. */
export const FEEL: Feel = { tilt: 16, sway: 2, stiffness: 490, damping: 9, pixel: 4 };

const SWAY_SECONDS = 3.4;
const SQUASH = { scaleX: [1, 1.14, 0.94, 1.03, 1], scaleY: [1, 0.86, 1.07, 0.98, 1] };

type FeelBoxProps = {
  readonly children: ReactNode;
  /** Idle sway; off for table, deck and enemy cards to keep the screen calm and cheap. */
  readonly idle?: boolean;
  readonly swayDelay?: number;
  readonly feel?: Feel;
  readonly onHover?: () => void;
};

export function FeelBox({ children, idle = false, swayDelay = 0, feel = FEEL, onHover }: FeelBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const spring = { stiffness: feel.stiffness, damping: feel.damping };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const [squash, setSquash] = useState(0);

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * feel.tilt);
    rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * feel.tilt);
  };
  const onLeave = (): void => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      className="feel"
      style={{ ['--px' as string]: `${feel.pixel}px` }}
      animate={idle ? { rotate: [-feel.sway, feel.sway, -feel.sway], y: [0, -feel.sway, 0] } : { rotate: 0, y: 0 }}
      transition={idle ? { duration: SWAY_SECONDS, repeat: Infinity, ease: 'easeInOut', delay: swayDelay } : { duration: 0.2 }}
    >
      <motion.div
        ref={ref}
        className="feel__tilt"
        style={{ rotateX, rotateY }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerEnter={onHover}
        onPointerDown={() => setSquash((n) => n + 1)}
      >
        <motion.div
          key={squash}
          className="feel__squash"
          initial={false}
          animate={squash ? SQUASH : {}}
          transition={{ duration: 0.38, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
```

`apps/web/src/ui/CardFace.tsx`:

```tsx
import { isRedSuit, rankLabel, type Card } from '@game/core';
import type { EnhancementId } from '@game/durak';
import { frontUrl } from './pixel/cardSprite';

type CardFaceProps = {
  readonly card: Card;
  readonly enhancement?: EnhancementId;
  /** Both enhancements available: own paper top-left, foreign paper bottom-right, split on the diagonal. */
  readonly split?: { readonly own: EnhancementId; readonly foreign: EnhancementId };
};

export function CardFace({ card, enhancement, split }: CardFaceProps) {
  const rankClass = isRedSuit(card.suit) ? 'face__rank face__rank--red' : 'face__rank';
  const rank = rankLabel(card.rank);
  return (
    <div className="face">
      {split ? (
        <>
          <img className="sprite face__sprite face__sprite--own" src={frontUrl(card, split.own)} alt="" draggable={false} />
          <img className="sprite face__sprite face__sprite--foreign" src={frontUrl(card, split.foreign)} alt="" draggable={false} />
          <span className="face__diagonal" aria-hidden="true" />
        </>
      ) : (
        <img className="sprite face__sprite" src={frontUrl(card, enhancement)} alt="" draggable={false} />
      )}
      <span className={rankClass}>{rank}</span>
      <span className={`${rankClass} face__rank--bottom`}>{rank}</span>
    </div>
  );
}
```

`apps/web/src/ui/PixelCard.tsx`:

```tsx
import type { Card } from '@game/core';
import { ENHANCEMENTS, type EnhancementId } from '@game/durak';
import { motion } from 'motion/react';
import { CardFace } from './CardFace';
import { FEEL, FeelBox, type Feel } from './FeelBox';
import { backUrl } from './pixel/cardSprite';

type PixelCardProps = {
  readonly card: Card;
  /** CSS px; the rank font scales with it. */
  readonly width: number;
  readonly enhancement?: EnhancementId;
  readonly faceDown?: boolean;
  readonly selected?: boolean;
  readonly swayDelay?: number;
  readonly idle?: boolean;
  readonly showLabel?: boolean;
  readonly feel?: Feel;
  readonly onTap?: () => void;
  readonly onHover?: () => void;
};

/** A free-standing card (lab, shop): feel, flip and an optional enhancement label underneath. */
export function PixelCard({
  card,
  width,
  enhancement,
  faceDown = false,
  selected = false,
  swayDelay = 0,
  idle = true,
  showLabel = false,
  feel = FEEL,
  onTap,
  onHover,
}: PixelCardProps) {
  const spring = { type: 'spring', stiffness: feel.stiffness, damping: feel.damping } as const;
  return (
    <motion.div
      className="pcard"
      style={{ width, fontSize: width * 0.2 }}
      animate={{ y: selected ? -width * 0.28 : 0 }}
      transition={spring}
      onClick={onTap}
    >
      <FeelBox idle={idle} swayDelay={swayDelay} feel={feel} onHover={onHover}>
        <motion.div className="pcard__flip" animate={{ rotateY: faceDown ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
          <div className="pcard__side">
            <CardFace card={card} enhancement={enhancement} />
          </div>
          <div className="pcard__side pcard__side--back">
            <img className="sprite" src={backUrl()} alt="" draggable={false} />
          </div>
        </motion.div>
      </FeelBox>
      {showLabel && enhancement && <span className="pcard__label">{ENHANCEMENTS[enhancement].name}</span>}
    </motion.div>
  );
}
```

`apps/web/src/ui/PixelButton.tsx`:

```tsx
import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { useSettings } from './SettingsContext';

export type ButtonTone = 'blue' | 'red' | 'orange' | 'green';

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly tone?: ButtonTone;
  readonly small?: boolean;
};

/** Blue — neutral, red — main fight action, orange — purchases, green — reroll / continue. */
export function PixelButton({ tone = 'blue', small = false, className, onClick, type = 'button', ...rest }: PixelButtonProps) {
  const { play } = useSettings();
  const classes = ['pbtn', `pbtn--${tone}`, small ? 'pbtn--small' : '', className ?? ''].filter(Boolean).join(' ');
  const click = (event: MouseEvent<HTMLButtonElement>): void => {
    play('select');
    onClick?.(event);
  };
  return <button type={type} className={classes} onClick={click} {...rest} />;
}
```

- [ ] **Step 5: Background**

```bash
git mv apps/web/src/lab/SwirlBackground.tsx apps/web/src/ui/SwirlBackground.tsx
```

Edit `ui/SwirlBackground.tsx`:
- Delete the `Palette` type and `PALETTES` (they live in `palettes.ts`).
- Props become `{ readonly colors: readonly [string, string, string]; readonly pixel: number; readonly speed: number }`; replace `palette.colors.forEach` with `colors.forEach`; effect deps `[colors, pixel, speed]`.
- Reduced motion: before the draw loop add

```ts
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
```

  and in `draw` replace `frame = requestAnimationFrame(draw);` with `if (!still) frame = requestAnimationFrame(draw);` (one static frame).
- Change the canvas class to `swirl`.

`apps/web/src/ui/Backdrop.tsx`:

```tsx
import type { CSSProperties } from 'react';
import { PALETTES } from './palettes';
import { useSettings } from './SettingsContext';
import { SwirlBackground } from './SwirlBackground';

export const BACKGROUND_SPEED = 0.6;
const BACKGROUND_PIXEL = 8;

/** Swirl + CRT behind every screen; without WebGL the palette gradient underneath shows instead. */
export function Backdrop() {
  const { settings } = useSettings();
  const { colors } = PALETTES[settings.palette];
  const style = { '--bg-a': colors[0], '--bg-b': colors[1] } as CSSProperties;
  return (
    <div className="backdrop" data-palette={settings.palette} style={style} aria-hidden="true">
      <SwirlBackground colors={colors} pixel={BACKGROUND_PIXEL} speed={BACKGROUND_SPEED} />
      <div className="crt" />
    </div>
  );
}
```

- [ ] **Step 6: Theme CSS**

`apps/web/src/ui/theme.css`:

```css
:root {
  --ink: #1b1426;
  --gold: #f2c94c;
  --card-w: min(14vw, 64px);
  --px: 4px;
  color-scheme: dark;
  font-family: 'Pixelify Sans', ui-monospace, monospace;
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }

body {
  background: #1d2b53;
  color: #ffffff;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  user-select: none;
}

/* ---------- background ---------- */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: radial-gradient(circle at 50% 40%, var(--bg-b), var(--bg-a));
}
.swirl { position: absolute; inset: 0; width: 100%; height: 100%; }
.crt {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(0deg, rgb(0 0 0 / 14%) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at center, transparent 55%, rgb(0 0 0 / 55%));
}

.screen {
  position: relative;
  z-index: 1;
  max-width: 480px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: max(12px, env(safe-area-inset-top)) 16px max(12px, env(safe-area-inset-bottom));
  text-shadow: 2px 2px 0 rgb(0 0 0 / 45%);
}

/* ---------- panels ---------- */
.panel {
  padding: 10px 12px;
  border: 3px solid #000000;
  border-radius: 10px;
  background: rgb(27 20 38 / 88%);
  box-shadow: 0 5px 0 rgb(0 0 0 / 55%);
}
.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgb(0 0 0 / 45%);
  font-size: 0.85rem;
}

/* ---------- buttons ---------- */
.pbtn {
  --c: #3a7bd5;
  --d: #22509c;
  font: inherit;
  font-size: 1.05rem;
  color: #ffffff;
  padding: 12px 18px;
  border: none;
  border-radius: 8px;
  background: var(--c);
  box-shadow: 0 4px 0 var(--d);
  text-shadow: 2px 2px 0 rgb(0 0 0 / 35%);
  cursor: pointer;
  transition: transform 0.06s, box-shadow 0.06s;
}
.pbtn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 0 0 var(--d); }
.pbtn:disabled { opacity: 0.45; cursor: default; }
.pbtn--blue { --c: #3a7bd5; --d: #22509c; }
.pbtn--red { --c: #e24a3b; --d: #a12a1f; }
.pbtn--orange { --c: #f39c32; --d: #b46a10; }
.pbtn--green { --c: #3fa36b; --d: #22693f; }
.pbtn--small { padding: 6px 10px; font-size: 0.85rem; }

/* ---------- card face & feel ---------- */
.sprite { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
.feel, .feel__tilt, .feel__squash { width: 100%; height: 100%; transform-style: preserve-3d; }
.feel__tilt { perspective: 700px; }
.face { position: relative; width: 100%; aspect-ratio: 5 / 7; }
.face::before {
  content: '';
  position: absolute;
  inset: 3%;
  transform: translate(var(--px), calc(var(--px) * 2));
  background: rgb(0 0 0 / 40%);
  z-index: -1;
}
.face__sprite { position: absolute; inset: 0; }
.face__sprite--own { clip-path: polygon(0 0, 100% 0, 0 100%); }
.face__sprite--foreign { clip-path: polygon(100% 0, 100% 100%, 0 100%); }
.face__diagonal {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top right, transparent calc(50% - 1px), var(--ink) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px));
  pointer-events: none;
}
.face__rank {
  position: absolute;
  top: 3%;
  left: 8%;
  font-family: 'Rubik', system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.4em;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--ink);
  text-shadow: 0.05em 0.05em 0 rgb(255 255 255 / 55%);
  pointer-events: none;
}
.face__rank--red { color: #c2292e; }
.face__rank--bottom { top: auto; left: auto; bottom: 3%; right: 8%; transform: rotate(180deg); }

/* ---------- free-standing card (lab, shop) ---------- */
.pcard { position: relative; aspect-ratio: 5 / 7; cursor: pointer; }
.pcard__flip { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; }
.pcard__side { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.pcard__side--back { transform: rotateY(180deg); }
.pcard__label {
  position: absolute;
  left: 50%;
  top: 103%;
  transform: translateX(-50%);
  padding: 2px 6px;
  background: var(--ink);
  color: var(--gold);
  font-size: 0.5em;
  white-space: nowrap;
  box-shadow: 2px 2px 0 rgb(0 0 0 / 50%);
}
```

- [ ] **Step 7: Rewire the lab and `main.tsx`**

Delete `apps/web/src/lab/PixelCard.tsx`. In `apps/web/src/lab/lab.css` keep only the `.lab`, `.lab__stage`, `.lab__title`, `.lab__hero`, `.lab__actions`, `.lab__hand`, `.lab__hand-slot`, `.lab__panel*`, `.lab__controls`, `.lab__slider*`, `.lab__check`, `.lab__dump`, `.lab__gallery` rules; delete the rest (`.lab__bg`, `.lab__crt`, all `.pcard*`, `.sprite`, `.pbtn*` — now in `theme.css`).

Rewrite the imports of `CardLab.tsx`:

```tsx
import { makeCard, type Card } from '@game/core';
import { ENHANCEMENT_IDS, ENHANCEMENTS, type EnhancementId } from '@game/durak';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { BACKGROUND_SPEED } from '../ui/Backdrop';
import { FEEL, type Feel } from '../ui/FeelBox';
import { PALETTE_IDS, PALETTES, type PaletteId } from '../ui/palettes';
import { PixelCard } from '../ui/PixelCard';
import { playSound, setVolume } from '../ui/sound';
import { SwirlBackground } from '../ui/SwirlBackground';
import './lab.css';
```

Then in the component:
- `DEFAULT_FEEL` → `FEEL`; `CardFeel` → `Feel`; the PixelCard `feel={feel}` props stay.
- `paletteIndex` state → `const [paletteId, setPaletteId] = useState<PaletteId>('neon');` and `const palette = PALETTES[paletteId];`.
- `speed` initial value → `BACKGROUND_SPEED`.
- Remove the `rankFont` state, its `<select>`, and every `rankFont={rankFont}` prop.
- Background: `<SwirlBackground colors={palette.colors} pixel={feel.pixel * 2} speed={speed} />` and `<div className="crt" aria-hidden="true" />`.
- Gallery cards: add `showLabel`.
- Palette `<select>`: `value={paletteId}`, `onChange={(e) => setPaletteId(e.target.value as PaletteId)}`, options `PALETTE_IDS.map((id) => <option key={id} value={id}>{PALETTES[id].name}</option>)`.
- Lab buttons stay plain `<button className="pbtn pbtn--blue">` (the lab has no `SettingsProvider`).

`apps/web/src/main.tsx`:

```tsx
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/rubik/700.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/theme.css';
import './styles.css';

/** `?lab` opens the card lab — a tuning tool kept out of the main bundle. */
const CardLab = lazy(() => import('./lab/CardLab').then((module) => ({ default: module.CardLab })));

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('lab') ? (
      <Suspense fallback={null}>
        <CardLab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
```

(`theme.css` is imported before the old `styles.css`, so old rules still win for the game screens until Task 6 deletes `styles.css`.)

- [ ] **Step 8: Verify**

Run: `npm run typecheck && npx vitest run apps/web/src` — Expected: no errors; all pass.
Run: `npm run build` — Expected: build succeeds; a separate `CardLab-*.js` chunk appears in the output.
Manual: `npm run dev`, open `/?lab` — hero card, hand, gallery with labels, palettes switch, sliders work.

- [ ] **Step 9: Commit**

```bash
git add -A apps/web/src
git commit -m "feat: shared pixel UI (card face, feel, buttons, backdrop, theme); lab uses it"
```

---

### Task 6: App shell, menu, settings screen

**Files:**
- Create: `apps/web/src/screens/SettingsScreen.tsx`, `apps/web/src/screens/menu.css`, `e2e/settings.spec.ts`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/screens/MenuScreen.tsx`, `apps/web/src/ErrorBoundary.tsx`, `apps/web/src/main.tsx`, `apps/web/src/games/durak/RunOverScreen.tsx`
- Delete: `apps/web/src/styles.css`

**Interfaces:**
- Consumes: `SettingsProvider`, `useSettings`, `Backdrop`, `PixelButton`, `PALETTE_IDS`, `PALETTES`.
- Produces: screen `settings` in `App`; `MenuScreen` gains `onSettings: () => void`; CSS classes `.menu*`, `.run-over`, `.settings*`.

Note: deleting `styles.css` leaves the fight and shop screens unstyled until Tasks 7–9; expected inside this branch.

- [ ] **Step 1: Write the failing e2e test**

`e2e/settings.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('the chosen palette survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-palette', 'neon');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Сукно' }).click();
  await expect(page.getByRole('button', { name: 'Сукно' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.backdrop')).toHaveAttribute('data-palette', 'felt');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('button', { name: 'Сукно' })).toHaveAttribute('aria-pressed', 'true');
});

test('sound can be switched off and the volume slider follows it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Звук').uncheck();
  await expect(page.getByLabel('Громкость')).toBeDisabled();
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByRole('heading', { name: 'Карточный рогалик' })).toBeVisible();
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx playwright test e2e/settings.spec.ts`
Expected: FAIL — `.backdrop` not found.

- [ ] **Step 3: Settings screen**

`apps/web/src/screens/SettingsScreen.tsx`:

```tsx
import type { CSSProperties } from 'react';
import { PALETTE_IDS, PALETTES } from '../ui/palettes';
import { PixelButton } from '../ui/PixelButton';
import { useSettings } from '../ui/SettingsContext';
import './menu.css';

export function SettingsScreen({ onBack }: { readonly onBack: () => void }) {
  const { settings, update, play } = useSettings();
  return (
    <main className="screen menu">
      <h1 className="menu__title">Настройки</h1>
      <section className="panel settings">
        <h2 className="settings__label">Палитра фона</h2>
        <div className="settings__palettes">
          {PALETTE_IDS.map((id) => {
            const [a, b, c] = PALETTES[id].colors;
            const swatch: CSSProperties = { background: `linear-gradient(135deg, ${a}, ${b} 60%, ${c})` };
            return (
              <button
                key={id}
                type="button"
                className="settings__palette"
                aria-pressed={settings.palette === id}
                onClick={() => {
                  play('select');
                  update({ palette: id });
                }}
              >
                <span className="settings__swatch" style={swatch} aria-hidden="true" />
                {PALETTES[id].name}
              </button>
            );
          })}
        </div>
        <label className="settings__row">
          <input type="checkbox" checked={settings.sound} onChange={(event) => update({ sound: event.target.checked })} />
          Звук
        </label>
        <label className="settings__row settings__row--column">
          <span>Громкость: {Math.round(settings.volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.sound}
            aria-label="Громкость"
            onChange={(event) => update({ volume: Number(event.target.value) })}
            onPointerUp={() => play('coin')}
          />
        </label>
      </section>
      <PixelButton tone="blue" onClick={onBack}>
        Назад
      </PixelButton>
    </main>
  );
}
```

- [ ] **Step 4: Menu, run-over, error screen**

`MenuScreen.tsx` — add `readonly onSettings: () => void;` to props, import `PixelButton` from `'../ui/PixelButton'` and `'./menu.css'`, replace the JSX:

```tsx
    <main className="screen menu">
      <h1 className="menu__title">Карточный рогалик</h1>
      <p className="menu__subtitle">Дурак · 2 круга по 3 боя · магазин между боями</p>
      <div className="menu__buttons">
        {canContinue && (
          <PixelButton tone="red" onClick={onContinue}>
            Продолжить забег
          </PixelButton>
        )}
        <PixelButton tone={canContinue ? 'blue' : 'red'} onClick={onNewRun}>
          Новый забег
        </PixelButton>
        <PixelButton tone="blue" onClick={onSettings}>
          Настройки
        </PixelButton>
        <PixelButton tone="blue" disabled>
          TriPeaks — скоро
        </PixelButton>
      </div>
      {saveInvalid && (
        <p className="menu__notice" role="alert">
          Сохранение повреждено — начни новый забег
        </p>
      )}
      <p className="panel menu__rules">
        Заставь соперника взять — он теряет HP за каждую карту. Победа приносит монеты; в магазине — перки (до 3) и
        усиления карт. Синие метки — твои усиления, красные — соперника; карту с двумя усилениями разыгрывай тапом по
        нужной половине.
      </p>
    </main>
```

`RunOverScreen.tsx` — import `PixelButton` and `'../../screens/menu.css'`; replace the JSX:

```tsx
    <main className="screen menu" data-testid="run-over">
      <h1 className="menu__title">{won ? 'Забег пройден!' : 'Забег окончен'}</h1>
      <section className="panel run-over">
        <p>
          Боёв выиграно: {fightsWon} из {RUN_SCHEDULE.length}
        </p>
        <p>Монеты: {run.coins}</p>
        <p>Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}</p>
      </section>
      <div className="menu__buttons">
        <PixelButton tone="green" onClick={onNewRun}>
          Новый забег
        </PixelButton>
        <PixelButton tone="blue" onClick={onExit}>
          В меню
        </PixelButton>
      </div>
    </main>
```

`ErrorBoundary.tsx` — keep a plain `<button>` (the boundary must not depend on the provider): `className="pbtn pbtn--red"` instead of `"btn btn--primary"`.

- [ ] **Step 5: App and providers**

`App.tsx`:
- `type Screen = { readonly name: 'menu' } | { readonly name: 'settings' } | { readonly name: 'run'; readonly run: RunState; readonly key: number };`
- Move the current conditional JSX into a local `renderScreen()` that returns the run screen for `run`, `<SettingsScreen onBack={() => setScreen({ name: 'menu' })} />` for `settings`, otherwise the menu with `onSettings={() => setScreen({ name: 'settings' })}`.
- Return:

```tsx
  return (
    <SettingsProvider>
      <Backdrop />
      <ErrorBoundary onReset={toMenu}>{renderScreen()}</ErrorBoundary>
    </SettingsProvider>
  );
```

Imports: `SettingsProvider` from `'./ui/SettingsContext'`, `Backdrop` from `'./ui/Backdrop'`, `SettingsScreen` from `'./screens/SettingsScreen'`.

`main.tsx`: delete `import './styles.css';`. Then `git rm apps/web/src/styles.css`.

- [ ] **Step 6: Menu styles**

`apps/web/src/screens/menu.css`:

```css
.menu { justify-content: center; align-items: stretch; text-align: center; }
.menu__title {
  margin: 0;
  font-size: 2.3rem;
  font-weight: 700;
  color: var(--gold);
  text-shadow: 3px 3px 0 #000000, 6px 6px 0 rgb(0 0 0 / 35%);
}
.menu__subtitle { margin: 0 0 12px; opacity: 0.85; }
.menu__buttons { display: flex; flex-direction: column; gap: 12px; }
.menu__notice { margin: 0; color: #ff8a80; }
.menu__rules { margin: 6px 0 0; font-size: 0.85rem; line-height: 1.4; text-align: left; }

.run-over p { margin: 4px 0; }

.settings { display: flex; flex-direction: column; gap: 12px; text-align: left; }
.settings__label { margin: 0; font-size: 1rem; }
.settings__palettes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.settings__palette {
  font: inherit;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 3px solid transparent;
  border-radius: 8px;
  background: rgb(0 0 0 / 35%);
  cursor: pointer;
}
.settings__palette[aria-pressed='true'] { border-color: var(--gold); }
.settings__swatch { width: 100%; height: 36px; border-radius: 4px; }
.settings__row { display: flex; align-items: center; gap: 8px; }
.settings__row--column { flex-direction: column; align-items: stretch; }
.settings__row input[type='range'] { accent-color: #f39c32; }
```

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npx vitest run` — Expected: clean, all pass.
Run: `npx playwright test e2e/settings.spec.ts` — Expected: PASS (2 tests).
Run: `npx playwright test e2e/durak.spec.ts` — Expected: PASS (6 tests; styles do not affect selectors). A failure here is fixed now, not deferred.

- [ ] **Step 8: Commit**

```bash
git add -A apps/web/src e2e
git commit -m "feat: pixel menu, settings screen with persisted palette and sound"
```

---

### Task 7: Cards, hand fan, table, deck

**Files:**
- Modify: `apps/web/src/components/CardView.tsx`, `apps/web/src/games/durak/TableView.tsx`, `apps/web/src/games/durak/DeckView.tsx`, `apps/web/src/games/durak/DurakFightScreen.tsx` (hands only)
- Create: `apps/web/src/games/durak/fight.css`

**Interfaces:**
- Consumes: `CardFace`, `FeelBox`, `backUrl`, `fanAngle`, `fanDrop`, `handOverlap`.
- Produces: `CardView` props unchanged plus `idle?: boolean`, `swayDelay?: number`; `CardBack` unchanged (`layoutId?`). Classes `.card`, `.card--playable`, `.card--trump`, `.card--split`, `.card__tag--own|foreign`, `.card__half*`, `.hand`, `.hand__slot`, `.table*`, `.deck*`, `.fight__middle`.

- [ ] **Step 1: CardView on pixel sprites**

Replace `components/CardView.tsx`:

```tsx
import { isRedSuit, rankLabel, SUIT_NAMES, type Card } from '@game/core';
import { ENHANCEMENTS, type CardEnhancements, type EnhancementId, type EnhancementSource } from '@game/durak';
import { motion } from 'motion/react';
import { CardFace } from '../ui/CardFace';
import { FeelBox } from '../ui/FeelBox';
import { backUrl } from '../ui/pixel/cardSprite';

const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 35 } as const;

type CardViewProps = {
  readonly card: Card;
  readonly playable?: boolean;
  readonly trump?: boolean;
  readonly enhancements?: CardEnhancements;
  readonly onTap?: () => void;
  /** When both enhancements are available, each half of the card plays the card with that enhancement. */
  readonly onTapOption?: (use: EnhancementSource) => void;
  /** Halves that are a legal move right now; the others are disabled and dimmed. */
  readonly legalUses?: readonly EnhancementSource[];
  /** Idle sway — only for the player's hand. */
  readonly idle?: boolean;
  readonly swayDelay?: number;
};

/** Blue tag — the enhancement is yours, red — it came from the opponent. */
function Tag({ source, short }: { readonly source: EnhancementSource; readonly short: string }) {
  return <span className={`card__tag card__tag--${source}`}>{short}</span>;
}

function cardClasses(card: Card, playable: boolean, trump: boolean, extra = ''): string {
  return ['card', isRedSuit(card.suit) ? 'card--red' : 'card--black', playable ? 'card--playable' : '', trump ? 'card--trump' : '', extra]
    .filter(Boolean)
    .join(' ');
}

export function CardView({ card, playable = false, trump = false, enhancements, onTap, onTapOption, legalUses, idle = false, swayDelay = 0 }: CardViewProps) {
  const label = `${rankLabel(card.rank)} ${SUIT_NAMES[card.suit]}`;
  const own = enhancements?.own;
  const foreign = enhancements?.foreign;

  if (own && foreign) {
    const halfEnabled = (source: EnhancementSource): boolean => Boolean(onTapOption) && (!legalUses || legalUses.includes(source));
    const half = (source: EnhancementSource, id: EnhancementId) => (
      <button
        type="button"
        className={halfEnabled(source) ? `card__half card__half--${source}` : `card__half card__half--${source} card__half--illegal`}
        disabled={!halfEnabled(source)}
        onClick={() => onTapOption?.(source)}
        aria-label={`${label}: ${ENHANCEMENTS[id].name} (${source === 'own' ? 'твоё' : 'соперника'})`}
      >
        <Tag source={source} short={ENHANCEMENTS[id].short} />
      </button>
    );
    return (
      <motion.div layoutId={card.id} transition={CARD_SPRING} className={cardClasses(card, playable, trump, 'card--split')} aria-label={label}>
        <FeelBox idle={idle} swayDelay={swayDelay}>
          <CardFace card={card} split={{ own, foreign }} />
          {half('own', own)}
          {half('foreign', foreign)}
        </FeelBox>
      </motion.div>
    );
  }

  const single = own ?? foreign;
  return (
    <motion.button
      type="button"
      layoutId={card.id}
      transition={CARD_SPRING}
      className={cardClasses(card, playable, trump)}
      onClick={onTap}
      disabled={!onTap}
      aria-label={single ? `${label}: ${ENHANCEMENTS[single].name}` : label}
    >
      <FeelBox idle={idle} swayDelay={swayDelay}>
        <CardFace card={card} enhancement={single} />
        {single && <Tag source={own ? 'own' : 'foreign'} short={ENHANCEMENTS[single].short} />}
      </FeelBox>
    </motion.button>
  );
}

type CardBackProps = { readonly layoutId?: string };

export function CardBack({ layoutId }: CardBackProps) {
  return (
    <motion.div layoutId={layoutId} transition={CARD_SPRING} className="card card--back" aria-hidden="true">
      <img className="sprite" src={backUrl()} alt="" draggable={false} />
    </motion.div>
  );
}
```

(If `EnhancementId` is not re-exported from `@game/durak`'s index, it is — `enhancements.ts` is exported; check with typecheck.)

- [ ] **Step 2: Fanned hands in `DurakFightScreen.tsx`**

Add imports `import type { CSSProperties } from 'react';`, `import { fanAngle, fanDrop, handOverlap } from '../../ui/fan';`, `import './fight.css';`. Add at module level:

```tsx
/** Later cards sit on top; a big hand overlaps so it never leaves the screen. */
function slotStyle(index: number, count: number, fan: boolean): CSSProperties {
  const overlap = handOverlap(count);
  return {
    marginLeft: index === 0 ? 0 : `calc(var(--slot-w) * ${-overlap})`,
    transform: fan ? `translateY(${fanDrop(index, count)}px) rotate(${fanAngle(index, count)}deg)` : undefined,
    zIndex: index,
  };
}
```

Replace the two hand blocks (keep `data-testid`s):

```tsx
        <div className="hand hand--enemy" data-testid="enemy-hand">
          {round.hands.enemy.map((card, index, all) => (
            <div key={card.id} className="hand__slot" style={slotStyle(index, all.length, false)}>
              <CardBack layoutId={card.id} />
            </div>
          ))}
        </div>
```

```tsx
        <div className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand">
          {round.hands.player.map((card, index, all) => {
            const enhancements = cardEnhancements(round, 'player', card);
            const split = Boolean(enhancements.own && enhancements.foreign);
            return (
              <div key={card.id} className="hand__slot" style={slotStyle(index, all.length, true)}>
                <CardView
                  card={card}
                  enhancements={enhancements}
                  playable={myTurn && playableIds.has(card.id)}
                  trump={isTrumpCard(card, round.trumpSuit, round.boss) || enhancements.own === 'trump' || enhancements.foreign === 'trump'}
                  onTap={myTurn && !split ? () => play(card) : undefined}
                  onTapOption={myTurn && split ? (use) => play(card, use) : undefined}
                  legalUses={myTurn && split ? legalUses(card.id) : undefined}
                  idle
                  swayDelay={index * 0.4}
                />
              </div>
            );
          })}
        </div>
```

- [ ] **Step 3: Deck as a stack**

`DeckView.tsx` — replace the returned JSX:

```tsx
  const stack = Math.min(3, Math.max(0, round.deck.length - 1));
  return (
    <div className="deck" data-testid="deck">
      <div className="deck__pile">
        {round.deck.length > 0 && (
          <div className="deck__trump-card">
            <CardView card={round.trumpCard} trump={isTrumpCard(round.trumpCard, round.trumpSuit, round.boss)} />
          </div>
        )}
        {Array.from({ length: stack }, (_, i) => (
          <div key={i} className="deck__layer" style={{ transform: `translate(${-i * 2}px, ${-i * 2}px)` }}>
            {i === stack - 1 && showTopFaceUp ? <CardView card={top} /> : <CardBack />}
          </div>
        ))}
      </div>
      <span className="chip deck__count">{round.deck.length > 0 ? `Колода: ${round.deck.length}` : 'Колода пуста'}</span>
      <span className="chip deck__trump">
        Козырь {SUIT_SYMBOLS[round.trumpSuit]}
        {round.boss === 'witch' && ' + дамы'}
        {round.boss === 'shuffler' && ' (меняется)'}
      </span>
    </div>
  );
```

(`showTopFaceUp` already narrows `top`; if TS complains, use `top &&`.)

- [ ] **Step 4: TableView**

Only change: `<div className="table panel" data-testid="table">`. Table cards keep `idle` off (default).

- [ ] **Step 5: Fight card styles**

`apps/web/src/games/durak/fight.css` (Task 8 appends the rest):

```css
/* ---------- cards ---------- */
.card {
  position: relative;
  display: block;
  width: var(--card-w);
  aspect-ratio: 5 / 7;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: calc(var(--card-w) * 0.2);
  color: inherit;
  cursor: pointer;
  transition: translate 0.15s ease-out, filter 0.15s;
}
.card:disabled { cursor: default; }
.card--playable { translate: 0 -10%; }
.card--playable .face { outline: 3px solid #ffffff; outline-offset: 1px; box-shadow: 0 0 0 6px rgb(0 0 0 / 55%); }
.card--trump .face::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 2px dashed var(--gold);
  pointer-events: none;
}
.card--back { cursor: default; }
.card__tag {
  position: absolute;
  left: 4%;
  bottom: 4%;
  padding: 0 0.25em;
  font-size: 0.75em;
  line-height: 1.3;
  color: #ffffff;
  box-shadow: 1px 1px 0 #000000;
}
.card__tag--own { background: #2563eb; }
.card__tag--foreign { background: #dc2626; }
.card--split { cursor: default; }
.card__half { position: absolute; inset: 0; padding: 0; border: 0; background: transparent; cursor: pointer; }
.card__half:disabled { cursor: default; }
.card__half--own { clip-path: polygon(0 0, 100% 0, 0 100%); }
.card__half--foreign { clip-path: polygon(100% 0, 100% 100%, 0 100%); }
.card__half--own .card__tag { left: 4%; top: 42%; bottom: auto; }
.card__half--foreign .card__tag { left: auto; right: 4%; }
.card__half--illegal { background: rgb(15 10 25 / 55%); }

/* ---------- hands ---------- */
.hand { --slot-w: var(--card-w); display: flex; justify-content: center; align-items: flex-end; min-height: calc(var(--card-w) * 1.5); padding-top: 8px; }
.hand__slot { transform-origin: 50% 120%; }
.hand--enemy { --slot-w: calc(var(--card-w) * 0.6); min-height: calc(var(--card-w) * 0.9); }
.hand--enemy .card { width: calc(var(--card-w) * 0.6); }
.hand--waiting .card { filter: brightness(0.7); }

/* ---------- table & deck ---------- */
.fight__middle { flex: 1; display: flex; align-items: center; gap: 10px; min-height: calc(var(--card-w) * 1.9); }
.table {
  flex: 1;
  align-self: stretch;
  display: grid;
  grid-template-columns: repeat(3, var(--card-w));
  gap: 22px 14px;
  justify-content: center;
  align-content: center;
  background: rgb(0 0 0 / 30%);
}
.table__pair { position: relative; width: var(--card-w); }
.table__defense { position: absolute; top: 34%; left: 30%; }
.deck { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 0.8rem; text-align: center; }
.deck__pile { position: relative; width: var(--card-w); aspect-ratio: 5 / 7; margin-bottom: calc(var(--card-w) * 0.3); }
.deck__layer { position: absolute; inset: 0; }
.deck__trump-card { position: absolute; left: 30%; top: 22%; transform: rotate(90deg); }
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npx vitest run` — Expected: clean, all pass.
Run: `npx playwright test e2e/durak.spec.ts` — Expected: PASS (6 tests). If a `.card--playable` click fails with "element intercepts pointer events", fix the stacking (raise playable slots' `zIndex`), not the test.
Manual (`npm run dev`, 412px wide): hand fans, playable cards lift with a white pixel outline, split card halves work, deck shows a stack and a sideways trump.

- [ ] **Step 7: Commit**

```bash
git add -A apps/web/src
git commit -m "feat: pixel cards in the fight: fanned hand, stacked deck, felt table"
```

---

### Task 8: Fight screen — HP, hits, status, actions, overlay, sounds

**Files:**
- Create: `apps/web/src/components/hpSegments.ts`, `apps/web/src/components/hpSegments.test.ts`, `apps/web/src/games/durak/sounds.ts`, `apps/web/src/games/durak/sounds.test.ts`
- Modify: `apps/web/src/components/HpBar.tsx`, `apps/web/src/games/durak/DurakFightScreen.tsx`, `apps/web/src/games/durak/ActionBar.tsx`, `apps/web/src/games/durak/FightOverlay.tsx`, `apps/web/src/games/durak/useDurakRun.ts`, `apps/web/src/games/durak/DurakRunScreen.tsx`, `apps/web/src/games/durak/ShopScreen.tsx` (prop only), `apps/web/src/games/durak/RunHeader.tsx`, `apps/web/src/games/durak/fight.css`

**Interfaces:**
- Consumes: `useSettings().play`, `usePrevious`, `PixelButton`, `SoundName`.
- Produces: `hpSegments(hp, max): readonly boolean[]`; `fightSound(prev: FightState, next: FightState): SoundName | null`; `coinSound(prev: number, next: number): SoundName | null`; `useDurakRun` returns `{ run, error, errorSeq, act }`; `DurakFightScreen` and `ShopScreen` receive `errorSeq: number`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/components/hpSegments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hpSegments } from './hpSegments';

describe('hpSegments', () => {
  it('has one segment per max HP, filled up to the current HP', () => {
    expect(hpSegments(3, 5)).toEqual([true, true, true, false, false]);
  });

  it('clamps HP outside 0..max', () => {
    expect(hpSegments(-2, 3)).toEqual([false, false, false]);
    expect(hpSegments(9, 2)).toEqual([true, true]);
  });

  it('is empty for a non-positive max', () => {
    expect(hpSegments(0, 0)).toEqual([]);
  });
});
```

`apps/web/src/games/durak/sounds.test.ts`:

```ts
import { createFight, type FightState } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { coinSound, fightSound } from './sounds';

const base = createFight({ seed: 7, playerHp: 10, enemyHp: 7 });
const attack = base.round.hands[base.round.attacker][0]!;
const defense = base.round.hands.player[1]!;

function withTable(state: FightState, table: FightState['round']['table']): FightState {
  return { ...state, round: { ...state.round, table } };
}

describe('fightSound', () => {
  it('is silent when nothing changed', () => {
    expect(fightSound(base, base)).toBeNull();
  });

  it('plays a card when a card lands on the table', () => {
    const attacked = withTable(base, [{ attack, defense: null }]);
    expect(fightSound(base, attacked)).toBe('play');
    expect(fightSound(attacked, withTable(base, [{ attack, defense }]))).toBe('play');
  });

  it('sweeps the table on «Бито» and thuds on a take', () => {
    const attacked = withTable(base, [{ attack, defense: null }]);
    expect(fightSound(attacked, base)).toBe('flip');
    expect(fightSound(attacked, { ...base, hitSeq: base.hitSeq + 1 })).toBe('hit');
  });

  it('celebrates a win and thuds on a loss', () => {
    expect(fightSound(base, { ...base, winner: 'player' })).toBe('win');
    expect(fightSound(base, { ...base, winner: 'enemy' })).toBe('hit');
  });

  it('shuffles on a new deal', () => {
    expect(fightSound(base, { ...base, roundNumber: base.roundNumber + 1 })).toBe('flip');
  });
});

describe('coinSound', () => {
  it('rings whenever the coin count changes', () => {
    expect(coinSound(5, 5)).toBeNull();
    expect(coinSound(5, 2)).toBe('coin');
    expect(coinSound(2, 4)).toBe('coin');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run apps/web/src/components apps/web/src/games/durak/sounds.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`apps/web/src/components/hpSegments.ts`:

```ts
/** One segment per max HP; the first `hp` are filled. */
export function hpSegments(hp: number, max: number): readonly boolean[] {
  const total = Math.max(0, max);
  const filled = Math.min(total, Math.max(0, hp));
  return Array.from({ length: total }, (_, i) => i < filled);
}
```

`apps/web/src/games/durak/sounds.ts`:

```ts
import type { FightState, RoundState } from '@game/durak';
import type { SoundName } from '../../ui/sound';

function cardsOnTable(round: RoundState): number {
  return round.table.reduce((sum, pair) => sum + (pair.defense ? 2 : 1), 0);
}

/** The one sound a fight state change makes, most important first. */
export function fightSound(prev: FightState, next: FightState): SoundName | null {
  if (next.winner && !prev.winner) return next.winner === 'player' ? 'win' : 'hit';
  if (next.hitSeq > prev.hitSeq) return 'hit';
  if (next.roundNumber > prev.roundNumber) return 'flip';
  const before = cardsOnTable(prev.round);
  const after = cardsOnTable(next.round);
  if (after > before) return 'play';
  if (before > 0 && after === 0) return 'flip';
  return null;
}

export function coinSound(prev: number, next: number): SoundName | null {
  return prev === next ? null : 'coin';
}
```

Run: `npx vitest run apps/web/src` — Expected: PASS.

- [ ] **Step 4: `errorSeq` in `useDurakRun`**

Add `const [errorSeq, setErrorSeq] = useState(0);`; in the failure branch of `act` add `setErrorSeq((n) => n + 1);`; add `readonly errorSeq: number;` to `DurakRun` and return it. In `DurakRunScreen` destructure `errorSeq` and pass `errorSeq={errorSeq}` to `DurakFightScreen` and `ShopScreen`; add `readonly errorSeq: number;` to both prop types (the shop uses it in Task 9).

- [ ] **Step 5: Sounds in the fight screen**

In `DurakFightScreen` (imports: `useEffect` from react, `useSettings`, `usePrevious`, `fightSound`, `PixelButton`):

```tsx
  const { play: playSfx } = useSettings();
  const previous = usePrevious(fight);
  useEffect(() => {
    if (!previous || previous === fight) return;
    const sound = fightSound(previous, fight);
    if (sound) playSfx(sound);
  }, [fight, previous, playSfx]);
  useEffect(() => {
    if (errorSeq > 0) playSfx('deny');
  }, [errorSeq, playSfx]);
```

The local `play(card, use)` helper keeps its name.

- [ ] **Step 6: HP bar with segments and a bouncy hit**

`components/HpBar.tsx`:

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { hpSegments } from './hpSegments';

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };
const POP = { scale: [0.3, 1.35, 1], opacity: 1, y: -6 };

type HpBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Damage label to pop near the bar; `hitKey` changes on every new hit to replay the animation. */
  readonly hitLabel?: string | null;
  readonly hitKey?: number;
};

export function HpBar({ label, hp, maxHp, hitLabel = null, hitKey = 0 }: HpBarProps) {
  return (
    <div className="hp panel" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
      <span className="hp__label">{label}</span>
      <motion.div key={hitLabel ? hitKey : 'still'} className="hp__track" animate={hitLabel ? SHAKE : {}} transition={{ duration: 0.35 }}>
        {hpSegments(hp, maxHp).map((full, i) => (
          <span key={i} className={full ? 'hp__seg hp__seg--full' : 'hp__seg'} />
        ))}
      </motion.div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
      <AnimatePresence>
        {hitLabel && (
          <motion.span
            key={hitKey}
            className="hp__hit"
            data-testid={`hit-${label}`}
            initial={{ scale: 0.3, opacity: 0, y: 0 }}
            animate={POP}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {hitLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 7: Header, status, actions, overlay, run header**

`DurakFightScreen` header:

```tsx
        <header className="fight__header">
          <PixelButton tone="blue" small onClick={onExit}>
            Меню
          </PixelButton>
          <span className="chip">Раздача {fight.roundNumber}</span>
        </header>
```

Status: `<p className="fight__status panel" role="status">`.

`ActionBar.tsx` — `PixelButton` for both: «Беру» `tone="blue"`, «Бито»/«Готово» `tone="red"`; keep the empty `<div className="actions" />` placeholders.

`FightOverlay.tsx` — import `motion` and `PixelButton`; for both overlays:
- inner panel: `<motion.div className="overlay__panel panel" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>`;
- title `<h2 className="overlay__title">`;
- fight end button `tone={won ? 'green' : 'blue'}`; «Следующая раздача» `tone="green"`.

`RunHeader.tsx` JSX:

```tsx
    <div className="run-header panel" data-testid="run-header">
      <span>
        Круг {circle} · бой {fight}/{FIGHTS_PER_CIRCLE} — {enemy.name} ({TIER_LABELS[enemy.tier]})
      </span>
      {enemy.boss && <span className="run-header__boss">Правило: {BOSSES[enemy.boss].description}</span>}
      <span className="run-header__meta">
        <span className="chip run-header__coins">● {run.coins}</span>
        <span className="chip">Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}</span>
      </span>
    </div>
```

- [ ] **Step 8: Append fight styles**

Append to `fight.css`:

```css
/* ---------- fight layout ---------- */
.fight__header { display: flex; justify-content: space-between; align-items: center; }
.fight__status { margin: 0; min-height: 1.4em; padding: 6px 10px; text-align: center; }
.actions { display: flex; justify-content: center; gap: 12px; min-height: 52px; }

.run-header { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; text-align: center; }
.run-header__boss { color: #ff8a80; }
.run-header__meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; }
.run-header__coins { color: var(--gold); }

/* ---------- HP ---------- */
.hp { position: relative; display: grid; grid-template-columns: 5.5em 1fr 3em; align-items: center; gap: 8px; padding: 6px 10px; font-size: 0.9rem; }
.hp__track { display: flex; gap: 2px; height: 14px; }
.hp__seg { flex: 1; background: rgb(0 0 0 / 55%); box-shadow: inset 0 -3px 0 rgb(0 0 0 / 35%); }
.hp__seg--full { background: #e24a3b; box-shadow: inset 0 3px 0 #ff8a73, inset 0 -3px 0 #a12a1f; }
.hp__value { text-align: right; }
.hp__hit {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  z-index: 2;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 700;
  color: #ff5a4a;
  text-shadow: 3px 3px 0 #000000;
  pointer-events: none;
}
.hand--player + .hp .hp__hit { top: auto; bottom: calc(100% + 2px); }

/* ---------- round / fight overlay ---------- */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 55%);
}
.overlay__panel { width: min(100%, 360px); display: flex; flex-direction: column; gap: 12px; padding: 20px; text-align: center; }
.overlay__panel p { margin: 0; }
.overlay__title { margin: 0; font-size: 1.8rem; color: var(--gold); text-shadow: 3px 3px 0 #000000; }
```

- [ ] **Step 9: Verify**

Run: `npm run typecheck && npx vitest run` — Expected: clean, all pass.
Run: `npx playwright test` — Expected: PASS (8 tests).
Manual: a take shakes the HP bar and pops «−N взял»; sounds: card play, take thud, «Бито» sweep, illegal tap deny (twice in a row → two sounds), win arpeggio; sound off in settings → silence.

- [ ] **Step 10: Commit**

```bash
git add -A apps/web/src
git commit -m "feat: pixel fight screen: segmented HP, hit pops, panels, sound feedback"
```

---

### Task 9: Shop in the Balatro style

**Files:**
- Modify: `apps/web/src/games/durak/ShopScreen.tsx`
- Create: `apps/web/src/games/durak/shop.css`, `apps/web/src/games/durak/PerkCard.tsx`

**Interfaces:**
- Consumes: `emblemUrl`, `PixelCard`, `PixelButton`, `useSettings`, `usePrevious`, `coinSound`; `errorSeq` prop from Task 8.
- Produces: `PerkCard` props `{ perkId: PerkId; action: ReactNode }`; classes `.joker*`, `.shop*`.

- [ ] **Step 1: Perk "joker" card**

`apps/web/src/games/durak/PerkCard.tsx`:

```tsx
import { PERKS, type PerkId } from '@game/durak';
import type { ReactNode } from 'react';
import { emblemUrl } from '../../ui/pixel/perkEmblem';

type PerkCardProps = { readonly perkId: PerkId; readonly action: ReactNode };

/** A perk shown like a Balatro joker: emblem, name, rule and a price/sell button underneath. */
export function PerkCard({ perkId, action }: PerkCardProps) {
  const perk = PERKS[perkId];
  return (
    <article className="joker">
      <img className="sprite joker__emblem" src={emblemUrl(perkId)} alt="" draggable={false} />
      <h4 className="joker__name">{perk.name}</h4>
      <p className="joker__text">{perk.description}</p>
      {action}
    </article>
  );
}
```

- [ ] **Step 2: Rewrite `ShopScreen`**

Keep `CARDS_BY_ID`, `cardLabel` and the props (with `errorSeq`). Imports to add: `useEffect` from react, `PixelButton`, `PixelCard` (`../../ui/PixelCard`), `useSettings`, `usePrevious`, `coinSound` from `'./sounds'`, `PerkCard`, `'./fight.css'` (status/actions/header styles), `'./shop.css'`. At the top of the component:

```tsx
  const { play } = useSettings();
  const previousCoins = usePrevious(run.coins);
  useEffect(() => {
    if (previousCoins === undefined) return;
    const sound = coinSound(previousCoins, run.coins);
    if (sound) play(sound);
  }, [run.coins, previousCoins, play]);
  useEffect(() => {
    if (errorSeq > 0) play('deny');
  }, [errorSeq, play]);
```

JSX:

```tsx
    <main className="screen shop" data-testid="shop">
      <header className="fight__header">
        <PixelButton tone="blue" small onClick={onExit}>
          Меню
        </PixelButton>
        <span className="chip">Магазин · круг {stageLabel(run.stage).circle}</span>
        <span className="shop__coins">● {run.coins}</span>
      </header>

      <section className="panel shop__reward">
        <h2 className="shop__title">Награда за бой: +{reward.total}</h2>
        <p>
          Победа {reward.base} · HP {reward.hpBonus} · проценты {reward.interest}
          {reward.perkBonus > 0 && ` · перки ${reward.perkBonus}`}
        </p>
      </section>

      <section className="panel">
        <h3 className="shop__title">Товары</h3>
        <div className="shop__shelf">
          {shop.offers.map((offer, index) =>
            offer ? (
              <PerkCard
                key={offer.perkId}
                perkId={offer.perkId}
                action={
                  <PixelButton
                    tone="orange"
                    small
                    onClick={() => onAct({ type: 'buyPerk', index })}
                    aria-label={`Купить ${PERKS[offer.perkId].name} за ${offer.price}`}
                  >
                    ● {offer.price}
                  </PixelButton>
                }
              />
            ) : (
              <div key={`sold-${index}`} className="joker joker--sold">
                Продано
              </div>
            ),
          )}
        </div>
      </section>

      <section className="panel">
        <h3 className="shop__title">Усиления карт</h3>
        {shop.enhancementOffers.map((offer, index) =>
          offer ? (
            <div key={offer.enhancementId} className="shop__enhancement">
              <p className="shop__enhancement-text">
                <strong>{ENHANCEMENTS[offer.enhancementId].name}</strong> · ● {offer.price}
                <br />
                {ENHANCEMENTS[offer.enhancementId].description}
              </p>
              <div className="shop__cards">
                {offer.cardIds.map((cardId) => {
                  const card = CARDS_BY_ID.get(cardId);
                  const current = run.profile[cardId];
                  if (!card) return null;
                  return (
                    <button
                      key={cardId}
                      type="button"
                      className="shop__card"
                      onClick={() => onAct({ type: 'buyEnhancement', index, cardId })}
                      aria-label={`${ENHANCEMENTS[offer.enhancementId].name} на ${cardLabel(cardId)}${current ? `, заменит ${ENHANCEMENTS[current].name}` : ''}`}
                    >
                      <PixelCard card={card} width={56} enhancement={offer.enhancementId} idle={false} />
                      <span className="shop__card-caption">
                        {cardLabel(cardId)}
                        {current ? ` (заменит ${ENHANCEMENTS[current].short})` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p key={`sold-enh-${index}`} className="shop__sold">
              Продано
            </p>
          ),
        )}
      </section>

      <section className="panel">
        <h3 className="shop__title">
          Твои перки ({run.perks.length}/{MAX_PERKS})
        </h3>
        {run.perks.length === 0 && <p className="shop__empty">Пока нет</p>}
        <div className="shop__shelf">
          {run.perks.map((id) => (
            <PerkCard
              key={id}
              perkId={id}
              action={
                <PixelButton tone="blue" small onClick={() => onAct({ type: 'sellPerk', perkId: id })}>
                  Продать +{sellPrice(id)}
                </PixelButton>
              }
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="shop__title">Твоя колода</h3>
        {Object.keys(run.profile).length === 0 && <p className="shop__empty">Усилений пока нет</p>}
        <div className="shop__deck">
          {Object.entries(run.profile).map(([cardId, id]) => {
            const card = CARDS_BY_ID.get(cardId);
            return card && id ? <PixelCard key={cardId} card={card} width={44} enhancement={id} idle={false} showLabel /> : null;
          })}
        </div>
      </section>

      <p className="fight__status panel" role="status">
        {error ?? ''}
      </p>
      <div className="actions">
        <PixelButton tone="green" onClick={() => onAct({ type: 'reroll' })}>
          Рерол · ● {shop.rerollCost}
        </PixelButton>
        <PixelButton tone="red" onClick={() => onAct({ type: 'leaveShop' })}>
          В бой: {next.name}
        </PixelButton>
      </div>
    </main>
```

- [ ] **Step 3: Shop styles**

`apps/web/src/games/durak/shop.css`:

```css
.shop { overflow-y: auto; }
.shop .panel { display: flex; flex-direction: column; gap: 8px; }
.shop__title { margin: 0; font-size: 1rem; color: var(--gold); }
.shop__coins { font-size: 1.5rem; font-weight: 700; color: var(--gold); text-shadow: 3px 3px 0 #000000; }
.shop__reward p { margin: 0; font-size: 0.85rem; }
.shop__empty, .shop__sold { margin: 0; opacity: 0.6; font-size: 0.9rem; }

.shop__shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
.joker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 3px solid #000000;
  border-radius: 8px;
  background: linear-gradient(180deg, #3a2a4f, #241833);
  box-shadow: 0 4px 0 rgb(0 0 0 / 55%);
  text-align: center;
}
.joker--sold { justify-content: center; min-height: 120px; opacity: 0.5; }
.joker__emblem { width: 48px; height: 48px; }
.joker__name { margin: 0; font-size: 0.95rem; }
.joker__text { margin: 0; flex: 1; font-size: 0.72rem; line-height: 1.3; opacity: 0.85; }

.shop__enhancement { display: flex; flex-direction: column; gap: 6px; }
.shop__enhancement-text { margin: 0; font-size: 0.8rem; line-height: 1.35; }
.shop__cards { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.shop__card {
  font: inherit;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 0;
  background: none;
  cursor: pointer;
}
.shop__card-caption { font-size: 0.75rem; }
.shop__deck { display: flex; flex-wrap: wrap; gap: 8px 10px; padding-bottom: 14px; }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run` — Expected: clean, all pass.
Run: `npx playwright test` — Expected: PASS (8 tests).
Manual: win a fight — jokers with emblems, mini enhanced cards per offer, coins ring on buy/sell, deny on a failed buy, «Твоя колода» shows mini cards with labels.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/src
git commit -m "feat: Balatro-style shop: perk jokers, enhancement mini cards, coin sounds"
```

---

### Task 10: Final pass

**Files:**
- Modify: `apps/web/vite.config.ts`, `apps/web/index.html`, `README.md`

- [ ] **Step 1: PWA colours follow the default palette**

`vite.config.ts` manifest: `theme_color: '#1d2b53'`, `background_color: '#1d2b53'`. `index.html`: `<meta name="theme-color" content="#1d2b53" />`.

- [ ] **Step 2: Dead-class sweep**

Run: `grep -rnE "btn--primary|className=\"btn|card__badge|card__rank|card__suit|lab__bg|lab__crt|SpriteImage|spriteRanks" apps/web/src`
Expected: no matches. Fix any leftovers.

- [ ] **Step 3: README**

Under the web app section add: `?lab` opens the card lab (feel/palette tuning); settings (palette, sound, volume) are stored in `localStorage` under `thegame.settings`.

- [ ] **Step 4: Full verification**

Run: `npm run typecheck && npm run coverage && npm run build && npx playwright test`
Expected: no type errors; all unit tests pass with coverage thresholds met; build succeeds; 8 e2e pass.

- [ ] **Step 5: Manual check (412px phone width and laptop)**

Menu → settings (each palette, sound off/on, volume) → new run → fight (fan, lift, split card, take, «Бито», hit pop, overlay) → shop (buy perk, buy enhancement, sell, reroll) → run over; `?lab` still works. Start Chrome with `--disable-webgl` and emulate `prefers-reduced-motion: reduce` — gradient backdrop shows, no console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: pixel theme colours for the PWA; docs for lab and settings"
```
