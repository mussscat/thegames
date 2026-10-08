import { expect, test } from '@playwright/test';

test('the chosen palette survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-palette', 'neon');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Сукно' }).click();
  await expect(page.getByRole('button', { name: 'Сукно' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.backdrop')).toHaveAttribute('data-palette', 'felt');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('button', { name: 'Сукно' })).toHaveAttribute('aria-pressed', 'true');
});

test('sound can be switched off and the volume slider follows it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Звук').uncheck();
  await expect(page.getByLabel('Громкость')).toBeDisabled();
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByRole('heading', { name: 'Карточный рогалик' })).toBeVisible();
});

test('card sway can be switched off and stays off after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Покачивание карт').uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByLabel('Покачивание карт')).not.toBeChecked();
});

test('the hand is sorted by suit with trumps on the right, and the order is configurable', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  const cards = page.getByTestId('player-hand').getByRole('button');
  await expect(cards.first()).toHaveAccessibleName('9 бубны');
  await expect(cards.last()).toHaveAccessibleName('10 пики');
  await page.getByRole('button', { name: 'Меню' }).click();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Козыри').selectOption('first');
  await page.getByLabel('По рангу').selectOption('desc');
  await page.getByLabel('По масти').uncheck();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(cards.first()).toHaveAccessibleName('10 пики');
  await expect(cards.nth(1)).toHaveAccessibleName('Т бубны');
  await expect(cards.last()).toHaveAccessibleName('8 червы');
});

test('the sort preview reorders as the sort settings change', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).click();
  const preview = page.getByTestId('sort-preview').getByRole('img');
  await expect(preview).toHaveCount(7);
  await expect(preview.last()).toHaveAccessibleName('К червы, козырь');
  await page.getByLabel('Козыри').selectOption('first');
  await expect(preview.first()).toHaveAccessibleName('6 червы, козырь');
  await page.getByLabel('По рангу').selectOption('desc');
  await expect(preview.first()).toHaveAccessibleName('К червы, козырь');
});
