import { expect, test } from '@playwright/test';

test('the menu appears even if one sprite sheet never finishes loading', async ({ page }) => {
  // The request is neither answered nor failed: a stalled connection on the first visit.
  await page.route('**/assets/back*.png', () => undefined);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible({ timeout: 6_000 });
});
