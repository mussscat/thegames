import { computeScale, type PixelScale, type ScaleTarget, type Viewport } from './pixelScale';

export type StageLayout = PixelScale & {
  /** Where the stage's top-left corner sits, in CSS px: a whole number of device pixels, so no art pixel straddles one. */
  readonly offsetX: number;
  readonly offsetY: number;
};

/** The stage's scale plus its position: centred, the sub-art-pixel remainder split between the edges by whole device pixels. */
export function stageLayout(viewport: Viewport, target: ScaleTarget): StageLayout {
  const scale = computeScale(viewport, target);
  const dpr = viewport.dpr > 0 ? viewport.dpr : 1;
  const spareW = Math.floor(viewport.cssW * dpr) - scale.artW * scale.n;
  const spareH = Math.floor(viewport.cssH * dpr) - scale.artH * scale.n;
  return { ...scale, offsetX: Math.max(0, Math.floor(spareW / 2)) / dpr, offsetY: Math.max(0, Math.floor(spareH / 2)) / dpr };
}
