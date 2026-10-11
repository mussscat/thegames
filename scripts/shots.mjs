// Screenshots and a short screen recording of the stage, for the owner to look at.
// Needs the built app served:  npm run build && npm run preview -w @game/web -- --port 4173
// Writes to .superpowers/shots/juice-1/ (not committed).
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const URL = process.env.SHOTS_URL ?? 'http://localhost:4173';
const OUT = '.superpowers/shots/juice-1';
mkdirSync(OUT, { recursive: true });

const run = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['hearts', 'looter', 'small', 'rage', 'mirror'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [{ card: { kind: 'joker', jokerId: 'gloat' }, price: 5 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }], packs: [{ kind: 'focuses', size: 'big', price: 6 }, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'], recordVideo: { dir: OUT, size: { width: 412, height: 915 } } });
const page = await context.newPage();
await page.goto(URL);
await page.evaluate((saved) => {
  localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved }));
  localStorage.setItem('thegame.settings', JSON.stringify({ effects: true }));
}, run);
await page.reload();
await page.screenshot({ path: `${OUT}/menu.png` });
await page.getByRole('button', { name: 'Продолжить забег' }).click();
await page.screenshot({ path: `${OUT}/shop.png` });
await page.getByRole('button', { name: /Следующий бой/ }).click();
await page.getByTestId('player-hand').waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/fight.png` });
const hand = await page.getByTestId('player-hand').boundingBox();
for (let i = 0; i < 40 && hand; i++) {
  await page.mouse.move(hand.x + hand.width * (0.1 + 0.8 * ((i % 20) / 20)), hand.y + hand.height * 0.6);
  await page.waitForTimeout(60);
}
await page.screenshot({ path: `${OUT}/fight-hover.png` });
await page.goto(`${URL}/?lab`);
await page.getByRole('button', { name: 'Ощущение' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/lab-feel.png`, fullPage: true });
await context.close();
await browser.close();
console.log(`saved to ${OUT}`);
