# Native shell (part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The game stops behaving like a web page: no pull-to-refresh, no page scroll, no image-save / context menus, no text selection, no zoom, no white flash on start.

**Architecture:** Three layers. (1) `ui/shell.css` — global CSS that pins the document and switches off selection, callouts, drag and tap-zoom. (2) `ui/shell.ts` — a tiny set of event guards (`contextmenu`, `gesturestart`, ctrl+wheel, `dragstart`, `selectstart`) installed once from `main.tsx`; testable with a fake event source. (3) Screens that used to scroll the page (shop, menu, settings, run-over, pack opening) scroll inside their own container with `overscroll-behavior: contain`. A splash inside `#root` in `index.html` covers the sprite preload. Verification: Playwright on Chromium (Pixel 7) and on WebKit (iPhone 14, Desktop Safari).

**Tech Stack:** TypeScript strict, React 19, Vite 8, Vitest (node env), Playwright 1.63 (WebKit browser is not installed yet — Task 1 installs it).

**Spec:** `docs/superpowers/specs/2026-10-12-native-feel-design.md` (section 3, A1–A7). Parts C/D (look, 9 UI bugs) and B (Telegram) are separate branches and are NOT touched here.

## Global Constraints

- Only `apps/web` (plus `e2e/`, `playwright.config.ts`, `docs/`). `packages/durak` untouched; `npm run simulate` must give stage reach 100 / 100 / 69 / 37 / 37 / 9 % before and after.
- No new dependencies. Only the WebKit *browser binary* for Playwright is downloaded (`npx playwright install webkit`).
- Animations stay `transform`/`opacity` only (the splash uses opacity).
- Text inputs (`input`, `textarea`, `[contenteditable]`) keep selection and the context menu.
- Existing e2e suite stays green on the `mobile` (Pixel 7) project.
- Code, comments, commits in English. One commit per task, conventional format.

## Rulings made while planning (spec is binding; these cover what it left open)

- **Legacy iOS (< 16) touchmove interception — dropped.** `overscroll-behavior` works from Safari 16; the interception needs ancestor-scroll detection that is flaky and the audience on iOS 15 is negligible. Cost if wrong: pull-to-refresh on an iOS 15 device.
- **History guard (A4) — dropped.** Trapping Back in a normal tab is a dark pattern, and on Android standalone it would stop the system Back from closing the app. Swipe-back is covered by `overscroll-behavior-x: none`; Telegram `BackButton` is part B. Cost if wrong: Back in a browser tab leaves the game (the run is autosaved).
- **WebKit project runs only `shell.spec.ts`.** The 50-odd existing specs run on `mobile` (Chromium). Running them all on WebKit is a later decision. Cost if wrong: a WebKit-only regression in an old flow goes unseen by CI (the owner checks on the real iPhone).
- **`user-select: none` stays global on `body`**, inputs opt back in. Cost if wrong: none visible.

## Review Focus

- A `<select>` / range slider / checkbox in Settings must still work (touch-action, user-select, pointer-events rules must not break them) → Task 3 test.
- The shop's fixed bottom bar must not hide the last pack at 320×568, and the last pack must be reachable by scrolling the shop container → Task 4 test.
- Rotating the phone (portrait → landscape → portrait) leaves no page overflow → Task 4 test.
- Pack-opening overlay and the detail sheet scroll inside themselves and never chain into the page → Task 4 (CSS) + e2e on `overscroll-behavior`.
- Reduced motion: splash must not animate under `prefers-reduced-motion` → Task 5 test.

---

## File Structure

- Create `apps/web/src/ui/shell.ts` — `isEditable`, `installShellGuards`. One responsibility: event guards.
- Create `apps/web/src/ui/shell.test.ts` — unit tests with a fake event source.
- Create `apps/web/src/ui/shell.css` — global document-pinning and no-selection rules, `.scroll-area` helper, focus ring.
- Create `e2e/shell.spec.ts` — shell behaviour on every screen.
- Create `docs/superpowers/checklists/native-shell-device.md` — what the owner checks by hand on iPhone and Mac.
- Modify `playwright.config.ts` — projects `mobile`, `iphone`, `desktop-safari`.
- Modify `apps/web/src/main.tsx` — import `shell.css`, call `installShellGuards(document)`.
- Modify `apps/web/index.html` — meta tags, inline splash and ground colour.
- Modify `apps/web/src/games/durak/shop.css`, `apps/web/src/screens/menu.css`, `apps/web/src/games/durak/shop/opening.css` — internal scroll containers.
- Modify `e2e/startup.spec.ts` — splash is visible while sprites load.

