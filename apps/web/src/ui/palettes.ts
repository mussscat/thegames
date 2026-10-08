export const PALETTE_IDS = ['balatro', 'felt', 'neon'] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export type Palette = { readonly name: string; readonly colors: readonly [string, string, string] };

export const PALETTES: Readonly<Record<PaletteId, Palette>> = {
  balatro: { name: 'Балатро', colors: ['#3b1c32', '#b4282d', '#f2994a'] },
  felt: { name: 'Сукно', colors: ['#0b2a22', '#1f6b4a', '#d9b44a'] },
  neon: { name: 'Неон', colors: ['#1d2b53', '#7e2553', '#29adff'] },
};
