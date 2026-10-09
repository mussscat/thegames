import { expect, test, type Page } from '@playwright/test';

async function takeTheTable(page: Page): Promise<void> {
  await page.goto('/?seed=1');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await page.getByRole('button', { name: 'Беру' }).click({ timeout: 5_000 });
}

const playerHp = (page: Page) => page.getByRole('meter', { name: 'Ты' });

test('a take plays the scoring board with pops over the cards, then the damage lands', async ({ page }) => {
  await takeTheTable(page);
  const board = page.getByTestId('score-board');
  await expect(board).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('score-pop').first()).toBeVisible();
  await expect(playerHp(page)).toHaveAttribute('aria-valuenow', '40');
  await expect(board).toBeHidden({ timeout: 10_000 });
  await expect(playerHp(page)).not.toHaveAttribute('aria-valuenow', '40');
});

test('a tap skips the show, and a second tap does no harm', async ({ page }) => {
  await takeTheTable(page);
  const board = page.getByTestId('score-board');
  await expect(board).toBeVisible({ timeout: 5_000 });
  const skip = page.getByTestId('score-skip');
  await skip.click();
  await skip.click({ force: true, timeout: 300 }).catch(() => undefined);
  // From any point a skip ends the show within the final's 600 ms + 200 ms fade (the full show here is 1.35 s from the board).
  await expect(board).toBeHidden({ timeout: 1_000 });
  await expect(playerHp(page)).not.toHaveAttribute('aria-valuenow', '40');
  await expect(page.getByTestId('score-skip')).toHaveCount(0);
});

test('a reload during scoring continues with the damage already taken and no replay', async ({ page }) => {
  await takeTheTable(page);
  await expect(page.getByTestId('score-board')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(playerHp(page)).not.toHaveAttribute('aria-valuenow', '40');
  await expect(page.getByTestId('score-board')).toHaveCount(0);
});
