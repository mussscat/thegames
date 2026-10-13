import { expect, test, type Page } from '@playwright/test';

type StageMeasure = { readonly n: number; readonly artW: number; readonly artH: number; readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly dpr: number; readonly vw: number; readonly vh: number; readonly scrollW: number; readonly scrollH: number };

async function measure(page: Page): Promise<StageMeasure> {
  return page.locator('.stage').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport;
    return {
      n: Number((el as HTMLElement).dataset.n),
      artW: Number((el as HTMLElement).dataset.artW),
      artH: Number((el as HTMLElement).dataset.artH),
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      dpr: window.devicePixelRatio,
      vw: vv?.width ?? window.innerWidth,
      vh: vv?.height ?? window.innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
    };
  });
}

function expectWholeDevicePixels(m: StageMeasure): void {
  const cssPerArt = m.width / m.artW;
  expect(Number.isInteger(m.n)).toBe(true);
  expect(m.n).toBeGreaterThanOrEqual(1);
  expect(cssPerArt * m.dpr).toBeCloseTo(m.n, 2);
  expect(m.left * m.dpr).toBeCloseTo(Math.round(m.left * m.dpr), 1);
  expect(m.top * m.dpr).toBeCloseTo(Math.round(m.top * m.dpr), 1);
}

for (const size of [null, { width: 1920, height: 1080 }, { width: 375, height: 667 }]) {
  test(`the pixel stage is a whole number of device pixels per art pixel${size ? ` at ${size.width}×${size.height}` : ''}`, async ({ page }) => {
    if (size) await page.setViewportSize(size);
    await page.goto('/?pixel');
    await expect(page.locator('.stage')).toBeVisible();
    const m = await measure(page);
    expectWholeDevicePixels(m);
    // Centred: the gaps on opposite sides differ by less than one art pixel.
    const cssPerArt = m.width / m.artW;
    expect(Math.abs(m.left - (m.vw - m.left - m.width))).toBeLessThanOrEqual(cssPerArt);
    expect(Math.abs(m.top - (m.vh - m.top - m.height))).toBeLessThanOrEqual(cssPerArt);
    // It never overflows: nothing scrolls.
    expect(m.scrollW).toBeLessThanOrEqual(Math.ceil(m.vw));
    expect(m.scrollH).toBeLessThanOrEqual(Math.ceil(m.vh));
  });
}

test('without ?pixel the game renders as before, with no stage', async ({ page }) => {
  await page.goto('/?pixel=0');
  await expect(page.getByRole('button', { name: 'Новый забег' })).toBeVisible();
  await expect(page.locator('.stage')).toHaveCount(0);
});

test('?pixel is remembered for the next visit', async ({ page }) => {
  await page.goto('/?pixel');
  await expect(page.locator('.stage')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.stage')).toBeVisible();
});
