import { useState } from 'react';
import kit from '../../assets/ui-kit/ui-kit.json';
import '../../ui/ui-kit.css';

const TONES = ['blue', 'red', 'orange', 'green'] as const;
const STATES = [
  { id: 'normal', name: 'обычная', cls: '' },
  { id: 'pressed', name: 'нажатая', cls: ' is-pressed' },
  { id: 'disabled', name: 'неактивная', cls: '' },
] as const;

/** Every element of the generated UI kit with every state, drawn by the same classes the game will use. */
export function PilotKit() {
  const [hp, setHp] = useState(60);
  const count = kit.length;
  return (
    <div className="pk">
      <p className="pk__note">{count} картинок кита. Работает в режимах zoom и transform (1 css px = 1 px арта).</p>

      <h3 className="pk__h">Кнопки: большая 44, малая 32</h3>
      {(['l', 's'] as const).map((size) => (
        <div key={size} className="pk__grid">
          {TONES.map((tone) =>
            STATES.map((state) => (
              <button key={`${tone}${size}${state.id}`} type="button" className={`px-button px-button-${tone}-${size}${state.cls}`} disabled={state.id === 'disabled'}>
                <span>{state.name}</span>
              </button>
            )),
          )}
        </div>
      ))}

      <h3 className="pk__h">Иконки 32×32</h3>
      <div className="pk__row">
        {['close', 'arrow-left', 'arrow-right'].map((name) => (
          <span key={name} className="pk__row">
            <button type="button" className={`px-${name}`} aria-label={name} />
            <button type="button" className={`px-${name} is-pressed`} aria-label={`${name} pressed`} />
          </span>
        ))}
      </div>

      <h3 className="pk__h">Панель, окно, подсказка</h3>
      <div className="px-panel pk__box">панель 24 (угол 6)</div>
      <div className="px-window pk__box">окно 32 (угол 8)</div>
      <div className="px-tip pk__box">подсказка</div>
      <div className="pk__row">
        <span className="px-tip-arrow-down" />
        <span className="px-tip-arrow-up" />
      </div>

      <h3 className="pk__h">HP, цена, слоты, бейджи, разделитель</h3>
      <div className="px-hp-frame pk__hp">
        <div className="pk__hp-fill" style={{ width: `${Math.round((hp / 100) * 108)}px` }} />
      </div>
      <input type="range" min={0} max={100} value={hp} onChange={(e) => setHp(Number(e.target.value))} aria-label="HP" />
      <div className="pk__row">
        <span className="px-price-ok pk__chip">5 хватает</span>
        <span className="px-price-short pk__chip">9 мало</span>
      </div>
      <div className="pk__row">
        <span className="px-slot-empty pk__chip">пусто</span>
        <span className="px-slot-filled pk__chip">занят</span>
        <span className="px-slot-selected pk__chip">выбран</span>
      </div>
      <div className="pk__row">
        <span className="px-badge-common pk__badge">обыч</span>
        <span className="px-badge-rare pk__badge">редк</span>
        <span className="px-badge-legendary pk__badge">леге</span>
      </div>
      <div className="px-divider pk__divider" />
    </div>
  );
}
