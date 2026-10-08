import { useState, type CSSProperties } from 'react';
import { JokerCard } from '../games/durak/JokerCard';
import { FONT_OPTIONS, fontFamily, type FontId } from './labFonts';
import { LabSelect } from './LabSelect';

const RULES =
  'Заставь соперника взять — он теряет HP за каждую карту. Победа приносит монеты; в магазине — джокеры (до 5) и усиления карт.';

/** Real game copy in candidate fonts: title, rules, a joker card, buttons, status and HP. */
export function FontTab() {
  const [body, setBody] = useState<FontId>('nunito');
  const [head, setHead] = useState<FontId>('press');
  const [scale, setScale] = useState(1.1);
  const style = { '--lab-body': fontFamily(body), '--lab-head': fontFamily(head), fontSize: `${scale}rem` } as CSSProperties;

  return (
    <div className="fontlab" style={style}>
      <div className="lab__controls lab__controls--inline">
        <LabSelect label="Текст" value={body} options={FONT_OPTIONS} onChange={setBody} />
        <LabSelect label="Заголовки" value={head} options={FONT_OPTIONS} onChange={setHead} />
        <label className="lab__slider">
          <span>Размер: {scale.toFixed(2)}</span>
          <input type="range" min={0.8} max={1.3} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        </label>
      </div>
      <h2 className="fontlab__title">Карточный рогалик</h2>
      <p className="panel fontlab__text">{RULES}</p>
      <div className="fontlab__row">
        <JokerCard jokerId="trumpAce" action={<button type="button" className="pbtn pbtn--orange pbtn--small">● 6</button>} />
        <div className="fontlab__col">
          <p className="panel fontlab__status">Отбивайся или бери</p>
          <div className="panel fontlab__hp">
            <span>Соперник</span>
            <span>6/7</span>
          </div>
          <button type="button" className="pbtn pbtn--red">Бито</button>
          <button type="button" className="pbtn pbtn--blue">Новый забег</button>
        </div>
      </div>
    </div>
  );
}
