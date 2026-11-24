# Baltic Nuoma

Сайт аренды автомобилей **Baltic Nuoma** (Klaipėda): публичная часть на LT/EN с 3D-демонстрацией
авто, онлайн-бронированием и админ-панелью для менеджеров.

Архитектура и соглашения — в [`CLAUDE.md`](./CLAUDE.md). Что должен предоставить владелец — в [`TODO.md`](./TODO.md).

> Статус: фаза 1 (каркас). Инструкции по Supabase, email и 3D-генерации будут дополнены
> в соответствующих фазах.

## Локальный запуск

Требования: Node.js ≥ 20.18, npm.

```bash
npm install
cp .env.example .env.local   # заполните значения
npm run dev                  # http://localhost:3000
```

| Скрипт                        | Что делает                                     |
| ----------------------------- | ---------------------------------------------- |
| `npm run dev`                 | dev-сервер (Turbopack)                         |
| `npm run build` / `npm start` | production-сборка и запуск                     |
| `npm run check`               | typecheck + ESLint + проверка ключей переводов |
| `npm run format`              | Prettier (с сортировкой Tailwind-классов)      |

## URL-структура

| LT (по умолчанию)                       | EN                            |
| --------------------------------------- | ----------------------------- |
| `/`                                     | `/en`                         |
| `/automobiliai`, `/automobiliai/[slug]` | `/en/cars`, `/en/cars/[slug]` |
| `/kainos`                               | `/en/prices`                  |
| `/salygos`                              | `/en/terms`                   |
| `/kontaktai`                            | `/en/contacts`                |
| `/privatumo-politika`                   | `/en/privacy-policy`          |
| `/slapukai`                             | `/en/cookies`                 |
| `/admin`                                | — (только LT)                 |

## Деплой на Vercel (кратко)

1. Импортируйте репозиторий в Vercel (Framework preset: **Next.js**).
2. В _Settings → Environment Variables_ добавьте переменные из `.env.example`
   (как минимум `NEXT_PUBLIC_SITE_URL`).
3. Подключите домен и обновите `NEXT_PUBLIC_SITE_URL`.

Подробная настройка Supabase, Resend, Vercel Cron и 3D-провайдеров будет добавлена в фазах 2, 5, 6b и 8.

## Бренд

Логотипы — в `public/brand/`: `logo.svg` (горизонтальный), `logo-stacked.svg`, `logo-mark.svg`
(знак), `logo-mono-light.svg` / `logo-mono-dark.svg` (одноцветные). Текст переведён в кривые,
шрифт — Unbounded (SIL OFL).
