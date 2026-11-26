# Baltic Nuoma — architecture & conventions

Car rental website for **Baltic Nuoma** (Birutės g. 21, Klaipėda, Lithuania).
**Positioning (owner's decision, overrides the original brief): rentals of cars of every class
for personal use** — economy today (5 × Toyota Prius). Premium & luxury are not planned in the near
future (owner, 2026-11), so the public copy talks about economy cars ("Jūsų ekonomija", unlimited
mileage); every data model, filter and UI must still support all classes.

**Contacts (owner, 2026-11):** no WhatsApp as a company contact anywhere on the site (phone, email,
optional Telegram only). The office is temporarily closed: `settings.contacts.office_open` (missing =
closed, admin → Nustatymai → Kontaktai) switches the address / directions to "Biuras laikinai
uždarytas" and the terms to "handover at an agreed place"; the map stays.

**No ride-hailing / taxi content anywhere for now** — no Bolt, "pavežėjimas", passenger-transport
permits, earnings, platform questions in forms. The taxi offering will be revisited as a separate
project after launch (`bookings.platform_driver` is kept, nullable, for that).

**Requests don't hold the car (owner's decision, overrides the brief):** a booking sent from the
website is only a request (`pending`). Its dates stay free in the public calendar and other visitors
may request the same dates; the car is occupied only by bookings **confirmed** in the admin panel
and by manual blocks. The manager picks which request to confirm.

**No 3D (owner's decision):** phase 4 (3D hero / scroll scenes / car viewer) and phase 6b (3D
generation from photos) are dropped. Cars are shown with photos (gallery) or the SVG silhouette.
The 3D-related DB objects from phase 2 (`base_models`, `car_model_versions`, `model_jobs`,
`cars.model_source`…, buckets `models` / `model-inputs`, setting `three_d`) stay unused — don't
build on them unless the owner brings 3D back.

The original product brief (phases, requirements) is the source of truth for scope, except where
the owner changed it (positioning above, static buttons). Owner-supplied items are in `TODO.md`.

## Stack

| Concern   | Choice                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router, RSC) + TypeScript strict, deployed on Vercel             |
| Styling   | Tailwind CSS v4 (CSS-first config in `app/globals.css` → `@theme` tokens)        |
| i18n      | `next-intl` v4 — `lt` default (no prefix), `en` under `/en` with localized paths |
| Motion    | `framer-motion` (UI, via `LazyMotion` + `m.*`), `lenis` (smooth scroll)          |
| Backend   | Supabase: Postgres + RLS, Auth, Storage, Realtime (phase 2)                      |
| Email     | Resend + `react-email` (`lib/email/*`, sent after the response via `after()`)    |
| Forms     | `react-hook-form` + `zod` (shared schema client ↔ server action)                 |
| Tests     | `node:test` via `tsx` (unit), pgTAP (DB), Playwright + axe (e2e, a11y)           |

## Commands

```bash
npm run dev          # dev server (Turbopack) on :3000
npm run build        # production build (webpack)
npm run check        # typecheck + lint + i18n key parity — run before every commit
npm run test:unit    # pricing / availability / format / consent unit tests (tests/unit, node:test + tsx)
npm run test:e2e     # Playwright smoke + axe on the production build (:3100); `npm run build` first.
                     # E2E_BASE_URL=https://www.balticnuoma.lt → read-only run against a deployment
npm run format       # prettier (with tailwind class sorting)
npm run i18n:check   # messages/en.json must have exactly the keys of lt.json

# Database (Supabase CLI via npx, needs Docker)
npm run db:start     # local Supabase stack (Postgres, Auth, Storage, Realtime, Studio)
npm run db:reset     # re-apply all migrations + supabase/seed.sql
npm run db:test      # pgTAP tests in supabase/tests (RLS, double-booking protection)
npm run db:lint      # Supabase linter (security / performance advisories)
npm run db:types     # regenerate lib/supabase/database.types.ts from the local DB
npm run db:bundle    # rebuild supabase/production-setup.sql (one-paste install for a new project)
npm run seed:admin   # create/promote an admin user (reads .env.local)
```

