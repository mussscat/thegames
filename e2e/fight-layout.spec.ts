import { expect, test, type Page } from '@playwright/test';
import { screenOverflow } from './helpers/fit';

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

test('the status text is for screen readers only and takes no space', async ({ page }) => {
  await startFight(page);
  const box = await page.getByRole('status').boundingBox();
  expect(box === null || (box.width <= 1 && box.height <= 1)).toBe(true);
});

test('enemy backs are whole, as big as the player cards, with no count', async ({ page }) => {
  await startFight(page);
  const sizes = await page.evaluate(() => {
    const back = document.querySelector('[data-testid="enemy-hand"] .card')!;
    const mine = document.querySelector('[data-testid="player-hand"] .card')!;
    return { back: (back as HTMLElement).offsetWidth, mine: (mine as HTMLElement).offsetWidth, clip: getComputedStyle(back).clipPath, count: document.querySelectorAll('.hand__count').length };
  });
  expect(Math.round(sizes.back)).toBe(Math.round(sizes.mine));
  expect(sizes.clip).toBe('none');
  expect(sizes.count).toBe(0);
});

const FULL_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage', 'mirror', 'hearts'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

/** A fight with five jokers and two focuses. */
async function fullFight(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((run) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), FULL_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

const tooSmall = (page: Page) =>
  page.evaluate(() =>
    // Playing cards overlap in the fan by design (down to 36 px wide on a phone with Safari's bars); every other button is a real tap target.
    [...document.querySelectorAll('.fight button:not(.card)')]
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.width < 43.5 || r.height < 43.5)).length,
  );

// 390×670, 430×742, 844×335 and 932×321 are an iPhone with Safari's bars showing; 500×1000 is a narrow tall desktop window.
const SIZES = [[320, 568], [375, 667], [390, 670], [390, 844], [412, 915], [430, 742], [430, 932], [500, 1000], [667, 375], [844, 335], [915, 412], [932, 321], [1280, 800], [1440, 900]] as const;
const WIDE_SIZES = SIZES.filter(([width, height]) => width > height);

for (const [width, height] of SIZES) {
  test(`the full fight fits ${width}×${height}, also with a focus picked`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    expect(await screenOverflow(page)).toBeLessThanOrEqual(0);
    expect(await tooSmall(page)).toBe(0);
    const geometry = await page.evaluate(() => {
      const rect = (el: Element | null) => el!.getBoundingClientRect();
      const handTop = rect(document.querySelector('[data-testid="player-hand"]')).top;
      const midParts = [...document.querySelectorAll('.fight__mid > *')].map((el) => rect(el).bottom);
      const segs = [...document.querySelectorAll('.hp__seg')].map((el) => rect(el).width);
      return { badge: rect(document.querySelector('[data-testid="enemy-badge"]')).width, midOverHand: Math.max(...midParts) - handTop, thinnestSeg: Math.min(...segs) };
    });
    expect(geometry.badge).toBeLessThanOrEqual(60);
    expect(geometry.midOverHand).toBeLessThanOrEqual(1);
    expect(geometry.thinnestSeg).toBeGreaterThanOrEqual(6);
    await page.getByTestId('enemy-badge').click();
    const tip = await page.getByRole('tooltip').boundingBox();
    expect(tip!.x).toBeGreaterThanOrEqual(0);
    expect(tip!.x + tip!.width).toBeLessThanOrEqual(width);
    await page.getByTestId('enemy-badge').click();
    await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
    await page.waitForTimeout(400); // the hand re-fans when the buttons change; measure after its 0.28 s transition
    expect(await screenOverflow(page)).toBeLessThanOrEqual(0);
  });
}

test('portrait order: top bar, enemy HP, enemy hand, table, hand, player HP, actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fullFight(page);
  const ys = await page.evaluate(() =>
    ['.fight__top', '.hp--enemy', '[data-testid="enemy-hand"]', '[data-testid="table"]', '[data-testid="player-hand"]', '.hp--player', '[data-testid="actions"]'].map(
      (s) => document.querySelector(s)!.getBoundingClientRect().top,
    ),
  );
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
});

