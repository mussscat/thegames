import { expect, test, type Page } from '@playwright/test';

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

test('the coin and the icons show at their pre-shrunk size, so every pixel is a whole pixel', async ({ page }) => {
  await startFight(page);
  await expect(page.locator('.stats .coin').first()).toBeVisible();
  const sizes = await page.evaluate(() => {
    const read = (selector: string) => {
      const img = document.querySelector<HTMLImageElement>(selector);
      return img ? { natural: img.naturalWidth, shown: Math.round(img.getBoundingClientRect().width) } : null;
    };
    return { coin: read('.stats .coin'), icon: read('.hp .icon') };
  });
  expect(sizes.coin).toEqual({ natural: 19, shown: 19 });
  expect(sizes.icon).toEqual({ natural: 18, shown: 18 });
});
