import { expect, test, type Page } from '@playwright/test';
import { screenOverflow } from './helpers/fit';

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

test('the status text is for screen readers only and takes no space', async ({ page }) => {
  await startFight(page);
  const box = await page.getByRole('status').boundingBox();
  expect(box === null || (box.width <= 1 && box.height <= 1)).toBe(true);
});

test('enemy backs are whole, as big as the player cards, with no count', async ({ page }) => {
  await startFight(page);
  const sizes = await page.evaluate(() => {
    const back = document.querySelector('[data-testid="enemy-hand"] .card')!;
    const mine = document.querySelector('[data-testid="player-hand"] .card')!;
    return { back: (back as HTMLElement).offsetWidth, mine: (mine as HTMLElement).offsetWidth, clip: getComputedStyle(back).clipPath, count: document.querySelectorAll('.hand__count').length };
  });
  expect(Math.round(sizes.back)).toBe(Math.round(sizes.mine));
  expect(sizes.clip).toBe('none');
  expect(sizes.count).toBe(0);
});

const FULL_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage', 'mirror', 'hearts'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

/** A fight with five jokers and two focuses; `layout` picks the wide-screen variant (owner's choice pending). */
async function fullFight(page: Page, layout: 'a' | 'b'): Promise<void> {
  await page.goto(`/?layout=${layout}`);
  await page.evaluate((run) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), FULL_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

const tooSmall = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.fight button')]
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.width < 43.5 || r.height < 43.5)).length,
  );

const SIZES = [[320, 568], [375, 667], [390, 844], [412, 915], [430, 932], [667, 375], [915, 412], [1280, 800], [1440, 900]] as const;

for (const layout of ['a', 'b'] as const) {
  for (const [width, height] of SIZES) {
    test(`layout ${layout}: the full fight fits ${width}×${height}, also with a focus picked`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await fullFight(page, layout);
      expect(await screenOverflow(page)).toBeLessThanOrEqual(0);
      expect(await tooSmall(page)).toBe(0);
      const geometry = await page.evaluate(() => {
        const rect = (el: Element | null) => el!.getBoundingClientRect();
        const handTop = rect(document.querySelector('[data-testid="player-hand"]')).top;
        const midParts = [...document.querySelectorAll('.fight__mid > *')].map((el) => rect(el).bottom);
        const segs = [...document.querySelectorAll('.hp__seg')].map((el) => rect(el).width);
        return { badge: rect(document.querySelector('[data-testid="enemy-badge"]')).width, midOverHand: Math.max(...midParts) - handTop, thinnestSeg: Math.min(...segs) };
      });
      expect(geometry.badge).toBeLessThanOrEqual(60);
      expect(geometry.midOverHand).toBeLessThanOrEqual(1);
      expect(geometry.thinnestSeg).toBeGreaterThanOrEqual(6);
      await page.getByTestId('enemy-badge').click();
      const tip = await page.getByRole('tooltip').boundingBox();
      expect(tip!.x).toBeGreaterThanOrEqual(0);
      expect(tip!.x + tip!.width).toBeLessThanOrEqual(width);
      await page.getByTestId('enemy-badge').click();
      await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
      expect(await screenOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
}

test('portrait order: top bar, enemy HP, enemy hand, table, hand, player HP, actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fullFight(page, 'a');
  const ys = await page.evaluate(() =>
    ['.fight__top', '.hp--enemy', '[data-testid="enemy-hand"]', '[data-testid="table"]', '[data-testid="player-hand"]', '.hp--player', '[data-testid="actions"]'].map(
      (s) => document.querySelector(s)!.getBoundingClientRect().top,
    ),
  );
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
});

test('top-bar boxes are all the same size', async ({ page }) => {
  await fullFight(page, 'a');
  const boxes = await page.locator('.fight__top > *').evaluateAll((els) => els.map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  expect(boxes).toHaveLength(3);
  expect(new Set(boxes.map((b) => b[0])).size).toBe(1);
  expect(new Set(boxes.map((b) => b[1])).size).toBe(1);
});

test.describe('desktop on a 2× screen', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('cards are 111 px or more, a whole multiple of 37 px (74 device px)', async ({ page }) => {
    await fullFight(page, 'a');
    const w = await page.locator('[data-testid="player-hand"] .card').first().evaluate((el) => (el as HTMLElement).offsetWidth);
    expect(w).toBeGreaterThanOrEqual(111);
    expect(w % 37).toBe(0);
  });
});
