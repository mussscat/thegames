import type { FightError } from '@game/durak';

const ERROR_MESSAGES: Readonly<Record<FightError, string>> = {
  roundOver: 'Раздача уже окончена',
  notYourTurn: 'Сейчас не твой ход',
  cardNotInHand: 'Этой карты нет в руке',
  cannotThrowIn: 'Эту карту нельзя подкинуть',
  cannotBeat: 'Эта карта не бьёт',
  cannotEndAttack: 'Сначала сходи картой',
  fightOver: 'Бой окончен',
  roundInProgress: 'Раздача ещё идёт',
};

export function errorMessage(error: FightError): string {
  return ERROR_MESSAGES[error];
}
