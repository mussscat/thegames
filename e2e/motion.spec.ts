import { expect, test, type Page } from '@playwright/test';

const EFFECTS_ON = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'thegame.settings', value: JSON.stringify({ effects: true }) }] }] };

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

async function handTransforms(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="player-hand"] .feel')!).transform));
    await page.waitForTimeout(450);
  }
  return out;
}

test('with effects off (the e2e default) the hand does not sway', async ({ page }) => {
  await startFight(page);
  const samples = await handTransforms(page);
  expect(new Set(samples).size).toBe(1);
});

test.describe('effects on', () => {
  test.use({ storageState: EFFECTS_ON });

  test('the hand sways', async ({ page }) => {
    await startFight(page);
    const samples = await handTransforms(page);
    expect(new Set(samples).size).toBeGreaterThan(1);
  });

  test('jokers sway on their own, each with its own phase', async ({ page }) => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage'], collected: 0, profile: {}, focuses: [], bosses: ['general', 'witch'],
      phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    };
    await page.goto('/');
    await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
    await page.reload();
    await page.getByRole('button', { name: 'Продолжить забег' }).click();
    await page.getByRole('button', { name: /Следующий бой/ }).click();
    const read = () => page.evaluate(() => [...document.querySelectorAll('.jslot .feel')].map((el) => getComputedStyle(el).transform));
    await expect(page.locator('.jslot .feel')).toHaveCount(3);
    const a = await read();
    await page.waitForTimeout(700);
    const b = await read();
    expect(b).not.toEqual(a);
    expect(new Set(b).size).toBeGreaterThan(1);
  });
});

test.describe('effects on but the system asks for reduced motion', () => {
  test.use({ storageState: EFFECTS_ON, reducedMotion: 'reduce' });

  test('the hand stays still', async ({ page }) => {
    await startFight(page);
    const samples = await handTransforms(page);
    expect(new Set(samples).size).toBe(1);
  });
});

async function jokerTilt(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.querySelector('.jslot .feel__tilt')!).transform);
}

/** How far a computed transform is from standing still: 0 for `none` or the identity matrix, the largest off-identity entry otherwise. */
function deviationFromRest(transform: string): number {
  if (transform === 'none') return 0;
  const values = transform.replace(/^matrix3d\(|\)$/g, '').split(',').map(Number);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return Math.max(...values.map((v, i) => Math.abs(v - (identity[i] ?? 0))));
}

async function fightWithJoker(page: Page): Promise<void> {
  const run = {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {}, focuses: [], bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
  };
  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.locator('.jslot .feel__tilt')).toBeVisible();
}

test('with effects off a joker does not tilt under the pointer', async ({ page }) => {
  await fightWithJoker(page);
  const box = (await page.locator('.jslot').first().boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await page.waitForTimeout(300);
  expect(await jokerTilt(page)).toBe('none');
});

test.describe('effects on: tilt', () => {
  test.use({ storageState: EFFECTS_ON });

  test('a joker tilts towards the pointer and comes back when it leaves', async ({ page }) => {
    await fightWithJoker(page);
    const box = (await page.locator('.jslot').first().boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await expect.poll(() => jokerTilt(page), { timeout: 2000 }).not.toBe('none');
    await page.mouse.move(5, 5);
    await expect.poll(async () => deviationFromRest(await jokerTilt(page)), { timeout: 3000 }).toBeLessThan(0.01);
  });
});
