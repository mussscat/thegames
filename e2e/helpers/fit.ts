import type { Page } from '@playwright/test';

/**
 * How far the current screen spills past what can be seen, in px (≤ 0 means it fits).
 * The document is pinned, so it never overflows itself: measure the screen root instead.
 * A screen that scrolls vertically may be taller than the viewport; nothing may ever be wider.
 */
export const screenOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const root = document.querySelector('#root main');
    if (!root) throw new Error('no screen root (#root main) on the page');
    const overflowY = getComputedStyle(root).overflowY;
    const scrollsDown = overflowY === 'auto' || overflowY === 'scroll';
    const down = scrollsDown ? 0 : root.scrollHeight - root.clientHeight;
    const wide = root.scrollWidth - root.clientWidth;
    return Math.max(down, wide);
  });
