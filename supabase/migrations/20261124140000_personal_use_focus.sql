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
