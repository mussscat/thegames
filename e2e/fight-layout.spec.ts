import { expect, test, type Page } from '@playwright/test';

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
