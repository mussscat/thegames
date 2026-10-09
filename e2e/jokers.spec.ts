import { expect, test, type Page } from '@playwright/test';

const SHOP_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 24, jokers: ['looter'], collected: 0, profile: {},
  bosses: ['general', 'witch'],
  phase: {
    kind: 'shop',
    shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null },
    reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
  },
};

async function fightWithLooter(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 8, run })), SHOP_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
}

test('compact joker tickets show only the picture and open the description on tap', async ({ page }) => {
  await fightWithLooter(page);
  const ticket = page.getByRole('button', { name: /Мародёр/ });
  await expect(ticket).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeHidden();
  await ticket.click();
  await expect(ticket).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeVisible();
  await ticket.click();
  await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeHidden();
});

test.describe('wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('wide joker tickets show the picture and the description', async ({ page }) => {
    await fightWithLooter(page);
    await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeVisible();
  });
});

test('jokers can be bought and reordered in the shop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {},
      bosses: ['general', 'witch'],
      phase: {
        kind: 'shop',
        shop: { items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, null], packs: [null, null], rerollCost: 2, opened: null, casting: null },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 8, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  const owned = page.getByTestId('owned-jokers').locator('.owned__ticket');
  await expect(owned).toHaveCount(2);
  await expect(owned.nth(1)).toHaveAccessibleName('Трефовик');
  await owned.nth(1).click();
  await page.getByRole('button', { name: 'Трефовик левее' }).click();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(owned.nth(0)).toHaveAccessibleName('Трефовик');
});