## Folder map

```
app/
  layout.tsx            pass-through root layout (required by app/not-found.tsx)
  globals.css           design tokens (@theme) + base styles + custom utilities
  not-found.tsx         fallback 404 outside [locale]
  global-error.tsx      last-resort 500
  icon.svg, apple-icon.png
  sitemap.ts, robots.ts  sitemap (LT + EN + cars, hreflang) / robots (previews: disallow all)
  [locale]/             PUBLIC SITE — <html> lives in [locale]/layout.tsx
    layout.tsx          fonts, NextIntlClientProvider (client namespaces only), Navbar, Footer, FloatingContacts
    page.tsx            home
    automobiliai/ salygos/ kontaktai/ privatumo-politika/ slapukai/   (no separate prices page —
                        removed by the owner; /kainos redirects to /automobiliai). The 3 legal pages are
                        createLegalPage() routes with texts in content/legal/
    [...rest]/page.tsx  → notFound() so unknown URLs get the localized 404
    not-found.tsx, error.tsx
  admin/                ADMIN — LT only, own <html> (layout.tsx), never indexed
    prisijungimas/      login (email + password, rate-limited)
    (panel)/            everything behind the login: layout (requireStaff + AdminShell + LiveBookings),
                        page (dashboard), rezervacijos/ (list, [id] card, csv/ route), kalendorius/
                        (fleet timeline + manual blocks), automobiliai/ (list, [id] 3-step editor),
                        kategorijos/ (list, [id] editor, "nauja"), nustatymai/ (+ naudotojai/), paskyra/
  api/                  route handlers: health (deployment self-check), availability (catalog
                        date filter), busy (one car's busy periods for the booking calendar),
                        og/[locale] + og/[locale]/cars/[slug] (Open Graph PNG cards, static / ISR)
components/
  brand/                Logo, LogoMark (SVG)
  layout/               Navbar, Footer, FloatingContacts, LanguageSwitcher, PageHero, nav-items
  providers/            Providers (LazyMotion, MotionConfig, ConsentProvider), SmoothScroll (Lenis), ScrollToTop
  consent/              ConsentProvider (useConsent), CookieBanner + CookieSettingsButton, GoogleAnalytics
  seo/                  JsonLd
  legal/                LegalPage (createLegalPage: hero, TOC, numbered sections, draft HTML comment)
  ui/                   Button/ButtonLink/ButtonAnchor, BrandIcons, Reveal/RevealText, Spotlight,
                        SectionHeading
  sections/             home sections: Hero, Advantages, HowItWorks, FleetPreview, Requirements, Faq,
                        ContactSection (no pricing block on the home page — owner's request)
  cars/                 CarCard, CarPlaceholder (SVG silhouettes), CarGallery, CarSpecs, CarFeatures,
                        TariffList, RulesList, Catalog (client filters)
  contact/              ContactList, MapEmbed (Google Maps iframe — only with "maps" consent, lazy)
  booking/              BookingWidget (modes, quote, form, success), BookingCalendar (APG grid)
  admin/                AdminShell (sidebar / phone drawer), LoginForm, BookingActions + ManagerNote,
                        FleetCalendar, LiveBookings (Realtime → router.refresh), ui.tsx (PageHeader, Card,
                        status badges, Notice, adminInput), car-editor/ (CarEditor + BasicStep / PhotosStep /
                        PublishStep), RichTextEditor, TermsFields (tariffs / rules with inheritance),
                        CategoryEditor, SettingsForms, UsersManager (+ AccountForms)
content/legal/          terms / privacy / cookies × lt / en (JSX, interpolate LegalContext), ui.tsx helpers
i18n/                   routing.ts (locales + localized pathnames), navigation.ts, request.ts
messages/               lt.json (source of truth), en.json
lib/
  config/site.ts        compile-time fallbacks (phone, address, geo, site URL); requisites live in settings.company
  seo/                  urls.ts (localizedPath, absoluteUrl, alternatesFor), metadata.ts (pageMetadata, OG
                        sizes), schema.ts (AutoRental / Car + Offer / BreadcrumbList JSON-LD), og-image.tsx
                        (next/og cards; fonts/ = merged Unbounded + Manrope WOFF, OFL)
  legal/context.ts      getLegalContext() (requisites → placeholders when empty), LEGAL_UPDATED
  consent.ts            consent cookie format (bn_consent, CONSENT_VERSION), GA id
  fonts.ts              Unbounded (display) + Manrope (text), latin-ext subsets
  motion/lenis.ts       root Lenis handle: getLenis(), lockScroll()
  utils/cn.ts           clsx + tailwind-merge
  supabase/             env.ts, public.ts (anon, cookie-less → static pages), server.ts (session,
                        admin), client.ts (browser), admin.ts (service role, server-only),
                        database.types.ts (generated — never edit), types.ts (aliases)
  db/json.ts            zod contracts for JSONB columns + resolvePricing / resolveRentalRules
  data/                 server-only cached reads: settings.ts (getPublicSettings), cars.ts
                        (getPublishedCars, getCarBySlug, getCategories, pick()), defaults.ts, cache.ts
  pricing/display.ts    "from" price, per-day equivalent, savings %
  pricing/calculate.ts  booking quote: quoteDays (cheapest of daily / weekly / long-term), quoteHours
  booking/              schema.ts (zod: selection + customer, error codes), selection.ts (interval,
                        quote, timing checks), availability.ts (Vilnius day maths, free hourly slots),
                        format.ts (BN-000123, LT/EN date ranges, €), server.ts (server-only: car terms,
                        IP hash, rate limit), actions.ts ("use server" submitBooking)
  dates.ts              Europe/Vilnius day helpers (vilniusDayStart, vilniusToday, addDaysIso)
  format/hours.ts       opening hours → "I–V 9:00–18:00" / "Mon–Fri 9:00–18:00"
  email/                send.ts (Resend, preview files, no-key fallback), templates.tsx (react-email),
                        booking.tsx (request → customer + manager; confirmed / rejected → customer)
  admin/                auth.ts (getStaff / requireStaff / requireAdmin, safeNextPath), session-actions.ts
                        (signIn / signOut), bookings.ts (filters, list + conflict hints, card), booking-
                        actions.ts (confirm / reject / cancel / reopen / note / reject overlapping),
                        booking-email.ts (DB row → email input), calendar.ts, block-actions.ts,
                        dashboard.ts, format.ts (LT dates, periods, money), car-schema.ts (editor form zod),
                        cars.ts + car-actions.ts (draft / autosave / duplicate / delete, photos), image.ts
                        (browser WebP compression + blur placeholder), categories.ts + category-actions.ts,
                        settings-actions.ts (settings, users, my account)
  content/html.ts       cleanHtml (description allow-list) used on save AND on render
  utils/slug.ts         slugify() / SLUG_PATTERN — same rules as private.slugify
  db/range.ts           parse / build tstzrange literals
supabase/
  config.toml           local stack config (sign-up disabled)
  migrations/           ordered SQL migrations (foundation, core, bookings, rls, storage)
  seed.sql              idempotent seed: settings, categories, makes/models, 5 Prius, luxury draft
  production-setup.sql  GENERATED: migrations + seed in one transaction for the SQL Editor
  tests/database/       pgTAP tests
public/brand/           logo.svg, logo-stacked.svg, logo-mark.svg, logo-mono-{light,dark}.svg
scripts/                check-messages.mjs, seed-admin.mjs, build-setup-sql.mjs
tests/unit/             node:test unit tests (run with tsx; `@/` paths work)
tests/e2e/              Playwright specs: public, consent, booking (local only — creates a booking), a11y (axe)
playwright.config.ts    desktop + Pixel 7 projects, webServer `next start -p 3100` (rate limit raised)
docs/                   owner-facing guides (SUPABASE_SETUP.md, EMAIL_SETUP.md, ADMIN_SETUP.md, SEO_SETUP.md)
middleware.ts           /admin → Supabase session refresh + login gate (X-Robots-Tag noindex);
                        everything else → next-intl (skips /api, static files)
```

