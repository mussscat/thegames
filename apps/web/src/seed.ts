const MAX_SEED = 0xffffffff;
const DIGITS_ONLY = /^\d+$/;

export function parseSeed(raw: string | null): number | null {
  if (raw === null || !DIGITS_ONLY.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value <= MAX_SEED ? value : null;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

export function seedFromUrl(search: string): number {
  return parseSeed(new URLSearchParams(search).get('seed')) ?? randomSeed();
}
