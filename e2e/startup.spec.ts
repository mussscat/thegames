import { expect, test } from '@playwright/test';

test('the menu appears even if one sprite sheet never finishes loading', async ({ page }) => {
  // The request is neither answered nor failed: a stalled connection on the first visit.
  await page.route('**/assets/back*.png', () => undefined);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible({ timeout: 6_000 });
});

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
