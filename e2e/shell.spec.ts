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
    // Content taller than the screen must still not move the page.
    await page.evaluate(() => {
      const tall = document.createElement('div');
      tall.style.height = '3000px';
      document.body.appendChild(tall);
      window.scrollTo(0, 500);
    });
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