---

### Task 1: WebKit projects and the failing shell spec

**Files:**
- Modify: `playwright.config.ts`
- Create: `e2e/shell.spec.ts`

**Interfaces:**
- Produces: Playwright projects `mobile` (Chromium, Pixel 7, all specs), `iphone` (WebKit, iPhone 14) and `desktop-safari` (WebKit, Desktop Safari), the last two run only `shell.spec.ts`. Helpers `openMenu`, `openSettings`, `openFight`, `openShop` inside `shell.spec.ts`, used by Tasks 3–5.

- [ ] **Step 1: Install the WebKit browser**

Run: `npx playwright install webkit`
Expected: downloads WebKit into `~/Library/Caches/ms-playwright/webkit-*`; no login, no account.

- [ ] **Step 2: Replace the projects in `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${PORT}`, storageState: 'e2e/storage-state.json' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // The Safari engine: the owner plays on iPhone Safari and desktop Safari-like browsers.
    { name: 'iphone', use: { ...devices['iPhone 14'] }, testMatch: /shell\.spec\.ts/ },
    { name: 'desktop-safari', use: { ...devices['Desktop Safari'] }, testMatch: /shell\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npm run preview -w @game/web -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write `e2e/shell.spec.ts` (all assertions of A1–A5)**

```ts
import { expect, test, type Page } from '@playwright/test';

/** A saved run in the shop phase: Continue opens the shop, «Следующий бой» opens a fight. */
const SHOP_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: {
    kind: 'shop',
    shop: {
      items: [{ card: { kind: 'joker', jokerId: 'gloat' }, price: 5 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }],
      packs: [{ kind: 'focuses', size: 'big', price: 6 }, { kind: 'jokers', size: 'normal', price: 4 }],
      rerollCost: 2, opened: null, casting: null,
    },
    reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
  },
};

async function openMenu(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible();
}
async function openSettings(page: Page): Promise<void> {
  await openMenu(page);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
}
async function openShop(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), SHOP_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.locator('.shop')).toBeVisible();
}
async function openFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => ({
    html: document.documentElement.scrollHeight - window.innerHeight,
    body: document.body.scrollHeight - window.innerHeight,
    wide: document.documentElement.scrollWidth - window.innerWidth,
  }));

test.describe('document is pinned (A1)', () => {
  test('html and body refuse overscroll, so there is no pull-to-refresh and no swipe-back', async ({ page }) => {
    await openMenu(page);
    const values = await page.evaluate(() =>
      ['documentElement', 'body'].map((key) => {
        const style = getComputedStyle(document[key as 'documentElement' | 'body']);
        return { x: style.overscrollBehaviorX, y: style.overscrollBehaviorY, position: style.position, overflow: style.overflow };
      }),
    );
    for (const value of values) {
      expect(value.x).toBe('none');
      expect(value.y).toBe('none');
      expect(value.overflow).toBe('hidden');
    }
    expect(values[1]!.position).toBe('fixed');
  });

  test('the page cannot be scrolled programmatically', async ({ page }) => {
    await openMenu(page);
    await page.evaluate(() => window.scrollTo(0, 500));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('no browser chrome behaviour (A2, A3)', () => {
  test('contextmenu on a sprite and on text is cancelled', async ({ page }) => {
    await openFight(page);
    const cancelled = await page.evaluate(() => {
      const fire = (el: Element) => {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      };
      return { sprite: fire(document.querySelector('img.sprite')!), text: fire(document.querySelector('h1, h2, p, span')!) };
    });
    expect(cancelled).toEqual({ sprite: true, text: true });
  });

  test('every image ignores pointer input and cannot be dragged', async ({ page }) => {
    await openFight(page);
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('img')].filter((img) => getComputedStyle(img).pointerEvents !== 'none' || img.draggable).length,
    );
    expect(bad).toBe(0);
  });

  test('selection and tap-zoom are off on the body', async ({ page }) => {
    await openMenu(page);
    const style = await page.evaluate(() => {
      const css = getComputedStyle(document.body);
      return { select: css.userSelect || css.webkitUserSelect, touch: css.touchAction, html: getComputedStyle(document.documentElement).touchAction };
    });
    expect(style.select).toBe('none');
    expect(style.touch).toBe('manipulation');
    expect(style.html).toBe('manipulation');
  });

  test('WebKit: the long-press callout is off', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '-webkit-touch-callout exists only in WebKit');
    await openMenu(page);
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('-webkit-touch-callout'))).toBe('none');
  });

  test('gesturestart and ctrl+wheel zoom are cancelled, dragstart and selectstart on content too', async ({ page }) => {
    await openMenu(page);
    const results = await page.evaluate(() => {
      const fire = (target: EventTarget, event: Event) => {
        target.dispatchEvent(event);
        return event.defaultPrevented;
      };
      const h1 = document.querySelector('h1')!;
      return {
        gesture: fire(document, new Event('gesturestart', { cancelable: true })),
        wheel: fire(document, new WheelEvent('wheel', { ctrlKey: true, cancelable: true })),
        plainWheel: fire(document, new WheelEvent('wheel', { cancelable: true })),
        drag: fire(h1, new Event('dragstart', { bubbles: true, cancelable: true })),
        select: fire(h1, new Event('selectstart', { bubbles: true, cancelable: true })),
      };
    });
    expect(results).toEqual({ gesture: true, wheel: true, plainWheel: false, drag: true, select: true });
  });

  test('form controls in Settings still work', async ({ page }) => {
    await openSettings(page);
    const sound = page.getByRole('checkbox', { name: 'Звук' });
    const was = await sound.isChecked();
    await sound.click();
    expect(await sound.isChecked()).toBe(!was);
    if (!(await sound.isChecked())) await sound.click();
    const volume = page.getByRole('slider', { name: 'Громкость' });
    const before = await volume.inputValue();
    await volume.focus();
    await volume.press('ArrowLeft');
    expect(await volume.inputValue()).not.toBe(before);
  });
});

test.describe('focus and cursor (A5)', () => {
  test('a mouse click leaves no focus ring, the keyboard shows one', async ({ page }) => {
    await openMenu(page);
    const button = page.getByRole('button', { name: 'Настройки' });
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible');
    await expect(focused).toHaveCount(1);
    expect(await focused.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    expect(await button.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
  });
});

const SIZES = [
  { name: '320×568', width: 320, height: 568 },
  { name: '375×667', width: 375, height: 667 },
  { name: '412×915', width: 412, height: 915 },
  { name: 'landscape 915×412', width: 915, height: 412 },
  { name: 'desktop 1280×800', width: 1280, height: 800 },
] as const;
const SCREENS = [
  { name: 'menu', open: openMenu },
  { name: 'settings', open: openSettings },
  { name: 'shop', open: openShop },
  { name: 'fight', open: openFight },
] as const;

test.describe('no page scroll on any screen (A1)', () => {
  for (const size of SIZES) {
    for (const screen of SCREENS) {
      test(`${screen.name} at ${size.name} does not overflow the page`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await screen.open(page);
        const { html, body, wide } = await pageOverflow(page);
        expect(html).toBeLessThanOrEqual(0);
        expect(body).toBeLessThanOrEqual(0);
        expect(wide).toBeLessThanOrEqual(0);
      });
    }
  }
});

test.describe('long screens scroll inside themselves', () => {
  test('the last pack of the shop is reachable at 320×568 and clears the bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openShop(page);
    const lastPack = page.locator('.shop__packs > *').last();
    await lastPack.scrollIntoViewIfNeeded();
    const pack = await lastPack.boundingBox();
    const bar = await page.locator('.shop__bar').boundingBox();
    expect(pack && bar && pack.y + pack.height <= bar.y + 1).toBe(true);
    expect(await page.locator('.shop').evaluate((el) => getComputedStyle(el).overscrollBehaviorY)).toBe('contain');
  });

  test('rotating portrait → landscape → portrait leaves no page overflow', async ({ page }) => {
    await openShop(page);
    for (const [width, height] of [[412, 915], [915, 412], [412, 915]] as const) {
      await page.setViewportSize({ width, height });
      const { html, body, wide } = await pageOverflow(page);
      expect(Math.max(html, body, wide)).toBeLessThanOrEqual(0);
    }
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `npx playwright test e2e/shell.spec.ts --project=mobile 2>&1 | tail -40`
Expected: FAIL — overscroll `auto` on `html`, `position` not `fixed`, `contextmenu`/`gesturestart` not cancelled, shop overflows at 320×568. (Chromium-only run; WebKit run comes after the implementation.)

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/shell.spec.ts
git commit -m "test: shell spec (pinned document, no browser menus, no page scroll) and WebKit projects"
```

---

### Task 2: Event guards (`shell.ts`)

**Files:**
- Create: `apps/web/src/ui/shell.ts`
- Create: `apps/web/src/ui/shell.test.ts`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Produces: `isEditable(target: unknown): boolean`; `installShellGuards(source: GuardSource): () => void` where `GuardSource` is `{ addEventListener(type: string, listener: (event: GuardEvent) => void, options?: { passive?: boolean }): void; removeEventListener(type: string, listener: (event: GuardEvent) => void): void }` and `GuardEvent` is `{ target: unknown; ctrlKey?: boolean; preventDefault(): void }`. `Document` satisfies `GuardSource`.

- [ ] **Step 1: Write the failing test `apps/web/src/ui/shell.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { installShellGuards, isEditable, type GuardEvent, type GuardSource } from './shell';

function fakeSource() {
  const listeners = new Map<string, (event: GuardEvent) => void>();
  const options = new Map<string, { passive?: boolean } | undefined>();
  const source: GuardSource = {
    addEventListener: (type, listener, opts) => {
      listeners.set(type, listener);
      options.set(type, opts);
    },
    removeEventListener: (type) => {
      listeners.delete(type);
    },
  };
  const fire = (type: string, event: Partial<GuardEvent> & { target?: unknown } = {}): boolean => {
    const preventDefault = vi.fn();
    listeners.get(type)?.({ target: { tagName: 'DIV' }, preventDefault, ...event });
    return preventDefault.mock.calls.length > 0;
  };
  return { source, fire, listeners, options };
}

describe('isEditable', () => {
  it('is true for text fields and contenteditable, false for everything else', () => {
    expect(isEditable({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(isEditable({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditable({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isEditable({ tagName: 'IMG' })).toBe(false);
    expect(isEditable({ tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(isEditable(null)).toBe(false);
    expect(isEditable(undefined)).toBe(false);
  });
});

describe('installShellGuards', () => {
  it.each(['contextmenu', 'dragstart', 'selectstart'])('cancels %s on content but not in a text field', (type) => {
    const { source, fire } = fakeSource();
    installShellGuards(source);
    expect(fire(type, { target: { tagName: 'IMG' } })).toBe(true);
    expect(fire(type, { target: { tagName: 'INPUT', type: 'text' } })).toBe(false);
  });

  it.each(['gesturestart', 'gesturechange', 'gestureend'])('always cancels %s (Safari pinch zoom)', (type) => {
    const { source, fire } = fakeSource();
    installShellGuards(source);
    expect(fire(type)).toBe(true);
  });

  it('cancels ctrl+wheel zoom but leaves a plain wheel alone', () => {
    const { source, fire } = fakeSource();
    installShellGuards(source);
    expect(fire('wheel', { ctrlKey: true })).toBe(true);
    expect(fire('wheel', { ctrlKey: false })).toBe(false);
  });

  it('registers wheel as non-passive, otherwise preventDefault is ignored', () => {
    const { source, options } = fakeSource();
    installShellGuards(source);
    expect(options.get('wheel')).toEqual({ passive: false });
  });

  it('removes every listener on uninstall', () => {
    const { source, listeners } = fakeSource();
    const uninstall = installShellGuards(source);
    expect(listeners.size).toBeGreaterThan(0);
    uninstall();
    expect(listeners.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it — must fail**

Run: `npx vitest run apps/web/src/ui/shell.test.ts`
Expected: FAIL — cannot resolve `./shell`.

- [ ] **Step 3: Implement `apps/web/src/ui/shell.ts`**

```ts
export interface GuardEvent {
  readonly target: unknown;
  readonly ctrlKey?: boolean;
  preventDefault(): void;
}

export interface GuardSource {
  addEventListener(type: string, listener: (event: GuardEvent) => void, options?: { passive?: boolean }): void;
  removeEventListener(type: string, listener: (event: GuardEvent) => void): void;
}

/** Text fields keep selection and the context menu; everything else in the game does not. */
export function isEditable(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const node = target as { tagName?: unknown; type?: unknown; isContentEditable?: unknown };
  if (node.isContentEditable === true) return true;
  if (node.tagName === 'TEXTAREA') return true;
  return node.tagName === 'INPUT' && (node.type === 'text' || node.type === 'search' || node.type === 'number' || node.type === 'password');
}

const CANCEL_OUTSIDE_FIELDS = ['contextmenu', 'dragstart', 'selectstart'] as const;
/** Safari ignores `user-scalable=no`; pinch arrives as these events. */
const CANCEL_ALWAYS = ['gesturestart', 'gesturechange', 'gestureend'] as const;

/** Switches off the browser's own gestures; returns the function that removes the guards again. */
export function installShellGuards(source: GuardSource): () => void {
  const outsideFields = (event: GuardEvent): void => {
    if (!isEditable(event.target)) event.preventDefault();
  };
  const always = (event: GuardEvent): void => event.preventDefault();
  const ctrlWheel = (event: GuardEvent): void => {
    if (event.ctrlKey) event.preventDefault();
  };

  const installed: ReadonlyArray<readonly [string, (event: GuardEvent) => void]> = [
    ...CANCEL_OUTSIDE_FIELDS.map((type) => [type, outsideFields] as const),
    ...CANCEL_ALWAYS.map((type) => [type, always] as const),
    ['wheel', ctrlWheel],
  ];
  for (const [type, listener] of installed) {
    // `wheel` must be non-passive, otherwise preventDefault is ignored.
    source.addEventListener(type, listener, type === 'wheel' ? { passive: false } : undefined);
  }
  return () => {
    for (const [type, listener] of installed) source.removeEventListener(type, listener);
  };
}
```

- [ ] **Step 4: Run — must pass**

Run: `npx vitest run apps/web/src/ui/shell.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Wire it in `apps/web/src/main.tsx`**

Add after the existing `./ui/theme.css` import block:

```tsx
import './ui/shell.css';
import { installShellGuards } from './ui/shell';
```

and right before `const root = rootElement;`:

```tsx
installShellGuards(document);
```

(`shell.css` is created in Task 3; the build fails until then, so Tasks 2 and 3 are committed together only if you run the build between them — commit this task after Task 3's file exists, or create an empty `shell.css` here. Create it empty now: `touch apps/web/src/ui/shell.css`.)

- [ ] **Step 6: Typecheck, unit suite, commit**

Run: `npm run typecheck && npx vitest run 2>&1 | tail -8`
Expected: typecheck clean; all unit tests pass.

```bash
git add apps/web/src/ui/shell.ts apps/web/src/ui/shell.test.ts apps/web/src/ui/shell.css apps/web/src/main.tsx
git commit -m "feat(web): shell guards — cancel contextmenu, pinch, ctrl+wheel, drag and selection outside text fields"
```

---

### Task 3: Global shell CSS and document meta

**Files:**
- Modify: `apps/web/src/ui/shell.css` (empty from Task 2)
- Modify: `apps/web/src/ui/theme.css:33-34` (remove the now-duplicated `overscroll-behavior` / `user-select` lines from `body`)
- Modify: `apps/web/index.html`

**Interfaces:**
- Produces: class `.scroll-area` (internal scroll region with `overscroll-behavior: contain`) used by Task 4.

- [ ] **Step 1: Write `shell.css`**

```css
/* The document is a fixed stage, not a page: nothing scrolls, pulls, selects, zooms or opens a menu. */
html, body, #root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  overscroll-behavior: none;
}
html, body {
  background: #1d2b53;
  touch-action: manipulation;
}
body {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  cursor: default;
}

/* Sprites are decoration: they never take the pointer, so there is no «save image» and no drag ghost. */
img {
  pointer-events: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

input, textarea, [contenteditable] {
  -webkit-user-select: text;
  user-select: text;
}

/* A hand cursor only where something happens. */
button, [role='button'], label, select, input[type='range'], input[type='checkbox'], input[type='radio'] { cursor: pointer; }
button:disabled, input:disabled { cursor: default; }

/* The focus ring is for the keyboard; a mouse click or a tap leaves none. */
:focus:not(:focus-visible) { outline: none; }
:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }

/* The only places that may scroll: a screen that is longer than the viewport scrolls inside itself. */
.scroll-area {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
```

- [ ] **Step 2: Remove the duplicates from `theme.css`**

In the `body { … }` block delete `overscroll-behavior: none;` and `user-select: none;` (now owned by `shell.css`; `-webkit-tap-highlight-color`, `background`, `color` stay).

- [ ] **Step 3: Update `apps/web/index.html` meta**

Replace the viewport line and add three metas after `theme-color`:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#1d2b53" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="apple-mobile-web-app-title" content="Карты" />
    <meta name="mobile-web-app-capable" content="yes" />
```

(keep the existing `apple-mobile-web-app-capable`, `status-bar-style`, icons, title.)

- [ ] **Step 4: Run the shell spec on Chromium**

Run: `npx playwright test e2e/shell.spec.ts --project=mobile 2>&1 | tail -40`
Expected: the "document is pinned", "no browser chrome", "focus and cursor" groups PASS. Some "no page scroll" cases (shop) and "long screens" still FAIL — Task 4 fixes them.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui/shell.css apps/web/src/ui/theme.css apps/web/index.html
git commit -m "feat(web): pin the document — no overscroll, selection, callout, tap-zoom; focus ring only for the keyboard"
```

---

### Task 4: Screens scroll inside themselves

**Files:**
- Modify: `apps/web/src/games/durak/shop.css:3-13` (`.shop`) and `:166-167` (`.sheet`)
- Modify: `apps/web/src/screens/menu.css:39` (`.menu`)
- Modify: `apps/web/src/games/durak/shop/opening.css:2-12` (`.opening`)

**Interfaces:**
- Consumes: `.scroll-area` semantics from Task 3 (these rules repeat its three declarations on the existing selectors instead of adding the class to markup, so no `.tsx` changes).

- [ ] **Step 1: Run the failing cases**

Run: `npx playwright test e2e/shell.spec.ts --project=mobile -g "no page scroll|long screens" 2>&1 | tail -30`
Expected: FAIL for `shop` (page taller than the viewport / `overscroll-behavior-y` not `contain`).

- [ ] **Step 2: Shop — stop growing the page**

In `.shop` replace `min-height: 100dvh;` with:

```css
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
```

The bottom padding `calc(70px + env(safe-area-inset-bottom, 0px))` stays: it keeps the last pack clear of the fixed `.shop__bar`.

- [ ] **Step 3: Menu, settings, run-over (they share `.menu`)**

Change the `.menu` rule to:

```css
.menu { overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; justify-content: safe center; }
```

- [ ] **Step 4: Pack opening and detail sheet**

In `.opening` add `overscroll-behavior: contain;` after `overflow-y: auto;`. In `.sheet` add `overscroll-behavior: contain;` after `overflow-y: auto;`.

- [ ] **Step 5: Run the whole shell spec on all three projects**

Run: `npx playwright test e2e/shell.spec.ts 2>&1 | tail -40`
Expected: PASS on `mobile`, `iphone`, `desktop-safari`. If a WebKit-only assertion fails, fix the CSS (not the test) unless the assertion misreads a WebKit quirk; record any such change in the commit body.

- [ ] **Step 6: Run the existing e2e suite — nothing may regress**

Run: `npx playwright test --project=mobile 2>&1 | tail -30`
Expected: all existing specs pass. A spec that relied on page scroll (shop) must be fixed in the spec by scrolling the container (`scrollIntoViewIfNeeded`), not by loosening the shell.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/games/durak/shop.css apps/web/src/screens/menu.css apps/web/src/games/durak/shop/opening.css
git commit -m "fix(web): long screens scroll inside their own container, never the page"
```

---

### Task 5: Splash instead of a blank first frame

**Files:**
- Modify: `apps/web/index.html`
- Modify: `e2e/startup.spec.ts`

**Interfaces:**
- Produces: `.splash` element inside `#root`; React replaces it on first render (`createRoot(root).render` clears the container), so there is no JS to remove it.

- [ ] **Step 1: Write the failing tests in `e2e/startup.spec.ts`**

Append:

```ts
test('a splash shows while the sprites load, then gives way to the menu', async ({ page }) => {
  await page.route('**/assets/back*.png', () => undefined);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('.splash')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible({ timeout: 6_000 });
  await expect(page.locator('.splash')).toHaveCount(0);
});

test('the splash does not animate under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/assets/back*.png', () => undefined);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('.splash__dot').first()).toBeVisible();
  const names = await page.locator('.splash__dot').evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
  expect(names.every((name) => name === 'none')).toBe(true);
});

test('the ground is the game colour before any stylesheet or script runs', async ({ page }) => {
  await page.route('**/assets/**', (route) => route.abort());
  await page.goto('/', { waitUntil: 'commit' });
  const color = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(color).toBe('rgb(29, 43, 83)');
});
```

- [ ] **Step 2: Run — must fail**

Run: `npx playwright test e2e/startup.spec.ts --project=mobile 2>&1 | tail -20`
Expected: FAIL — no `.splash`.

- [ ] **Step 3: Add the splash to `index.html`**

Inside `<head>` (after `<title>`):

```html
    <style>
      html, body { margin: 0; background: #1d2b53; }
      .splash { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; color: #ffffff; font: 800 1.4rem/1.2 system-ui, sans-serif; letter-spacing: 0.04em; }
      .splash__dots { display: flex; gap: 8px; }
      .splash__dot { width: 10px; height: 10px; background: #f2c94c; animation: splash-pulse 0.9s ease-in-out infinite; }
      .splash__dot:nth-child(2) { animation-delay: 0.15s; }
      .splash__dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes splash-pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .splash__dot { animation: none; } }
    </style>
```

and replace `<div id="root"></div>` with:

```html
    <div id="root">
      <div class="splash" role="status" aria-label="Загрузка">
        <div>Карточный рогалик</div>
        <div class="splash__dots" aria-hidden="true"><span class="splash__dot"></span><span class="splash__dot"></span><span class="splash__dot"></span></div>
      </div>
    </div>
```

- [ ] **Step 4: Run — must pass; run the shell spec again**

Run: `npx playwright test e2e/startup.spec.ts e2e/shell.spec.ts 2>&1 | tail -20`
Expected: PASS everywhere (all three projects for `shell.spec.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/index.html e2e/startup.spec.ts
git commit -m "feat(web): splash and ground colour in the first frame, no white flash"
```

---

### Task 6: Device checklist, installed-app meta, full verification

**Files:**
- Create: `docs/superpowers/checklists/native-shell-device.md`
- Modify: `apps/web/vite.config.ts` (manifest: add `id: '/'`, `scope: '/'`)

- [ ] **Step 1: Manifest identity (A7)**

In the `manifest` object add `id: '/',` and `scope: '/',` before `start_url`.

- [ ] **Step 2: Write the checklist**

```markdown
# Shell check on real devices (owner)

Open the build on the device (`npm run build && npm run preview -w @game/web -- --host`, then the LAN address), or the deployed one. Tick each line.

## iPhone, Safari tab and «Add to Home Screen» app
- [ ] Pull down on the menu, in a fight, in the shop: the page does not reload or stretch.
- [ ] Long-press a card, a joker, a pack, a coin: no «Save image / Copy» sheet.
- [ ] Long-press text (title, prices): nothing gets selected.
- [ ] Double-tap anywhere: no zoom. Pinch: no zoom.
- [ ] Swipe from the left edge: the game does not go «back».
- [ ] Shop is longer than the screen: it scrolls by itself; the last pack is not hidden under the bottom bar.
- [ ] Rotate the phone in the menu, fight and shop: no stuck layout.
- [ ] Cold start: a dark-blue screen with the title, no white flash.
- [ ] Settings: the switch, the volume slider and the selector still respond.

## Mac, Safari and Chrome
- [ ] Right-click a card: no context menu.
- [ ] Drag a card image with the mouse: no ghost image.
- [ ] Double-click text: nothing is selected.
- [ ] Ctrl + mouse wheel / trackpad pinch: the page does not zoom.
- [ ] Two-finger swipe left on the trackpad in the middle of a fight: does not navigate back.
- [ ] Click a button, then press Tab: a gold ring appears only after Tab.

Anything that fails: write the device, the OS version and the screen.
```

- [ ] **Step 3: Full verification**

Run each and read the output:

```bash
npm run typecheck
npx vitest run 2>&1 | tail -8
npx playwright test 2>&1 | tail -30
npm run simulate 2>&1 | grep -iE "stage|reach" | head
```

Expected: typecheck clean; unit suite green; e2e green on `mobile`, `iphone`, `desktop-safari`; simulate prints stage reach 100 / 100 / 69 / 37 / 37 / 9 % (unchanged).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/checklists/native-shell-device.md apps/web/vite.config.ts
git commit -m "docs: device checklist for the native shell; manifest id and scope"
```

- [ ] **Step 5: Hand over**

Branch `feat/native-shell` is ready for the whole-branch review on Opus. After review fixes and the owner's OK (not before): merge into `main` locally. No push without an explicit request.
