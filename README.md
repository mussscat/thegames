# Карточный рогалик — прототипы

Два прототипа для проверки идеи: «Дурак-рогалик» и «TriPeaks-рогалик» (в разработке).
Спецификация: `docs/superpowers/specs/2026-10-07-card-roguelike-prototypes-design.md`.

## Запуск

```bash
npm install
npm run dev          # http://localhost:5173 (и по IP в локальной сети — открой с телефона)
```

Фиксированный сид для воспроизведения раздачи: `http://localhost:5173/?seed=42`.

## Проверки

```bash
npm test             # unit + property-тесты
npm run coverage     # покрытие (порог 80% для packages/*)
npm run typecheck
npm run e2e          # Playwright, мобильный viewport
```

## Структура

- `packages/core` — RNG с сидом, карты, Result
- `packages/durak` — правила дурака, бой с HP, ИИ (чистая логика)
- `apps/web` — React PWA

## Деплой (Cloudflare Pages)

1. Запушить репозиторий на GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → выбрать репозиторий.
3. Настройки сборки:
   - Build command: `npm run build`
   - Build output directory: `apps/web/dist`
   - Environment variable: `NODE_VERSION=22`
4. Каждый пуш в `main` деплоится автоматически; ссылку `*.pages.dev` можно раздавать тестерам.

## Известная особенность npm

Если после `npm install <пакет>` тесты падают с `Cannot find native binding`, это баг npm с optional-зависимостями
(npm/cli#4828): удалите `node_modules` и `package-lock.json` и выполните `npm install` заново.
