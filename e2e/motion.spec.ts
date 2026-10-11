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
});

test.describe('effects on but the system asks for reduced motion', () => {
  test.use({ storageState: EFFECTS_ON, reducedMotion: 'reduce' });

  test('the hand stays still', async ({ page }) => {
    await startFight(page);
    const samples = await handTransforms(page);
    expect(new Set(samples).size).toBe(1);
  });
});
