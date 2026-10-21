import { makeCard } from '@game/core';
import { describe, expect, it } from 'vitest';
import { composeIndexLayer, cornerBlock } from './cornerIndex';

const painted = (p: { w: number; h: number; data: Uint8ClampedArray }) => Array.from({ length: p.w * p.h }, (_, i) => p.data[i * 4 + 3] ?? 0).filter((a) => a > 0).length;

describe('cornerIndex', () => {
  it('draws one pip per suit in a fixed-size corner column', () => {
    for (const size of ['l', 's'] as const) {
      const sizes = (['hearts', 'diamonds', 'clubs', 'spades'] as const).map((suit) => cornerBlock(makeCard(suit, 6), size));
      for (const block of sizes) {
        expect(block.w).toBe(sizes[0]?.w);
        expect(painted(block)).toBeGreaterThan(0);
      }
    }
  });

  it('puts an index in both corners and the big suit only when given', () => {
    const big = { w: 10, h: 10, data: new Uint8ClampedArray(400).fill(255) };
    const bare = composeIndexLayer(makeCard('clubs', 7), 's', 52, 73, undefined);
    const plain = composeIndexLayer(makeCard('clubs', 7), 's', 52, 73, big);
    expect(painted(plain)).toBeGreaterThan(painted(bare));
    expect([bare.w, bare.h]).toEqual([52, 73]);
  });
});
