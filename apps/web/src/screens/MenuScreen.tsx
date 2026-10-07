type MenuScreenProps = { readonly onStartDurak: () => void };

export function MenuScreen({ onStartDurak }: MenuScreenProps) {
  return (
    <main className="screen menu">
      <h1 className="menu__title">Карточный рогалик</h1>
      <p className="menu__subtitle">Прототипы</p>
      <button type="button" className="btn btn--primary" onClick={onStartDurak}>
        Дурак
      </button>
      <p className="menu__rules">
        Заставил соперника взять — он теряет HP за каждую карту.
      </p>
      <button type="button" className="btn" disabled>
        TriPeaks — скоро
      </button>
    </main>
  );
}
