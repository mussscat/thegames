import { applyFocus, FOCUSES, focusReady, MAX_FOCUSES, type FightState, type FocusId } from '@game/durak';
import { CardTip, useCardTip } from '../../components/CardTip';
import { PixelButton } from '../../ui/PixelButton';
import { targetHint } from './focusView';
import { FOCUS_GLYPHS } from './shop/PackCardFace';
import { cardTipLines } from './shop/shopCopy';

export type FocusPick = { readonly slot: number; readonly targets: readonly string[] };

function FocusChip({ id, selected, onSelect }: { readonly id: FocusId; readonly selected: boolean; readonly onSelect: () => void }) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <li className={selected ? 'focus-chip focus-chip--selected' : 'focus-chip'}>
      <button type="button" className="focus-chip__face" aria-label={FOCUSES[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <span className="focus-chip__glyph">{FOCUS_GLYPHS[id]}</span>
        <span className="focus-chip__name">{FOCUSES[id].name}</span>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'focus', focusId: id }, {})} />}
    </li>
  );
}

type FocusBarProps = {
  readonly focuses: readonly FocusId[];
  readonly fight: FightState;
  /** false while it is not the player's turn or the scoring board plays. */
  readonly myTurn: boolean;
  readonly pick: FocusPick | null;
  readonly onPick: (pick: FocusPick | null) => void;
  readonly onPlay: (pick: FocusPick) => void;
};

/** The two focus slots next to the jokers; a tap selects, «Сыграть» plays it once it is ready and its targets are chosen. */
export function FocusBar({ focuses, fight, myTurn, pick, onPick, onPlay }: FocusBarProps) {
  const id = pick ? focuses[pick.slot] : undefined;
  const ready = Boolean(id && pick && myTurn && focusReady(fight, id) && applyFocus(fight, id, pick.targets).ok);
  const hint = id ? targetHint(id) : null;
  return (
    <section className="focus-bar panel" data-testid="focus-bar" aria-label="Фокусы">
      <ul className="focus-bar__list">
        {Array.from({ length: MAX_FOCUSES }, (_, slot) => {
          const focus = focuses[slot];
          return focus ? (
            <FocusChip key={`${focus}-${slot}`} id={focus} selected={pick?.slot === slot} onSelect={() => onPick(pick?.slot === slot ? null : { slot, targets: [] })} />
          ) : (
            <li key={`empty-${slot}`} className="focus-chip focus-chip--empty" aria-hidden="true" />
          );
        })}
      </ul>
      {id && pick && (
        <div className="focus-bar__actions">
          {hint && <p className="focus-bar__hint">{hint}</p>}
          <PixelButton tone="orange" small disabled={!ready} onClick={() => onPlay(pick)}>
            Сыграть
          </PixelButton>
          <PixelButton tone="blue" small onClick={() => onPick(null)}>
            Отмена
          </PixelButton>
        </div>
      )}
    </section>
  );
}
