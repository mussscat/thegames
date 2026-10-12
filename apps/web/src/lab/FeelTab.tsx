import { makeCard, type Card } from '@game/core';
import { JOKER_IDS } from '@game/durak';
import { useState } from 'react';
import { CardView } from '../components/CardView';
import { JokerFace } from '../games/durak/JokerFace';
import { FeelBox } from '../ui/FeelBox';
import { PixelButton } from '../ui/PixelButton';
import { SettingsProvider, useSettings } from '../ui/SettingsContext';
import { useFan } from '../ui/useFan';
import { useFps } from '../ui/useFps';
import '../games/durak/fight.css';

const POOL: readonly Card[] = [
  makeCard('spades', 10), makeCard('clubs', 9), makeCard('diamonds', 13), makeCard('hearts', 7), makeCard('spades', 14), makeCard('clubs', 6),
  makeCard('hearts', 12), makeCard('diamonds', 8), makeCard('spades', 6), makeCard('clubs', 14), makeCard('hearts', 9), makeCard('diamonds', 11),
];
const SHOWN_JOKERS = JOKER_IDS.slice(0, 5);

function FanStand() {
  const [count, setCount] = useState(6);
  const fan = useFan(count, true);
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Веер руки</h2>
      <div className="feellab__buttons">
        <PixelButton tone="blue" small onClick={() => setCount((c) => Math.max(0, c - 1))}>
          − карта
        </PixelButton>
        <PixelButton tone="green" small onClick={() => setCount((c) => Math.min(POOL.length, c + 1))}>
          + карта
        </PixelButton>
        <span>{count}</span>
      </div>
      <div ref={fan.containerRef} className="hand hand--player feellab__hand" data-motion={fan.motion ? 'on' : 'off'}>
        <span ref={fan.probeRef} className="hand__probe" aria-hidden="true" />
        {POOL.slice(0, count).map((card, index) => (
          <div key={card.id} className="hand__slot" style={fan.slotStyle(index)}>
            <CardView card={card} playable />
          </div>
        ))}
      </div>
    </section>
  );
}

function JokerStand() {
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Джокеры: наклон</h2>
      <ul className="feellab__jokers">
        {SHOWN_JOKERS.map((id, i) => (
          <li key={id} style={{ ['--jface-w' as string]: '64px' }}>
            <FeelBox>
              <JokerFace id={id} />
            </FeelBox>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Controls() {
  const { settings, update } = useSettings();
  const fps = useFps();
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Настройки и fps</h2>
      <label className="settings__row">
        <input type="checkbox" checked={settings.effects} onChange={(event) => update({ effects: event.target.checked })} />
        Эффекты
      </label>
      <p className="feellab__fps">{fps} fps</p>
    </section>
  );
}

function ButtonStand() {
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Панели и кнопки</h2>
      <div className="feellab__buttons">
        <PixelButton tone="blue">Обычная</PixelButton>
        <PixelButton tone="red">Красная</PixelButton>
        <PixelButton tone="orange" disabled>
          Недоступна
        </PixelButton>
        <PixelButton tone="green" small>
          Малая
        </PixelButton>
      </div>
      <p>
        <span className="chip">чип</span> <span className="chip">×1.25</span>
      </p>
    </section>
  );
}

/** The stage-1 stand: the fan, the tilt, the thick panels and buttons, the switches and an fps badge. */
export function FeelTab() {
  return (
    <SettingsProvider>
      <div className="jokerlab">
        <Controls />
        <FanStand />
        <JokerStand />
        <ButtonStand />
      </div>
    </SettingsProvider>
  );
}
