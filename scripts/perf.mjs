// Rough frame-rate check: a fight with 5 jokers and a full hand on a Pixel 7 profile, CPU slowed ×4.
// Needs the built app served first:  npm run build && npm run preview -w @game/web -- --port 4173
// Usage: npm run perf     (PERF_URL overrides the address). It reports, it never fails: the real check is on a phone.
import { chromium, devices } from '@playwright/test';
import { summarizeFrames } from '../apps/web/src/ui/fpsMeter.ts';

const URL = process.env.PERF_URL ?? 'http://localhost:4173';
const SAMPLE_MS = 5000;
const TARGET_FPS = 55;

const run = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['hearts', 'looter', 'small', 'rage', 'mirror'], collected: 0, profile: {}, focuses: [],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
await page.goto(URL);
await page.evaluate((saved) => {
  localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved }));
  localStorage.setItem('thegame.settings', JSON.stringify({ effects: true }));
}, run);
await page.reload();
await page.getByRole('button', { name: 'Продолжить забег' }).click();
await page.getByRole('button', { name: /Следующий бой/ }).click();
await page.getByTestId('player-hand').waitFor();

const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const sampling = page.evaluate(
  (ms) =>
    new Promise((resolve) => {
      const deltas = [];
      let last = performance.now();
      const end = last + ms;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve(deltas);
      };
      requestAnimationFrame(tick);
    }),
  SAMPLE_MS,
);
// Move over the hand while sampling, so the tilt and the lift are part of the measurement.
const box = await page.getByTestId('player-hand').boundingBox();
const started = Date.now();
while (box && Date.now() - started < SAMPLE_MS) {
  const t = (Date.now() - started) / 700;
  await page.mouse.move(box.x + box.width * (0.5 + 0.4 * Math.sin(t)), box.y + box.height * 0.6);
  await page.waitForTimeout(40);
}
const stats = summarizeFrames(await sampling);
console.log(`fps (CPU ×4): avg ${stats.avg.toFixed(1)}, 5th percentile ${stats.p5.toFixed(1)} — ${stats.p5 >= TARGET_FPS ? 'OK' : `below ${TARGET_FPS}`}`);
await browser.close();
