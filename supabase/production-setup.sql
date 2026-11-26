-- ═════════════════════════════════════════════════════════════════════════════
-- Baltic Nuoma — full database setup for a NEW Supabase project
--
-- GENERATED FILE — do not edit. Source: supabase/migrations/*.sql + supabase/seed.sql
-- Regenerate with: npm run db:bundle
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
-- Runs in a single transaction: either everything is created, or nothing changes.
-- ═════════════════════════════════════════════════════════════════════════════

begin;

do $guard$
begin
  if to_regclass('public.cars') is not null then
    raise exception 'Baltic Nuoma database is already installed — nothing to do. (Duomenų bazė jau įdiegta.)';
  end if;
end;
$guard$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124120000_foundation.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 01 · Foundation: extensions, private schema, enums, helpers
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists btree_gist with schema extensions; -- uuid "=" inside GiST exclusion constraints
create extension if not exists unaccent with schema extensions;   -- slugify Lithuanian text (ą č ę ė į š ų ū ž)

-- Helpers that must not be exposed through the Data API live in `private`.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('admin', 'manager');
create type public.car_status as enum ('draft', 'published', 'hidden', 'maintenance');
create type public.model_source as enum ('none', 'generated', 'uploaded', 'base_model');
create type public.body_type as enum ('sedan', 'hatchback', 'wagon', 'suv', 'coupe', 'cabrio', 'minivan', 'van');
create type public.rental_type as enum ('hourly', 'daily', 'weekly', 'long_term');
create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled');
create type public.platform_driver as enum ('yes', 'no', 'planning');
create type public.model_job_status as enum ('queued', 'processing', 'succeeded', 'failed', 'cancelled');

comment on type public.car_status is 'draft: being prepared · published: public · hidden: not public · maintenance: public page hidden, cannot be booked';
comment on type public.model_source is 'Which 3D source the car page uses: none (photos only), generated (AI from photos), uploaded (own GLB), base_model (shared model + color/livery/plate)';

-- ── Generic helpers ──────────────────────────────────────────────────────────
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- "Škoda Superb – 2024!" → "skoda-superb-2024"
create function private.slugify(value text)
returns text
language sql
stable
strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, value)),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Shared CHECK helpers (immutable so they can be used in constraints).
create function private.is_valid_slug(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(value) <= 120;
$$;

-- A rental / block period must be a finite, non-empty, half-open [start, end) range.
create function private.is_valid_period(value tstzrange)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not isempty(value)
     and not lower_inf(value)
     and not upper_inf(value)
     and lower_inc(value)
     and not upper_inc(value);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124120100_core_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 02 · Core schema: staff, catalog (categories, makes, models),
-- cars, photos, 3D (base models, versions, generation jobs), settings
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Staff profiles ───────────────────────────────────────────────────────────
-- Public sign-up is disabled; users are created by the seed script / an admin.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (length(full_name) <= 120),
  role        public.app_role not null default 'manager',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Admin-panel users (2 people). role admin: everything · manager: no car deletes, no settings.';

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- New auth user → profile. Role comes from app_metadata (only settable with the
-- service role), so nobody can make themselves admin from the client.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.app_role
         else 'manager'::public.app_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Categories (Ekonominė / Taksi, Premium, Prabangi, …) ─────────────────────
create table public.categories (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (private.is_valid_slug(slug)),
  name_lt              text not null check (length(btrim(name_lt)) between 1 and 80),
  name_en              text not null check (length(btrim(name_en)) between 1 and 80),
  description_lt       text,
  description_en       text,
  icon                 text check (length(icon) <= 60),
  -- Partial overrides of settings.pricing; {} = inherit the global tariffs.
  default_pricing      jsonb not null default '{}'::jsonb check (jsonb_typeof(default_pricing) = 'object'),
  -- Partial overrides of settings.rental_rules (min age, experience, mileage limit …).
  default_rental_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(default_rental_rules) = 'object'),
  sort                 integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on column public.categories.default_pricing is 'Pricing resolution: settings.pricing ← categories.default_pricing ← cars.price_overrides (later wins).';

create trigger categories_set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();

-- ── Makes & models directory (autocomplete + free input) ────────────────────
create table public.makes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 60),
  slug        text not null unique check (private.is_valid_slug(slug)),
  created_at  timestamptz not null default now()
);
create unique index makes_name_ci_key on public.makes (lower(name));

create table public.vehicle_models (
  id          uuid primary key default gen_random_uuid(),
  make_id     uuid not null references public.makes (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 80),
  slug        text not null check (private.is_valid_slug(slug)),
  body_type   public.body_type,
  created_at  timestamptz not null default now(),
  unique (make_id, slug)
);
create unique index vehicle_models_make_name_ci_key on public.vehicle_models (make_id, lower(name));

-- ── Shared 3D base models (e.g. one Prius model for five identical cars) ────
create table public.base_models (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(btrim(name)) between 1 and 120),
  make               text,
  model              text,
  generation         text,
  glb_path           text not null,                 -- path in the `models` storage bucket
  poster_path        text,
  scale              numeric(8, 4) not null default 1 check (scale > 0),
  camera_json        jsonb not null default '{}'::jsonb check (jsonb_typeof(camera_json) = 'object'),
  -- Regex matched against mesh names that receive body color / livery decal.
  body_mesh_pattern  text not null default '^body',
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger base_models_set_updated_at before update on public.base_models
  for each row execute function private.set_updated_at();

-- ── Cars ─────────────────────────────────────────────────────────────────────
create table public.cars (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique check (private.is_valid_slug(slug)),
  category_id              uuid not null references public.categories (id) on delete restrict,
  make_id                  uuid references public.makes (id) on delete set null,
  vehicle_model_id         uuid references public.vehicle_models (id) on delete set null,
  year                     smallint check (year between 1950 and 2100),
  body_type                public.body_type,
  title_lt                 text not null check (length(btrim(title_lt)) between 1 and 120),
  title_en                 text check (length(title_en) <= 120),           -- null → use title_lt
  description_lt           text,                                            -- sanitized rich text (HTML)
  description_en           text,
  -- Standard specs: fuel, transmission, drive, power_hp, acceleration_0_100_s, seats, doors,
  -- consumption_l_100km, range_km, trunk_l, engine_l, livery … (validated by zod in the app)
  specs                    jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  -- Free "label — value" pairs: [{label_lt, label_en, value_lt, value_en}]
  custom_specs             jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_specs) = 'array'),
  -- Equipment list: [{key, icon?, label_lt?, label_en?}] — known keys are translated in the app
  features                 jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  -- Partial overrides of category/global rules: min_age, min_license_years, min_rental_days,
  -- mileage_limit_km_per_day, allowed_rental_types …
  rental_rules             jsonb not null default '{}'::jsonb check (jsonb_typeof(rental_rules) = 'object'),
  color                    text check (color ~ '^#[0-9A-Fa-f]{6}$'),       -- body color for base_model tint
  plate                    text check (length(plate) <= 16),
  model_source             public.model_source not null default 'none',
  base_model_id            uuid references public.base_models (id) on delete set null,
  active_model_version_id  uuid,                                            -- FK added below
  livery_texture_path      text,                                            -- PNG with alpha, `models` bucket
  price_overrides          jsonb not null default '{}'::jsonb check (jsonb_typeof(price_overrides) = 'object'),
  deposit                  numeric(10, 2) check (deposit >= 0),             -- null → category / global deposit
  status                   public.car_status not null default 'draft',
  sort                     integer not null default 0,
  published_at             timestamptz,
  created_by               uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint cars_base_model_required
    check (model_source <> 'base_model' or base_model_id is not null or status = 'draft')
);
create index cars_listing_idx on public.cars (status, category_id, sort);
create index cars_make_idx on public.cars (make_id);

create trigger cars_set_updated_at before update on public.cars
  for each row execute function private.set_updated_at();

create function private.set_car_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger cars_set_published_at before insert or update of status on public.cars
  for each row execute function private.set_car_published_at();

-- ── Car photos ───────────────────────────────────────────────────────────────
create table public.car_images (
  id             uuid primary key default gen_random_uuid(),
  car_id         uuid not null references public.cars (id) on delete cascade,
  path           text not null unique,              -- path in the `car-images` bucket
  alt_lt         text check (length(alt_lt) <= 200),
  alt_en         text check (length(alt_en) <= 200),
  width          integer check (width > 0),
  height         integer check (height > 0),
  blur_data_url  text check (length(blur_data_url) <= 2000),  -- tiny placeholder for next/image
  sort           integer not null default 0,
  is_cover       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index car_images_car_sort_idx on public.car_images (car_id, sort);
create unique index car_images_one_cover_per_car on public.car_images (car_id) where is_cover;

-- ── 3D model versions (history, rollback) ───────────────────────────────────
create table public.car_model_versions (
  id             uuid primary key default gen_random_uuid(),
  car_id         uuid not null references public.cars (id) on delete cascade,
  source         public.model_source not null check (source in ('generated', 'uploaded')),
  glb_path       text not null,                     -- models/cars/{car_id}/{id}.glb
  poster_path    text,                              -- webp poster shown before the 3D loads
  size_bytes     bigint check (size_bytes >= 0),
  triangles      integer check (triangles >= 0),
  -- {scale, y_offset, rotation_y, camera: {position, target, fov}, env_intensity, initial_view}
  view_settings  jsonb not null default '{}'::jsonb check (jsonb_typeof(view_settings) = 'object'),
  job_id         uuid,                              -- FK added after model_jobs
  approved_at    timestamptz,
  rejected_at    timestamptz,
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (id, car_id)                               -- target of the composite FK from cars
);
create index car_model_versions_car_idx on public.car_model_versions (car_id, created_at desc);

-- The active version must belong to the same car. Deleting the version only
-- clears the pointer (PG15+ column list for SET NULL).
alter table public.cars
  add constraint cars_active_model_version_fk
  foreign key (active_model_version_id, id)
  references public.car_model_versions (id, car_id)
  on delete set null (active_model_version_id);

-- ── 3D generation jobs (Meshy / Tripo / mock) ───────────────────────────────
create table public.model_jobs (
  id                 uuid primary key default gen_random_uuid(),
  car_id             uuid not null references public.cars (id) on delete cascade,
  provider           text not null check (provider ~ '^[a-z0-9_-]{2,32}$'),
  ai_model           text check (length(ai_model) <= 64),       -- from settings; never hard-coded
  provider_task_id   text,
  input_image_ids    uuid[] not null default '{}' check (cardinality(input_image_ids) <= 4),
  -- [{image_id, angle: front|side|back|three_quarter, path}]
  angles             jsonb not null default '[]'::jsonb check (jsonb_typeof(angles) = 'array'),
  options            jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  status             public.model_job_status not null default 'queued',
  progress           smallint not null default 0 check (progress between 0 and 100),
  error              text,
  cost_credits       numeric(10, 2) check (cost_credits >= 0),
  result_version_id  uuid references public.car_model_versions (id) on delete set null,
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  updated_at         timestamptz not null default now()
);
create index model_jobs_car_idx on public.model_jobs (car_id, created_at desc);
create index model_jobs_unfinished_idx on public.model_jobs (created_at) where status in ('queued', 'processing');
create unique index model_jobs_provider_task_key on public.model_jobs (provider, provider_task_id)
  where provider_task_id is not null;

create trigger model_jobs_set_updated_at before update on public.model_jobs
  for each row execute function private.set_updated_at();

alter table public.car_model_versions
  add constraint car_model_versions_job_fk
  foreign key (job_id) references public.model_jobs (id) on delete set null;

-- ── Settings (key → JSON) ────────────────────────────────────────────────────
create table public.settings (
  key          text primary key check (key ~ '^[a-z0-9_]{2,64}$'),
  value        jsonb not null,
  is_public    boolean not null default false,       -- readable by site visitors
  description  text,
  updated_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

create trigger settings_set_updated_at before update on public.settings
  for each row execute function private.set_updated_at();

create function private.set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

create trigger settings_set_updated_by before update on public.settings
  for each row execute function private.set_updated_by();

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124120200_bookings.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 03 · Bookings, manual blocks and double-booking protection
--
-- Both bookings (pending/confirmed) and blocks (maintenance, repair) mirror their
-- period into `car_occupancy`. A single GiST exclusion constraint there makes any
-- overlap for the same car impossible — booking↔booking, booking↔block and
-- block↔block — even under concurrent inserts. Violations raise SQLSTATE 23P01
-- with HINT 'period_unavailable'.
-- Periods are half-open [start, end) in UTC; the app works in Europe/Vilnius.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  number                bigint generated always as identity unique,   -- human reference, e.g. BN-000123
  car_id                uuid not null references public.cars (id) on delete restrict,
  period                tstzrange not null check (private.is_valid_period(period)),
  rental_type           public.rental_type not null,
  status                public.booking_status not null default 'pending',
  customer_first_name   text not null check (length(btrim(customer_first_name)) between 1 and 80),
  customer_last_name    text not null check (length(btrim(customer_last_name)) between 1 and 80),
  customer_phone        text not null check (length(customer_phone) between 5 and 32),
  customer_email        text not null check (length(customer_email) <= 254 and customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  license_year          smallint not null check (license_year between 1940 and 2100),
  experience_confirmed  boolean not null default false,               -- "≥ 2 years" checkbox
  platform_driver       public.platform_driver not null,
  comment               text check (length(comment) <= 2000),
  locale                text not null default 'lt' check (locale in ('lt', 'en')),  -- language for emails
  total_price           numeric(10, 2) not null check (total_price >= 0),
  deposit               numeric(10, 2) not null check (deposit >= 0),
  price_breakdown       jsonb not null default '{}'::jsonb check (jsonb_typeof(price_breakdown) = 'object'),
  manager_note          text,
  rejection_reason      text,
  terms_accepted_at     timestamptz not null,                         -- GDPR consent record
  ip_hash               text,                                         -- salted hash, for abuse checks only
  status_changed_at     timestamptz,
  status_changed_by     uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint bookings_rejection_reason_required check (status <> 'rejected' or coalesce(length(btrim(rejection_reason)), 0) > 0)
);
comment on table public.bookings is 'Booking requests. Public inserts only via server code (service role); staff may add phone bookings.';
create index bookings_status_created_idx on public.bookings (status, created_at desc);
create index bookings_car_idx on public.bookings (car_id, lower(period));

create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

create function private.track_booking_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger bookings_track_status before update of status on public.bookings
  for each row execute function private.track_booking_status();

-- ── Manual blocks (maintenance, repair, owner use) ──────────────────────────
create table public.blocks (
  id          uuid primary key default gen_random_uuid(),
  car_id      uuid not null references public.cars (id) on delete cascade,
  period      tstzrange not null check (private.is_valid_period(period)),
  reason      text check (length(reason) <= 500),
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index blocks_car_idx on public.blocks (car_id, lower(period));

create trigger blocks_set_updated_at before update on public.blocks
  for each row execute function private.set_updated_at();

-- ── Occupancy: the single source of truth for "is this car free?" ───────────
create table public.car_occupancy (
  id          bigint generated always as identity primary key,
  car_id      uuid not null references public.cars (id) on delete cascade,
  period      tstzrange not null,
  booking_id  uuid unique references public.bookings (id) on delete cascade,
  block_id    uuid unique references public.blocks (id) on delete cascade,
  constraint car_occupancy_one_source check (num_nonnulls(booking_id, block_id) = 1),
  constraint car_occupancy_no_overlap exclude using gist (car_id with =, period with &&)
);
comment on table public.car_occupancy is 'Maintained by triggers on bookings/blocks. Contains no personal data.';

create function private.sync_booking_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('pending', 'confirmed') then
    insert into public.car_occupancy (car_id, period, booking_id)
    values (new.car_id, new.period, new.id)
    on conflict (booking_id) do update set car_id = excluded.car_id, period = excluded.period;
  else
    delete from public.car_occupancy where booking_id = new.id;
  end if;
  return new;
exception
  when exclusion_violation then
    raise exception 'Automobilis šiam laikotarpiui jau užimtas (car % is not available for %)', new.car_id, new.period
      using errcode = 'exclusion_violation', hint = 'period_unavailable';
end;
$$;

create trigger bookings_sync_occupancy after insert or update of car_id, period, status on public.bookings
  for each row execute function private.sync_booking_occupancy();

create function private.sync_block_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.car_occupancy (car_id, period, block_id)
  values (new.car_id, new.period, new.id)
  on conflict (block_id) do update set car_id = excluded.car_id, period = excluded.period;
  return new;
exception
  when exclusion_violation then
    raise exception 'Automobilis šiam laikotarpiui jau užimtas (car % is not available for %)', new.car_id, new.period
      using errcode = 'exclusion_violation', hint = 'period_unavailable';
end;
$$;

create trigger blocks_sync_occupancy after insert or update of car_id, period on public.blocks
  for each row execute function private.sync_block_occupancy();

-- ── Public read model ───────────────────────────────────────────────────────
-- Busy periods for the public calendar (red = taken). No customer data and no
-- distinction between pending / confirmed / block. Past periods are trimmed.
-- security_invoker → the RLS policies of car_occupancy apply (published cars only).
create view public.car_busy_periods
with (security_invoker = true)
as
select
  o.car_id,
  o.period,
  lower(o.period) as starts_at,
  upper(o.period) as ends_at
from public.car_occupancy o
where upper(o.period) > now() - interval '1 day';

comment on view public.car_busy_periods is 'Public availability calendar: busy periods of published cars, no personal data.';

-- Catalog filter "available on dates": published cars with no overlap in [p_from, p_to).
create function public.available_cars(p_from timestamptz, p_to timestamptz)
returns setof public.cars
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.cars c
  where c.status = 'published'
    and p_from < p_to
    and not exists (
      select 1
      from public.car_occupancy o
      where o.car_id = c.id
        and o.period && tstzrange(p_from, p_to, '[)')
    )
  order by c.sort, c.created_at;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124120300_rls.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 04 · Row Level Security
--
-- Visitors (anon) can read: categories, makes/models, base models, PUBLISHED cars
-- with their photos and active 3D version, busy periods of published cars and
-- public settings. Nothing else.
-- Staff (authenticated with a profile role admin|manager) manage everything;
-- only admin may delete cars / catalog entries and change settings or roles.
-- Public booking requests are inserted by server code with the service role
-- (which bypasses RLS) after validation, rate limiting and a honeypot check.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Role helpers (security definer → no RLS recursion on profiles) ──────────
create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'manager')
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create function private.is_car_published(p_car_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.cars c where c.id = p_car_id and c.status = 'published');
$$;

grant execute on function private.is_staff(), private.is_admin(), private.is_car_published(uuid)
  to anon, authenticated, service_role;

-- Only an admin may change roles (managers can still edit their own name).
create function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user = 'authenticated'
     and not (select private.is_admin()) then
    raise exception 'Only an admin can change roles' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update of role on public.profiles
  for each row execute function private.guard_profile_role();

-- ── Defense in depth: visitors never write; nobody truncates via the API ────
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;
revoke insert, update, delete on public.car_occupancy from authenticated;   -- triggers only
-- Same for tables created by future migrations (they still need their own RLS policies).
alter default privileges for role postgres in schema public revoke insert, update, delete, truncate on tables from anon;
alter default privileges for role postgres in schema public revoke truncate on tables from authenticated;

-- ── Enable RLS everywhere ───────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.makes               enable row level security;
alter table public.vehicle_models      enable row level security;
alter table public.base_models         enable row level security;
alter table public.cars                enable row level security;
alter table public.car_images          enable row level security;
alter table public.car_model_versions  enable row level security;
alter table public.model_jobs          enable row level security;
alter table public.settings            enable row level security;
alter table public.bookings            enable row level security;
alter table public.blocks              enable row level security;
alter table public.car_occupancy       enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy "profiles: staff read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "profiles: self or admin update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- ── Public catalog: categories, makes, vehicle_models, base_models ──────────
create policy "categories: public read" on public.categories for select to anon, authenticated using (true);
create policy "categories: staff insert" on public.categories for insert to authenticated with check ((select private.is_staff()));
create policy "categories: staff update" on public.categories for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "categories: admin delete" on public.categories for delete to authenticated using ((select private.is_admin()));

create policy "makes: public read" on public.makes for select to anon, authenticated using (true);
create policy "makes: staff insert" on public.makes for insert to authenticated with check ((select private.is_staff()));
create policy "makes: staff update" on public.makes for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "makes: admin delete" on public.makes for delete to authenticated using ((select private.is_admin()));

create policy "vehicle_models: public read" on public.vehicle_models for select to anon, authenticated using (true);
create policy "vehicle_models: staff insert" on public.vehicle_models for insert to authenticated with check ((select private.is_staff()));
create policy "vehicle_models: staff update" on public.vehicle_models for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "vehicle_models: admin delete" on public.vehicle_models for delete to authenticated using ((select private.is_admin()));

create policy "base_models: public read" on public.base_models for select to anon, authenticated using (true);
create policy "base_models: staff insert" on public.base_models for insert to authenticated with check ((select private.is_staff()));
create policy "base_models: staff update" on public.base_models for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "base_models: admin delete" on public.base_models for delete to authenticated using ((select private.is_admin()));

-- ── cars ────────────────────────────────────────────────────────────────────
create policy "cars: public read published" on public.cars
  for select to anon, authenticated
  using (status = 'published' or (select private.is_staff()));
create policy "cars: staff insert" on public.cars for insert to authenticated with check ((select private.is_staff()));
create policy "cars: staff update" on public.cars for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "cars: admin delete" on public.cars for delete to authenticated using ((select private.is_admin()));

-- ── car_images ──────────────────────────────────────────────────────────────
create policy "car_images: public read of published cars" on public.car_images
  for select to anon, authenticated
  using (private.is_car_published(car_id) or (select private.is_staff()));
create policy "car_images: staff insert" on public.car_images for insert to authenticated with check ((select private.is_staff()));
create policy "car_images: staff update" on public.car_images for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "car_images: staff delete" on public.car_images for delete to authenticated using ((select private.is_staff()));

-- ── car_model_versions: visitors see only the ACTIVE version of a published car
create policy "car_model_versions: public read active" on public.car_model_versions
  for select to anon, authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1 from public.cars c
      where c.id = car_model_versions.car_id
        and c.status = 'published'
        and c.active_model_version_id = car_model_versions.id
    )
  );
create policy "car_model_versions: staff insert" on public.car_model_versions for insert to authenticated with check ((select private.is_staff()));
create policy "car_model_versions: staff update" on public.car_model_versions for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "car_model_versions: staff delete" on public.car_model_versions for delete to authenticated using ((select private.is_staff()));

-- ── model_jobs: staff only ──────────────────────────────────────────────────
create policy "model_jobs: staff read" on public.model_jobs for select to authenticated using ((select private.is_staff()));
create policy "model_jobs: staff insert" on public.model_jobs for insert to authenticated with check ((select private.is_staff()));
create policy "model_jobs: staff update" on public.model_jobs for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "model_jobs: admin delete" on public.model_jobs for delete to authenticated using ((select private.is_admin()));

-- ── settings: public keys readable by everyone; only admin writes ───────────
create policy "settings: read public or staff" on public.settings
  for select to anon, authenticated
  using (is_public or (select private.is_staff()));
create policy "settings: admin insert" on public.settings for insert to authenticated with check ((select private.is_admin()));
create policy "settings: admin update" on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "settings: admin delete" on public.settings for delete to authenticated using ((select private.is_admin()));

-- ── bookings: personal data → staff only (no anon access at all) ────────────
create policy "bookings: staff read" on public.bookings for select to authenticated using ((select private.is_staff()));
create policy "bookings: staff insert (phone bookings)" on public.bookings for insert to authenticated with check ((select private.is_staff()));
create policy "bookings: staff update" on public.bookings for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "bookings: admin delete" on public.bookings for delete to authenticated using ((select private.is_admin()));

-- ── blocks: staff only ──────────────────────────────────────────────────────
create policy "blocks: staff read" on public.blocks for select to authenticated using ((select private.is_staff()));
create policy "blocks: staff insert" on public.blocks for insert to authenticated with check ((select private.is_staff()));
create policy "blocks: staff update" on public.blocks for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "blocks: staff delete" on public.blocks for delete to authenticated using ((select private.is_staff()));

-- ── car_occupancy: read-only, published cars for visitors ───────────────────
create policy "car_occupancy: public read of published cars" on public.car_occupancy
  for select to anon, authenticated
  using (private.is_car_published(car_id) or (select private.is_staff()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124120400_storage_realtime.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 05 · Storage buckets & policies, Realtime
--
--   car-images    public   car photos (webp), path: cars/{car_id}/{uuid}.webp
--   models        public   optimized GLB + posters + liveries,
--                          path: cars/{car_id}/{version_id}.glb | base/{id}.glb | liveries/{car_id}.png
--   model-inputs  private  photos sent to 3D providers via short-lived signed URLs,
--                          path: jobs/{job_id}/{angle}.webp
-- Public buckets are served by URL/CDN without policies; writes are staff-only.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('car-images',   'car-images',   true,  10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('models',       'models',       true,  52428800, array['model/gltf-binary', 'application/octet-stream', 'image/webp', 'image/png', 'image/jpeg']),
  ('model-inputs', 'model-inputs', false, 20971520, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media: staff read" on storage.objects
  for select to authenticated
  using (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

create policy "media: staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

create policy "media: staff update" on storage.objects
  for update to authenticated
  using (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()))
  with check (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

create policy "media: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

-- ── Realtime: live 3D job progress and new bookings in the admin panel ──────
-- postgres_changes respects RLS, so only staff receive these events.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.model_jobs, public.bookings;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124140000_personal_use_focus.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 06 · Personal-use focus
--
-- The site now targets rentals of all classes for personal use. The ride-hailing
-- (taxi) offering is postponed, so seed data that talked about taxi work is
-- rewritten. Safe to run more than once; only seed texts are touched (anything
-- the owner has already edited is left alone).
-- ─────────────────────────────────────────────────────────────────────────────

-- Economy category: no more "Taksi" in the name / slug.
update public.categories
set slug           = 'ekonomine',
    name_lt        = 'Ekonominė',
    name_en        = 'Economy',
    description_lt = 'Taupūs ir patogūs automobiliai kasdienai ir kelionėms.',
    description_en = 'Fuel-efficient, comfortable cars for everyday driving and trips.'
where slug = 'ekonomine-taksi';

-- Prius descriptions written for taxi drivers → personal use.
update public.cars
set description_lt = '<p>Patikimas ir taupus Toyota Prius hibridas kasdienėms kelionėms mieste ir už jo ribų. Automatinė pavarų dėžė, erdvus salonas ir mažos degalų sąnaudos — patogu ir ekonomiška.</p><p>Privalomasis draudimas ir techninė priežiūra jau įskaičiuoti į kainą, rida neribojama.</p>',
    description_en = '<p>A reliable, fuel-efficient Toyota Prius hybrid for everyday trips in and out of town. Automatic gearbox, a roomy cabin and low fuel consumption — comfortable and economical.</p><p>Mandatory insurance and maintenance are included in the price, with unlimited mileage.</p>'
where slug like 'toyota-prius-%'
  and description_lt like '%pavežėjimo platformose%';

-- The "ride-hailing livery" spec is no longer shown.
update public.cars
set specs = specs - 'livery'
where specs ->> 'livery' = 'ride_hailing';

-- Booking form no longer asks about ride-hailing work; the column stays for later.
alter table public.bookings alter column platform_driver drop not null;
comment on column public.bookings.platform_driver is
  'Ride-hailing question — not asked while the site focuses on personal use; kept for a future taxi offering.';

-- Result shown in the Supabase SQL Editor after running this file.
select
  (select string_agg(name_lt, ', ' order by sort) from public.categories)                           as categories,
  (select count(*) from public.cars where description_lt like '%pavežėjimo%')                       as cars_with_taxi_text,
  (select count(*) from public.cars where specs ? 'livery')                                          as cars_with_livery,
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'platform_driver') as platform_driver_nullable;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261124150000_booking_rate_limit.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 07 · Rate limit for public forms (booking requests)
--
-- Serverless functions have no shared memory, so the limit lives in Postgres.
-- The server calls `consume_rate_limit(key, max, window)` with the service role
-- before inserting a booking; the key is a salted hash of the visitor's IP —
-- never the raw address. Hits older than one day are purged on every call.
-- Safe to run twice (owners apply it by hand in the SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists private.rate_limit_hits (
  id      bigint generated always as identity primary key,
  key     text not null check (length(key) between 1 and 200),
  hit_at  timestamptz not null default now()
);
comment on table private.rate_limit_hits is 'Rate-limit counters (hashed keys only). Written by public.consume_rate_limit().';
create index if not exists rate_limit_hits_key_idx on private.rate_limit_hits (key, hit_at);
create index if not exists rate_limit_hits_hit_at_idx on private.rate_limit_hits (hit_at);

-- Not exposed through the API (private schema); RLS on with no policies as a second lock.
alter table private.rate_limit_hits enable row level security;

/**
 * Records one hit for `p_key` and returns true while the key has made fewer than
 * `p_max` hits in the last `p_window_seconds`; returns false (and records nothing)
 * once the limit is reached. Concurrent calls for the same key are serialized.
 */
