import { expect, test, type Page } from '@playwright/test';

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

test('the coin and the icons show at their pre-shrunk size, so every pixel is a whole pixel', async ({ page }) => {
  await startFight(page);
  await expect(page.locator('.stats .coin').first()).toBeVisible();
  const sizes = await page.evaluate(() => {
    const read = (selector: string) => {
      const img = document.querySelector<HTMLImageElement>(selector);
      return img ? { natural: img.naturalWidth, shown: Math.round(img.getBoundingClientRect().width) } : null;
    };
    return { coin: read('.stats .coin'), icon: read('.hp .icon') };
  });
  expect(sizes.coin).toEqual({ natural: 19, shown: 19 });
  expect(sizes.icon).toEqual({ natural: 18, shown: 18 });
});

const BIG = { storageState: { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'thegame.settings', value: '{"effects":false}' }] }] } };

async function fightWith(page: Page, patch: object): Promise<void> {
  const run = {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
    bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    ...patch,
  };
  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
/** Rows of the fight grid shrink instead of scrolling, so also check nothing pokes out of its panel and nothing is wider than the screen. */
const squeeze = (page: Page) =>
  page.evaluate(() => {
    const bottom = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().bottom ?? 0;
    const top = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().top ?? 0;
    return {
      jokersOut: Math.round(bottom('.jokers__list') - bottom('.jokers')),
      focusOver: Math.round(bottom('.jokers') - top('.focus-bar')),
      wide: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

const cardWidth = (page: Page) => page.locator('[data-testid="player-hand"] .card').first().evaluate((el) => (el as HTMLElement).offsetWidth);

test.describe('Pixel 7 portrait (412×915)', () => {
  test.use({ ...BIG, viewport: { width: 412, height: 915 } });

  test('cards are exactly 74 px (×1) and the whole fight fits without scrolling', async ({ page }) => {
    await fightWith(page, {});
    expect(Math.round(await cardWidth(page))).toBe(74);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const squeezed = await squeeze(page);
    expect(squeezed.jokersOut).toBeLessThanOrEqual(0);
    expect(squeezed.focusOver).toBeLessThanOrEqual(0);
    expect(squeezed.wide).toBeLessThanOrEqual(0);
  });
});

test.describe('short portrait (375×667)', () => {
  test.use({ ...BIG, viewport: { width: 375, height: 667 } });

  test('keeps the reduced card size and still fits without scrolling', async ({ page }) => {
    await fightWith(page, {});
    expect(await cardWidth(page)).toBeLessThan(74);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const squeezed = await squeeze(page);
    expect(squeezed.jokersOut).toBeLessThanOrEqual(0);
    expect(squeezed.focusOver).toBeLessThanOrEqual(0);
    expect(squeezed.wide).toBeLessThanOrEqual(0);
  });
});

test.describe('desktop (1280×800)', () => {
  test.use({ ...BIG, viewport: { width: 1280, height: 800 } });

  test('cards are a whole multiple of 74 px', async ({ page }) => {
    await fightWith(page, {});
    expect(Math.round(await cardWidth(page)) % 74).toBe(0);
  });
});

test('the thick-panel tokens exist and panels use the 2 px outline', async ({ page }) => {
  await page.goto('/');
  const tokens = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return ['--bevel-light', '--bevel-dark', '--inner-shadow', '--sp-1', '--sp-2', '--sp-3', '--sp-4'].map((name) => css.getPropertyValue(name).trim());
  });
  expect(tokens.every((value) => value !== '')).toBe(true);
  await page.getByRole('button', { name: 'Настройки' }).click();
  const border = await page.locator('.panel').first().evaluate((el) => getComputedStyle(el).borderTopWidth);
  expect(border).toBe('2px');
});

test.describe('landscape phone (915×412)', () => {
  test.use({ ...BIG, viewport: { width: 915, height: 412 } });

  test('the enemy hand is visible and spread out', async ({ page }) => {
    await fightWith(page, {});
    const slots = page.getByTestId('enemy-hand').locator('.hand__slot');
    const boxes = await slots.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes[boxes.length - 1]!.x - boxes[0]!.x).toBeGreaterThan(60);
    expect(await slots.first().evaluate((e) => getComputedStyle(e).visibility)).toBe('visible');
  });
});

for (const size of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
  test.describe(`common phone ${size.width}×${size.height}`, () => {
    test.use({ ...BIG, viewport: size });

    test('the fight fits: no scrolling, nothing squeezed or wider than the screen', async ({ page }) => {
      await fightWith(page, {});
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      const squeezed = await squeeze(page);
      expect(squeezed.jokersOut).toBeLessThanOrEqual(0);
      expect(squeezed.focusOver).toBeLessThanOrEqual(0);
      expect(squeezed.wide).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('enemy hand and deck on a short screen', () => {
  test.use({ ...BIG, viewport: { width: 375, height: 667 } });

  test('taken cards are not clipped in flight, and the deck labels stay readable for assistive technology', async ({ page }) => {
    await fightWith(page, {});
    const hand = await page.getByTestId('enemy-hand').evaluate((el) => getComputedStyle(el).overflow);
    expect(hand).toBe('visible');
    const clip = await page.getByTestId('enemy-hand').locator('.card').first().evaluate((el) => getComputedStyle(el).clipPath);
    expect(clip).toContain('inset');
    const label = await page.locator('.deck__label').first().evaluate((el) => getComputedStyle(el).display);
    expect(label).not.toBe('none');
  });
});
