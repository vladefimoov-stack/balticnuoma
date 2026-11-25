-- Deleting cars: history is protected, archived cars are hidden and can't be published.
-- Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.bookings (car_id, period, rental_type, status, customer_first_name, customer_last_name,
  customer_phone, customer_email, license_year, experience_confirmed, total_price, deposit, terms_accepted_at)
values ((select id from public.cars where slug = 'toyota-prius-5'), tstzrange('2020-01-01', '2020-01-03', '[)'),
  'daily', 'confirmed', 'Sena', 'Rezervacija', '+37060000000', 'sena@example.lt', 2010, true, 36, 500, now());

select throws_ok($$ delete from public.cars where slug = 'toyota-prius-5' $$, '23503', null,
  'a car with bookings cannot be hard-deleted (history is kept)');

select throws_ok($$ update public.cars set archived_at = now() where slug = 'toyota-prius-5' $$, '23514', null,
  'a published car cannot be archived without hiding it');

select lives_ok($$ update public.cars set archived_at = now(), status = 'hidden' where slug = 'toyota-prius-5' $$,
  'archiving = hidden + archived_at');

select throws_ok($$ update public.cars set status = 'published' where slug = 'toyota-prius-5' $$, '23514', null,
  'an archived car cannot be published');

select is((select count(*)::int from public.bookings where car_id = (select id from public.cars where slug = 'toyota-prius-5')),
  1, 'its bookings are kept');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select count(*)::int from public.cars where slug = 'toyota-prius-5'), 0, 'visitors no longer see the archived car');
reset role;

select * from finish();
rollback;