## i18n rules

- **Internal pathnames are Lithuanian** (they equal the folder names). `i18n/routing.ts`
  maps them to EN paths (`/automobiliai` → `/en/cars`). Add every new public route there.
- In the public site always import `Link`, `redirect`, `usePathname`, `useRouter` from
  `@/i18n/navigation` — ESLint blocks `next/link` outside `app/admin`.
- All copy lives in `messages/*.json`. LT is the source; EN must mirror its keys
  (`npm run i18n:check`). Messages are typed via `global.d.ts`.
- Only the namespaces in `CLIENT_NAMESPACES` (`app/[locale]/layout.tsx`) are sent to the
  browser. Prefer translating in Server Components; add a namespace there only if a
  Client Component needs it.
- `localeDetection` is off: `/` is always Lithuanian (SEO-friendly, predictable).
- Every page calls `setRequestLocale(locale)` to stay statically renderable.
- Time zone is `Europe/Vilnius` (set in `i18n/request.ts`; use it for all date math).
- Admin is Lithuanian-only and does not use next-intl routing.

## Database (Supabase)

- **Never edit an applied migration** — add a new file `supabase/migrations/<timestamp>_<name>.sql`,
  then `npm run db:reset && npm run db:test && npm run db:types && npm run db:bundle`.
- `supabase/production-setup.sql` (generated by `npm run db:bundle`, checked by `npm run check`)
  installs everything on a **fresh** project via the SQL Editor — see `docs/SUPABASE_SETUP.md`.
  An already-installed production DB gets only the new migration files (`supabase db push`).
