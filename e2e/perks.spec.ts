import { expect, test, type Page } from '@playwright/test';

const SHOP_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 24, perks: ['looter'], profile: {},
  bosses: ['general', 'witch'],
  phase: {
    kind: 'shop',
    shop: { offers: [null, null], enhancementOffers: [null, null], rerollCost: 2 },
    reward: { base: 3, hpBonus: 5, interest: 2, perkBonus: 0, cardBonus: 0, total: 10 },
  },
};

async function fightWithLooter(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 6, run })), SHOP_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /В бой/ }).click();
}

test('compact perk tickets show only the picture and open the description on tap', async ({ page }) => {
  await fightWithLooter(page);
  const ticket = page.getByRole('button', { name: /Мародёр/ });
  await expect(ticket).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('+1 монета каждый раз, когда соперник берёт')).toBeHidden();
  await ticket.click();
  await expect(ticket).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('+1 монета каждый раз, когда соперник берёт')).toBeVisible();
  await ticket.click();
  await expect(page.getByText('+1 монета каждый раз, когда соперник берёт')).toBeHidden();
});

test.describe('wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('wide perk tickets show the picture and the description', async ({ page }) => {
    await fightWithLooter(page);
    await expect(page.getByText('+1 монета каждый раз, когда соперник берёт')).toBeVisible();
  });
});
