import { useReducedMotion } from 'motion/react';
import { useOptionalSettings } from './SettingsContext';

/** The one place that decides whether decorative motion may run. */
export function motionAllowed(effects: boolean, reducedMotion: boolean): boolean {
  return effects && !reducedMotion;
}

/** Works outside the settings provider too (the lab), where effects count as on. */
export function useMotionEnabled(): boolean {
  const api = useOptionalSettings();
  const reduced = useReducedMotion() ?? false;
  return motionAllowed(api?.settings.effects ?? true, reduced);
}
