import { nextInt, type RngState } from '@game/core';

/** One item with probability proportional to its integer weight; null for an empty or weightless pool. */
export function pickWeighted<T>(pool: readonly T[], weight: (item: T) => number, rng: RngState): readonly [T | null, RngState] {
  const total = pool.reduce((sum, item) => sum + weight(item), 0);
  if (total <= 0) return [null, rng];
  const [roll, next] = nextInt(rng, total);
  const bounds = pool.reduce<readonly number[]>((acc, item) => [...acc, (acc.at(-1) ?? 0) + weight(item)], []);
  const index = bounds.findIndex((bound) => roll < bound);
  return [pool[index] ?? null, next];
}

type Draw<T> = readonly [readonly T[], readonly T[], RngState];

/** Up to `count` different items, each drawn by weight from what is left. */
export function drawUnique<T>(pool: readonly T[], count: number, weight: (item: T) => number, rng: RngState): readonly [readonly T[], RngState] {
  const [drawn, , next] = Array.from({ length: count }).reduce<Draw<T>>(
    ([acc, left, current]) => {
      const [item, after] = pickWeighted(left, weight, current);
      return item === null ? [acc, left, after] : [[...acc, item], left.filter((other) => other !== item), after];
    },
    [[], pool, rng],
  );
  return [drawn, next];
}
