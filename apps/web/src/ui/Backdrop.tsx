import type { CSSProperties } from 'react';
import { PALETTES } from './palettes';
import { useSettings } from './SettingsContext';
import { useStage } from './StageContext';
import { SwirlBackground } from './SwirlBackground';

export const BACKGROUND_SPEED = 0.6;
/** One swirl block in art pixels; outside a stage an art pixel is a CSS px, so this is the old 8 px block. */
const BACKGROUND_CELL = 8;

/** Swirl + CRT behind every screen; without WebGL the palette gradient underneath shows instead. */
export function Backdrop() {
  const { settings } = useSettings();
  const { cssPerArt } = useStage();
  const { colors } = PALETTES[settings.palette];
  const style = { '--bg-a': colors[0], '--bg-b': colors[1] } as CSSProperties;
  return (
    <div className="backdrop" data-palette={settings.palette} style={style} aria-hidden="true">
      <SwirlBackground colors={colors} pixel={BACKGROUND_CELL * cssPerArt} speed={BACKGROUND_SPEED} />
      <div className="crt" />
    </div>
  );
}
