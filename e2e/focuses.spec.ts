import { expect, test, type Page } from '@playwright/test';
import { screenOverflow } from './helpers/fit';

const REWARD = { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 };

function shopRun(shop: object, patch: object = {}) {
  return {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: [], collected: 0, profile: {}, focuses: [],
    bosses: ['general', 'witch'], phase: { kind: 'shop', shop, reward: REWARD }, ...patch,
  };
}

const EMPTY_SHOP = { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null };

async function open(page: Page, run: object): Promise<void> {
  await page.goto('/');
  await page.evaluate((saved) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
}

/** Leaves the shop and waits until it is the player's turn in the next fight. */
async function toMyTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('focus-bar')).toBeVisible();
  await expect(page.getByRole('status')).not.toHaveText(/Соперник/i, { timeout: 10_000 });
}

test('a shelf focus lands in a focus slot and can be sold', async ({ page }) => {
  await open(page, shopRun({ ...EMPTY_SHOP, items: [{ card: { kind: 'focus', focusId: 'boost' }, price: 3 }, null] }));
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Разгон за 3' }).click();
  const owned = page.getByTestId('owned-focuses');
  await owned.getByRole('button', { name: 'Разгон' }).click();
  await page.getByRole('button', { name: /Продать Разгон за 1/ }).click();
  await expect(owned.getByRole('button', { name: 'Разгон' })).toHaveCount(0);
});

test('Подглядывание opens the enemy hand on the player turn', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['peek'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Подглядывание' }).click();
  await page.getByRole('button', { name: 'Сыграть' }).click();
  await expect(page.getByTestId('enemy-hand')).toHaveAttribute('data-revealed', 'true');
  await expect(page.getByTestId('focus-bar').getByRole('button', { name: 'Подглядывание' })).toHaveCount(0);
});

test('Разгон shows its charge badge', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['boost'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
  await page.getByRole('button', { name: 'Сыграть' }).click();
  await expect(page.getByTestId('focus-charges')).toContainText('+3 множ.');
});

test('Пересдача needs chosen cards before it can be played', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['redeal'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Пересдача' }).click();
  const play = page.getByRole('button', { name: 'Сыграть' });
  await expect(play).toBeDisabled();
  await page.getByTestId('player-hand').locator('.hand__slot').first().click();
  await expect(play).toBeEnabled();
  await play.click();
  await expect(page.getByTestId('focus-bar').getByRole('button', { name: 'Пересдача' })).toHaveCount(0);
});

test('«Сыграть» is enabled on the player turn and goes disabled as soon as the turn passes to the enemy', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['boost'] }));
  await toMyTurn(page);
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
  const play = page.getByRole('button', { name: 'Сыграть' });
  await expect(play).toBeEnabled();
  await page.getByTestId('player-hand').locator('.hand__slot').first().click();
  // Playwright polls, so the enemy turn only has to last one poll for this to be seen.
  await expect(play).toBeDisabled();
});

test('picking a focus puts Сыграть and Отмена in the bottom row and moves nothing', async ({ page }) => {
  await open(page, shopRun(EMPTY_SHOP, { focuses: ['boost', 'peek'] }));
  await toMyTurn(page);
  const handBefore = await page.getByTestId('player-hand').boundingBox();
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
  const row = page.getByTestId('actions');
  await expect(row.getByRole('button', { name: /Сыграть/ })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Отмена' })).toBeVisible();
  await expect(page.getByTestId('focus-bar').getByRole('button', { name: /Сыграть|Отмена/ })).toHaveCount(0);
  const handAfter = await page.getByTestId('player-hand').boundingBox();
  expect(Math.abs(handAfter!.y - handBefore!.y)).toBeLessThanOrEqual(1);
  const rowBox = await row.boundingBox();
  const hp = await page.getByRole('meter', { name: 'Ты' }).boundingBox();
  expect(rowBox!.y).toBeGreaterThanOrEqual(hp!.y + hp!.height - 1);
  await row.getByRole('button', { name: 'Отмена' }).click();
  await expect(row.getByRole('button', { name: 'Отмена' })).toHaveCount(0);
});

test.describe('two focuses on a small portrait screen', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the whole fight, including the player HP bar, fits without scrolling', async ({ page }) => {
    await open(page, shopRun(EMPTY_SHOP, { focuses: ['boost', 'peek'], jokers: ['looter', 'small'] }));
    await page.getByRole('button', { name: /Следующий бой/ }).click();
    await expect(page.getByTestId('focus-bar')).toBeVisible();
    const overflow = await screenOverflow(page);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
    await expect(page.getByRole('button', { name: 'Сыграть' })).toBeVisible();
    const withButtons = await screenOverflow(page);
    expect(withButtons).toBeLessThanOrEqual(0);
  });
});

test.describe('two focuses in landscape', () => {
  test.use({ viewport: { width: 915, height: 412 } });

  test('the focus bar sits inside the sidebar and on screen, with both chips tappable', async ({ page }) => {
    await open(page, shopRun(EMPTY_SHOP, { focuses: ['boost', 'peek'], jokers: ['looter', 'small'] }));
    await page.getByRole('button', { name: /Следующий бой/ }).click();
    const bar = await page.getByTestId('focus-bar').boundingBox();
    const side = await page.locator('.fight__side').boundingBox();
    const view = page.viewportSize();
    expect(bar).not.toBeNull();
    expect(bar!.x + bar!.width).toBeLessThanOrEqual((side?.x ?? 0) + (side?.width ?? 0) + 1);
    expect(bar!.y + bar!.height).toBeLessThanOrEqual((view?.height ?? 0) + 1);
    for (const name of ['Разгон', 'Подглядывание']) {
      const chip = await page.getByTestId('focus-bar').getByRole('button', { name }).boundingBox();
      expect(chip?.width ?? 0).toBeGreaterThan(60);
    }
  });
});
