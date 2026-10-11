import { JOKERS, MAX_JOKERS, type JokerId, type JokerState } from '@game/durak';
import { useState } from 'react';
import { CardTip, useCardTip } from '../../components/CardTip';
import { jokerBadge } from './jokerBadge';
import { FeelBox, SWAY_SECONDS } from '../../ui/FeelBox';
import { swayPhases } from '../../ui/visualRng';
import { JokerFace } from './JokerFace';
import { cardTipLines } from './shop/shopCopy';

type JokerSlotProps = { readonly id: JokerId; readonly slot: number; readonly badge: string | null; readonly idle: boolean; readonly phase: number };

/** One joker card; its rule opens on hover, long press or tap (the cards in the fight have no other tap action). */
function JokerSlot({ id, slot, badge, idle, phase }: JokerSlotProps) {
  const { anchor, handlers } = useCardTip(true, true);
  return (
    <li className="jslot" data-score-joker={`player-${slot}`}>
      <button type="button" className="jslot__button" aria-label={JOKERS[id].name} aria-expanded={anchor !== null} {...handlers}>
        <FeelBox idle={idle} swayDelay={phase}>
          <JokerFace id={id} badge={badge} />
        </FeelBox>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'joker', jokerId: id }, {})} />}
    </li>
  );
}

type JokerPanelProps = {
  readonly jokers: readonly JokerId[];
  readonly state: JokerState;
  /** The opponent's takes this fight (Серийный counter). */
  readonly enemyTakes: number;
  /** Idle sway on; off while a hit is scored and when the player turned it off. */
  readonly idle: boolean;
};

/** The player's jokers in slot order as cards with live counters; empty slots are dashed card outlines. */
export function JokerPanel({ jokers, state, enemyTakes, idle }: JokerPanelProps) {
  // One phase per slot, drawn once: the visual rng, not the game's.
  const [phases] = useState(() => swayPhases(MAX_JOKERS, SWAY_SECONDS));
  return (
    <section className={jokers.length > 0 ? 'jokers panel' : 'jokers jokers--empty panel'} aria-label="Джокеры">
      <header className="jokers__head">
        <h3 className="jokers__title">Джокеры</h3>
        <span className="jokers__count">
          {jokers.length}/{MAX_JOKERS}
        </span>
      </header>
      <ul className="jokers__list">
        {jokers.map((id, slot) => (
          <JokerSlot key={id} id={id} slot={slot} badge={jokerBadge(id, state, enemyTakes)} idle={idle} phase={phases[slot] ?? 0} />
        ))}
        {Array.from({ length: Math.max(0, MAX_JOKERS - jokers.length) }, (_, i) => (
          <li key={`empty-${i}`} className="jslot" aria-hidden="true">
            <span className="jface jface--empty" />
          </li>
        ))}
      </ul>
    </section>
  );
}
