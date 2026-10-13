export type ScaleTarget = { readonly w: number; readonly h: number };

/** Minimum screen size in art pixels; the scale is the largest whole n that still fits both. */
export const PILOT_TARGET: ScaleTarget = { w: 180, h: 320 };

/** The screen size the game is built for: 360 art pixels across (owner pick on iPhone Pro Max, 2026-10-14). */
export const SCREEN_TARGET: ScaleTarget = { w: 360, h: 320 };

export type Viewport = { readonly cssW: number; readonly cssH: number; readonly dpr: number };

export type PixelScale = {
  /** Device pixels per art pixel — always a whole number. */
  readonly n: number;
  /** CSS pixels per art pixel (`n / dpr`); fractional on fractional-dpr screens, but exact in device pixels. */
  readonly cssPerArt: number;
  /** Screen size in art pixels. */
  readonly artW: number;
  readonly artH: number;
};

/**
 * One art pixel = `n` whole device pixels, so every art pixel on screen has the same width even at
 * devicePixelRatio 2.625. `forceN` overrides the automatic choice (lab experiments).
 */
export function computeScale(viewport: Viewport, target: ScaleTarget, forceN?: number): PixelScale {
  const dpr = viewport.dpr > 0 ? viewport.dpr : 1;
  const deviceW = Math.floor(viewport.cssW * dpr);
  const deviceH = Math.floor(viewport.cssH * dpr);
  const auto = Math.floor(Math.min(deviceW / target.w, deviceH / target.h));
  const n = Math.max(1, forceN === undefined ? auto : Math.floor(forceN));
  return { n, cssPerArt: n / dpr, artW: Math.floor(deviceW / n), artH: Math.floor(deviceH / n) };
}

export type ScreenPoint = { readonly x: number; readonly y: number };

/** Where the stage sits on the screen and how many CSS pixels one art pixel covers there. */
export type StageFrame = { readonly left: number; readonly top: number; readonly cssPerArt: number };

/**
 * A pointer position (`clientX/Y`) in stage coordinates, i.e. in art pixels. Under the stage's `transform: scale`
 * screen coordinates and layout coordinates differ by `cssPerArt`; every read of a screen point goes through here.
 */
export function toArt(point: ScreenPoint, stage: StageFrame): ScreenPoint {
  const k = Number.isFinite(stage.cssPerArt) && stage.cssPerArt > 0 ? stage.cssPerArt : 1;
  return { x: (point.x - stage.left) / k, y: (point.y - stage.top) / k };
}
