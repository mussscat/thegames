import { Coin } from '../../ui/Coin';

type FightStatsProps = { readonly coins: number; readonly roundNumber: number };

/** Two equal boxes of the top bar: coins and the current deal. */
export function FightStats({ coins, roundNumber }: FightStatsProps) {
  return (
    <>
      <div className="stats__tile" aria-label={`Монеты: ${coins}`}>
        <Coin />
        <span className="stats__value stats__value--gold">{coins}</span>
      </div>
      <div className="stats__tile" aria-label={`Раздача ${roundNumber}`}>
        <span className="stats__label">Раздача</span>
        <span className="stats__value">{roundNumber}</span>
      </div>
    </>
  );
}
