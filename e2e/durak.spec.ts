import { expect, test } from '@playwright/test';

test('a new run starts the first fight of circle 1', async ({ page }) => {
  await page.goto('/?seed=42');
  await expect(page.getByRole('button', { name: 'Продолжить забег' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('run-header')).toContainText('Круг 1 · бой 1/3');
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('meter', { name: 'Ты' })).toBeVisible();
  await expect(page.getByTestId('deck')).toContainText('Козырь');
});

test('the player can make a move on their turn', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  const status = page.getByRole('status');
  await expect(status).not.toHaveText(/соперник/i, { timeout: 5_000 });
  const hand = page.getByTestId('player-hand');
  const playable = hand.locator('.card--playable');
  if ((await playable.count()) > 0) {
    await playable.first().click();
    await expect(hand.getByRole('button')).toHaveCount(5);
  } else {
    await page.getByRole('button', { name: 'Беру' }).click();
    await expect(status).toHaveText(/Соперник подкидывает|Твой ход|Отбивайся/);
  }
});

test('a reload offers to continue the same run', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('run-header')).toContainText('Круг 1 · бой 1/3');
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('run-header')).toContainText('Круг 1 · бой 1/3');
  await expect(page.getByTestId('player-hand').getByRole('button')).not.toHaveCount(0);
});

test('a corrupted save is reported and a new run still starts', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.setItem('thegame.durak.run', '{'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Сохранение повреждено');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('run-header')).toBeVisible();
});

test('garbage seed in the URL still starts a run', async ({ page }) => {
  await page.goto('/?seed=abc');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
});

test('menu button returns to the menu with the run saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await page.getByRole('button', { name: 'Меню' }).click();
  await expect(page.getByRole('heading', { name: 'Карточный рогалик' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Продолжить забег' })).toBeVisible();
});
