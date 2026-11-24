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
