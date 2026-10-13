import { expect, test } from '@playwright/test';
import { fullFight } from './helpers/fullFight';

// Wide screens: a phone on its side (also with Safari's bars: 844×335, 932×321) and desktop windows.
const WIDE = [[667, 375], [844, 335], [915, 412], [932, 321], [1280, 800], [1440, 900]] as const;

test.describe('the chips × mult counter (side panel)', () => {
  test.use({ viewport: { width: 915, height: 412 } });

  test('it starts at zero chips and follows the cards the player puts on the table', async ({ page }) => {
    await fullFight(page);
    const counter = page.getByTestId('score-counter');
    await expect(counter).toBeVisible();
    await expect(page.getByTestId('counter-chips')).toHaveText('0');
    await expect(page.getByTestId('counter-mult')).toHaveText('0');
    await expect(page.getByTestId('counter-damage')).toHaveText('0');
    await page.locator('[data-testid="player-hand"] .card--playable').first().click();
    await expect.poll(async () => Number(await page.getByTestId('counter-chips').textContent())).toBeGreaterThan(0);
    await expect.poll(async () => Number(await page.getByTestId('counter-mult').textContent())).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => Number(await page.getByTestId('counter-damage').textContent())).toBeGreaterThan(0);
    // The total stands above the chips × mult row, without «=» (owner, 2026-10-13).
    const order = await page.evaluate(() => ({
      damage: document.querySelector('[data-testid="counter-damage"]')!.getBoundingClientRect().bottom,
      row: document.querySelector('.counter__row')!.getBoundingClientRect().top,
    }));
    expect(order.damage).toBeLessThanOrEqual(order.row + 0.5);
    await expect(counter).toContainText('Удар по сопернику');
  });
});

test('portrait phones do not show the counter, the title or the enemy line (owner: only in the side panel)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fullFight(page);
  await expect(page.getByTestId('score-counter')).toBeHidden();
  await expect(page.locator('.enemy-title')).toBeHidden();
  await expect(page.locator('.enemy-line')).toBeHidden();
});

for (const [width, height] of WIDE) {
  test(`${width}×${height}: the panel runs enemy block, counter, my HP, coins and deal, then Menu at the very bottom`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    const g = await page.evaluate(() => {
      const r = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const parts = ['.enemy-block', '[data-testid="score-counter"]', '.hp--player', '.fight__stats', '.fight__menu'].map((s) => ({ s, top: r(s).top, bottom: r(s).bottom }));
      const side = r('.fight__side');
      const badge = r('[data-testid="enemy-badge"]');
      const value = r('.hp--enemy .hp__value');
      const inside = [...document.querySelectorAll('.fight__side *')].map((el) => el.getBoundingClientRect()).filter((b) => b.width > 0);
      return {
        order: parts.map((p, i) => (i === 0 ? 0 : p.top - parts[i - 1]!.bottom)),
        menuIsLowest: Math.max(...inside.map((b) => b.bottom)) - parts[4]!.bottom,
        badgeBeforeValue: badge.right - value.left,
        sideShare: side.width / innerWidth,
        tiles: [...document.querySelectorAll('.fight__stats .stats__tile')].length,
      };
    });
    const shown = JSON.stringify(g);
    for (const gap of g.order.slice(1)) expect(gap, shown).toBeGreaterThanOrEqual(-0.5);
    expect(g.menuIsLowest, shown).toBeLessThanOrEqual(0.5);
    expect(g.badgeBeforeValue, shown).toBeLessThanOrEqual(1);
    expect(g.tiles, shown).toBe(2);
    if (width >= 800) expect(g.sideShare, shown).toBeGreaterThanOrEqual(0.22);
  });
}

for (const [width, height] of WIDE.filter(([, h]) => h > 500)) {
  test(`${width}×${height}: the tall panel has the coloured title with the enemy's name and the short enemy line`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    const title = page.locator('.enemy-title');
    await expect(title).toBeVisible();
    const name = (await page.getByTestId('enemy-badge').getAttribute('aria-label'))!.replace('Соперник: ', '');
    await expect(title).toHaveText(name);
    await expect(page.locator('.enemy-line')).toBeVisible();
    await expect(page.locator('.enemy-line')).toContainText('соперник');
    const colour = await title.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(colour).not.toBe('rgba(0, 0, 0, 0)');
  });
}

for (const [width, height] of WIDE.filter(([, h]) => h <= 500)) {
  test(`${width}×${height}: a short panel is compact — no title, no counter label, nothing cut off`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    await expect(page.locator('.enemy-title')).toBeHidden();
    await expect(page.locator('.counter__label')).toBeHidden();
    // «Nothing cut off»: the enemy block shows all of itself, its HP bar included (a clipped child still reports its full box).
    const clipped = await page.evaluate(() => {
      const block = document.querySelector('.enemy-block') as HTMLElement;
      const track = document.querySelector('.hp--enemy .hp__track')!.getBoundingClientRect();
      const hit = document.elementFromPoint(track.left + track.width / 2, track.top + track.height / 2);
      return { blockClipped: block.scrollHeight - block.clientHeight, trackVisible: !!hit && !!hit.closest('.hp__track') };
    });
    expect(clipped.blockClipped).toBeLessThanOrEqual(0.5);
    expect(clipped.trackVisible).toBe(true);
  });
}

/** Plays «Разгон» so that the panel shows a focus charge (an extra row that used to squeeze the enemy block). */
async function withCharge(page: import('@playwright/test').Page): Promise<void> {
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
  await page.getByTestId('actions').getByRole('button', { name: /Сыграть/ }).click();
  await expect(page.getByTestId('focus-charges')).toBeVisible();
}

for (const [width, height] of WIDE) {
  for (const notch of [false, true]) {
    test(`${width}×${height}${notch ? ' with a notch' : ''}, focus charge shown: the enemy block and its HP bar are not clipped`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await fullFight(page);
      if (notch) {
        await page.evaluate(() => {
          const root = document.documentElement.style;
          root.setProperty('--safe-left', '59px');
          root.setProperty('--safe-right', '59px');
          root.setProperty('--safe-bottom', '21px');
        });
      }
      await withCharge(page);
      await page.waitForTimeout(300);
      const g = await page.evaluate((bottomInset) => {
        const block = document.querySelector('.enemy-block') as HTMLElement;
        const side = document.querySelector('.fight__side') as HTMLElement;
        const track = document.querySelector('.hp--enemy .hp__track')!.getBoundingClientRect();
        const hit = document.elementFromPoint(track.left + track.width / 2, track.top + track.height / 2);
        const menu = document.querySelector('.fight__menu')!.getBoundingClientRect();
        return {
          blockClipped: block.scrollHeight - block.clientHeight,
          sideClipped: side.scrollHeight - side.clientHeight,
          trackVisible: !!hit && !!hit.closest('.hp__track'),
          menuBelowScreen: menu.bottom - (innerHeight - bottomInset),
        };
      }, notch ? 21 : 0);
      const shown = JSON.stringify(g);
      expect(g.blockClipped, shown).toBeLessThanOrEqual(0.5);
      expect(g.sideClipped, shown).toBeLessThanOrEqual(0.5);
      expect(g.trackVisible, shown).toBe(true);
      expect(g.menuBelowScreen, shown).toBeLessThanOrEqual(0.5);
    });
  }
}
