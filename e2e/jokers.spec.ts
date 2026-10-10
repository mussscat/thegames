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

test('a joker card in the fight shows its rule on tap and hides it on a second tap', async ({ page }) => {
  await fightWithLooter(page);
  const joker = page.getByRole('button', { name: 'Мародёр' });
  await expect(joker).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeHidden();
  await joker.click();
  await expect(joker).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeVisible();
  await joker.click();
  await expect(page.getByText('+1 монета за каждый «Беру» соперника')).toBeHidden();
});

test('the fight shows five joker slots: the owned joker as a card and four empty outlines', async ({ page }) => {
  await fightWithLooter(page);
  const panel = page.getByRole('region', { name: 'Джокеры' });
  await expect(panel.locator('.jface')).toHaveCount(5);
  await expect(panel.locator('.jface--empty')).toHaveCount(4);
});

test.describe('wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('hovering a joker card in the sidebar shows its rule', async ({ page }) => {
    await fightWithLooter(page);
    await page.getByRole('button', { name: 'Мародёр' }).hover();
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
  const owned = page.getByTestId('owned-jokers').locator('.owned__card');
  await expect(owned).toHaveCount(2);
  await expect(owned.nth(1)).toHaveAccessibleName('Трефовик');
  await owned.nth(1).click();
  await page.getByRole('button', { name: 'Трефовик левее' }).click();
  await expect(owned.nth(0)).toHaveAccessibleName('Трефовик');
});
