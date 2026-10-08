type FightStatsProps = { readonly coins: number; readonly roundNumber: number };

/** Big number tiles: coins and the current deal. */
export function FightStats({ coins, roundNumber }: FightStatsProps) {
  return (
    <div className="stats">
      <div className="stats__tile panel">
        <span className="stats__label">Монеты</span>
        <span className="stats__value stats__value--gold">{coins}</span>
      </div>
      <div className="stats__tile panel">
        <span className="stats__label">Раздача</span>
        <span className="stats__value">{roundNumber}</span>
      </div>
    </div>
  );
}
