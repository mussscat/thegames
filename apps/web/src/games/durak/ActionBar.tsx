import { Icon } from '../../ui/Icon';
import { PixelButton } from '../../ui/PixelButton';
import type { FightAction, RoundState } from '@game/durak';
import type { ReactNode } from 'react';

/** A picked focus takes over the row: its play button (with the pick count) and a cancel. */
export type FocusAction = { readonly label: string; readonly ready: boolean; readonly onPlay: () => void; readonly onCancel: () => void };

type ActionBarProps = {
  readonly round: RoundState;
  readonly myTurn: boolean;
  readonly onAct: (action: FightAction) => void;
  readonly focus: FocusAction | null;
  /** The focus chips: they stand at the left end of the row, so the sides of the board only hold the deck and the jokers. */
  readonly chips?: ReactNode;
};

/**
 * The round button is always on screen, greyed out while it cannot be pressed (owner, 2026-10-13, like Balatro's
 * Play Hand): its label follows who attacks, so nothing appears or disappears and the hand never moves because of it.
 */
function RoundButton({ round, myTurn, onAct }: Omit<ActionBarProps, 'focus'>) {
  if (round.attacker === 'enemy') {
    return (
      <PixelButton tone="blue" disabled={!myTurn} onClick={() => onAct({ type: 'take' })}>
        <Icon id="hand" /> Беру
      </PixelButton>
    );
  }
  return (
    <PixelButton tone="red" disabled={!myTurn || round.table.length === 0} onClick={() => onAct({ type: 'endAttack' })}>
      <Icon id="check" /> {round.defenderTaking ? 'Готово' : 'Бито'}
    </PixelButton>
  );
}

/** The bottom row of the fight, always the same height so nothing above it moves (owner, 2026-10-12). */
export function ActionBar({ round, myTurn, onAct, focus, chips }: ActionBarProps) {
  return (
    <div className="actions" data-testid="actions">
      <div className="actions__chips">{chips}</div>
      <div className="actions__buttons">
      {focus ? (
        <>
          <PixelButton tone="orange" disabled={!focus.ready} onClick={focus.onPlay}>
            {focus.label}
          </PixelButton>
          <PixelButton tone="blue" onClick={focus.onCancel}>
            Отмена
          </PixelButton>
        </>
      ) : (
        <RoundButton round={round} myTurn={myTurn} onAct={onAct} />
      )}
      </div>
    </div>
  );
}
