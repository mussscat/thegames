import {
  conflictFor,
  ENHANCEMENTS,
  JOKERS,
  MAX_JOKERS,
  packCardRarity,
  sellPrice,
  TAROTS,
  type DeckProfile,
  type JokerId,
  type OpenedPack,
  type Rarity,
} from '@game/durak';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { useSettings } from '../../../ui/SettingsContext';
import type { SoundName } from '../../../ui/sound';
import { ConfirmReplace } from './ConfirmReplace';
import { canTake, FLIP_MS, replacementsFor, revealSchedule, type Replacement } from './opening';
import { PackArt } from './PackArt';
import { PackCardFace } from './PackCardFace';
import { PACK_NAMES, packCardText, packCardTitle } from './shopCopy';
import { TarotTargets } from './TarotTargets';
import './opening.css';

const RARITY_SOUND: Readonly<Record<Rarity, SoundName>> = { common: 'reveal', rare: 'revealRare', legendary: 'revealLegendary' };

type PackOpeningProps = {
  readonly opened: OpenedPack;
  readonly profile: DeckProfile;
  readonly jokers: readonly JokerId[];
  readonly speed: number;
  readonly error?: string | null;
  readonly onPick: (index: number, targets: readonly string[]) => void;
  readonly onSkip: () => void;
  readonly onSell: (jokerId: JokerId) => void;
};

/** Full-screen pack opening: the pack shakes and tears, cards flip by rarity, then the player takes or skips. */
export function PackOpening({ opened, profile, jokers, speed, error = null, onPick, onSkip, onSell }: PackOpeningProps) {
  const { play } = useSettings();
  const reduced = useReducedMotion() ?? false;
  const count = opened.cards.length;
  const [torn, setTorn] = useState(reduced);
  const [flipped, setFlipped] = useState(reduced ? count : 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [targets, setTargets] = useState<readonly string[]>([]);
  const [confirm, setConfirm] = useState<readonly Replacement[] | null>(null);

  // The reveal plays once per opening: the parent keys this component per pack, so a mega-pack pick does not replay it.
  useEffect(() => {
    const plan = revealSchedule(count, speed, reduced);
    if (!reduced) play('tear');
    const timers = [
      window.setTimeout(() => setTorn(true), plan.cardsAt),
      ...plan.flips.map((at, i) =>
        window.setTimeout(() => {
          setFlipped((n) => Math.max(n, i + 1));
          const card = opened.cards[i];
          if (card) play(RARITY_SOUND[packCardRarity(card)]);
        }, at),
      ),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealing = flipped < count;
  const revealAll = (): void => {
    setTorn(true);
    setFlipped(count);
  };
  const card = selected === null ? null : (opened.cards[selected] ?? null);
  const tarot = card?.kind === 'tarot' ? TAROTS[card.tarotId] : null;
  const ready = card !== null && canTake(card, targets, profile, jokers);
  const choose = (index: number): void => {
    setSelected(index);
    setTargets([]);
  };
  const commit = (): void => {
    if (selected === null) return;
    onPick(selected, targets);
    setSelected(null);
    setTargets([]);
  };
  const take = (): void => {
    if (!card) return;
    const changes = replacementsFor(card, targets, profile);
    if (changes.length > 0) setConfirm(changes);
    else commit();
  };

  return (
    <div
      className="opening"
      data-testid="pack-opening"
      role="dialog"
      aria-modal="true"
      aria-label={`Вскрытие: ${PACK_NAMES[opened.kind]}`}
      onClick={revealing ? revealAll : undefined}
    >
      <h2 className="opening__title">
        {PACK_NAMES[opened.kind]} · бери {opened.picksLeft}
      </h2>
      {!torn ? (
        <span className="opening__pack">
          <PackArt kind={opened.kind} />
        </span>
      ) : (
        <div className="opening__cards">
          {opened.cards.map((entry, i) =>
            entry ? (
              <button
                key={i}
                type="button"
                className={selected === i ? 'opening__card opening__card--selected' : 'opening__card'}
                aria-label={packCardTitle(entry)}
                aria-pressed={selected === i}
                disabled={i >= flipped}
                onClick={() => choose(i)}
              >
                <motion.span
                  className="opening__flip"
                  initial={reduced ? false : { rotateY: 180 }}
                  animate={{ rotateY: i < flipped ? 0 : 180 }}
                  transition={{ duration: FLIP_MS / 1000 / speed }}
                >
                  <PackCardFace card={entry} size="big" faceDown={i >= flipped} />
                </motion.span>
                {entry.kind === 'card' && i < flipped && conflictFor(profile, entry.cardId, entry.enhancement) && (
                  <span className="opening__conflict">В колоде: {ENHANCEMENTS[profile[entry.cardId] ?? entry.enhancement].name}</span>
                )}
              </button>
            ) : (
              <span key={i} className="opening__taken">
                Взято
              </span>
            ),
          )}
        </div>
      )}

      {card && <p className="opening__text">{packCardText(card)}</p>}
      {card?.kind === 'tarot' && tarot && tarot.maxTargets > 0 && (
        <TarotTargets tarotId={card.tarotId} hand={opened.hand} profile={profile} picked={targets} onChange={setTargets} />
      )}
      {card?.kind === 'joker' && jokers.length >= MAX_JOKERS && (
        <div className="opening__full">
          <p>Все {MAX_JOKERS} мест заняты — продай джокера:</p>
          {jokers.map((id) => (
            <PixelButton key={id} tone="blue" small onClick={() => onSell(id)}>
              {JOKERS[id].name} +{sellPrice(id)}
            </PixelButton>
          ))}
        </div>
      )}
      {error && (
        <p className="opening__error" role="alert">
          {error}
        </p>
      )}

      <div className="opening__bar">
        <PixelButton tone="orange" disabled={!ready || revealing} onClick={take}>
          {tarot && tarot.maxTargets > 0 ? 'Применить' : 'Взять'}
        </PixelButton>
        <PixelButton tone="blue" onClick={onSkip}>
          Пропустить
        </PixelButton>
      </div>

      {confirm && (
        <ConfirmReplace
          changes={confirm}
          onConfirm={() => {
            setConfirm(null);
            commit();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
