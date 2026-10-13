import { createContext, useContext } from 'react';
import type { StageFrame } from './pixelScale';

export type StageInfo = {
  /** CSS pixels per art pixel; 1 outside a stage, so tests and the lab keep working. */
  readonly cssPerArt: number;
  readonly artW: number;
  readonly artH: number;
  /** The stage element: the place portals render into so they are laid out and scaled like the rest. Null outside a stage. */
  readonly root: HTMLElement | null;
  /** Where the stage sits on screen right now (read on demand: it changes with rotation and resize). */
  readonly frame: () => StageFrame;
};

const SCREEN_FRAME: StageFrame = { left: 0, top: 0, cssPerArt: 1 };

export const NO_STAGE: StageInfo = { cssPerArt: 1, artW: 0, artH: 0, root: null, frame: () => SCREEN_FRAME };

export const StageContext = createContext<StageInfo>(NO_STAGE);

export function useStage(): StageInfo {
  return useContext(StageContext);
}
