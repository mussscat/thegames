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
