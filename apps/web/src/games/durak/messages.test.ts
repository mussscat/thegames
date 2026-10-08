import { describe, expect, it } from 'vitest';
import { errorMessage } from './messages';

describe('errorMessage', () => {
  it('explains shop errors in Russian', () => {
    expect(errorMessage('notEnoughCoins')).toBe('Не хватает монет');
    expect(errorMessage('jokerSlotsFull')).toBe('Все 5 мест заняты — сначала продай джокера');
    expect(errorMessage('jokerNotOwned')).toBe('Такого джокера нет');
    expect(errorMessage('wrongPhase')).toBe('Сейчас это недоступно');
  });
  it('keeps fight errors', () => {
    expect(errorMessage('cannotBeat')).toBe('Эта карта не бьёт');
  });
});
