# Baltic Nuoma — architecture & conventions

Car rental website for **Baltic Nuoma** (Birutės g. 21, Klaipėda, Lithuania).
Today: Toyota Prius hybrids for ride-hailing (Bolt) drivers. Tomorrow: premium & luxury
cars for private clients — every data model, filter and UI must already support that.

The original product brief (phases, requirements) is the source of truth for scope.
Owner-supplied items that are still missing are tracked in `TODO.md`.

## Stack

| Concern       | Choice                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router, RSC) + TypeScript strict, deployed on Vercel                                                         |
| Styling       | Tailwind CSS v4 (CSS-first config in `app/globals.css` → `@theme` tokens)                                                    |
| i18n          | `next-intl` v4 — `lt` default (no prefix), `en` under `/en` with localized paths                                             |
| Motion        | `framer-motion` (UI, via `LazyMotion` + `m.*`), `lenis` (smooth scroll), `gsap` + ScrollTrigger (3D scroll scenes — phase 4) |
| 3D            | `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` (phase 4)                                  |
| Backend       | Supabase: Postgres + RLS, Auth, Storage, Realtime (phase 2)                                                                  |
| Email         | Resend + `react-email` (phase 5)                                                                                             |
| Forms         | `react-hook-form` + `zod` (phase 5)                                                                                          |
| 3D generation | Meshy (default) / Tripo via fal.ai behind a `ThreeDProvider` adapter, `mock` for dev (phase 6b)                              |
| Tests         | Playwright smoke tests (phase 8)                                                                                             |

## Commands

