/** The one Node API the CSS unit test needs; the project does not depend on @types/node. */
declare module 'node:fs' {
  export function readFileSync(path: URL, encoding: 'utf8'): string;
}
