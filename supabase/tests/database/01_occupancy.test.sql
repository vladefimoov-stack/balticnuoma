-- Double-booking protection: bookings ↔ bookings ↔ blocks share one exclusion constraint.
-- Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.book(p_car text, p_from text, p_to text, p_status public.booking_status default 'pending')
returns uuid
language sql
as $$
  insert into public.bookings (
    car_id, period, rental_type, status, customer_first_name, customer_last_name, customer_phone,
    customer_email, license_year, experience_confirmed, platform_driver, total_price, deposit,
    terms_accepted_at, rejection_reason
  ) values (
    (select id from public.cars where slug = p_car),
    tstzrange(p_from::timestamptz, p_to::timestamptz, '[)'),
    'daily', p_status, 'Jonas', 'Jonaitis', '+37060000000', 'jonas@example.lt', 2015, true, 'yes',
    36, 500, now(), case when p_status = 'rejected' then 'test' end
  )
  returning id;
$$;

create function pg_temp.block(p_car text, p_from text, p_to text)
returns uuid
language sql
as $$
  insert into public.blocks (car_id, period, reason)
  values ((select id from public.cars where slug = p_car), tstzrange(p_from::timestamptz, p_to::timestamptz, '[)'), 'TO')
  returning id;
$$;

-- 1. Basic booking
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-01 10:00+02', '2030-12-03 10:00+02') $$,
  'a booking on a free car is accepted');
select is((select count(*)::int from public.car_occupancy), 1, 'pending booking occupies the car');
select ok((select number from public.bookings limit 1) is not null, 'booking gets a human reference number');

-- 2. Overlaps are rejected with SQLSTATE 23P01
select throws_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-02 10:00+02', '2030-12-04 10:00+02') $$,
  '23P01', null, 'overlapping booking on the same car is rejected');
select lives_ok($$ select pg_temp.book('toyota-prius-2', '2030-12-02 10:00+02', '2030-12-04 10:00+02') $$,
  'the same period on another car is fine');
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-03 10:00+02', '2030-12-05 10:00+02') $$,
  'back-to-back booking (end = next start) is allowed');
select throws_ok($$ select pg_temp.block('toyota-prius-1', '2030-12-04 00:00+02', '2030-12-04 12:00+02') $$,
  '23P01', null, 'a manual block cannot overlap a booking');
select lives_ok($$ select pg_temp.block('toyota-prius-1', '2030-12-10 00:00+02', '2030-12-12 00:00+02') $$,
  'a manual block on free dates is accepted');
select throws_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-11 08:00+02', '2030-12-11 12:00+02') $$,
  '23P01', null, 'a booking cannot overlap a manual block');

-- 3. Rejecting / cancelling frees the period
select throws_ok($$ update public.bookings set status = 'rejected'
                   where lower(period) = '2030-12-01 10:00+02' $$,
  '23514', null, 'rejecting requires a reason');
update public.bookings set status = 'rejected', rejection_reason = 'Dokumentai netinka'
  where lower(period) = '2030-12-01 10:00+02';
select ok((select status_changed_at is not null from public.bookings where lower(period) = '2030-12-01 10:00+02'),
  'status change is timestamped');
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-01 12:00+02', '2030-12-02 12:00+02') $$,
  'a rejected booking no longer blocks its dates');

-- 4. Moving a booking onto taken dates fails
select throws_ok($$ update public.bookings set period = tstzrange('2030-12-11 00:00+02', '2030-12-11 06:00+02', '[)')
                   where lower(period) = '2030-12-03 10:00+02' $$,
  '23P01', null, 'changing a period onto a block is rejected');

-- 5. Period validation
select throws_ok($$ select pg_temp.book('toyota-prius-3', '2030-12-01 10:00+02', '2030-12-01 10:00+02') $$,
  '23514', null, 'empty period is rejected');
select throws_ok($$ insert into public.blocks (car_id, period)
                   values ((select id from public.cars where slug = 'toyota-prius-3'), tstzrange('2030-12-01', null)) $$,
  '23514', null, 'open-ended period is rejected');

-- 6. Public read model & availability
select is((select count(*)::int from public.car_busy_periods where car_id = (select id from public.cars where slug = 'toyota-prius-1')),
  3, 'busy periods of Prius #1: two bookings + one block (rejected excluded)');
select is((select count(*)::int from public.available_cars('2030-12-01 12:00+02', '2030-12-02 12:00+02')),
  3, 'available_cars excludes Prius #1 and #2 on busy dates');

-- 7. Deleting a booking releases occupancy
delete from public.bookings where lower(period) = '2030-12-01 12:00+02';
select is((select count(*)::int from public.car_occupancy where car_id = (select id from public.cars where slug = 'toyota-prius-1')),
  2, 'deleted booking is removed from occupancy');

select * from finish();
rollback;
