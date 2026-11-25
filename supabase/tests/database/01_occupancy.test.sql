-- Double-booking protection. Requests (pending) don't hold the car; confirmed bookings and
-- manual blocks share one exclusion constraint, so two of them can never overlap.
-- Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

create function pg_temp.book(p_car text, p_from text, p_to text, p_status public.booking_status default 'pending')
returns uuid
language sql
as $$
  insert into public.bookings (
    car_id, period, rental_type, status, customer_first_name, customer_last_name, customer_phone,
    customer_email, license_year, experience_confirmed, total_price, deposit,
    terms_accepted_at, rejection_reason
  ) values (
    (select id from public.cars where slug = p_car),
    tstzrange(p_from::timestamptz, p_to::timestamptz, '[)'),
    'daily', p_status, 'Jonas', 'Jonaitis', '+37060000000', 'jonas@example.lt', 2015, true,
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

create function pg_temp.car(p_slug text)
returns uuid
language sql
as $$
  select id from public.cars where slug = p_slug;
$$;

create function pg_temp.occupied(p_car text)
returns int
language sql
as $$
  select count(*)::int from public.car_occupancy where car_id = (select id from public.cars where slug = p_car);
$$;

-- 1. Requests don't hold the car
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-01 00:00+02', '2030-12-04 00:00+02') $$,
  'a request is stored');
select is(pg_temp.occupied('toyota-prius-1'), 0, 'a pending request does not occupy the car');
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-02 00:00+02', '2030-12-04 00:00+02') $$,
  'another request for overlapping dates is accepted');
select ok((select number from public.bookings order by number limit 1) is not null, 'requests get a reference number');

-- 2. Confirming occupies; a second overlapping confirmation is refused
select lives_ok($$ update public.bookings set status = 'confirmed' where car_id = pg_temp.car('toyota-prius-1') and lower(period) = '2030-12-01 00:00+02' $$,
  'staff confirm the first request');
select is(pg_temp.occupied('toyota-prius-1'), 1, 'the confirmed booking occupies the car');
select throws_ok($$ update public.bookings set status = 'confirmed' where lower(period) = '2030-12-02 00:00+02' $$,
  '23P01', null, 'confirming an overlapping request is refused');
select is((select status::text from public.bookings where lower(period) = '2030-12-02 00:00+02'), 'pending',
  'the refused request stays pending');
select throws_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-03 00:00+02', '2030-12-06 00:00+02', 'confirmed') $$,
  '23P01', null, 'a phone booking entered as confirmed cannot overlap either');
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-04 00:00+02', '2030-12-06 00:00+02', 'confirmed') $$,
  'back-to-back confirmed booking (end = next start) is allowed');
select lives_ok($$ select pg_temp.book('toyota-prius-2', '2030-12-01 00:00+02', '2030-12-04 00:00+02', 'confirmed') $$,
  'the same dates on another car are fine');

-- 3. Manual blocks
select throws_ok($$ select pg_temp.block('toyota-prius-1', '2030-12-03 00:00+02', '2030-12-03 12:00+02') $$,
  '23P01', null, 'a manual block cannot overlap a confirmed booking');
select lives_ok($$ select pg_temp.block('toyota-prius-1', '2030-12-10 00:00+02', '2030-12-12 00:00+02') $$,
  'a manual block on free dates is accepted');
select lives_ok($$ select pg_temp.book('toyota-prius-1', '2030-12-11 08:00+02', '2030-12-11 12:00+02') $$,
  'a request for blocked dates can still be stored (the site refuses it earlier)');
select throws_ok($$ update public.bookings set status = 'confirmed' where lower(period) = '2030-12-11 08:00+02' $$,
  '23P01', null, 'but it cannot be confirmed onto a block');

-- 4. Rejecting / cancelling frees the period
select throws_ok($$ update public.bookings set status = 'rejected' where car_id = pg_temp.car('toyota-prius-1') and lower(period) = '2030-12-01 00:00+02' $$,
  '23514', null, 'rejecting requires a reason');
update public.bookings set status = 'cancelled' where car_id = pg_temp.car('toyota-prius-1') and lower(period) = '2030-12-01 00:00+02';
select ok((select status_changed_at is not null from public.bookings where car_id = pg_temp.car('toyota-prius-1') and lower(period) = '2030-12-01 00:00+02'),
  'status change is timestamped');
select lives_ok($$ update public.bookings set status = 'confirmed' where lower(period) = '2030-12-02 00:00+02' $$,
  'after a cancellation the overlapping request can be confirmed');

-- 5. Period validation
select throws_ok($$ select pg_temp.book('toyota-prius-3', '2030-12-01 10:00+02', '2030-12-01 10:00+02') $$,
  '23514', null, 'empty period is rejected');
select throws_ok($$ insert into public.blocks (car_id, period)
                   values ((select id from public.cars where slug = 'toyota-prius-3'), tstzrange('2030-12-01', null)) $$,
  '23514', null, 'open-ended period is rejected');

-- 6. Public read model & availability: confirmed bookings + blocks only
select is((select count(*)::int from public.car_busy_periods where car_id = (select id from public.cars where slug = 'toyota-prius-1')),
  3, 'busy periods of Prius #1: two confirmed bookings + one block (requests excluded)');
select is((select count(*)::int from public.available_cars('2030-12-02 12:00+02', '2030-12-03 12:00+02')),
  3, 'available_cars excludes Prius #1 and #2 (confirmed) but not cars with requests only');

select * from finish();
rollback;
