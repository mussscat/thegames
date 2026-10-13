import type { CSSProperties } from 'react';

export type CrtSettings = {
  readonly on: boolean;
  /** Darkness of the scanline gap, 0–100 %. */
  readonly scan: number;
  /** Scanline period in art pixels: 1 = a line per art pixel, 0.5 = twice as fine. */
  readonly period: number;
  /** Darkness of the screen edges, 0–100 %. */
  readonly vignette: number;
  /** Strength of the blue tint of the blacks, 0–100 %. */
  readonly tint: number;
};

export const CRT_DEFAULT: CrtSettings = { on: true, scan: 22, period: 0.5, vignette: 35, tint: 12 };

/**
 * A post-process look painted over the stage: scanlines locked to the art grid, a vignette and a cold tint.
 * Pure overlay (no filter, no blend mode), so it costs nothing per frame and never blocks input.
 */
export function CrtOverlay({ settings }: { readonly settings: CrtSettings }) {
  if (!settings.on) return null;
  const style = {
    '--crt-scan': `rgb(0 0 0 / ${settings.scan}%)`,
    '--crt-vignette': `rgb(0 0 0 / ${settings.vignette}%)`,
    '--crt-tint': `rgb(20 40 110 / ${settings.tint}%)`,
    '--crt-period': `calc(var(--u) * ${settings.period})`,
  } as CSSProperties;
  return <div className="pp-crt" style={style} aria-hidden="true" />;
}
