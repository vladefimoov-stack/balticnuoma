# Baltic Nuoma

Сайт аренды автомобилей **Baltic Nuoma** (Klaipėda): публичная часть на LT/EN с 3D-демонстрацией
авто, онлайн-бронированием и админ-панелью для менеджеров.

Архитектура и соглашения — в [`CLAUDE.md`](./CLAUDE.md). Что должен предоставить владелец — в [`TODO.md`](./TODO.md).

> Статус: фазы 1–2 (каркас, база данных). Инструкции по email и 3D-генерации будут дополнены
> в соответствующих фазах.

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
| `/kainos`                               | `/en/prices`                  |
| `/salygos`                              | `/en/terms`                   |
| `/kontaktai`                            | `/en/contacts`                |
| `/privatumo-politika`                   | `/en/privacy-policy`          |
| `/slapukai`                             | `/en/cookies`                 |
| `/admin`                                | — (только LT)                 |

## Настройка Supabase (production)

1. Создайте проект на [supabase.com](https://supabase.com): регион **EU Central (Frankfurt)** — рядом
   с функциями Vercel (`fra1`). Сохраните пароль базы данных.
2. _Authentication → Sign In / Providers_: выключите **Allow new users to sign up**
   (регистрация закрыта, пользователей создаёт админ). В _URL Configuration_ укажите домен сайта.
3. Примените миграции и seed (из корня репозитория):

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed
   ```

   Без CLI: выполните по очереди файлы из `supabase/migrations/`, затем `supabase/seed.sql`
   в _SQL Editor_. Seed идемпотентен — повторный запуск ничего не дублирует.

4. _Project Settings → API Keys_: скопируйте URL, `anon`/publishable и `service_role`/secret ключи.
5. Первый админ — локально, с production-ключами в `.env.local`:

   ```bash
   npm run seed:admin
   ```

   Второго пользователя (менеджера) можно добавить так же:
   `npm run seed:admin -- --email … --password … --name … --role manager`.

6. В Vercel добавьте `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (окружения Production и Preview) и сделайте Redeploy.

**Структура БД.** Категории, справочник марок/моделей, автомобили (характеристики, опции,
условия, цены — JSONB с zod-валидацией), фото, 3D (базовые модели, версии, задачи генерации),
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

Настройка Resend, Vercel Cron и 3D-провайдеров будет добавлена в фазах 5, 6b и 8.

## Бренд

Логотипы — в `public/brand/`: `logo.svg` (горизонтальный), `logo-stacked.svg`, `logo-mark.svg`
(знак), `logo-mono-light.svg` / `logo-mono-dark.svg` (одноцветные). Текст переведён в кривые,
шрифт — Unbounded (SIL OFL).
