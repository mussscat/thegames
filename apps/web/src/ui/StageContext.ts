import { createContext, useContext } from 'react';

export type StageInfo = {
  /** CSS pixels per art pixel; 1 outside a stage, so tests and the lab keep working. */
  readonly cssPerArt: number;
  readonly artW: number;
  readonly artH: number;
};

export const NO_STAGE: StageInfo = { cssPerArt: 1, artW: 0, artH: 0 };

export const StageContext = createContext<StageInfo>(NO_STAGE);

export function useStage(): StageInfo {
  return useContext(StageContext);
}
