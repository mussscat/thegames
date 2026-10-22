import { PixelButton } from '../../../components/pixel/PixelButton';
import { PixelIcon } from '../../../components/pixel/PixelIcon';
import { PixelText } from '../../../components/pixel/PixelText';
import { usePrevious } from '../../../ui/usePrevious';

type PixelStatsProps = { readonly coins: number; readonly roundNumber: number; readonly onExit: () => void };

/** The top bar: the menu button and two plates — coins and the current deal. The coin figure bumps when it grows (Копилочка), like the score values. */
export function PixelStats({ coins, roundNumber, onExit }: PixelStatsProps) {
  const previous = usePrevious(coins);
  const grew = previous !== undefined && coins > previous;
  return (
    <header className="pfight__top">
      <PixelButton tone="orange" small className="pfight__menu" onClick={onExit}>
        <PixelText>Меню</PixelText>
      </PixelButton>
      <div className="px-slot-filled pfight__tile" aria-label={`Монеты: ${coins}`}>
        <PixelIcon name="coin" />
        <PixelText key={coins} className={grew ? 'pfight__gold pfight__gold--bump' : 'pfight__gold'}>{coins}</PixelText>
      </div>
      <div className="px-slot-filled pfight__tile" aria-label={`Раздача ${roundNumber}`}>
        <PixelText>Раздача</PixelText>
        <PixelText>{roundNumber}</PixelText>
      </div>
    </header>
  );
}
