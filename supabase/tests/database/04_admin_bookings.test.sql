-- Bookings entered by staff: optional customer fields, strict website rows, RLS.
-- Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000d4', 'vadyb@test.lt', 'authenticated', 'authenticated', '{}', '{"full_name": "Vadybininkas"}');

-- ── Website rows stay strict (service role / postgres) ─────────────────────
select throws_ok($$
  insert into public.bookings (car_id, period, rental_type, customer_first_name, customer_last_name, customer_phone,
    total_price, deposit)
  values ((select id from public.cars where slug = 'toyota-prius-1'), tstzrange('2031-01-01', '2031-01-02', '[)'),
    'daily', 'Be', 'Pašto', '+37060000000', 18, 500)
$$, '23514', null, 'a website request without email / licence / consent is rejected');

-- ── Manager enters a phone booking ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000d4", "role": "authenticated"}';

select lives_ok($$
  insert into public.bookings (car_id, period, rental_type, status, source, customer_first_name, customer_last_name,
    customer_phone, total_price, deposit)
  values ((select id from public.cars where slug = 'toyota-prius-1'), tstzrange('2031-01-01', '2031-01-03', '[)'),
    'daily', 'confirmed', 'admin', 'Petras', 'Telefonas', '+37060000001', 36, 500)
$$, 'staff can enter a confirmed booking with only name and phone');

select is((select created_by from public.bookings where customer_last_name = 'Telefonas'),
  '00000000-0000-4000-8000-0000000000d4'::uuid, 'created_by is the staff member');

select throws_ok($$
  insert into public.bookings (car_id, period, rental_type, status, source, customer_first_name, customer_last_name,
    customer_phone, total_price, deposit)
  values ((select id from public.cars where slug = 'toyota-prius-1'), tstzrange('2031-01-02', '2031-01-04', '[)'),
    'daily', 'confirmed', 'admin', 'Ona', 'Kita', '+37060000002', 36, 500)
$$, '23P01', null, 'a confirmed phone booking cannot overlap another confirmed booking');

select throws_ok($$
  insert into public.bookings (car_id, period, rental_type, source, customer_first_name, customer_last_name,
    customer_phone, customer_email, total_price, deposit)
  values ((select id from public.cars where slug = 'toyota-prius-2'), tstzrange('2031-01-02', '2031-01-04', '[)'),
    'daily', 'admin', 'Blogas', 'Paštas', '+37060000003', 'ne-pastas', 36, 500)
$$, '23514', null, 'an email, when given, must still be valid');

select throws_ok($$
  insert into public.bookings (car_id, period, rental_type, source, customer_first_name, customer_last_name,
    customer_phone, total_price, deposit)
  values ((select id from public.cars where slug = 'toyota-prius-2'), tstzrange('2031-01-02', '2031-01-04', '[)'),
    'daily', 'telefonas', 'X', 'Y', '+37060000004', 36, 500)
$$, '23514', null, 'unknown source is rejected');

-- ── Visitors still cannot insert anything ──────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$
  insert into public.bookings (car_id, period, rental_type, source, customer_first_name, customer_last_name,
    customer_phone, total_price, deposit)
  values ((select id from public.cars where slug = 'toyota-prius-3'), tstzrange('2031-01-02', '2031-01-04', '[)'),
    'daily', 'admin', 'Anon', 'User', '+37060000005', 0, 0)
$$, '42501', null, 'anon cannot insert bookings, not even as "admin"');
reset role;

select is((select count(*)::int from public.car_busy_periods where car_id = (select id from public.cars where slug = 'toyota-prius-1')
  and lower(period) = '2031-01-01'::timestamptz), 1, 'the confirmed phone booking shows as busy on the website');

select * from finish();
rollback;
