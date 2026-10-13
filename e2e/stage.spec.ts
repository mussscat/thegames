import { expect, test, type Page } from '@playwright/test';

type StageMeasure = { readonly n: number; readonly artW: number; readonly artH: number; readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly dpr: number; readonly vw: number; readonly vh: number; readonly scrollW: number; readonly scrollH: number };

async function measure(page: Page): Promise<StageMeasure> {
  return page.locator('.stage').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport;
    return {
      n: Number((el as HTMLElement).dataset.n),
      artW: Number((el as HTMLElement).dataset.artW),
      artH: Number((el as HTMLElement).dataset.artH),
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      dpr: window.devicePixelRatio,
      vw: vv?.width ?? window.innerWidth,
      vh: vv?.height ?? window.innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
    };
  });
}

function expectWholeDevicePixels(m: StageMeasure): void {
  const cssPerArt = m.width / m.artW;
  expect(Number.isInteger(m.n)).toBe(true);
  expect(m.n).toBeGreaterThanOrEqual(1);
  expect(cssPerArt * m.dpr).toBeCloseTo(m.n, 2);
  expect(m.left * m.dpr).toBeCloseTo(Math.round(m.left * m.dpr), 1);
  expect(m.top * m.dpr).toBeCloseTo(Math.round(m.top * m.dpr), 1);
}

for (const size of [null, { width: 1920, height: 1080 }, { width: 375, height: 667 }]) {
  test(`the pixel stage is a whole number of device pixels per art pixel${size ? ` at ${size.width}×${size.height}` : ''}`, async ({ page }) => {
    if (size) await page.setViewportSize(size);
    await page.goto('/?pixel');
    await expect(page.locator('.stage')).toBeVisible();
    const m = await measure(page);
    expectWholeDevicePixels(m);
    // Centred: the gaps on opposite sides differ by less than one art pixel.
    const cssPerArt = m.width / m.artW;
    expect(Math.abs(m.left - (m.vw - m.left - m.width))).toBeLessThanOrEqual(cssPerArt);
    expect(Math.abs(m.top - (m.vh - m.top - m.height))).toBeLessThanOrEqual(cssPerArt);
    // It never overflows: nothing scrolls.
    expect(m.scrollW).toBeLessThanOrEqual(Math.ceil(m.vw));
    expect(m.scrollH).toBeLessThanOrEqual(Math.ceil(m.vh));
  });
}

test('without ?pixel the game renders as before, with no stage', async ({ page }) => {
  await page.goto('/?pixel=0');
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible();
  await expect(page.locator('.stage')).toHaveCount(0);
});

test('?pixel is remembered for the next visit', async ({ page }) => {
  await page.goto('/?pixel');
  await expect(page.locator('.stage')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.stage')).toBeVisible();
});

test('inside the stage a tip is rendered in the stage and stays on screen next to its anchor', async ({ page }) => {
  await page.goto('/?pixel&seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  const badge = page.getByTestId('enemy-badge');
  await badge.click();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await expect(page.locator('.stage').getByRole('tooltip')).toHaveCount(1);
  const [stage, tipBox, badgeBox] = await Promise.all([page.locator('.stage').boundingBox(), tip.boundingBox(), badge.boundingBox()]);
  if (!stage || !tipBox || !badgeBox) throw new Error('missing boxes');
  expect(tipBox.x).toBeGreaterThanOrEqual(stage.x - 1);
  expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
  // Beside the badge, not stranded at a screen coordinate left over from another scale.
  const gap = Math.min(Math.abs(tipBox.y + tipBox.height - badgeBox.y), Math.abs(tipBox.y - (badgeBox.y + badgeBox.height)));
  expect(gap).toBeLessThan(stage.height * 0.25);
});

test('inside the stage a bought tarot opens its sheet as a child of the stage', async ({ page }) => {
  await page.goto('/?pixel');
  await page.evaluate(() => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {}, focuses: ['boost'], bosses: ['general', 'witch'],
      phase: { kind: 'shop', shop: { items: [{ card: { kind: 'joker', jokerId: 'gloat' }, price: 5 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    };
    localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByTestId('shop-item-1').getByRole('button').click();
  await page.getByRole('button', { name: /^Купить .* за 3$/ }).click();
  await expect(page.locator('.stage').getByTestId('detail-sheet')).toBeVisible();
});

test('the pixel fight screen shows the kit top bar, both HP bars and the enemy badge, and the menu button leaves the fight', async ({ page }) => {
  await page.goto('/?pixel&seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('pixel-fight')).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Соперник' })).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Ты' })).toBeVisible();
  await expect(page.getByTestId('enemy-badge')).toHaveAccessibleName(/^Соперник: /);
  await expect(page.getByTestId('player-hand')).toBeVisible();
  await page.getByRole('button', { name: 'Меню' }).click();
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible();
});

test('the pixel fight bar fill is a whole number of art pixels at every HP', async ({ page }) => {
  await page.goto('/?pixel&seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  const widths = await page.getByRole('meter').evaluateAll((meters) => meters.map((m) => (m.firstElementChild as HTMLElement).offsetWidth));
  for (const w of widths) expect(Number.isInteger(w)).toBe(true);
});
