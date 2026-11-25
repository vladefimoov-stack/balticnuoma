# Baltic Nuoma

Сайт аренды автомобилей **Baltic Nuoma** (Klaipėda): публичная часть на LT/EN с каталогом
авто, онлайн-бронированием и админ-панелью для менеджеров.

Архитектура и соглашения — в [`CLAUDE.md`](./CLAUDE.md). Что должен предоставить владелец — в [`TODO.md`](./TODO.md).

> Статус: фазы 1–3, 5 и 6 готовы: каркас, база данных, публичные страницы, онлайн-бронирование и
> админ-панель ([`docs/ADMIN_SETUP.md`](./docs/ADMIN_SETUP.md)). Дальше — SEO, юридические страницы, cookies (фаза 7).

## Локальный запуск

Требования: Node.js ≥ 20.18, npm, Docker (для локального Supabase).

```bash
npm install
cp .env.example .env.local   # заполните значения
npm run db:start             # локальный Supabase; выведет URL и ключи → впишите их в .env.local
npm run seed:admin           # создаст админа из SEED_ADMIN_* в .env.local
npm run dev                  # http://localhost:3000, Supabase Studio — http://127.0.0.1:54323
```

Миграции и seed применяются автоматически при `npm run db:start` / `npm run db:reset`.

| Скрипт                        | Что делает                                     |
| ----------------------------- | ---------------------------------------------- |
| `npm run dev`                 | dev-сервер (Turbopack)                         |
| `npm run build` / `npm start` | production-сборка и запуск                     |
| `npm run check`               | typecheck + ESLint + проверка ключей переводов |
| `npm run test:unit`           | unit-тесты: расчёт цены, календарь, форматы    |
| `npm run format`              | Prettier (с сортировкой Tailwind-классов)      |
| `npm run db:reset`            | пересоздать локальную БД: миграции + seed      |
| `npm run db:test`             | pgTAP-тесты БД (RLS, защита от двойных броней) |
| `npm run db:types`            | перегенерировать TypeScript-типы БД            |
| `npm run seed:admin`          | создать / повысить пользователя админки        |

## URL-структура

| LT (по умолчанию)                       | EN                            |
| --------------------------------------- | ----------------------------- |
| `/`                                     | `/en`                         |
| `/automobiliai`, `/automobiliai/[slug]` | `/en/cars`, `/en/cars/[slug]` |
| `/salygos`                              | `/en/terms`                   |
| `/kontaktai`                            | `/en/contacts`                |
| `/privatumo-politika`                   | `/en/privacy-policy`          |
| `/slapukai`                             | `/en/cookies`                 |
| `/admin`                                | — (только LT)                 |

## Настройка Supabase (production)

👉 **Подробная пошаговая инструкция для владельца (без командной строки):
[`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md).**

Кратко для разработчика:

1. Новый проект в регионе **Central EU (Frankfurt)**; Data API и схема `public` — по умолчанию.
2. Схема + seed одним файлом: вставить [`supabase/production-setup.sql`](./supabase/production-setup.sql)
   в _SQL Editor_ → **Run** (одна транзакция; повторный запуск безопасно отказывается; миграции
   помечаются применёнными для CLI). Альтернатива через CLI:
   `npx supabase link --project-ref <ref> && npx supabase db push --include-seed`.
3. _Authentication_: выключить **Allow new users to sign up**, задать **Site URL**.
4. В Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable),
   `SUPABASE_SERVICE_ROLE_KEY` (secret, Sensitive), `NEXT_PUBLIC_SITE_URL` → Redeploy.
5. Пользователи админки: `npm run seed:admin` (с production-ключами в `.env.local`), менеджер —
   `npm run seed:admin -- --email … --password … --name … --role manager`.
6. Новые миграции после установки — `npx supabase db push` (или вставить новый файл миграции в
   _SQL Editor_). `production-setup.sql` — только для **нового** проекта; он пересобирается
   `npm run db:bundle`, а `npm run check` проверяет, что он актуален.

**Структура БД.** Категории, справочник марок/моделей, автомобили (характеристики, опции,
условия, цены — JSONB с zod-валидацией), фото,
брони, блокировки, настройки. Защита от двойных броней — exclusion constraint в Postgres
(`car_occupancy`), работает даже при одновременных заявках. Подробности — в `CLAUDE.md`.

## Деплой на Vercel (кратко)

1. Импортируйте репозиторий в Vercel. Фреймворк (`nextjs`) и регион функций (`fra1`, Франкфурт —
   ближе всего к Литве и к Supabase EU) зафиксированы в `vercel.json`, поэтому настройка
   _Framework Preset_ в панели не важна. В _Build and Deployment_ не включайте ручные
   переопределения Build Command / Output Directory.
2. В _Settings → Environment Variables_ добавьте переменные из `.env.example`
   (как минимум `NEXT_PUBLIC_SITE_URL` и ключи Supabase).
3. Подключите домен и обновите `NEXT_PUBLIC_SITE_URL`.

Письма о бронированиях (Resend) — пошагово в [`docs/EMAIL_SETUP.md`](./docs/EMAIL_SETUP.md).
Для локальной отладки писем задайте `EMAIL_PREVIEW_DIR=./.emails` — каждое письмо сохранится
как `.html` / `.txt` (ключ Resend не нужен).

## Бренд

Логотипы — в `public/brand/`: `logo.svg` (горизонтальный), `logo-stacked.svg`, `logo-mark.svg`
(знак), `logo-mono-light.svg` / `logo-mono-dark.svg` (одноцветные). Текст переведён в кривые,
шрифт — Unbounded (SIL OFL).
