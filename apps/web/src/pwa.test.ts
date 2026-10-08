import { describe, expect, it } from 'vitest';
import { PRECACHE_GLOBS } from './pwa';

describe('PWA precache', () => {
  it('includes the bundled fonts so the pixel UI renders offline', () => {
    expect(PRECACHE_GLOBS.some((glob) => glob.includes('woff2'))).toBe(true);
  });
});
