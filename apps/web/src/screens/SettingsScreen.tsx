import type { CSSProperties } from 'react';
import { PALETTE_IDS, PALETTES } from '../ui/palettes';
import { PixelButton } from '../ui/PixelButton';
import { useSettings } from '../ui/SettingsContext';
import './menu.css';

export function SettingsScreen({ onBack }: { readonly onBack: () => void }) {
  const { settings, update, play } = useSettings();
  return (
    <main className="screen menu">
      <h1 className="menu__title">Настройки</h1>
      <section className="panel settings">
        <h2 className="settings__label">Палитра фона</h2>
        <div className="settings__palettes">
          {PALETTE_IDS.map((id) => {
            const [a, b, c] = PALETTES[id].colors;
            const swatch: CSSProperties = { background: `linear-gradient(135deg, ${a}, ${b} 60%, ${c})` };
            return (
              <button
                key={id}
                type="button"
                className="settings__palette"
                aria-pressed={settings.palette === id}
                onClick={() => {
                  play('select');
                  update({ palette: id });
                }}
              >
                <span className="settings__swatch" style={swatch} aria-hidden="true" />
                {PALETTES[id].name}
              </button>
            );
          })}
        </div>
        <label className="settings__row">
          <input type="checkbox" checked={settings.sound} onChange={(event) => update({ sound: event.target.checked })} />
          Звук
        </label>
        <label className="settings__row">
          <input type="checkbox" checked={settings.sway} onChange={(event) => update({ sway: event.target.checked })} />
          Покачивание карт
        </label>
        <label className="settings__row settings__row--column">
          <span>Громкость: {Math.round(settings.volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.sound}
            aria-label="Громкость"
            onChange={(event) => update({ volume: Number(event.target.value) })}
            onPointerUp={() => play('coin')}
          />
        </label>
      </section>
      <PixelButton tone="blue" onClick={onBack}>
        Назад
      </PixelButton>
    </main>
  );
}