create or replace function public.consume_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_key is null or length(p_key) not between 1 and 200
     or p_max is null or p_max not between 1 and 10000
     or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'consume_rate_limit: invalid arguments' using errcode = 'invalid_parameter_value';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_key, 0));

  delete from private.rate_limit_hits where hit_at < now() - interval '1 day';

  select count(*) into v_hits
  from private.rate_limit_hits
  where key = p_key and hit_at > now() - make_interval(secs => p_window_seconds);

  if v_hits >= p_max then
    return false;
  end if;

  insert into private.rate_limit_hits (key) values (p_key);
  return true;
end;
$$;
comment on function public.consume_rate_limit(text, integer, integer) is 'Server-only (service role) rate limiter for public forms.';

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

select 'Rate limit ready' as status;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261125100000_requests_do_not_block.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 08 · Booking requests do not hold the car (owner's decision)
--
-- A request from the website (status `pending`) is only a request: the dates stay
-- free in the public calendar and other visitors may ask for the same dates. Only
-- a booking CONFIRMED by staff and manual blocks occupy the car. Confirming onto
-- dates that are already taken raises SQLSTATE 23P01 with HINT 'period_unavailable'.
-- Safe to run twice (owners apply it by hand in the SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.sync_booking_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'confirmed' then
    insert into public.car_occupancy (car_id, period, booking_id)
    values (new.car_id, new.period, new.id)
    on conflict (booking_id) do update set car_id = excluded.car_id, period = excluded.period;
  else
    delete from public.car_occupancy where booking_id = new.id;
  end if;
  return new;
exception
  when exclusion_violation then
    raise exception 'Automobilis šiam laikotarpiui jau užimtas (car % is not available for %)', new.car_id, new.period
      using errcode = 'exclusion_violation', hint = 'period_unavailable';
end;
$$;

-- Requests sent before this change stop blocking their dates.
delete from public.car_occupancy o
using public.bookings b
where o.booking_id = b.id
  and b.status <> 'confirmed';

comment on table public.car_occupancy is
  'Confirmed bookings and manual blocks (maintained by triggers). Contains no personal data.';
comment on view public.car_busy_periods is
  'Public availability calendar: confirmed bookings and blocks of published cars, no personal data. Pending requests are not shown.';
comment on table public.bookings is
  'Booking requests (pending) and bookings (confirmed). Only confirmed rows occupy the car. Public inserts only via server code (service role).';

select
  (select count(*) from public.bookings where status = 'pending')   as pending_requests,
  (select count(*) from public.bookings where status = 'confirmed') as confirmed_bookings,
  (select count(*) from public.car_occupancy)                       as occupied_periods;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261125140000_admin_bookings.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 09 · Bookings entered by staff (phone / ad callers)
--
-- `source` tells where a booking came from: the website form or the admin panel.
-- Website requests keep every requirement (email, licence year, consent time);
-- staff may enter a booking with just a name and a phone number.
-- `created_by` = the staff member who entered it (auth.uid(); null for the website).
-- Safe to run twice (owners apply it by hand in the SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists source text not null default 'website',
  add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null;

alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings add constraint bookings_source_check check (source in ('website', 'admin'));

-- Optional for staff-entered bookings only (the existing format checks still apply when filled in).
alter table public.bookings alter column customer_email drop not null;
alter table public.bookings alter column license_year drop not null;
alter table public.bookings alter column terms_accepted_at drop not null;

alter table public.bookings drop constraint if exists bookings_website_fields_required;
alter table public.bookings add constraint bookings_website_fields_required check (
  source <> 'website'
  or (customer_email is not null and license_year is not null and terms_accepted_at is not null)
);

comment on column public.bookings.source is 'website = request from the site form, admin = entered by staff (phone)';
comment on column public.bookings.created_by is 'Staff member who entered the booking (null for website requests)';

select
  (select count(*) from public.bookings where source = 'website') as website_bookings,
  (select count(*) from public.bookings where source = 'admin')   as admin_bookings;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261125160000_car_archive.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 10 · Deleting cars that have booking history
--
-- A car without bookings is deleted for real. A car with past bookings can't be
-- (bookings keep their history and prices), so "delete" archives it instead:
-- `archived_at` is set, the car disappears from the site and the admin lists, and
-- its old bookings still show it. An archived car can never be published.
-- Safe to run twice (owners apply it by hand in the SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.cars add column if not exists archived_at timestamptz;

comment on column public.cars.archived_at is
  'Set when a car with booking history is deleted in the admin: hidden everywhere, kept for old bookings.';

alter table public.cars drop constraint if exists cars_archived_not_published;
alter table public.cars add constraint cars_archived_not_published
  check (archived_at is null or status <> 'published');

select
  (select count(*) from public.cars where archived_at is null)     as active_cars,
  (select count(*) from public.cars where archived_at is not null) as archived_cars;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: supabase/seed.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · seed data
-- Idempotent: safe to run more than once (ON CONFLICT DO NOTHING).
-- Local: applied automatically by `supabase db reset`.
-- Production: run once in the Supabase SQL editor, or `supabase db push --include-seed`.
-- Prices and rules below are defaults/placeholders — the owner edits them in /admin.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Settings ────────────────────────────────────────────────────────────────
insert into public.settings (key, value, is_public, description) values
  ('pricing', '{
     "currency": "EUR",
     "hourly":    {"enabled": true, "price": 6, "min_hours": 3},
     "daily":     {"enabled": true, "price": 18},
     "weekly":    {"enabled": true, "price": 115},
     "long_term": {"enabled": true, "price_per_week": 105, "min_weeks": 4},
     "deposit": 500
   }', true, 'Bendri tarifai (EUR). Kategorijos ir automobiliai gali juos perrašyti.'),
  ('rental_rules', '{
     "min_age": 21,
     "min_license_years": 2,
     "min_rental_days": null,
     "mileage_limit_km_per_day": null
   }', true, 'Bendri reikalavimai vairuotojui ir nuomos sąlygos.'),
  ('contacts', '{
     "phone": "+370 654 37549",
     "whatsapp_url": "https://wa.me/37065437549",
     "telegram_username": "",
     "email": "",
     "address": "Birutės g. 21, Klaipėda, Lietuva"
   }', true, 'Kontaktai, rodomi svetainėje.'),
  ('opening_hours', '[
     {"days": [1, 2, 3, 4, 5], "opens": "09:00", "closes": "18:00"}
   ]', true, 'Darbo laikas (1 = pirmadienis … 7 = sekmadienis).'),
  ('notifications', '{
     "booking_email": null
   }', false, 'Kur siunčiamos naujų rezervacijų užklausos.'),
  ('company', '{
     "legal_name": "MB Baltic Nuoma",
     "company_code": "308190608",
     "vat_code": "",
     "registered_address": "",
     "privacy_email": "balticnuoma@gmail.com"
   }', true, 'Įmonės rekvizitai: poraštė ir teisiniai puslapiai.'),
  ('three_d', '{
     "provider": "meshy",
     "ai_model": "latest",
     "fallback_provider": "tripo",
     "monthly_limit": 20,
     "timeout_minutes": 30,
     "target_triangles": 150000,
     "max_texture_size": 2048
   }', false, '3D generavimo iš nuotraukų nustatymai ir mėnesio limitas.')
on conflict (key) do nothing;

-- ── Categories ──────────────────────────────────────────────────────────────
-- Economy inherits the global tariffs ({}); premium & luxury override them.
insert into public.categories (slug, name_lt, name_en, description_lt, description_en, icon, default_pricing, default_rental_rules, sort) values
  ('ekonomine', 'Ekonominė', 'Economy',
   'Taupūs ir patogūs automobiliai kasdienai ir kelionėms.',
   'Fuel-efficient, comfortable cars for everyday driving and trips.',
   'leaf', '{}', '{}', 10),
  ('premium', 'Premium', 'Premium',
   'Komfortiški verslo klasės automobiliai.',
   'Comfortable business-class cars.',
   'gem',
   '{"hourly": {"enabled": false},
     "daily": {"enabled": true, "price": 69},
     "weekly": {"enabled": true, "price": 420},
     "long_term": {"enabled": true, "price_per_week": 380, "min_weeks": 4},
     "deposit": 1000}',
   '{"min_age": 23, "min_license_years": 3, "mileage_limit_km_per_day": 300}', 20),
  ('prabangi', 'Prabangi', 'Luxury',
   'Prabangos klasės automobiliai ypatingoms progoms.',
   'Luxury cars for special occasions.',
   'crown',
   '{"hourly": {"enabled": false},
     "daily": {"enabled": true, "price": 189},
     "weekly": {"enabled": true, "price": 1150},
     "long_term": {"enabled": false},
     "deposit": 3000}',
   '{"min_age": 25, "min_license_years": 5, "mileage_limit_km_per_day": 250}', 30)
on conflict (slug) do nothing;

-- ── Makes ───────────────────────────────────────────────────────────────────
insert into public.makes (name, slug)
select name, private.slugify(name)
from (values
  ('Toyota'), ('Volkswagen'), ('Škoda'), ('BMW'), ('Mercedes-Benz'), ('Audi'), ('Porsche'),
  ('Tesla'), ('Volvo'), ('Lexus'), ('Kia'), ('Hyundai'), ('Ford'), ('Opel'), ('Peugeot'),
  ('Renault'), ('Citroën'), ('Nissan'), ('Honda'), ('Mazda'), ('Subaru'), ('Mitsubishi'),
  ('Fiat'), ('SEAT'), ('Cupra'), ('Dacia'), ('Land Rover'), ('Jaguar'), ('MINI'),
  ('Bentley'), ('Maserati'), ('Rolls-Royce'), ('Genesis'), ('Polestar'), ('BYD')
) as m(name)
on conflict do nothing;

-- ── Popular models ──────────────────────────────────────────────────────────
insert into public.vehicle_models (make_id, name, slug, body_type)
select mk.id, v.model, private.slugify(v.model), v.body::public.body_type
from (values
  ('Toyota', 'Prius', 'hatchback'), ('Toyota', 'Prius Plus', 'minivan'), ('Toyota', 'Corolla', 'sedan'),
  ('Toyota', 'Camry', 'sedan'), ('Toyota', 'C-HR', 'suv'), ('Toyota', 'RAV4', 'suv'),
  ('Toyota', 'Yaris', 'hatchback'), ('Toyota', 'Auris', 'hatchback'), ('Toyota', 'Land Cruiser', 'suv'),
  ('Volkswagen', 'Golf', 'hatchback'), ('Volkswagen', 'Passat', 'wagon'), ('Volkswagen', 'Touran', 'minivan'),
  ('Volkswagen', 'Tiguan', 'suv'), ('Volkswagen', 'Arteon', 'sedan'), ('Volkswagen', 'ID.4', 'suv'),
  ('Volkswagen', 'Transporter', 'van'),
  ('Škoda', 'Octavia', 'wagon'), ('Škoda', 'Superb', 'sedan'), ('Škoda', 'Fabia', 'hatchback'),
  ('Škoda', 'Kodiaq', 'suv'), ('Škoda', 'Enyaq', 'suv'),
  ('BMW', '3 serija', 'sedan'), ('BMW', '5 serija', 'sedan'), ('BMW', '7 serija', 'sedan'),
  ('BMW', 'X5', 'suv'), ('BMW', 'X7', 'suv'), ('BMW', 'i4', 'sedan'), ('BMW', 'i7', 'sedan'),
  ('Mercedes-Benz', 'C klasė', 'sedan'), ('Mercedes-Benz', 'E klasė', 'sedan'), ('Mercedes-Benz', 'S klasė', 'sedan'),
  ('Mercedes-Benz', 'GLE', 'suv'), ('Mercedes-Benz', 'GLS', 'suv'), ('Mercedes-Benz', 'V klasė', 'minivan'),
  ('Mercedes-Benz', 'EQS', 'sedan'),
  ('Audi', 'A4', 'sedan'), ('Audi', 'A6', 'sedan'), ('Audi', 'A8', 'sedan'), ('Audi', 'Q5', 'suv'),
  ('Audi', 'Q7', 'suv'), ('Audi', 'Q8', 'suv'), ('Audi', 'e-tron GT', 'coupe'),
  ('Porsche', 'Panamera', 'sedan'), ('Porsche', 'Cayenne', 'suv'), ('Porsche', 'Macan', 'suv'),
  ('Porsche', 'Taycan', 'sedan'), ('Porsche', '911', 'coupe'),
  ('Tesla', 'Model 3', 'sedan'), ('Tesla', 'Model Y', 'suv'), ('Tesla', 'Model S', 'sedan'), ('Tesla', 'Model X', 'suv'),
  ('Volvo', 'S60', 'sedan'), ('Volvo', 'S90', 'sedan'), ('Volvo', 'V90', 'wagon'), ('Volvo', 'XC60', 'suv'), ('Volvo', 'XC90', 'suv'),
  ('Lexus', 'ES', 'sedan'), ('Lexus', 'LS', 'sedan'), ('Lexus', 'RX', 'suv'), ('Lexus', 'NX', 'suv'),
  ('Kia', 'Niro', 'suv'), ('Kia', 'Ceed', 'hatchback'), ('Kia', 'Sportage', 'suv'), ('Kia', 'EV6', 'suv'),
  ('Hyundai', 'Ioniq', 'hatchback'), ('Hyundai', 'Ioniq 5', 'suv'), ('Hyundai', 'Tucson', 'suv'), ('Hyundai', 'Kona', 'suv'),
  ('Ford', 'Mondeo', 'sedan'), ('Ford', 'Focus', 'hatchback'), ('Ford', 'Galaxy', 'minivan'),
  ('Opel', 'Insignia', 'sedan'), ('Opel', 'Astra', 'hatchback'),
  ('Renault', 'Mégane', 'hatchback'), ('Peugeot', '508', 'sedan'), ('Citroën', 'C5 X', 'sedan'),
  ('Nissan', 'Leaf', 'hatchback'), ('Honda', 'Civic', 'hatchback'), ('Mazda', '6', 'sedan'),
  ('Land Rover', 'Range Rover', 'suv'), ('Land Rover', 'Defender', 'suv'),
  ('Bentley', 'Continental GT', 'coupe'), ('Maserati', 'Ghibli', 'sedan'), ('Rolls-Royce', 'Ghost', 'sedan'),
  ('Genesis', 'G80', 'sedan'), ('Polestar', '2', 'sedan'), ('BYD', 'Seal', 'sedan')
) as v(make, model, body)
join public.makes mk on mk.name = v.make
on conflict do nothing;

-- ── Fleet: 5 × Toyota Prius 2009 (economy) ──────────────────────────────────
-- 3D: model_source = none — the owner generates models from real photos in /admin.
insert into public.cars (
  slug, category_id, make_id, vehicle_model_id, year, body_type,
  title_lt, title_en, description_lt, description_en,
  specs, features, status, sort, model_source
)
select
  'toyota-prius-' || n,
  (select id from public.categories where slug = 'ekonomine'),
  mk.id,
  vm.id,
  2009,
  'hatchback',
  'Toyota Prius #' || n,
  'Toyota Prius #' || n,
  '<p>Patikimas ir taupus Toyota Prius hibridas kasdienėms kelionėms mieste ir už jo ribų. Automatinė pavarų dėžė, erdvus salonas ir mažos degalų sąnaudos — patogu ir ekonomiška.</p><p>Privalomasis draudimas ir techninė priežiūra jau įskaičiuoti į kainą, rida neribojama.</p>',
  '<p>A reliable, fuel-efficient Toyota Prius hybrid for everyday trips in and out of town. Automatic gearbox, a roomy cabin and low fuel consumption — comfortable and economical.</p><p>Mandatory insurance and maintenance are included in the price, with unlimited mileage.</p>',
  '{
     "fuel": "hybrid",
     "transmission": "automatic",
     "drive": "fwd",
     "engine_l": 1.5,
     "power_hp": 110,
     "acceleration_0_100_s": 10.9,
     "seats": 5,
     "doors": 5,
     "consumption_l_100km": 4.3,
     "trunk_l": 408
   }'::jsonb,
  '[{"key": "climate_control"}, {"key": "automatic_transmission"}, {"key": "hybrid"}]'::jsonb,
  'published',
  n * 10,
  'none'
from generate_series(1, 5) as n
join public.makes mk on mk.slug = 'toyota'
join public.vehicle_models vm on vm.make_id = mk.id and vm.slug = 'prius'
on conflict (slug) do nothing;

-- ── Demo luxury car (draft, no photos) — shows how a luxury card looks ──────
insert into public.cars (
  slug, category_id, make_id, vehicle_model_id, year, body_type,
  title_lt, title_en, description_lt, description_en,
  specs, custom_specs, features, rental_rules, deposit, color, status, sort, model_source
)
select
  'porsche-panamera-demo',
  (select id from public.categories where slug = 'prabangi'),
  mk.id,
  vm.id,
  2025,
  'sedan',
  'Porsche Panamera 4 E-Hybrid',
  'Porsche Panamera 4 E-Hybrid',
  '<p><strong>Demonstracinis įrašas.</strong> Taip atrodys prabangos klasės automobilio kortelė: galingas įkraunamas hibridas, keturios komfortiškos sėdynės ir aukščiausio lygio įranga.</p>',
  '<p><strong>Demo entry.</strong> This is how a luxury-class car card will look: a powerful plug-in hybrid, four comfortable seats and top-tier equipment.</p>',
  '{
     "fuel": "plug_in_hybrid",
     "transmission": "automatic",
     "drive": "awd",
     "power_hp": 470,
     "acceleration_0_100_s": 4.1,
     "seats": 4,
     "doors": 5,
     "range_km": 90,
     "trunk_l": 421
   }'::jsonb,
  '[
     {"label_lt": "Masažinės sėdynės", "label_en": "Massage seats", "value_lt": "Taip", "value_en": "Yes"},
     {"label_lt": "Garso sistema", "label_en": "Sound system", "value_lt": "Bose® Surround", "value_en": "Bose® Surround"}
   ]'::jsonb,
  '[{"key": "climate_control"}, {"key": "navigation"}, {"key": "heated_seats"}, {"key": "ventilated_seats"},
    {"key": "apple_carplay"}, {"key": "panoramic_roof"}, {"key": "adaptive_cruise"}, {"key": "parking_camera"}]'::jsonb,
  '{"min_age": 25, "min_license_years": 5, "min_rental_days": 1, "mileage_limit_km_per_day": 250,
    "allowed_rental_types": ["daily", "weekly"]}'::jsonb,
  3000,
  '#1C1F24',
  'draft',
  1000,
  'none'
