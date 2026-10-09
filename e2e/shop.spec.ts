import { expect, test, type Page } from '@playwright/test';

const HAND = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];

function shopRun(shop: object, patch: object = {}) {
  return {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {},
    bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    ...patch,
  };
}

const BASE_SHOP = {
  items: [{ card: { kind: 'joker', jokerId: 'clubs' }, price: 4 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }],
  packs: [{ kind: 'deck', size: 'normal', price: 4 }, { kind: 'jokers', size: 'normal', price: 4 }],
  rerollCost: 2,
  opened: null,
  casting: null,
};

async function openShop(page: Page, run: object): Promise<void> {
  await page.goto('/');
  await page.evaluate((saved) => window.localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 8, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('shop')).toBeVisible();
}

async function savedProfile(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('thegame.durak.run') ?? '{}').run.profile);
}

test('buying a joker item through the detail sheet', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-item-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Трефовик за 4' }).click();
  await expect(page.getByTestId('owned-jokers').getByRole('button', { name: 'Трефовик' })).toBeVisible();
  await expect(page.getByTestId('shop-item-0')).toContainText('Продано');
});

test('a bought pack opens, reveals its cards and a pick lands in the deck', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-pack-0').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Колода за 4' }).click();
  const opening = page.getByTestId('pack-opening');
  await expect(opening).toBeVisible();
  await opening.click({ position: { x: 5, y: 5 } });
  await opening.locator('.opening__card').first().click();
  await page.getByRole('button', { name: 'Взять' }).click();
  await expect(opening).toBeHidden();
  expect(Object.keys(await savedProfile(page))).toHaveLength(1);
});

test('a shelf tarot is bought, then applied right in its sheet — no pack screen', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-item-1').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Солнце за 3' }).click();
  await expect(page.getByTestId('pack-opening')).toHaveCount(0);
  const targets = page.getByTestId('tarot-targets');
  await expect(targets).toBeVisible();
  await targets.getByRole('button').nth(1).click();
  await targets.getByRole('button').nth(2).click();
  await page.getByRole('button', { name: 'Применить' }).click();
  await expect(targets).toHaveCount(0);
  expect(Object.values(await savedProfile(page))).toEqual(['golden', 'golden']);
  await expect(page.getByTestId('shop-item-1')).toContainText('Продано');
});

test('a shelf tarot over an enhanced card asks first, and the confirm can be pressed', async ({ page }) => {
  await openShop(page, shopRun({ ...BASE_SHOP, casting: { tarotId: 'sun', hand: HAND } }, { profile: { 'clubs-6': 'sharp' } }));
  const targets = page.getByTestId('tarot-targets');
  await targets.getByRole('button').nth(0).click();
  await page.getByRole('button', { name: 'Применить' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Замена усиления' });
  await expect(dialog).toContainText('Острая → Золотая');
  await dialog.getByRole('button', { name: 'Заменить' }).click({ timeout: 3_000 });
  await expect(targets).toHaveCount(0);
  expect(await savedProfile(page)).toEqual({ 'clubs-6': 'golden' });
});

test('a bought shelf tarot survives a reload and can be skipped with the money spent', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-item-1').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Солнце за 3' }).click();
  await expect(page.getByTestId('tarot-targets')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('tarot-targets')).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await expect(page.getByTestId('tarot-targets')).toHaveCount(0);
  expect(await savedProfile(page)).toEqual({});
  await expect(page.getByLabel('Монеты: 27')).toBeVisible();
});

test('a tarot from an arcana pack is applied to chosen cards of the hand', async ({ page }) => {
  await openShop(page, shopRun({ ...BASE_SHOP, opened: { kind: 'arcana', cards: [{ kind: 'tarot', tarotId: 'sun' }], picksLeft: 1, hand: HAND } }));
  const opening = page.getByTestId('pack-opening');
  await opening.click({ position: { x: 5, y: 5 } });
  await opening.getByRole('button', { name: 'Солнце' }).click();
  const apply = page.getByRole('button', { name: 'Применить' });
  await expect(apply).toBeDisabled();
  const targets = page.getByTestId('tarot-targets');
  await targets.getByRole('button').nth(0).click();
  await targets.getByRole('button').nth(3).click();
  await apply.click();
  await expect(opening).toBeHidden();
  expect(await savedProfile(page)).toEqual({ 'clubs-6': 'golden', 'clubs-9': 'golden' });
});

test('replacing an enhancement asks first and shows both versions', async ({ page }) => {
  const opened = { kind: 'deck', cards: [{ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }], picksLeft: 1, hand: [] };
  await openShop(page, shopRun({ ...BASE_SHOP, opened }, { profile: { 'hearts-14': 'sharp' } }));
  const opening = page.getByTestId('pack-opening');
  await opening.click({ position: { x: 5, y: 5 } });
  await expect(opening).toContainText('В колоде: Острая');
  await opening.locator('.opening__card').first().click();
  await page.getByRole('button', { name: 'Взять' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Замена усиления' });
  await expect(dialog).toContainText('Острая → Золотая');
  await dialog.getByRole('button', { name: 'Заменить' }).click();
  await expect(opening).toBeHidden();
  expect(await savedProfile(page)).toEqual({ 'hearts-14': 'golden' });
});

test('a reload during an opening brings the same pack back', async ({ page }) => {
  await openShop(page, shopRun(BASE_SHOP));
  await page.getByTestId('shop-pack-1').getByRole('button').click();
  await page.getByRole('button', { name: 'Купить Джокеры за 4' }).click();
  await expect(page.getByTestId('pack-opening')).toBeVisible();
  const read = () => page.evaluate(() => JSON.parse(window.localStorage.getItem('thegame.durak.run') ?? '{}').run.phase.shop.opened);
  const before = await read();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(page.getByTestId('pack-opening')).toBeVisible();
  expect(await read()).toEqual(before);
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await expect(page.getByTestId('pack-opening')).toBeHidden();
});

for (const viewport of [
  { width: 375, height: 667 },
  { width: 1280, height: 800 },
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('the whole shop fits on screen without scrolling', async ({ page }) => {
      await openShop(page, shopRun(BASE_SHOP));
      for (const id of ['owned-jokers', 'shop-item-0', 'shop-item-1', 'shop-pack-0', 'shop-pack-1']) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box, id).not.toBeNull();
        expect(box!.y + box!.height, id).toBeLessThanOrEqual(viewport.height);
      }
      for (const name of [/Следующий бой/, /Рерол/]) {
        const box = await page.getByRole('button', { name }).boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      }
    });
  });
}

test('the lab opens any pack', async ({ page }) => {
  await page.goto('/?lab');
  await page.getByRole('button', { name: 'Паки' }).click();
  await page.getByRole('button', { name: 'Вскрыть' }).click();
  await expect(page.getByTestId('pack-opening')).toBeVisible();
});