- **Every new table needs RLS** enabled + explicit policies in the same migration. Default
  privileges already revoke anon writes and TRUNCATE.
- Roles: helpers `private.is_staff()` / `private.is_admin()` (security definer, in the non-exposed
  `private` schema). Staff = profile role `admin` or `manager`; manager cannot delete cars /
  catalog entries, change settings or roles. Roles come from `app_metadata.role` (service role only).
- Visitors (anon) read only: categories, makes/models, base models, **published** cars, their
  photos, `car_busy_periods`, settings with `is_public = true`.
- **Bookings are never inserted with the anon key.** Public booking requests go through server
  code using `createAdminClient()` after zod validation, rate limit and honeypot.
- **Double-booking protection:** **confirmed** bookings and `blocks` are mirrored by triggers into
  `car_occupancy`, which has one GiST exclusion constraint `(car_id =, period &&)`. Pending
  requests are NOT mirrored (they may overlap each other); confirming one onto taken dates raises
  SQLSTATE `23P01` with hint `period_unavailable` → show "dates taken". `car_busy_periods` and
  `available_cars()` therefore show confirmed bookings + blocks only. Periods are half-open
  `[start, end)` `tstzrange` (back-to-back rentals are allowed).
- Pricing / rules resolution: `settings.pricing` ← `categories.default_pricing` ←
  `cars.price_overrides` (and `cars.deposit`); same for `rental_rules`. Use
  `resolvePricing()` / `resolveRentalRules()` from `lib/db/json.ts`; `{}` = inherit.
- JSONB columns are validated with the zod schemas in `lib/db/json.ts` on every read/write.
- Public pages use `createPublicClient()` (no cookies → static/ISR). Guard with
  `isSupabaseConfigured` so the site still builds without Supabase env vars.
- Storage buckets: `car-images` (public; writes staff-only). `models` / `model-inputs` are unused (3D dropped).
- Realtime publication: `model_jobs`, `bookings` (RLS applies — staff only).

