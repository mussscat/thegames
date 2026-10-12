import { expect, test, type Page } from '@playwright/test';

const SHOP_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 24, jokers: ['looter'], collected: 0, profile: {}, focuses: [],
  bosses: ['general', 'witch'],
  phase: {
    kind: 'shop',
    shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null },
    reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
  },
};

async function fightWithLooter(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), SHOP_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
}

test('the fight shows the jokers as one stack with a «n/5» tag and one score anchor per joker', async ({ page }) => {
  await fightWithLooter(page);
  const stack = page.getByTestId('joker-stack');
  await expect(stack).toHaveAccessibleName('Джокеры: 1 из 5');
  await expect(stack).toContainText('1/5');
  await expect(stack.locator('[data-score-joker="player-0"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Джокеры' })).toHaveCount(0);
});

test('the stack opens into a sheet where jokers are read and reordered, and the order is saved', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((run) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), { ...SHOP_RUN, jokers: ['looter', 'small'] });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await page.getByTestId('joker-stack').click();
  const sheet = page.getByRole('dialog', { name: 'Джокеры' });
  await expect(sheet).toBeVisible();
  const cards = sheet.getByRole('option');
  await expect(cards).toHaveCount(2);
  await expect(sheet.getByTestId('joker-sheet-info')).toContainText('+1 монета за каждый «Беру» соперника');
  await cards.nth(1).click();
  await expect(sheet.getByTestId('joker-sheet-info')).toContainText('Мелочь');
  await sheet.getByRole('button', { name: 'Мелочь левее' }).click();
  await expect(cards.nth(0)).toHaveAccessibleName('Мелочь');
  await sheet.getByRole('button', { name: 'Закрыть' }).click();
  await expect(sheet).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('thegame.durak.run')!).run.jokers);
  expect(saved).toEqual(['small', 'looter']);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('joker-stack').locator('[data-score-joker="player-0"] img').first()).toBeAttached();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the joker sheet still opens and closes', async ({ page }) => {
    await fightWithLooter(page);
    await page.getByTestId('joker-stack').click();
    await expect(page.getByRole('dialog', { name: 'Джокеры' })).toBeVisible();
    await page.getByRole('button', { name: 'Закрыть' }).click();
    await expect(page.getByRole('dialog', { name: 'Джокеры' })).toBeHidden();
  });
});

test('jokers can be bought and reordered in the shop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {}, focuses: [],
      bosses: ['general', 'witch'],
      phase: {
        kind: 'shop',
        shop: { items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, null], packs: [null, null], rerollCost: 2, opened: null, casting: null },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  const owned = page.getByTestId('owned-jokers').locator('.owned__card');
  await expect(owned).toHaveCount(2);
  await expect(owned.nth(1)).toHaveAccessibleName('Трефовик');
  await owned.nth(1).click();
  await page.getByRole('button', { name: 'Трефовик левее' }).click();
  await expect(owned.nth(0)).toHaveAccessibleName('Трефовик');
});
