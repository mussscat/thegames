import { expect, test } from '@playwright/test';

test('starts a durak fight with full hands', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Дурак' }).click();
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('meter', { name: 'Ты' })).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Соперник' })).toBeVisible();
  await expect(page.getByTestId('deck')).toContainText('Козырь');
});

test('the player can make a move on their turn', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Дурак' }).click();
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

test('garbage seed in the URL still starts a fight', async ({ page }) => {
  await page.goto('/?seed=abc');
  await page.getByRole('button', { name: 'Дурак' }).click();
  await expect(page.getByTestId('player-hand').getByRole('button')).toHaveCount(6);
});

test('menu button returns to the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Дурак' }).click();
  await page.getByRole('button', { name: 'Меню' }).click();
  await expect(page.getByRole('heading', { name: 'Карточный рогалик' })).toBeVisible();
});
