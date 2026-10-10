import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settleWithin } from './preload';

describe('settleWithin', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves as soon as the work settles, without waiting for the timeout', async () => {
    const done = vi.fn();
    void settleWithin(Promise.resolve('ok'), 2000).then(done);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledWith(true);
  });

  it('resolves false after the timeout when the work never settles', async () => {
    const done = vi.fn();
    void settleWithin(new Promise<never>(() => undefined), 2000).then(done);
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledWith(false);
  });

  it('never rejects: a failing job counts as settled', async () => {
    const done = vi.fn();
    void settleWithin(Promise.reject(new Error('decode failed')), 2000).then(done, () => done('rejected'));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledWith(true);
  });
});