## Public data & caching

- Public pages are **static with ISR** (`export const revalidate = 300` — a literal, Next requires it) and read data only through
  `lib/data/*` (wrapped in `unstable_cache` with tags `settings`, `categories`, `cars`).
  **Admin mutations must call `revalidateTag(...)`** for the affected tags so the site updates at once.
- Every reader falls back to `lib/data/defaults.ts` / empty lists when Supabase is not configured
  or fails — the site must always build and render.
- Localized DB text is `{ lt, en | null }` (`L10n`); render with `pick(text, locale)` (EN → LT fallback).
- Contacts, opening hours, tariffs, rules and company requisites (`settings.company`) come from
  `settings` (editable in admin), not from `lib/config/site.ts` (that file holds only fallbacks).
- The catalog stays static: cards render on the server, `Catalog` (client) only filters them;
  date availability comes from `GET /api/availability?from&to` (Vilnius days, `to` inclusive).
- Scroll reveals: `Reveal` / `RevealText` keep server HTML visible and only animate elements that
  start below the fold. Never wrap the hero H1 (LCP) in them.

## SEO, legal pages, cookies (phase 7)

- Every public page's `generateMetadata` returns `pageMetadata({ locale, href, title, description })`
  (`lib/seo/metadata.ts`): canonical + hreflang (lt / en / x-default) from `i18n/routing`, OG + Twitter
  with the site card `/api/og/{locale}` (car pages: `/api/og/{locale}/cars/{slug}`). New public routes:
  add them to `routing.ts`, `app/sitemap.ts` and give them `pageMetadata`.
- JSON-LD: `AutoRental` (home + contacts, `@id` `/#business`), `Car` + daily `Offer` + `BreadcrumbList`
  (car page), `BreadcrumbList` (catalog) — builders in `lib/seo/schema.ts`, rendered with `<JsonLd>`.
- OG cards are rendered by `next/og` (Satori): it can't read WebP, so the car cover goes through `sharp`
  (explicit dependency). Fonts are read from `lib/seo/fonts` (listed in `outputFileTracingIncludes`);
  one merged file per weight — Satori doesn't fall back between files of one family.
- `robots.ts`: preview deployments (`VERCEL_ENV != production`) disallow everything. `/api/og/` stays
  crawlable for link previews. Search Console: `GOOGLE_SITE_VERIFICATION` (or DNS, `docs/SEO_SETUP.md`).
