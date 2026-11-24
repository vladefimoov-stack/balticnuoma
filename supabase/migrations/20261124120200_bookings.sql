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
