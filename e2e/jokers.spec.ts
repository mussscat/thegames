import { expect, test, type Page } from '@playwright/test';

const SHOP_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 24, jokers: ['looter'], collected: 0, profile: {},
  bosses: ['general', 'witch'],
  phase: {
    kind: 'shop',
    shop: { offers: [null, null], enhancementOffers: [null, null], rerollCost: 2 },
    reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
  },
};

async function fightWithLooter(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 7, run })), SHOP_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /В бой/ }).click();
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
        shop: { offers: [{ jokerId: 'clubs', price: 4 }, null], enhancementOffers: [null, null], rerollCost: 2 },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 7, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  const owned = page.getByTestId('owned-jokers').getByRole('heading', { level: 4 });
  await expect(owned).toHaveText(['Мародёр', 'Трефовик']);
  await page.getByRole('button', { name: 'Трефовик левее' }).click();
  await expect(owned).toHaveText(['Трефовик', 'Мародёр']);
});