- No taxi / ride-hailing keywords anywhere (brief's «Bolt», «pavežėjams» keywords are dropped).
- Legal texts are drafts (`<!-- ЧЕРНОВИК: требует юридической проверки -->` is emitted on each page).
  Edit `content/legal/*.{lt,en}.tsx`, then bump `LEGAL_UPDATED`. Requisites come from admin →
  Nustatymai → Įmonės rekvizitai; empty ones render as amber `[…]` placeholders (footer hides them).
- The cookie banner is server-rendered (on phones it's the LCP element for first-time visitors — a
  client-only banner pushed LCP to ~4 s). An inline pre-paint script in `[locale]/layout.tsx` sets
  `<html data-consent-set>` when `bn_consent` exists and CSS hides the banner; `<html>` therefore has
  `suppressHydrationWarning`.
- Cookies: anything that sets non-essential cookies must wait for `useConsent()` (categories `maps`,
  `analytics`). GA4 loads only with `NEXT_PUBLIC_GA_MEASUREMENT_ID` + consent; withdrawing deletes `_ga*`
  and reloads. Changing categories → bump `CONSENT_VERSION` and update the cookie table in
  `content/legal/cookies.*`. "Necessary only" and "Accept all" must stay equally prominent.

## Booking (phase 5)

- Flow: car page → `BookingWidget` (client) → `submitBooking` server action → `bookings` row
  (`pending`) → emails after the response. The widget's quote is a preview only; the action
  re-validates **everything**: zod schema → honeypot + min fill time (fake success for bots) →
  dates (`checkSelectionTiming`) → rate limit → car terms loaded uncached with the admin client →
  `quoteSelection` → licence years → `isPeriodTaken` (confirmed / blocks only → `period_unavailable`)
  → same request already sent (`findDuplicateRequest`) → returns its number → insert `pending`.
- zod reaches the browser only when the form is used: `BookingWidget` validates through a lazy resolver
  (`import("@/lib/booking/schema")`, prefetched on "Tęsti"). Never import runtime values from
  `lib/booking/schema` (or `lib/db/json`) statically in public client components — types only.
- Success is shown in a popup (`SuccessDialog`, native modal `<dialog>`); the widget goes back to the
  calendar. The manager email says how many other pending requests overlap the dates.
- Day rentals select **first..last day inclusive**; the period is `[first 00:00, last+1 00:00)`
  Vilnius. Hourly rentals: one day, start 7:00…, end ≤ 24:00, start ≥ now + 1 h. A day with hourly
  bookings is `partial` (half red) and can't be part of a day rental.
- `price_breakdown` stores `{ version: 1, currency, selection, quote }` — enough to rebuild emails
  and the admin view later. Booking reference = `bookingNumber(number)` → `BN-000123`.
- Rate limit: `public.consume_rate_limit(key, max, window)` (service role only, counters in
  `private.rate_limit_hits`, key = `booking:<HMAC(IP)>`), `BOOKING_RATE_LIMIT_PER_HOUR` (default 5).
  The limiter fails open (logs) so bookings never break because of it.
- "Today" in the widget comes from the browser (`useSyncExternalStore`) — pages are ISR and may be
  older than today. `/api/busy` is `no-store`.
- Emails: customer in the booking's locale, manager always LT, `idempotencyKey` per booking/event.
  Without `RESEND_API_KEY` nothing is sent (logged) and the success screen doesn't promise an
  email. Manager address: `settings.notifications.booking_email` → `BOOKING_NOTIFY_EMAIL`.
  Locally `EMAIL_PREVIEW_DIR=./.emails` writes every email to disk.
- Copy: `booking` (client) and `emails` (server, via `createTranslator`) namespaces; price-line
  labels `booking.lines.*` are shared by the widget and the emails.

## Admin panel (phase 6)

- Every page and action starts with `requireStaff()` / `requireAdmin()` (`lib/admin/auth.ts`) and then
  uses the **session client** (`staff.supabase`) — RLS is the real permission check. The service-role
  client is not used in the admin except for the login rate limit.
- Middleware only refreshes the session and redirects anonymous visitors to `/admin/prisijungimas`
  (`?next=` is validated by `safeNextPath`). `next/link` is allowed in `app/admin` / `components/admin`.
- Actions return `ActionResult` (`{ ok, message } | { ok: false, error }`, LT text) and call
  `revalidatePath("/admin", "layout")`; mutations of cars / categories / settings must also call
  `revalidateTag` for the public site.
- Status changes are guarded (`.eq("status", "pending")` …) so two staff members can't both act on a
  stale page; 23P01 on confirm → "dates taken". Confirm / reject send the customer email via `after()`
  (rejection reasons for EN bookings are offered in English). Cancelling sends no email.
- Calendar: confirmed = red, pending = orange (lanes when requests overlap), block = gray stripes.
  Manual blocks are whole days (last day inclusive).
- Admin UI is dense and mobile-first enough to confirm a booking from a phone: tables become cards
  below `md`, the sidebar becomes a drawer below `lg`.
- Car editor: "Pridėti automobilį" inserts a draft first, then the whole form autosaves (debounced
  1.2 s, status changes immediately, one save in flight, `beforeunload` guard). Make / model are free
  text resolved to `makes` / `vehicle_models` (created when new). Publishing requires at least one
  bookable tariff after inheritance. Half-filled custom rows stay in the form but aren't sent.
- Photos go browser → Storage (`car-images/cars/{car_id}/{uuid}.webp`, staff RLS) after compression
  (≤ 2400 px, WebP / JPEG fallback), then `registerImage` stores the row; first photo = cover.
  Duplicating a car copies the Storage objects; deleting a car / photo removes them.
- Overrides (category / car): **empty = inherit**. `rentalRulesOverrideSchema` has no defaults on
  purpose — `{}` must stay `{}` (a parsed `null` would wipe the category's limits).
- Users: admin creates / re-passwords / deletes staff with the service role (`auth.admin`); at least
  one admin must remain. Everyone can change their own name and password on /admin/paskyra.
- Manual (phone) bookings: /admin/rezervacijos/nauja → `createManualBooking` (session client, RLS
  "staff insert"). `bookings.source = 'admin'`, `created_by = auth.uid()`; email, licence year and
  `terms_accepted_at` are optional for admin rows only (CHECK `bookings_website_fields_required`
  keeps website rows strict). Price = tariff quote unless staff type a total (`price_breakdown.
manualPrice`, lines dropped). Default status confirmed (occupies at once, 23P01 → "dates taken");
  optional confirmation email when an email is given. `previewManualBooking` shows quote + conflicts.
  Staff may book hidden / maintenance cars (`loadBookingCar(…, { anyStatus: true })`) and past dates.
- Code that reads bookings must handle `customer_email` / `license_year` being null.
- Deleting a car (admin only): no bookings → hard delete + Storage cleanup; booking history →
  archive (`cars.archived_at`, status `hidden`; CHECK `cars_archived_not_published`); upcoming
  pending / confirmed bookings → refused. Admin car lists (cars, calendar, new booking) must filter
  archived rows with `isArchived()` (`lib/admin/cars.ts`, works on `*` selects); restore = clear
  `archived_at` (stays hidden).

## Design system

Tokens are defined once in `app/globals.css` (`@theme`) and exposed both as Tailwind
utilities and as CSS variables (read them from JS/WebGL with `getComputedStyle`).

| Token                                              | Value                                         | Utility examples                         |
| -------------------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| `--color-bg`                                       | `#0A0B0D` graphite                            | `bg-bg`                                  |
| `--color-surface` / `--color-surface-2`            | `#121418` / `#1A1D23`                         | `bg-surface`                             |
| `--color-fg` / `--color-muted`                     | `#F2F3F5` / `#8A8F98`                         | `text-fg`, `text-muted`                  |
| `--color-line` / `--color-line-strong`             | white 8% / 16%                                | `border-line` (1px dividers)             |
| `--color-amber` (+`-soft`, `-strong`)              | `#FFB547` Baltic amber                        | CTA, glow, hover, focus ring             |
| `--color-silver`                                   | `#C9D1DC`                                     | end of amber→silver gradients            |
| `--color-free` / `-busy` / `-pending` / `-blocked` | `#22C55E` / `#EF4444` / `#F59E0B` / `#6B7280` | calendar statuses (`pending` admin-only) |

- Fonts: `font-display` = **Unbounded** (headings), `font-sans` = **Manrope** (body).
  Both load `latin-ext` — required for ą č ę ė į š ų ū ž.
- Type scale: `text-display-xl | -lg | -md` (fluid clamp) for headings.
- Custom utilities: `container-site`, `glass` (pair with `border border-line`),
  `text-gradient`, `hairline-accent`, `eyebrow`, `bg-aurora`.
- **No Bolt green and no Bolt logos anywhere.** Brand accents are amber → silver only.
- Glassmorphism only on the navbar, floating contacts and small overlays (badges on photos).
- Buttons are static (owner's request): no magnetic pull, sweep, glow or moving icons —
  only a short color transition on hover.
- Dark theme only for now; to add a light theme, override the same tokens under a
  `[data-theme="light"]` selector.

## Motion & performance rules

- Use `m.*` components (LazyMotion strict) — importing `motion.*` throws at runtime.
- Respect `prefers-reduced-motion`: MotionConfig handles framer-motion, Lenis is not
  started, CSS animations are neutralized globally.
- **Every navigation starts at the top of the new page** (owner's requirement): `ScrollToTop`
  resets Lenis + window on each pathname change (incl. back/forward, language switch); don't
  pass `scroll={false}` to links.
- Pause scrolling for overlays with `lockScroll(true|false)` from `lib/motion/lenis.ts`;
  add `data-lenis-prevent` to scrollable overlays.
- Budgets: Lighthouse mobile Performance ≥ 90, LCP < 2.5 s, home JS ≤ 250 KB gzip; all
  images via `next/image` (webp/avif).

## Code conventions

- TypeScript strict; `any` is a lint error. Use `zod` at every trust boundary.
- Server Components by default; `"use client"` only where interaction requires it.
- Secrets (service role, API keys) are only read in server code (`server-only`).
- Prettier (120 cols) + `prettier-plugin-tailwindcss` sorts classes (also inside `cn()`).
- Keep accessibility: semantic landmarks, visible focus (`:focus-visible` amber ring),
  `aria-*` on icon-only buttons, `alt` on every image, WCAG AA contrast (no `opacity-*` on muted
  text), no skipped heading levels, an accessible name that contains the visible text (no
  `aria-label` that replaces short visible labels — add `sr-only` text instead), keyboard-reachable
  scroll containers. `npm run test:e2e` runs axe on the main pages.

## Known issues

- **Rare hydration mismatch on slow networks (React #418), pre-existing.** Next.js 15.5 renders its
  own metadata / outlet Suspense boundaries (`<div hidden><!--$--><!--/$--></div>` at the top of
  `<body>`, `<!--$--><!--/$-->` at the end of `<main>`). When the HTML streams slowly they can resolve
  mid-hydration and React reports a recoverable mismatch (usually at the footer), then re-renders that
  subtree on the client — no visible breakage. Measured with a slow-HTML proxy: ~5–10 % of loads on
  pages with more content (contacts, catalog, home), 0 % on legal pages; same rate on the phase 7 build,
  so not caused by our code. `htmlLimitedBots` doesn't change it. Re-check after a Next.js upgrade;
  live e2e runs ignore #418 (`tests/e2e/helpers.ts`), local runs don't.
- `useConsent()` reports `undefined` while the calling component hydrates (own `useSyncExternalStore`
  flag) — components inside late-hydrating boundaries must not render consent-dependent UI before that.

## Phase status

- [x] 1 — Skeleton: Next.js, Tailwind tokens, fonts, i18n, layout, navbar, footer,
      floating contacts, logo, 404/500, docs
- [x] 2 — Supabase: migrations, RLS, occupancy exclusion, storage, seed, pgTAP tests,
      generated types, clients, seed-admin script
- [x] 3 — Public pages: home sections, catalog with filters, car page, contacts; data
      layer with ISR + tags; LT/EN copy (legal pages → phase 7)
- [—] 4 — 3D & motion — **dropped by the owner** (no 3D on the site)
- [x] 5 — Booking: calendar, pricing, form (no ride-hailing question), server action, emails
- [x] 6 — Admin panel: login, dashboard, bookings (+ CSV, emails), fleet calendar + blocks, car
      editor (3 steps, autosave, photos, duplicate), categories, settings, users / my account
- [—] 6b — 3D generation from photos — **dropped by the owner**
- [x] 7 — SEO (canonical / hreflang, OG cards, sitemap, robots, JSON-LD), legal pages LT/EN (drafts),
      company requisites in admin, cookie banner (map + optional GA4 after consent)
- [x] 8 — Polish: Lighthouse (mobile 90–98, LCP 1.1 s), axe a11y fixes, Playwright e2e (desktop +
      phone, incl. a booking request), README, final TODO