test('top-bar boxes are all the same size', async ({ page }) => {
  await fullFight(page);
  const boxes = await page.locator('.fight__top > *').evaluateAll((els) => els.map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  expect(boxes).toHaveLength(3);
  expect(new Set(boxes.map((b) => b[0])).size).toBe(1);
  expect(new Set(boxes.map((b) => b[1])).size).toBe(1);
});

test.describe('desktop on a 2× screen', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('the hands are 111 px or more, the table pieces at least 74 px, all whole multiples of 37 px (74 device px)', async ({ page }) => {
    await fullFight(page);
    const sizes = await page.evaluate(() => ({
      hand: (document.querySelector('[data-testid="player-hand"] .card') as HTMLElement).offsetWidth,
      pile: (document.querySelector('.deck__pile') as HTMLElement).offsetWidth / 1.4,
    }));
    expect(sizes.hand).toBeGreaterThanOrEqual(111);
    expect(sizes.hand % 37).toBe(0);
    expect(Math.round(sizes.pile)).toBeGreaterThanOrEqual(74);
    expect(Math.round(sizes.pile) % 37).toBe(0);
  });
});

test.describe('a desktop browser (mouse, no touch) gets the same layout as a phone (owner, 2026-10-13)', () => {
  test.use({ hasTouch: false, isMobile: false });

  for (const [width, height] of [[1440, 900], [1280, 800]] as const) {
    test(`${width}×${height}: the sidebar is there`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await fullFight(page);
      const side = await page.locator('.fight__side').boundingBox();
      expect(side!.x).toBeLessThanOrEqual(1);
      expect(side!.width).toBeGreaterThan(150);
      expect(side!.width).toBeLessThan(width * 0.3);
      expect(await page.locator('.fight__side').evaluate((el) => getComputedStyle(el).display)).toBe('flex');
    });
  }
});

test.describe('the round button is always there (Balatro): disabled until it can be pressed, and nothing moves because of it', () => {
  test.use({ viewport: { width: 915, height: 412 } });

  test('the player attacks: the button waits disabled on the empty table, then lights up', async ({ page }) => {
    await fullFight(page);
    const button = page.getByTestId('actions').getByRole('button', { name: /Беру|Бито|Готово/ });
    await expect(button).toHaveCount(1);
    await expect(button).toBeDisabled();
    const before = await page.getByTestId('player-hand').boundingBox();
    const buttonBefore = await button.boundingBox();
    await page.locator('[data-testid="player-hand"] .card--playable').first().click();
    await expect(button).toBeEnabled({ timeout: 10_000 });
    const after = await page.getByTestId('player-hand').boundingBox();
    const buttonAfter = await button.boundingBox();
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonAfter!.x - buttonBefore!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonAfter!.y - buttonBefore!.y)).toBeLessThanOrEqual(1);
  });
});

