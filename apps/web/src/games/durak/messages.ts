import type { RunError } from '@game/durak';

const ERROR_MESSAGES: Readonly<Record<RunError, string>> = {
  roundOver: 'Раздача уже окончена',
  notYourTurn: 'Сейчас не твой ход',
  cardNotInHand: 'Этой карты нет в руке',
  cannotThrowIn: 'Эту карту нельзя подкинуть',
  cannotBeat: 'Эта карта не бьёт',
  cannotEndAttack: 'Сначала сходи картой',
  enhancementUnavailable: 'Этого усиления нет на карте',
  fightOver: 'Бой окончен',
  roundInProgress: 'Раздача ещё идёт',
  noOffer: 'Этот товар уже куплен',
  notEnoughCoins: 'Не хватает монет',
  jokerSlotsFull: 'Все 5 мест заняты — сначала продай джокера',
  jokerNotOwned: 'Такого джокера нет',
  cardNotOffered: 'Эту карту нельзя выбрать',
  packOpen: 'Сначала возьми карту из пака или пропусти его',
  noPackOpen: 'Пак не открыт',
  tarotPending: 'Сначала примени таро или пропусти его',
  noTarotPending: 'Таро не ждёт применения',
  badTargets: 'Выбери подходящие карты',
  wrongPhase: 'Сейчас это недоступно',
  fightNotOver: 'Бой ещё идёт',
};

export function errorMessage(error: RunError): string {
  return ERROR_MESSAGES[error];
}
