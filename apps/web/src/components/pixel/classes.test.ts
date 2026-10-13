import { describe, expect, it } from 'vitest';
import { barFill, buttonClass, iconClass, panelClass, textClass } from './classes';

describe('buttonClass', () => {
  it('maps tone and size to the kit class', () => {
    expect(buttonClass('red', false)).toBe('px-button px-button-red-l');
    expect(buttonClass('blue', true)).toBe('px-button px-button-blue-s');
  });

  it('appends an extra class last', () => {
    expect(buttonClass('green', false, 'my')).toBe('px-button px-button-green-l my');
  });
});

describe('panelClass', () => {
  it('names the kit class of each frame kind', () => {
    expect(panelClass('panel')).toBe('px-panel');
    expect(panelClass('window')).toBe('px-window');
    expect(panelClass('tip')).toBe('px-tip');
  });
});

describe('textClass and iconClass', () => {
  it('picks the text size (caption 11, body 22, number 33)', () => {
    expect(textClass('s')).toBe('px-text px-text-s');
    expect(textClass('m')).toBe('px-text px-text-m');
    expect(textClass('l')).toBe('px-text px-text-l');
  });

  it('names an icon class', () => {
    expect(iconClass('deck')).toBe('px-icon-deck');
  });
});

describe('barFill', () => {
  it('is a whole number of art pixels', () => {
    for (const hp of [1, 7, 13, 19]) expect(Number.isInteger(barFill(hp, 20, 107))).toBe(true);
  });

  it('is empty only at 0 hp and full only at max hp', () => {
    expect(barFill(0, 20, 100)).toBe(0);
    expect(barFill(20, 20, 100)).toBe(100);
    expect(barFill(1, 1000, 100)).toBe(1);
    expect(barFill(999, 1000, 100)).toBe(99);
  });

  it('proportional in between', () => {
    expect(barFill(10, 20, 100)).toBe(50);
    expect(barFill(5, 20, 100)).toBe(25);
  });

  it('survives bad input: negative or over-full hp, zero max, zero width', () => {
    expect(barFill(-3, 20, 100)).toBe(0);
    expect(barFill(30, 20, 100)).toBe(100);
    expect(barFill(5, 0, 100)).toBe(0);
    expect(barFill(5, 20, 0)).toBe(0);
    expect(barFill(Number.NaN, 20, 100)).toBe(0);
  });
});
