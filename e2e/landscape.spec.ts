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
          items: [{ card: { kind: 'joker', jokerId: 'cardSharp' }, price: 6 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }],
          packs: [{ kind: 'deck', size: 'normal', price: 4 }, { kind: 'jokers', size: 'normal', price: 4 }],
          rerollCost: 2,
          opened: null,
          casting: null,
        },
        reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 },
      },
    };
    window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 8, run }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  const side = await page.getByTestId('shop-reward').boundingBox();
  const items = await page.getByTestId('shop-item-0').boundingBox();
  const owned = await page.getByTestId('owned-jokers').boundingBox();
  expect(side && items && side.x + side.width <= items.x).toBe(true);
  expect(owned && items && owned.y + owned.height <= items.y).toBe(true);
});
