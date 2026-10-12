// Screenshots of the fight screen in both wide-screen layouts, for the owner to choose (A: sidebar, B: no sidebar).
// Needs the built app served:  npm run build && npm run preview -w @game/web -- --port 4173
// Writes to .superpowers/shots/fight/ (not committed).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const URL = process.env.SHOTS_URL ?? 'http://localhost:4173';
const OUT = '.superpowers/shots/fight';
mkdirSync(OUT, { recursive: true });

const run = {
  seed: 3, rng: { seed: 1696107122 }, stage: 1, coins: 30, jokers: ['hearts', 'looter', 'small', 'rage', 'mirror'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

const SIZES = [
  { name: 'phone-portrait', width: 390, height: 844, scale: 3, mobile: true },
  { name: 'phone-landscape', width: 844, height: 390, scale: 3, mobile: true },
  { name: 'mac', width: 1440, height: 900, scale: 2, mobile: false },
];

const browser = await chromium.launch();
for (const layout of ['a', 'b']) {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale, isMobile: size.mobile, hasTouch: size.mobile });
    const page = await context.newPage();
    await page.goto(`${URL}/?layout=${layout}`);
    await page.evaluate((saved) => {
      localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved }));
      localStorage.setItem('thegame.settings', JSON.stringify({ effects: true }));
    }, run);
    await page.reload();
    await page.getByRole('button', { name: 'Продолжить забег' }).click();
    await page.getByRole('button', { name: /Следующий бой/ }).click();
    await page.getByTestId('player-hand').waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${layout}-${size.name}.png` });
    if (size.name !== 'phone-landscape') {
      await page.getByTestId('enemy-badge').click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${layout}-${size.name}-enemy-tip.png` });
      await page.mouse.click(5, size.height / 2);
      await page.getByTestId('joker-stack').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/${layout}-${size.name}-jokers.png` });
    }
    await context.close();
  }
}
await browser.close();
console.log(`shots in ${OUT}`);
