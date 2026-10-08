import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 915, height: 412 } });

test('landscape fight puts the run panel left of the table and keeps the hand on screen', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  const header = await page.getByTestId('run-header').boundingBox();
  const table = await page.getByTestId('table').boundingBox();
  const hand = page.getByTestId('player-hand').getByRole('button');
  await expect(hand).toHaveCount(6);
  expect(header && table && header.x + header.width <= table.x).toBe(true);
  for (const box of await hand.evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().toJSON()))) {
    expect(box.bottom).toBeLessThanOrEqual(412);
    expect(box.right).toBeLessThanOrEqual(915);
  }
});

test('landscape shop shows offers and the run summary side by side', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 24, jokers: ['looter'], collected: 0, profile: { 'hearts-12': 'golden' },
      bosses: ['general', 'witch'],
      phase: {
        kind: 'shop',
        shop: {
          offers: [{ jokerId: 'cardSharp', price: 6 }, { jokerId: 'trumpAce', price: 7 }],
          enhancementOffers: [{ enhancementId: 'coin', price: 3, cardIds: ['diamonds-6', 'diamonds-10', 'clubs-7'] }, null],
          rerollCost: 2,
        },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 7, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  const offers = await page.getByTestId('shop-offers').boundingBox();
  const reward = await page.getByTestId('shop-reward').boundingBox();
  expect(offers && reward && offers.x + offers.width <= reward.x).toBe(true);
});
