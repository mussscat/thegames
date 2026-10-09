import type { CSSProperties } from 'react';
import { RANK_ORDERS, TRUMP_PLACES, type HandSort } from '../ui/handSort';
import { PALETTE_IDS, PALETTES } from '../ui/palettes';
import { PixelButton } from '../ui/PixelButton';
import { useSettings } from '../ui/SettingsContext';
import { ANIM_SPEEDS } from '../ui/settings';
import { SortPreview } from './SortPreview';
import './menu.css';

const RANK_NAMES: Readonly<Record<HandSort['rank'], string>> = { asc: 'Сначала младшие', desc: 'Сначала старшие' };
const TRUMP_NAMES: Readonly<Record<HandSort['trumps'], string>> = {
  first: 'В начале',
  last: 'В конце',
  mixed: 'Вместе с остальными',
};

export function SettingsScreen({ onBack }: { readonly onBack: () => void }) {
  const { settings, update, play } = useSettings();
  const sortBy = (patch: Partial<HandSort>): void => update({ sort: { ...settings.sort, ...patch } });
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
        <label className="settings__row">
          <input type="checkbox" checked={settings.sway} onChange={(event) => update({ sway: event.target.checked })} />
          Покачивание карт
        </label>
        <fieldset className="settings__group">
          <legend className="settings__label">Скорость анимации</legend>
          <div className="settings__speeds">
            {ANIM_SPEEDS.map((speed) => (
              <label key={speed} className="settings__speed">
                <input
                  type="radio"
                  name="anim-speed"
                  checked={settings.animSpeed === speed}
                  onChange={() => update({ animSpeed: speed })}
                />
                x{speed}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="settings__group">
          <legend className="settings__label">Сортировка руки</legend>
          <label className="settings__row">
            <input type="checkbox" checked={settings.sort.bySuit} onChange={(event) => sortBy({ bySuit: event.target.checked })} />
            По масти
          </label>
          <label className="settings__row settings__row--column">
            <span>По рангу</span>
            <select
              className="settings__select"
              aria-label="По рангу"
              value={settings.sort.rank}
              onChange={(event) => sortBy({ rank: event.target.value as HandSort['rank'] })}
            >
              {RANK_ORDERS.map((id) => (
                <option key={id} value={id}>
                  {RANK_NAMES[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="settings__row settings__row--column">
            <span>Козыри</span>
            <select
              className="settings__select"
              aria-label="Козыри"
              value={settings.sort.trumps}
              onChange={(event) => sortBy({ trumps: event.target.value as HandSort['trumps'] })}
            >
              {TRUMP_PLACES.map((id) => (
                <option key={id} value={id}>
                  {TRUMP_NAMES[id]}
                </option>
              ))}
            </select>
          </label>
          <SortPreview sort={settings.sort} />
        </fieldset>
      </section>
      <PixelButton tone="blue" onClick={onBack}>
        Назад
      </PixelButton>
    </main>
  );
}