from public.makes mk
join public.vehicle_models vm on vm.make_id = mk.id and vm.slug = 'panamera'
where mk.slug = 'porsche'
on conflict (slug) do nothing;

-- ── Summary — shown as the result in the Supabase SQL Editor ───────────────
-- Expected after a fresh install: settings 6, categories 3, makes 35, vehicle_models 87,
-- cars 6, storage_buckets 3, rls_policies 47, storage_policies 4, realtime_tables 2.
select
  case
    when (select count(*) from public.cars) >= 6
     and (select count(*) from public.categories) >= 3
     and (select count(*) from public.settings) >= 6
     and (select count(*) from storage.buckets where id in ('car-images', 'models', 'model-inputs')) = 3
    then 'OK' else 'CHECK'
  end                                                                                     as status,
  (select count(*) from public.settings)                                                  as settings,
  (select count(*) from public.categories)                                                as categories,
  (select count(*) from public.makes)                                                     as makes,
  (select count(*) from public.vehicle_models)                                            as vehicle_models,
  (select count(*) from public.cars)                                                      as cars,
  (select count(*) from storage.buckets where id in ('car-images', 'models', 'model-inputs')) as storage_buckets,
  (select count(*) from pg_policies where schemaname = 'public')                          as rls_policies,
  (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'media:%') as storage_policies,
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public') as realtime_tables;

-- ─────────────────────────────────────────────────────────────────────────────
-- Mark migrations as applied for the Supabase CLI
-- ─────────────────────────────────────────────────────────────────────────────
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261124120000', 'foundation'),
  ('20261124120100', 'core_schema'),
  ('20261124120200', 'bookings'),
  ('20261124120300', 'rls'),
  ('20261124120400', 'storage_realtime'),
  ('20261124140000', 'personal_use_focus'),
  ('20261124150000', 'booking_rate_limit'),
  ('20261125100000', 'requests_do_not_block'),
  ('20261125140000', 'admin_bookings'),
  ('20261125160000', 'car_archive')
on conflict (version) do nothing;

commit;
