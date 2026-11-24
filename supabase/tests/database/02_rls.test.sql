-- Row Level Security: what visitors, managers and admins can see and change.
-- Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ── Fixtures (as postgres) ──────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@test.lt',   'authenticated', 'authenticated', '{"role": "admin"}', '{"full_name": "Admin"}'),
  ('00000000-0000-4000-8000-0000000000b2', 'manager@test.lt', 'authenticated', 'authenticated', '{}',                '{"full_name": "Manager"}'),
  ('00000000-0000-4000-8000-0000000000c3', 'sneaky@test.lt',  'authenticated', 'authenticated', '{}',                '{}');
-- A logged-in user without a staff role (profile row removed) must behave like a visitor.
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000c3';

insert into public.bookings (car_id, period, rental_type, customer_first_name, customer_last_name, customer_phone,
  customer_email, license_year, experience_confirmed, platform_driver, total_price, deposit, terms_accepted_at)
values ((select id from public.cars where slug = 'toyota-prius-1'),
  tstzrange('2030-12-01 10:00+02', '2030-12-03 10:00+02', '[)'), 'daily', 'Ona', 'Onaitė', '+37061111111',
  'ona@example.lt', 2018, true, 'yes', 36, 500, now());
insert into public.blocks (car_id, period, reason)
values ((select id from public.cars where slug = 'porsche-panamera-demo'),
  tstzrange('2030-12-01', '2030-12-05', '[)'), 'Demo');

select is((select role::text from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'), 'admin',
  'profile is created on sign-up with role from app_metadata');
select is((select role::text from public.profiles where id = '00000000-0000-4000-8000-0000000000b2'), 'manager',
  'default staff role is manager');

-- ── Visitor (anon) ──────────────────────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.cars), 5, 'anon sees only the 5 published cars');
select is((select count(*)::int from public.cars where slug = 'porsche-panamera-demo'), 0, 'anon cannot see drafts');
select is((select count(*)::int from public.categories), 3, 'anon reads categories');
select ok((select count(*) from public.vehicle_models) > 50, 'anon reads the makes/models directory');
select is((select count(*)::int from public.bookings), 0, 'anon cannot read bookings');
select is((select count(*)::int from public.blocks), 0, 'anon cannot read blocks');
select is((select count(*)::int from public.profiles), 0, 'anon cannot read staff profiles');
select is((select count(*)::int from public.model_jobs), 0, 'anon cannot read 3D jobs');
select is((select count(*)::int from public.settings), 4, 'anon reads only public settings');
select is((select count(*)::int from public.settings where key in ('notifications', 'three_d')), 0,
  'private settings stay hidden');
select is((select count(*)::int from public.car_busy_periods), 1,
  'anon sees busy periods of published cars only (draft car block hidden)');
select is((select array_agg(column_name::text order by column_name) from information_schema.columns
           where table_schema = 'public' and table_name = 'car_busy_periods'),
  array['car_id', 'ends_at', 'period', 'starts_at'], 'busy periods expose no personal data');
select throws_ok($$ insert into public.bookings (car_id, period, rental_type, customer_first_name, customer_last_name,
    customer_phone, customer_email, license_year, platform_driver, total_price, deposit, terms_accepted_at)
  values ((select id from public.cars limit 1), tstzrange('2031-01-01', '2031-01-02', '[)'), 'daily', 'X', 'Y',
    '+37060000000', 'x@y.lt', 2010, 'no', 1, 1, now()) $$,
  '42501', null, 'anon cannot insert bookings directly (only server code can)');
select throws_ok($$ update public.cars set title_lt = 'Hacked' $$, '42501', null, 'anon cannot update cars');

-- ── Authenticated user without a staff role ─────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}';
select is((select count(*)::int from public.bookings), 0, 'non-staff user cannot read bookings');
select is_empty($$ update public.cars set title_lt = 'Hacked' returning id $$, 'non-staff user cannot edit cars');

-- ── Manager ─────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}';
select is((select count(*)::int from public.cars), 6, 'manager sees drafts too');
select is((select count(*)::int from public.bookings), 1, 'manager reads bookings');
select isnt_empty($$ update public.cars set title_en = 'Toyota Prius No. 1' where slug = 'toyota-prius-1' returning id $$,
  'manager can edit cars');
select isnt_empty($$ update public.bookings set status = 'confirmed' returning id $$, 'manager can confirm bookings');
select is_empty($$ delete from public.cars where slug = 'porsche-panamera-demo' returning id $$,
  'manager cannot delete cars');
select is_empty($$ update public.settings set value = '{}' where key = 'pricing' returning key $$,
  'manager cannot change settings');
select is((select count(*)::int from public.settings), 6, 'manager reads all settings');
select throws_ok($$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000b2' $$,
  '42501', 'Only an admin can change roles', 'manager cannot promote themselves');
select isnt_empty($$ update public.profiles set full_name = 'Vadybininkas' where id = '00000000-0000-4000-8000-0000000000b2' returning id $$,
  'manager can edit their own name');

-- ── Admin ───────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select isnt_empty($$ update public.settings set value = value where key = 'pricing' returning key $$,
  'admin can change settings');
select isnt_empty($$ delete from public.cars where slug = 'porsche-panamera-demo' returning id $$,
  'admin can delete a car without bookings');
select throws_ok($$ delete from public.cars where slug = 'toyota-prius-1' $$, '23503', null,
  'a car with bookings cannot be deleted (history is kept)');

reset role;
select * from finish();
rollback;
