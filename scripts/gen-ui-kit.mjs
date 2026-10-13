// Generates the TEMPORARY pixel UI kit: PNGs, ui-kit.json (sizes and 9-slice cuts) and the ui-kit.css that uses them.
// The hand-drawn kit of stage 2 replaces the PNGs under the same names and sizes; the code does not change.
// Usage: npm run kit
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCss } from './ui-kit/css.mjs';
import { encodePng } from './ui-kit/png.mjs';
import { buildKit } from './ui-kit/spec.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/src');
const PNG_DIR = join(ROOT, 'assets/ui-kit');

const kit = buildKit();
mkdirSync(PNG_DIR, { recursive: true });
for (const e of kit) writeFileSync(join(PNG_DIR, `${e.name}.png`), encodePng(e.w, e.h, e.pixels));
writeFileSync(join(PNG_DIR, 'ui-kit.json'), `${JSON.stringify(kit.map(({ name, w, h, slice }) => ({ name, w, h, slice })), null, 2)}\n`);
writeFileSync(join(ROOT, 'ui/ui-kit.css'), renderCss(kit));
console.log(`ui kit: ${kit.length} pictures → ${PNG_DIR}`);
