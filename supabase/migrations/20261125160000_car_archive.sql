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
