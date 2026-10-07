type MenuScreenProps = {
  readonly canContinue: boolean;
  readonly saveInvalid: boolean;
  readonly onNewRun: () => void;
  readonly onContinue: () => void;
};

export function MenuScreen({ canContinue, saveInvalid, onNewRun, onContinue }: MenuScreenProps) {
  return (
    <main className="screen menu">
      <h1 className="menu__title">Карточный рогалик</h1>
      <p className="menu__subtitle">Дурак: 2 круга по 3 боя, магазин между боями</p>
      {canContinue && (
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          Продолжить забег
        </button>
      )}
      <button type="button" className={canContinue ? 'btn' : 'btn btn--primary'} onClick={onNewRun}>
        Новый забег
      </button>
      {saveInvalid && (
        <p className="menu__notice" role="alert">
          Сохранение повреждено — начни новый забег
        </p>
      )}
      <p className="menu__rules">
        Заставил соперника взять — он теряет HP за каждую карту. Победа приносит монеты, в магазине — перки (до 3).
      </p>
      <button type="button" className="btn" disabled>
        TriPeaks — скоро
      </button>
    </main>
  );
}
