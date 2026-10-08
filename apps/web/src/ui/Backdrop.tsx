import type { CSSProperties } from 'react';
import { PALETTES } from './palettes';
import { useSettings } from './SettingsContext';
import { SwirlBackground } from './SwirlBackground';

export const BACKGROUND_SPEED = 0.6;
const BACKGROUND_PIXEL = 8;

/** Swirl + CRT behind every screen; without WebGL the palette gradient underneath shows instead. */
export function Backdrop() {
  const { settings } = useSettings();
  const { colors } = PALETTES[settings.palette];
  const style = { '--bg-a': colors[0], '--bg-b': colors[1] } as CSSProperties;
  return (
    <div className="backdrop" data-palette={settings.palette} style={style} aria-hidden="true">
      <SwirlBackground colors={colors} pixel={BACKGROUND_PIXEL} speed={BACKGROUND_SPEED} />
      <div className="crt" />
    </div>
  );
}
