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
