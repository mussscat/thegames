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

  test('the hand never sways, even with effects on (owner, 2026-10-12)', async ({ page }) => {
    await startFight(page);
    const samples = await handTransforms(page);
    expect(new Set(samples).size).toBe(1);
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

async function cardTilt(page: Page): Promise<string> {
  // The last card lies on top of its neighbours, so the pointer over it reaches it.
  return page.evaluate(() => getComputedStyle([...document.querySelectorAll('[data-testid="player-hand"] .feel__tilt')].at(-1)!).transform);
}

/** How far a computed transform is from standing still: 0 for `none` or the identity matrix, the largest off-identity entry otherwise. */
function deviationFromRest(transform: string): number {
  if (transform === 'none') return 0;
  const values = transform.replace(/^matrix3d\(|\)$/g, '').split(',').map(Number);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return Math.max(...values.map((v, i) => Math.abs(v - (identity[i] ?? 0))));
}

async function fightWithCards(page: Page): Promise<void> {
  const run = {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {}, focuses: [], bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
  };
  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.locator('[data-testid="player-hand"] .feel__tilt').first()).toBeVisible();
}

test('with effects off a card does not tilt under the pointer', async ({ page }) => {
  await fightWithCards(page);
  const box = (await page.locator('[data-testid="player-hand"] .hand__slot').last().boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await page.waitForTimeout(300);
  expect(await cardTilt(page)).toBe('none');
});

test.describe('effects on: tilt', () => {
  test.use({ storageState: EFFECTS_ON });

  test('a card tilts towards the pointer and comes back when it leaves', async ({ page }) => {
    await fightWithCards(page);
    const box = (await page.locator('[data-testid="player-hand"] .hand__slot').last().boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await expect.poll(() => cardTilt(page), { timeout: 2000 }).not.toBe('none');
    await page.mouse.move(5, 5);
    await expect.poll(async () => deviationFromRest(await cardTilt(page)), { timeout: 3000 }).toBeLessThan(0.01);
  });
});
