import { createDeck, rankLabel, SUIT_SYMBOLS, type Card } from '@game/core';
import {
  ENHANCEMENTS,
  JOKERS,
  MAX_JOKERS,
  sellPrice,
  stageEnemy,
  stageLabel,
  type FightReward,
  type RunAction,
  type RunState,
  type ShopState,
} from '@game/durak';

import { useEffect } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { PixelCard } from '../../ui/PixelCard';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { JokerCard } from './JokerCard';
import { coinSound, isNewError } from './sounds';
import './fight.css';
import './shop.css';

const CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(createDeck(6).map((card) => [card.id, card]));

function cardLabel(cardId: string): string {
  const card = CARDS_BY_ID.get(cardId);
  return card ? `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : cardId;
}

type ShopScreenProps = {
  readonly run: RunState;
  readonly shop: ShopState;
  readonly reward: FightReward;
  readonly error: string | null;
  readonly errorSeq: number;
  readonly onAct: (action: RunAction) => void;
  readonly onExit: () => void;
};

export function ShopScreen({ run, shop, reward, error, errorSeq, onAct, onExit }: ShopScreenProps) {
  const { play } = useSettings();
  const previousCoins = usePrevious(run.coins);
  useEffect(() => {
    if (previousCoins === undefined) return;
    const sound = coinSound(previousCoins, run.coins);
    if (sound) play(sound);
  }, [run.coins, previousCoins, play]);
  const previousErrorSeq = usePrevious(errorSeq);
  useEffect(() => {
    if (isNewError(previousErrorSeq, errorSeq)) play('deny');
  }, [errorSeq, previousErrorSeq, play]);
  const next = stageEnemy(run, run.stage + 1);
  return (
    <main className="screen shop" data-testid="shop">
      <header className="fight__header">
        <PixelButton tone="blue" small onClick={onExit}>
          Меню
        </PixelButton>
        <span className="chip">Магазин · круг {stageLabel(run.stage).circle}</span>
        <span className="shop__coins">● {run.coins}</span>
      </header>

      <section className="panel shop__reward" data-testid="shop-reward">
        <h2 className="shop__title">Награда за бой: +{reward.total}</h2>
        <p>
          Победа {reward.base} · HP {reward.hpBonus} · проценты {reward.interest}
          {reward.jokerBonus > 0 && ` · джокеры ${reward.jokerBonus}`}
        </p>
      </section>

      <section className="panel shop__offers" data-testid="shop-offers">
        <h3 className="shop__title">Товары</h3>
        <div className="shop__shelf">
          {shop.offers.map((offer, index) =>
            offer ? (
              <JokerCard
                key={offer.jokerId}
                jokerId={offer.jokerId}
                action={
                  <PixelButton
                    tone="orange"
                    small
                    onClick={() => onAct({ type: 'buyJoker', index })}
                    aria-label={`Купить ${JOKERS[offer.jokerId].name} за ${offer.price}`}
                  >
                    ● {offer.price}
                  </PixelButton>
                }
              />
            ) : (
              <div key={`sold-${index}`} className="joker joker--sold">
                Продано
              </div>
            ),
          )}
        </div>
      </section>

      <section className="panel shop__enh">
        <h3 className="shop__title">Усиления карт</h3>
        {shop.enhancementOffers.map((offer, index) =>
          offer ? (
            <div key={offer.enhancementId} className="shop__enhancement">
              <p className="shop__enhancement-text">
                <strong>{ENHANCEMENTS[offer.enhancementId].name}</strong> · ● {offer.price}
                <br />
                {ENHANCEMENTS[offer.enhancementId].description}
              </p>
              <div className="shop__cards">
                {offer.cardIds.map((cardId) => {
                  const card = CARDS_BY_ID.get(cardId);
                  const current = run.profile[cardId];
                  if (!card) return null;
                  return (
                    <button
                      key={cardId}
                      type="button"
                      className="shop__card"
                      onClick={() => onAct({ type: 'buyEnhancement', index, cardId })}
                      aria-label={`${ENHANCEMENTS[offer.enhancementId].name} на ${cardLabel(cardId)}${current ? `, заменит ${ENHANCEMENTS[current].name}` : ''}`}
                    >
                      <PixelCard card={card} width={56} enhancement={offer.enhancementId} idle={false} />
                      <span className="shop__card-caption">
                        {cardLabel(cardId)}
                        {current ? ` (заменит: ${ENHANCEMENTS[current].name})` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p key={`sold-enh-${index}`} className="shop__sold">
              Продано
            </p>
          ),
        )}
      </section>

      <section className="panel shop__owned" data-testid="owned-jokers">
        <h3 className="shop__title">
          Твои джокеры ({run.jokers.length}/{MAX_JOKERS})
        </h3>
        {run.jokers.length === 0 && <p className="shop__empty">Пока нет</p>}
        <div className="shop__shelf">
          {run.jokers.map((id, i) => (
            <JokerCard
              key={id}
              jokerId={id}
              action={
                <span className="joker__actions">
                  <PixelButton
                    tone="blue"
                    small
                    disabled={i === 0}
                    aria-label={`${JOKERS[id].name} левее`}
                    onClick={() => onAct({ type: 'moveJoker', from: i, to: i - 1 })}
                  >
                    ◀
                  </PixelButton>
                  <PixelButton tone="blue" small onClick={() => onAct({ type: 'sellJoker', jokerId: id })}>
                    Продать +{sellPrice(id)}
                  </PixelButton>
                  <PixelButton
                    tone="blue"
                    small
                    disabled={i === run.jokers.length - 1}
                    aria-label={`${JOKERS[id].name} правее`}
                    onClick={() => onAct({ type: 'moveJoker', from: i, to: i + 1 })}
                  >
                    ▶
                  </PixelButton>
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section className="panel shop__mydeck">
        <h3 className="shop__title">Твоя колода</h3>
        {Object.keys(run.profile).length === 0 && <p className="shop__empty">Усилений пока нет</p>}
        <div className="shop__deck">
          {Object.entries(run.profile).map(([cardId, id]) => {
            const card = CARDS_BY_ID.get(cardId);
            return card && id ? <PixelCard key={cardId} card={card} width={44} enhancement={id} idle={false} /> : null;
          })}
        </div>
      </section>

      <p className={error ? 'fight__status panel' : 'fight__status'} role="status">
        {error ?? ''}
      </p>
      <div className="actions">
        <PixelButton tone="green" onClick={() => onAct({ type: 'reroll' })}>
          Рерол · ● {shop.rerollCost}
        </PixelButton>
        <PixelButton tone="red" onClick={() => onAct({ type: 'leaveShop' })}>
          В бой: {next.name}
        </PixelButton>
      </div>
    </main>
  );
}
