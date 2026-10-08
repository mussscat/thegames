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
  perkSlotsFull: 'Все 3 слота заняты — сначала продай перк',
  perkNotOwned: 'Такого перка нет',
  wrongPhase: 'Сейчас это недоступно',
  fightNotOver: 'Бой ещё идёт',
};

export function errorMessage(error: RunError): string {
  return ERROR_MESSAGES[error];
}
