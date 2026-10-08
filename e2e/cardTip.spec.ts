import { expect, test } from '@playwright/test';

const GOLDEN = 'Соперник забрал её («Беру») — +1 урон';

test.beforeEach(async ({ page }) => {
  await page.goto('/?lab');
  await page.getByRole('button', { name: 'Галерея' }).click();
});

test('hovering an enhanced card shows what the enhancement does', async ({ page }) => {
  await page.getByRole('button', { name: '10 пики: Золотая' }).hover();
  await expect(page.getByRole('tooltip')).toContainText('Золотая');
  await expect(page.getByRole('tooltip')).toContainText(GOLDEN);
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('a long press shows the tooltip for both halves of a split card', async ({ page }) => {
  const card = page.getByLabel('К бубны', { exact: true });
  await card.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, clientX: 0, clientY: 0 });
  await page.waitForTimeout(600);
  const tip = page.getByRole('tooltip');
  await expect(tip).toContainText('Тяжёлая');
  await expect(tip).toContainText('твоё');
  await expect(tip).toContainText('Монетная');
  await expect(tip).toContainText('соперника');
  await card.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
  await expect(tip).toHaveCount(0);
});
