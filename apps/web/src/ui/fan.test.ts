import { describe, expect, it } from 'vitest';
import { fanAngle, fanDrop, handLayout, handOverlap } from './fan';

describe('fanAngle', () => {
  it('is zero for a single card and symmetric around the middle', () => {
    expect(fanAngle(0, 1)).toBe(0);
    expect(fanAngle(0, 5)).toBe(-fanAngle(4, 5));
    expect(fanAngle(2, 5)).toBe(0);
  });

  it('keeps the whole fan within ±3° (owner: a flat, Balatro-like arc)', () => {
    for (const count of [2, 3, 6, 8, 12, 30]) {
      const angles = Array.from({ length: count }, (_, i) => fanAngle(i, count));
      expect(Math.max(...angles.map(Math.abs))).toBeLessThanOrEqual(3);
      expect(angles[0]).toBeLessThan(0);
    }
  });
});

describe('fanDrop', () => {
  it('lifts the middle and drops the edges', () => {
    expect(fanDrop(2, 5)).toBe(0);
    expect(fanDrop(0, 5)).toBeGreaterThan(fanDrop(1, 5));
    expect(fanDrop(0, 1)).toBe(0);
  });

  it('drops the outer cards at most 4 px', () => {
    for (const count of [2, 6, 12]) {
      expect(fanDrop(0, count)).toBeLessThanOrEqual(4);
      expect(fanDrop(Math.floor((count - 1) / 2), count)).toBeLessThanOrEqual(1);
    }
  });
});

describe('handOverlap', () => {
  it('does not overlap a normal hand', () => {
    expect(handOverlap(1)).toBe(0);
    expect(handOverlap(6)).toBe(0);
  });

  it('squeezes a big hand into 6.5 card widths', () => {
    for (const count of [7, 13, 24]) {
      const overlap = handOverlap(count);
      const width = 1 + (count - 1) * (1 - overlap);
      expect(width).toBeCloseTo(6.5);
      expect(overlap).toBeLessThan(1);
    }
  });
});

describe('handLayout', () => {
  const WIDTHS = [200, 396, 700];
  const CARD = 64;

  it('is empty for no cards and centred for one', () => {
    expect(handLayout(0, 396, CARD)).toEqual([]);
    expect(handLayout(1, 396, CARD)).toEqual([{ x: 0, y: 0, angle: 0 }]);
  });

  it('keeps every card inside the container for 1…12 cards on narrow and wide hands', () => {
    for (const width of WIDTHS) {
      for (let count = 1; count <= 12; count++) {
        const slots = handLayout(count, width, CARD);
        expect(slots).toHaveLength(count);
        for (const slot of slots) {
          expect(Number.isFinite(slot.x) && Number.isFinite(slot.y) && Number.isFinite(slot.angle)).toBe(true);
          expect(Math.abs(slot.x) + CARD / 2).toBeLessThanOrEqual(width / 2 + 0.001);
        }
      }
    }
  });

  it('is symmetric, left to right, and lets cards touch with a small gap when they fit', () => {
    const slots = handLayout(5, 700, CARD);
    expect(slots[0]?.x).toBeCloseTo(-(slots[4]?.x ?? 0));
    for (let i = 1; i < slots.length; i++) expect(slots[i]!.x).toBeGreaterThan(slots[i - 1]!.x);
    expect(slots[1]!.x - slots[0]!.x).toBeCloseTo(CARD + 4);
  });

  it('overlaps more as the hand grows on a fixed width', () => {
    const six = handLayout(6, 396, 74);
    const ten = handLayout(10, 396, 74);
    expect(six[1]!.x - six[0]!.x).toBeGreaterThan(ten[1]!.x - ten[0]!.x);
  });

  it('stacks the cards instead of producing NaN while the container is not measured yet', () => {
    const slots = handLayout(3, 0, 0);
    expect(slots.every((s) => s.x === 0)).toBe(true);
  });
});
