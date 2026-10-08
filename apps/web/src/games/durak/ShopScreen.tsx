import { createDeck, rankLabel, SUIT_SYMBOLS, type Card } from '@game/core';
import {
  ENHANCEMENTS,
  MAX_PERKS,
  PERKS,
  sellPrice,
  stageEnemy,
  stageLabel,
  type FightReward,
  type RunAction,
  type RunState,
  type ShopState,
} from '@game/durak';

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

export function ShopScreen({ run, shop, reward, error, onAct, onExit }: ShopScreenProps) {
  const next = stageEnemy(run, run.stage + 1);
  return (
    <main className="screen shop" data-testid="shop">
      <header className="fight__header">
        <button type="button" className="btn btn--small" onClick={onExit}>
          Меню
        </button>
        <span className="fight__round">Магазин · круг {stageLabel(run.stage).circle}</span>
      </header>

      <section className="shop__panel">
        <h2 className="shop__title">Награда за бой: +{reward.total}</h2>
        <ul className="shop__reward">
          <li>За победу: {reward.base}</li>
          <li>За оставшиеся HP: {reward.hpBonus}</li>
          <li>Проценты: {reward.interest}</li>
          {reward.perkBonus > 0 && <li>Перки: {reward.perkBonus}</li>}
        </ul>
        <p className="shop__coins">Монеты: {run.coins}</p>
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">
          Твои перки ({run.perks.length}/{MAX_PERKS})
        </h3>
        {run.perks.length === 0 && <p className="shop__empty">Пока нет</p>}
        {run.perks.map((id) => (
          <div key={id} className="shop__item">
            <div>
              <strong>{PERKS[id].name}</strong>
              <p>{PERKS[id].description}</p>
            </div>
            <button type="button" className="btn btn--small" onClick={() => onAct({ type: 'sellPerk', perkId: id })}>
              Продать +{sellPrice(id)}
            </button>
          </div>
        ))}
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">Товары</h3>
        {shop.offers.map((offer, index) =>
          offer ? (
            <div key={offer.perkId} className="shop__item">
              <div>
                <strong>{PERKS[offer.perkId].name}</strong>
                <p>{PERKS[offer.perkId].description}</p>
              </div>
              <button type="button" className="btn btn--small btn--primary" onClick={() => onAct({ type: 'buyPerk', index })}>
                Купить за {offer.price}
              </button>
            </div>
          ) : (
            <div key={`sold-${index}`} className="shop__item shop__item--sold">
              Продано
            </div>
          ),
        )}
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">Усиления карт</h3>
        {shop.enhancementOffers.map((offer, index) =>
          offer ? (
            <div key={offer.enhancementId} className="shop__enhancement">
              <div>
                <strong>
                  {ENHANCEMENTS[offer.enhancementId].name} — {offer.price}
                </strong>
                <p>{ENHANCEMENTS[offer.enhancementId].description}</p>
              </div>
              <div className="shop__cards">
                {offer.cardIds.map((cardId) => (
                  <button
                    key={cardId}
                    type="button"
                    className="btn btn--small"
                    onClick={() => onAct({ type: 'buyEnhancement', index, cardId })}
                  >
                    {cardLabel(cardId)}
                    {run.profile[cardId] ? ` (заменит ${ENHANCEMENTS[run.profile[cardId]!].short})` : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div key={`sold-enh-${index}`} className="shop__item shop__item--sold">
              Продано
            </div>
          ),
        )}
      </section>

      <section className="shop__panel">
        <h3 className="shop__title">Твоя колода</h3>
        {Object.keys(run.profile).length === 0 && <p className="shop__empty">Усилений пока нет</p>}
        <div className="shop__cards">
          {Object.entries(run.profile).map(([cardId, id]) =>
            id ? (
              <span key={cardId} className="shop__chip">
                {cardLabel(cardId)} — {ENHANCEMENTS[id].name}
              </span>
            ) : null,
          )}
        </div>
      </section>

      <p className="fight__status" role="status">
        {error ?? ''}
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={() => onAct({ type: 'reroll' })}>
          Рерол ({shop.rerollCost})
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onAct({ type: 'leaveShop' })}>
          В бой: {next.name}
        </button>
      </div>
    </main>
  );
}
