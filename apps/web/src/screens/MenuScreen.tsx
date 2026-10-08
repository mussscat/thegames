import { PixelButton } from '../ui/PixelButton';
import './menu.css';

type MenuScreenProps = {
  readonly canContinue: boolean;
  readonly saveInvalid: boolean;
  readonly onNewRun: () => void;
  readonly onContinue: () => void;
  readonly onSettings: () => void;
};

export function MenuScreen({ canContinue, saveInvalid, onNewRun, onContinue, onSettings }: MenuScreenProps) {
  return (
    <main className="screen menu">
      <h1 className="menu__title">Карточный рогалик</h1>
      <p className="menu__subtitle">Дурак · 2 круга по 3 боя · магазин между боями</p>
      <div className="menu__buttons">
        {canContinue && (
          <PixelButton tone="red" onClick={onContinue}>
            Продолжить забег
          </PixelButton>
        )}
        <PixelButton tone={canContinue ? 'blue' : 'red'} onClick={onNewRun}>
          Новый забег
        </PixelButton>
        <PixelButton tone="blue" onClick={onSettings}>
          Настройки
        </PixelButton>
        <PixelButton tone="blue" disabled>
          TriPeaks — скоро
        </PixelButton>
      </div>
      {saveInvalid && (
        <p className="menu__notice" role="alert">
          Сохранение повреждено — начни новый забег
        </p>
      )}
      <p className="panel menu__rules">
        Заставь соперника взять — он теряет HP за каждую карту. Победа приносит монеты; в магазине — перки (до 3) и
        усиления карт. Усиленные карты видно по цвету и значку; карту с двумя усилениями разыгрывай
        тапом по нужной половине.
      </p>
    </main>
  );
}
