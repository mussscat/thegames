import '@fontsource/handjet/500.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/handjet/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/tiny5/400.css';

/** Candidate UI fonts with Cyrillic, compared live in the lab. */
export const FONT_OPTIONS = [
  { id: 'pixelify', name: 'Pixelify Sans (сейчас)', family: "'Pixelify Sans', monospace" },
  { id: 'rubik', name: 'Rubik', family: "'Rubik', system-ui, sans-serif" },
  { id: 'nunito', name: 'Nunito', family: "'Nunito', system-ui, sans-serif" },
  { id: 'press', name: 'Press Start 2P', family: "'Press Start 2P', monospace" },
  { id: 'tiny5', name: 'Tiny5', family: "'Tiny5', monospace" },
  { id: 'handjet', name: 'Handjet', family: "'Handjet', monospace" },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]['id'];

export function fontFamily(id: FontId): string {
  return FONT_OPTIONS.find((font) => font.id === id)?.family ?? FONT_OPTIONS[0].family;
}
