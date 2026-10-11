import { expect, test, type Page } from '@playwright/test';

const EFFECTS_ON = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'thegame.settings', value: JSON.stringify({ effects: true, sway: false }) }] }] };

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand').locator('.hand__slot').first()).toBeVisible();
}

async function cardBoxes(page: Page) {
  return page.getByTestId('player-hand').locator('.hand__slot .card').evaluateAll((cards) => cards.map((c) => c.getBoundingClientRect().toJSON()));
}

test('every card of the hand stays on screen', async ({ page }) => {
  await startFight(page);
  const width = page.viewportSize()?.width ?? 0;
  for (const box of await cardBoxes(page)) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(width + 1);
  }
});

test('after a card is played the rest of the hand is re-laid out and still on screen and tappable', async ({ page }) => {
  await startFight(page);
  // Wait for the player's turn the way e2e/durak.spec.ts does, then play the first playable card.
  await expect(page.getByRole('status')).not.toHaveText(/соперник/i, { timeout: 5_000 });
  const before = await page.getByTestId('player-hand').locator('.hand__slot').count();
  await page.getByTestId('player-hand').locator('.card--playable').first().click();
  await expect(page.getByTestId('player-hand').locator('.hand__slot')).toHaveCount(before - 1);
  const width = page.viewportSize()?.width ?? 0;
  for (const box of await cardBoxes(page)) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(width + 1);
  }
});

test.describe('effects on', () => {
  test.use({ storageState: EFFECTS_ON });

  test('a card under the pointer lifts above its neighbours', async ({ page }) => {
    await startFight(page);
    const slot = page.getByTestId('player-hand').locator('.hand__slot').nth(2);
    const before = (await slot.boundingBox())!.y;
    await slot.hover();
    await expect.poll(async () => (await slot.boundingBox())!.y, { timeout: 2000 }).toBeLessThan(before - 6);
  });
});