```bash
npm run dev          # dev server (Turbopack) on :3000
npm run build        # production build (webpack)
npm run check        # typecheck + lint + i18n key parity — run before every commit
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
  [locale]/             PUBLIC SITE — <html> lives in [locale]/layout.tsx
    layout.tsx          fonts, NextIntlClientProvider (client namespaces only), Navbar, Footer, FloatingContacts
    page.tsx            home
    automobiliai/ kainos/ salygos/ kontaktai/ privatumo-politika/ slapukai/
    [...rest]/page.tsx  → notFound() so unknown URLs get the localized 404
    not-found.tsx, error.tsx
  admin/                ADMIN (phase 6) — LT only, own <html>, excluded from i18n middleware
  api/                  route handlers: health (deployment self-check), availability (catalog
                        date filter), later cron / 3D polling
components/
  brand/                Logo, LogoMark (SVG)
  layout/               Navbar, Footer, FloatingContacts, LanguageSwitcher, PageHero, nav-items
  providers/            Providers (LazyMotion, MotionConfig), SmoothScroll (Lenis)
  ui/                   Button/ButtonLink/ButtonAnchor, BrandIcons, Reveal/RevealText, CountUp,
                        Spotlight, SectionHeading
  sections/             home sections: Hero, Advantages, HowItWorks, FleetPreview, PricingSection,
                        Requirements, Faq, ContactSection
  cars/                 CarCard, CarPlaceholder (SVG silhouettes), CarGallery, CarSpecs, CarFeatures,
                        TariffList, RulesList, Catalog (client filters)
  contact/              ContactList, MapEmbed (lazy Google Maps iframe)
  three/ booking/ admin/  (later phases)
i18n/                   routing.ts (locales + localized pathnames), navigation.ts, request.ts
messages/               lt.json (source of truth), en.json
lib/
  config/site.ts        business constants (phone, address, socials, requisites)
  fonts.ts              Unbounded (display) + Manrope (text), latin-ext subsets
  motion/lenis.ts       root Lenis handle: getLenis(), lockScroll()
  utils/cn.ts           clsx + tailwind-merge
  supabase/             env.ts, public.ts (anon, cookie-less → static pages), server.ts (session,
                        admin), client.ts (browser), admin.ts (service role, server-only),
                        database.types.ts (generated — never edit), types.ts (aliases)
  db/json.ts            zod contracts for JSONB columns + resolvePricing / resolveRentalRules
  data/                 server-only cached reads: settings.ts (getPublicSettings), cars.ts
                        (getPublishedCars, getCarBySlug, getCategories, pick()), defaults.ts, cache.ts
  pricing/display.ts    "from" price, per-day equivalent, savings % (booking math: phase 5)
  dates.ts              Europe/Vilnius day helpers (vilniusDayStart, vilniusToday, addDaysIso)
  format/hours.ts       opening hours → "I–V 9:00–18:00" / "Mon–Fri 9:00–18:00"
  3d/providers/ email/  (later phases)
supabase/
  config.toml           local stack config (sign-up disabled)
  migrations/           ordered SQL migrations (foundation, core, bookings, rls, storage)
  seed.sql              idempotent seed: settings, categories, makes/models, 5 Prius, luxury draft
  production-setup.sql  GENERATED: migrations + seed in one transaction for the SQL Editor
  tests/database/       pgTAP tests
public/brand/           logo.svg, logo-stacked.svg, logo-mark.svg, logo-mono-{light,dark}.svg
public/models/          GLB files (hero-car.glb — owner must supply, see TODO.md)
scripts/                check-messages.mjs, seed-admin.mjs, build-setup-sql.mjs, optimize-models (phase 4)
docs/                   owner-facing guides (SUPABASE_SETUP.md)
middleware.ts           next-intl middleware (skips /api, /admin, static files)
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
  photos and active 3D version, `car_busy_periods`, settings with `is_public = true`.
- **Bookings are never inserted with the anon key.** Public booking requests go through server
  code using `createAdminClient()` after zod validation, rate limit and honeypot.
- **Double-booking protection:** bookings (`pending`/`confirmed`) and `blocks` are mirrored by
  triggers into `car_occupancy`, which has one GiST exclusion constraint `(car_id =, period &&)`.
  An overlap raises SQLSTATE `23P01` with hint `period_unavailable` → show "dates taken".
  Periods are half-open `[start, end)` `tstzrange` (back-to-back rentals are allowed).
- Pricing / rules resolution: `settings.pricing` ← `categories.default_pricing` ←
  `cars.price_overrides` (and `cars.deposit`); same for `rental_rules`. Use
  `resolvePricing()` / `resolveRentalRules()` from `lib/db/json.ts`; `{}` = inherit.
- JSONB columns are validated with the zod schemas in `lib/db/json.ts` on every read/write.
- Public pages use `createPublicClient()` (no cookies → static/ISR). Guard with
  `isSupabaseConfigured` so the site still builds without Supabase env vars.
- Storage buckets: `car-images` (public), `models` (public: GLB, posters, liveries),
  `model-inputs` (private: photos for 3D providers via signed URLs). Writes are staff-only.
- Realtime publication: `model_jobs`, `bookings` (RLS applies — staff only).

## Public data & caching

- Public pages are **static with ISR** (`export const revalidate = 3600`) and read data only through
  `lib/data/*` (wrapped in `unstable_cache` with tags `settings`, `categories`, `cars`).
  **Admin mutations must call `revalidateTag(...)`** for the affected tags so the site updates at once.
- Every reader falls back to `lib/data/defaults.ts` / empty lists when Supabase is not configured
  or fails — the site must always build and render.
- Localized DB text is `{ lt, en | null }` (`L10n`); render with `pick(text, locale)` (EN → LT fallback).
- Contacts, opening hours, tariffs and rules come from `settings` (editable in admin), not from
  `lib/config/site.ts` (that file holds only fallbacks and legal requisites).
- The catalog stays static: cards render on the server, `Catalog` (client) only filters them;
  date availability comes from `GET /api/availability?from&to` (Vilnius days, `to` inclusive).
- Scroll reveals: `Reveal` / `RevealText` keep server HTML visible and only animate elements that
  start below the fold. Never wrap the hero H1 (LCP) in them.

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
- Glassmorphism only on the navbar, floating contacts and cards over 3D.
- Buttons are static (owner's request): no magnetic pull, sweep, glow or moving icons —
  only a short color transition on hover.
- Dark theme only for now; to add a light theme, override the same tokens under a
  `[data-theme="light"]` selector.

## Motion & performance rules

- Use `m.*` components (LazyMotion strict) — importing `motion.*` throws at runtime.
- Respect `prefers-reduced-motion`: MotionConfig handles framer-motion, Lenis is not
  started, CSS animations are neutralized globally. GSAP/3D code must check it too.
- Pause scrolling for overlays with `lockScroll(true|false)` from `lib/motion/lenis.ts`;
  add `data-lenis-prevent` to scrollable overlays.
- 3D: load with `next/dynamic` (`ssr: false`) only when in viewport, show a webp poster
  first, `dpr={[1, 1.75]}`, `frameloop="demand"` unless continuously animating, static
  fallback for weak devices (`hardwareConcurrency <= 4` or no WebGL2).
- Budgets: Lighthouse mobile Performance ≥ 90, LCP < 2.5 s, home JS ≤ 250 KB gzip
  excluding the 3D chunk, GLB ≤ 3 MB (Draco/meshopt + KTX2).

## Code conventions

- TypeScript strict; `any` is a lint error. Use `zod` at every trust boundary.
- Server Components by default; `"use client"` only where interaction requires it.
- Secrets (service role, API keys) are only read in server code (`server-only`).
- Prettier (120 cols) + `prettier-plugin-tailwindcss` sorts classes (also inside `cn()`).
- Keep accessibility: semantic landmarks, visible focus (`:focus-visible` amber ring),
  `aria-*` on icon-only buttons, `alt` on every image, WCAG AA contrast.

## Phase status

- [x] 1 — Skeleton: Next.js, Tailwind tokens, fonts, i18n, layout, navbar, footer,
      floating contacts, logo, 404/500, docs
- [x] 2 — Supabase: migrations, RLS, occupancy exclusion, storage, seed, pgTAP tests,
      generated types, clients, seed-admin script
- [x] 3 — Public pages: home sections, catalog with filters, car page, prices, contacts; data
      layer with ISR + tags; LT/EN copy (legal pages → phase 7)
- [ ] 4 — 3D & motion: hero scene, scroll scenario, car viewer, optimization
- [ ] 5 — Booking: calendar, pricing, form, server action, emails
- [ ] 6 — Admin panel
- [ ] 6b — 3D generation from photos (provider adapter, jobs, cron, GLB optimization)
- [ ] 7 — SEO, legal pages, cookie banner
- [ ] 8 — Polish: Lighthouse, a11y, Playwright, README, final TODO