for (const [width, height] of [[915, 412], [667, 375], [844, 390], [1280, 800]] as const) {
  test(`sidebar ${width}×${height}: menu on its own row, coins and deal side by side, nothing sticks out`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    const g = await page.evaluate(() => {
      const r = (el: Element) => el.getBoundingClientRect();
      const side = r(document.querySelector('.fight__side')!);
      const tiles = [...document.querySelectorAll('.fight__side .stats__tile')].map(r);
      const menu = r(document.querySelector('.fight__side .fight__menu')!);
      const inside = [...document.querySelectorAll('.fight__side *')].map(r).filter((b) => b.width > 0);
      return {
        menuBottom: menu.bottom, tilesTop: Math.min(...tiles.map((t) => t.top)), tilesTopSpread: Math.max(...tiles.map((t) => t.top)) - Math.min(...tiles.map((t) => t.top)),
        overRight: Math.max(...inside.map((b) => b.right)) - side.right, overBottom: Math.max(...inside.map((b) => b.bottom)) - innerHeight,
      };
    });
    expect(g.tilesTop).toBeGreaterThanOrEqual(g.menuBottom);
    expect(g.tilesTopSpread).toBeLessThanOrEqual(1);
    expect(g.overRight).toBeLessThanOrEqual(0.5);
    expect(g.overBottom).toBeLessThanOrEqual(0);
  });
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: cards never rest on the table edge, buttons keep clear of the HP bar`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(400); // lifted cards finish their 0.15–0.28 s transitions
    const g = await page.evaluate(() => {
      const r = (el: Element) => el.getBoundingClientRect();
      const table = r(document.querySelector('[data-testid="table"]')!);
      const hand = [...document.querySelectorAll('[data-testid="player-hand"] .card')].map(r);
      const enemy = [...document.querySelectorAll('[data-testid="enemy-hand"] .card')].map(r);
      const hp = r(document.querySelector('.hp--player')!);
      // The action buttons; a selected focus chip lifts 4 px by design and is not what must keep clear of the bar.
      const btns = [...document.querySelectorAll('[data-testid="actions"] .pbtn')].map(r);
      const sharesColumn = btns.some((b) => b.left < hp.right && b.right > hp.left);
      return {
        handOverTable: table.bottom - Math.min(...hand.map((c) => c.top)),
        enemyOverTable: Math.max(...enemy.map((c) => c.bottom)) - table.top,
        // Wide screens: the buttons stand beside the hand and may sit above the HP bar; they just must not touch it.
        gapToHp: !sharesColumn ? 99 : innerWidth > innerHeight ? Math.max(Math.min(...btns.map((b) => b.top)) - hp.bottom, hp.top - Math.max(...btns.map((b) => b.bottom))) : Math.min(...btns.map((b) => b.top)) - hp.bottom,
        belowScreen: Math.max(...btns.map((b) => b.bottom)) - innerHeight,
      };
    });
    const shown = JSON.stringify(g);
    expect(g.handOverTable, shown).toBeLessThanOrEqual(0.5);
    expect(g.enemyOverTable, shown).toBeLessThanOrEqual(0.5);
    expect(g.gapToHp, shown).toBeGreaterThanOrEqual(6);
    expect(g.belowScreen, shown).toBeLessThanOrEqual(-6);
  });
}

/** Fills the table with the most a round can hold: six attacks, each defended (the defending card overhangs its attack). */
async function fillTable(page: Page): Promise<void> {
  await page.evaluate(() => {
    const table = document.querySelector('[data-testid="table"]')!;
    const sample = document.querySelector('[data-testid="player-hand"] .card')!;
    // A card from the hand carries the fan's position as an inline style: a table card must not.
    const copy = () => {
      const clone = sample.cloneNode(true) as HTMLElement;
      clone.removeAttribute('style');
      clone.classList.remove('card--playable');
      return clone;
    };
    for (let i = 0; i < 6; i++) {
      const pair = document.createElement('div');
      pair.className = 'table__pair';
      pair.append(copy());
      const defense = document.createElement('div');
      defense.className = 'table__defense';
      defense.append(copy());
      pair.append(defense);
      table.append(pair);
    }
  });
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: a full table keeps every card inside its panel and clear of the hand`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    await fillTable(page);
    const g = await page.evaluate(() => {
      const r = (el: Element) => el.getBoundingClientRect();
      const table = r(document.querySelector('[data-testid="table"]')!);
      const hand = r(document.querySelector('[data-testid="player-hand"]')!);
      const cards = [...document.querySelectorAll('[data-testid="table"] .card')].map(r);
      return {
        left: table.left - Math.min(...cards.map((c) => c.left)),
        right: Math.max(...cards.map((c) => c.right)) - table.right,
        top: table.top - Math.min(...cards.map((c) => c.top)),
        bottom: Math.max(...cards.map((c) => c.bottom)) - table.bottom,
        overHand: table.bottom - hand.top,
      };
    });
    const shown = JSON.stringify(g);
    expect(g.left, shown).toBeLessThanOrEqual(1);
    expect(g.right, shown).toBeLessThanOrEqual(1);
    expect(g.top, shown).toBeLessThanOrEqual(1);
    expect(g.bottom, shown).toBeLessThanOrEqual(1);
    expect(g.overHand, shown).toBeLessThanOrEqual(0.5);
  });
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: the deck and the jokers sit level at the middle of the table, equally wide`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    const g = await page.evaluate(() => {
      const r = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const table = r('[data-testid="table"]');
      const deck = r('.deck');
      const stack = r('.jstack__pile');
      const pile = r('.deck__pile');
      const mid = r('.fight__mid');
      return {
        // The deck column is the pile and the strip under it; the jokers keep that strip empty, so both piles start level.
        level: Math.abs(pile.top - stack.top),
        deckCentre: Math.abs((deck.top + deck.bottom) / 2 - (table.top + table.bottom) / 2),
        deckLeft: Math.abs(deck.left - mid.left),
        stackRight: Math.abs(r('.fight__side-stack').right - mid.right),
        tableCentred: Math.abs(table.left - mid.left - (mid.right - table.right)),
      };
    });
    const shown = JSON.stringify(g);
    expect(g.level, shown).toBeLessThanOrEqual(1);
    expect(g.deckCentre, shown).toBeLessThanOrEqual(2);
    expect(g.deckLeft, shown).toBeLessThanOrEqual(1);
    expect(g.stackRight, shown).toBeLessThanOrEqual(1);
    expect(g.tableCentred, shown).toBeLessThanOrEqual(2);
  });
}

for (const [width, height] of [[932, 321], [844, 335], [667, 375]] as const) {
  test(`sidebar ${width}×${height} on a phone with a notch (59 px left and right, 21 px home bar): nothing is cut off`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    await page.evaluate(() => {
      const root = document.documentElement.style;
      root.setProperty('--safe-left', '59px');
      root.setProperty('--safe-right', '59px');
      root.setProperty('--safe-bottom', '21px');
    });
    const g = await page.evaluate(() => {
      const r = (el: Element) => el.getBoundingClientRect();
      const side = r(document.querySelector('.fight__side')!);
      const inside = [...document.querySelectorAll('.fight__side *')].map(r).filter((b) => b.width > 0);
      const hp = [...document.querySelectorAll('.fight__side .hp')].map((el) => ({ box: r(el), value: r(el.querySelector('.hp__value')!) }));
      return {
        contentLeft: Math.min(...inside.map((b) => b.left)),
        overRight: Math.max(...inside.map((b) => b.right)) - side.right,
        overBottom: Math.max(...inside.map((b) => b.bottom)) - (innerHeight - 21),
        valueCut: Math.max(...hp.map((h) => h.value.right - h.box.right)),
        trackWidth: Math.min(...[...document.querySelectorAll('.fight__side .hp__track')].map((t) => r(t).width)),
      };
    });
    expect(g.contentLeft).toBeGreaterThanOrEqual(59);
    expect(g.overRight).toBeLessThanOrEqual(0.5);
    expect(g.overBottom).toBeLessThanOrEqual(0);
    expect(g.valueCut).toBeLessThanOrEqual(0.5);
    expect(g.trackWidth).toBeGreaterThanOrEqual(60);
  });
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: the deck's count and trump sit under the pile, inside the middle row`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    const g = await page.evaluate(() => {
      const r = (el: Element) => el.getBoundingClientRect();
      const pile = r(document.querySelector('.deck__pile')!);
      const info = r(document.querySelector('.deck__info')!);
      const mid = r(document.querySelector('.fight__mid')!);
      const table = r(document.querySelector('[data-testid="table"]')!);
      const chips = [...document.querySelectorAll('.deck__info .chip')].map(r);
      return {
        overPile: pile.bottom - Math.min(...chips.map((c) => c.top)),
        belowMid: Math.max(...chips.map((c) => c.bottom)) - mid.bottom,
        intoTable: Math.max(...chips.map((c) => c.right)) - table.left,
        offLeft: mid.left - Math.min(...chips.map((c) => c.left)),
        infoTop: info.top - pile.bottom,
      };
    });
    const shown = JSON.stringify(g);
    expect(g.overPile, shown).toBeLessThanOrEqual(1);
    expect(g.belowMid, shown).toBeLessThanOrEqual(0.5);
    expect(g.intoTable, shown).toBeLessThanOrEqual(0.5);
    expect(g.offLeft, shown).toBeLessThanOrEqual(8);
  });
}

for (const [width, height] of WIDE_SIZES) {
  test(`${width}×${height}: the action buttons stand right of the hand, the focus chips left of it`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fullFight(page);
    await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
    const g = await page.evaluate(() => {
      const r = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const hand = r('[data-testid="player-hand"]');
      const buttons = r('.actions__buttons');
      const chips = r('.actions__chips');
      const table = r('[data-testid="table"]');
      return {
        buttonsLeftOfHandEnd: hand.right - buttons.left,
        chipsRightOfHandStart: chips.right - hand.left,
        buttonsOverTable: table.bottom - buttons.top,
      };
    });
    const shown = JSON.stringify(g);
    expect(g.buttonsLeftOfHandEnd, shown).toBeLessThanOrEqual(0.5);
    expect(g.chipsRightOfHandStart, shown).toBeLessThanOrEqual(0.5);
    expect(g.buttonsOverTable, shown).toBeLessThanOrEqual(0.5);
  });
}
