import { expect, type Page } from '@playwright/test';

/** A saved run in the shop phase with five jokers and two focuses: «Continue», then «Next fight» opens a full fight. */
export const FULL_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage', 'mirror', 'hearts'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

/** A fight with five jokers and two focuses. */
export async function fullFight(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), FULL_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}
