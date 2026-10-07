import { describe, expect, it } from 'vitest';
import { errorMessage } from './messages';

describe('errorMessage', () => {
  it('explains shop errors in Russian', () => {
    expect(errorMessage('notEnoughCoins')).toBe('Не хватает монет');
    expect(errorMessage('perkSlotsFull')).toBe('Все 3 слота заняты — сначала продай перк');
    expect(errorMessage('wrongPhase')).toBe('Сейчас это недоступно');
  });
  it('keeps fight errors', () => {
    expect(errorMessage('cannotBeat')).toBe('Эта карта не бьёт');
  });
});
