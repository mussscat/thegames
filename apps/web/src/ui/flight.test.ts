import { describe, expect, it } from 'vitest';
import { markClaimed, rememberLeave, takeLeave, ORIGIN_TTL_MS, planFlight, rememberOrigin, takeOrigin, wasClaimed } from './flight';

describe('origins', () => {
  it('keeps an origin for a repeated read (StrictMode runs effects twice)', () => {
    rememberOrigin('a', { left: 1, top: 2, width: 3, height: 4 }, 100);
    expect(takeOrigin('a', 200)?.left).toBe(1);
    expect(takeOrigin('a', 300)?.left).toBe(1);
  });

  it('drops a stale origin', () => {
    rememberOrigin('b', { left: 1, top: 2, width: 3, height: 4 }, 0);
    expect(takeOrigin('b', ORIGIN_TTL_MS + 1)).toBeUndefined();
  });
});

describe('planFlight', () => {
  const from = { left: 100, top: 400, width: 74, height: 104, at: 0 };
  it('offsets between centres, divided by the stage scale', () => {
    const plan = planFlight(from, { left: 100, top: 200, width: 52, height: 73 }, 2);
    expect(plan.dx).toBeCloseTo(5.5);
    expect(plan.dy).toBeCloseTo((452 - 236.5) / 2);
  });
  it('scales by the sprite size ratio and survives a zero scale', () => {
    const plan = planFlight(from, { left: 0, top: 0, width: 37, height: 52 }, 0);
    expect(plan.scale).toBe(2);
  });
});

describe('claims', () => {
  it('knows whether a card was claimed since a moment', () => {
    markClaimed('c', 500);
    expect(wasClaimed('c', 400)).toBe(true);
    expect(wasClaimed('c', 600)).toBe(false);
    expect(wasClaimed('never', 0)).toBe(false);
  });
});

describe('leaves', () => {
  it('are kept apart from hand origins', () => {
    rememberLeave('t', { left: 5, top: 6, width: 7, height: 8 }, 100);
    expect(takeLeave('t', 200)?.left).toBe(5);
    expect(takeOrigin('t', 200)).toBeUndefined();
    expect(takeLeave('t', 100 + ORIGIN_TTL_MS + 1)).toBeUndefined();
  });
});
