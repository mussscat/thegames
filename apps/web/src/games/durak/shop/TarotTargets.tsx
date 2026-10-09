import { ENHANCEMENTS, TAROTS, type DeckProfile, type TarotId } from '@game/durak';
import { PixelCard } from '../../../ui/PixelCard';
import { cardLabel, deckCard } from './shopCopy';

type TarotTargetsProps = {
  readonly tarotId: TarotId;
  readonly hand: readonly string[];
  readonly profile: DeckProfile;
  readonly picked: readonly string[];
  readonly onChange: (picked: readonly string[]) => void;
};

function hint(tarotId: TarotId): string {
  if (tarotId === 'death') return 'Выбери карту, затем карту, чьё усиление она получит';
  const max = TAROTS[tarotId].maxTargets;
  return max === 1 ? 'Выбери карту' : `Выбери до ${max} карт`;
}

/** The hand of 5 deck cards a tarot targets; picks are numbered in order (Смерть: 1 — target, 2 — source). */
export function TarotTargets({ tarotId, hand, profile, picked, onChange }: TarotTargetsProps) {
  const max = TAROTS[tarotId].maxTargets;
  const toggle = (cardId: string): void => {
    if (picked.includes(cardId)) onChange(picked.filter((id) => id !== cardId));
    else if (picked.length < max) onChange([...picked, cardId]);
  };
  return (
    <div className="targets" data-testid="tarot-targets">
      <p className="targets__hint">{hint(tarotId)}</p>
      <div className="targets__hand">
        {hand.map((cardId) => {
          const card = deckCard(cardId);
          if (!card) return null;
          const order = picked.indexOf(cardId);
          const current = profile[cardId];
          return (
            <button
              key={cardId}
              type="button"
              className={order >= 0 ? 'targets__card targets__card--picked' : 'targets__card'}
              aria-pressed={order >= 0}
              aria-label={`${cardLabel(cardId)}${current ? `, ${ENHANCEMENTS[current].name}` : ''}`}
              onClick={() => toggle(cardId)}
            >
              <PixelCard card={card} width={52} enhancement={current} idle={false} />
              {order >= 0 && <span className="targets__order">{order + 1}</span>}
              {current && <span className="targets__current">{ENHANCEMENTS[current].name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
