-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · seed data
-- Idempotent: safe to run more than once (ON CONFLICT DO NOTHING).
-- Local: applied automatically by `supabase db reset`.
-- Production: run once in the Supabase SQL editor, or `supabase db push --include-seed`.
-- Prices and rules below are defaults/placeholders — the owner edits them in /admin.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Settings ────────────────────────────────────────────────────────────────
insert into public.settings (key, value, is_public, description) values
  ('pricing', '{
     "currency": "EUR",
     "hourly":    {"enabled": true, "price": 6, "min_hours": 3},
     "daily":     {"enabled": true, "price": 18},
     "weekly":    {"enabled": true, "price": 115},
     "long_term": {"enabled": true, "price_per_week": 105, "min_weeks": 4},
     "deposit": 500
   }', true, 'Bendri tarifai (EUR). Kategorijos ir automobiliai gali juos perrašyti.'),
  ('rental_rules', '{
     "min_age": 21,
     "min_license_years": 2,
     "min_rental_days": null,
     "mileage_limit_km_per_day": null
   }', true, 'Bendri reikalavimai vairuotojui ir nuomos sąlygos.'),
  ('contacts', '{
     "phone": "+370 654 37549",
     "whatsapp_url": "https://wa.me/37065437549",
     "telegram_username": "",
     "email": "",
     "address": "Birutės g. 21, Klaipėda, Lietuva"
   }', true, 'Kontaktai, rodomi svetainėje.'),
  ('opening_hours', '[
     {"days": [1, 2, 3, 4, 5], "opens": "09:00", "closes": "18:00"}
   ]', true, 'Darbo laikas (1 = pirmadienis … 7 = sekmadienis).'),
  ('notifications', '{
     "booking_email": null
   }', false, 'Kur siunčiamos naujų rezervacijų užklausos.'),
  ('three_d', '{
     "provider": "meshy",
     "ai_model": "latest",
     "fallback_provider": "tripo",
     "monthly_limit": 20,
     "timeout_minutes": 30,
     "target_triangles": 150000,
     "max_texture_size": 2048
   }', false, '3D generavimo iš nuotraukų nustatymai ir mėnesio limitas.')
on conflict (key) do nothing;

-- ── Categories ──────────────────────────────────────────────────────────────
-- Economy inherits the global tariffs ({}); premium & luxury override them.
insert into public.categories (slug, name_lt, name_en, description_lt, description_en, icon, default_pricing, default_rental_rules, sort) values
  ('ekonomine', 'Ekonominė', 'Economy',
   'Taupūs ir patogūs automobiliai kasdienai ir kelionėms.',
   'Fuel-efficient, comfortable cars for everyday driving and trips.',
   'leaf', '{}', '{}', 10),
  ('premium', 'Premium', 'Premium',
   'Komfortiški verslo klasės automobiliai.',
   'Comfortable business-class cars.',
   'gem',
   '{"hourly": {"enabled": false},
     "daily": {"enabled": true, "price": 69},
     "weekly": {"enabled": true, "price": 420},
     "long_term": {"enabled": true, "price_per_week": 380, "min_weeks": 4},
     "deposit": 1000}',
   '{"min_age": 23, "min_license_years": 3, "mileage_limit_km_per_day": 300}', 20),
  ('prabangi', 'Prabangi', 'Luxury',
   'Prabangos klasės automobiliai ypatingoms progoms.',
   'Luxury cars for special occasions.',
   'crown',
   '{"hourly": {"enabled": false},
     "daily": {"enabled": true, "price": 189},
     "weekly": {"enabled": true, "price": 1150},
     "long_term": {"enabled": false},
     "deposit": 3000}',
   '{"min_age": 25, "min_license_years": 5, "mileage_limit_km_per_day": 250}', 30)
on conflict (slug) do nothing;

-- ── Makes ───────────────────────────────────────────────────────────────────
insert into public.makes (name, slug)
select name, private.slugify(name)
from (values
  ('Toyota'), ('Volkswagen'), ('Škoda'), ('BMW'), ('Mercedes-Benz'), ('Audi'), ('Porsche'),
  ('Tesla'), ('Volvo'), ('Lexus'), ('Kia'), ('Hyundai'), ('Ford'), ('Opel'), ('Peugeot'),
  ('Renault'), ('Citroën'), ('Nissan'), ('Honda'), ('Mazda'), ('Subaru'), ('Mitsubishi'),
  ('Fiat'), ('SEAT'), ('Cupra'), ('Dacia'), ('Land Rover'), ('Jaguar'), ('MINI'),
  ('Bentley'), ('Maserati'), ('Rolls-Royce'), ('Genesis'), ('Polestar'), ('BYD')
) as m(name)
on conflict do nothing;

-- ── Popular models ──────────────────────────────────────────────────────────
insert into public.vehicle_models (make_id, name, slug, body_type)
select mk.id, v.model, private.slugify(v.model), v.body::public.body_type
from (values
  ('Toyota', 'Prius', 'hatchback'), ('Toyota', 'Prius Plus', 'minivan'), ('Toyota', 'Corolla', 'sedan'),
  ('Toyota', 'Camry', 'sedan'), ('Toyota', 'C-HR', 'suv'), ('Toyota', 'RAV4', 'suv'),
  ('Toyota', 'Yaris', 'hatchback'), ('Toyota', 'Auris', 'hatchback'), ('Toyota', 'Land Cruiser', 'suv'),
  ('Volkswagen', 'Golf', 'hatchback'), ('Volkswagen', 'Passat', 'wagon'), ('Volkswagen', 'Touran', 'minivan'),
  ('Volkswagen', 'Tiguan', 'suv'), ('Volkswagen', 'Arteon', 'sedan'), ('Volkswagen', 'ID.4', 'suv'),
  ('Volkswagen', 'Transporter', 'van'),
  ('Škoda', 'Octavia', 'wagon'), ('Škoda', 'Superb', 'sedan'), ('Škoda', 'Fabia', 'hatchback'),
  ('Škoda', 'Kodiaq', 'suv'), ('Škoda', 'Enyaq', 'suv'),
  ('BMW', '3 serija', 'sedan'), ('BMW', '5 serija', 'sedan'), ('BMW', '7 serija', 'sedan'),
  ('BMW', 'X5', 'suv'), ('BMW', 'X7', 'suv'), ('BMW', 'i4', 'sedan'), ('BMW', 'i7', 'sedan'),
  ('Mercedes-Benz', 'C klasė', 'sedan'), ('Mercedes-Benz', 'E klasė', 'sedan'), ('Mercedes-Benz', 'S klasė', 'sedan'),
  ('Mercedes-Benz', 'GLE', 'suv'), ('Mercedes-Benz', 'GLS', 'suv'), ('Mercedes-Benz', 'V klasė', 'minivan'),
  ('Mercedes-Benz', 'EQS', 'sedan'),
  ('Audi', 'A4', 'sedan'), ('Audi', 'A6', 'sedan'), ('Audi', 'A8', 'sedan'), ('Audi', 'Q5', 'suv'),
  ('Audi', 'Q7', 'suv'), ('Audi', 'Q8', 'suv'), ('Audi', 'e-tron GT', 'coupe'),
  ('Porsche', 'Panamera', 'sedan'), ('Porsche', 'Cayenne', 'suv'), ('Porsche', 'Macan', 'suv'),
  ('Porsche', 'Taycan', 'sedan'), ('Porsche', '911', 'coupe'),
  ('Tesla', 'Model 3', 'sedan'), ('Tesla', 'Model Y', 'suv'), ('Tesla', 'Model S', 'sedan'), ('Tesla', 'Model X', 'suv'),
  ('Volvo', 'S60', 'sedan'), ('Volvo', 'S90', 'sedan'), ('Volvo', 'V90', 'wagon'), ('Volvo', 'XC60', 'suv'), ('Volvo', 'XC90', 'suv'),
  ('Lexus', 'ES', 'sedan'), ('Lexus', 'LS', 'sedan'), ('Lexus', 'RX', 'suv'), ('Lexus', 'NX', 'suv'),
  ('Kia', 'Niro', 'suv'), ('Kia', 'Ceed', 'hatchback'), ('Kia', 'Sportage', 'suv'), ('Kia', 'EV6', 'suv'),
  ('Hyundai', 'Ioniq', 'hatchback'), ('Hyundai', 'Ioniq 5', 'suv'), ('Hyundai', 'Tucson', 'suv'), ('Hyundai', 'Kona', 'suv'),
  ('Ford', 'Mondeo', 'sedan'), ('Ford', 'Focus', 'hatchback'), ('Ford', 'Galaxy', 'minivan'),
  ('Opel', 'Insignia', 'sedan'), ('Opel', 'Astra', 'hatchback'),
  ('Renault', 'Mégane', 'hatchback'), ('Peugeot', '508', 'sedan'), ('Citroën', 'C5 X', 'sedan'),
  ('Nissan', 'Leaf', 'hatchback'), ('Honda', 'Civic', 'hatchback'), ('Mazda', '6', 'sedan'),
  ('Land Rover', 'Range Rover', 'suv'), ('Land Rover', 'Defender', 'suv'),
  ('Bentley', 'Continental GT', 'coupe'), ('Maserati', 'Ghibli', 'sedan'), ('Rolls-Royce', 'Ghost', 'sedan'),
  ('Genesis', 'G80', 'sedan'), ('Polestar', '2', 'sedan'), ('BYD', 'Seal', 'sedan')
) as v(make, model, body)
join public.makes mk on mk.name = v.make
on conflict do nothing;

-- ── Fleet: 5 × Toyota Prius 2009 (economy) ──────────────────────────────────
-- 3D: model_source = none — the owner generates models from real photos in /admin.
insert into public.cars (
  slug, category_id, make_id, vehicle_model_id, year, body_type,
  title_lt, title_en, description_lt, description_en,
  specs, features, status, sort, model_source
)
select
  'toyota-prius-' || n,
  (select id from public.categories where slug = 'ekonomine'),
  mk.id,
  vm.id,
  2009,
  'hatchback',
  'Toyota Prius #' || n,
  'Toyota Prius #' || n,
  '<p>Patikimas ir taupus Toyota Prius hibridas kasdienėms kelionėms mieste ir už jo ribų. Automatinė pavarų dėžė, erdvus salonas ir mažos degalų sąnaudos — patogu ir ekonomiška.</p><p>Privalomasis draudimas ir techninė priežiūra jau įskaičiuoti į kainą, rida neribojama.</p>',
  '<p>A reliable, fuel-efficient Toyota Prius hybrid for everyday trips in and out of town. Automatic gearbox, a roomy cabin and low fuel consumption — comfortable and economical.</p><p>Mandatory insurance and maintenance are included in the price, with unlimited mileage.</p>',
  '{
     "fuel": "hybrid",
     "transmission": "automatic",
     "drive": "fwd",
     "engine_l": 1.5,
     "power_hp": 110,
     "acceleration_0_100_s": 10.9,
     "seats": 5,
     "doors": 5,
     "consumption_l_100km": 4.3,
     "trunk_l": 408
   }'::jsonb,
  '[{"key": "climate_control"}, {"key": "automatic_transmission"}, {"key": "hybrid"}]'::jsonb,
  'published',
  n * 10,
  'none'
from generate_series(1, 5) as n
join public.makes mk on mk.slug = 'toyota'
join public.vehicle_models vm on vm.make_id = mk.id and vm.slug = 'prius'
on conflict (slug) do nothing;

-- ── Demo luxury car (draft, no photos) — shows how a luxury card looks ──────
insert into public.cars (
  slug, category_id, make_id, vehicle_model_id, year, body_type,
  title_lt, title_en, description_lt, description_en,
  specs, custom_specs, features, rental_rules, deposit, color, status, sort, model_source
)
select
  'porsche-panamera-demo',
  (select id from public.categories where slug = 'prabangi'),
  mk.id,
  vm.id,
  2025,
  'sedan',
  'Porsche Panamera 4 E-Hybrid',
  'Porsche Panamera 4 E-Hybrid',
  '<p><strong>Demonstracinis įrašas.</strong> Taip atrodys prabangos klasės automobilio kortelė: galingas įkraunamas hibridas, keturios komfortiškos sėdynės ir aukščiausio lygio įranga.</p>',
  '<p><strong>Demo entry.</strong> This is how a luxury-class car card will look: a powerful plug-in hybrid, four comfortable seats and top-tier equipment.</p>',
  '{
     "fuel": "plug_in_hybrid",
     "transmission": "automatic",
     "drive": "awd",
     "power_hp": 470,
     "acceleration_0_100_s": 4.1,
     "seats": 4,
     "doors": 5,
     "range_km": 90,
     "trunk_l": 421
   }'::jsonb,
  '[
     {"label_lt": "Masažinės sėdynės", "label_en": "Massage seats", "value_lt": "Taip", "value_en": "Yes"},
     {"label_lt": "Garso sistema", "label_en": "Sound system", "value_lt": "Bose® Surround", "value_en": "Bose® Surround"}
   ]'::jsonb,
  '[{"key": "climate_control"}, {"key": "navigation"}, {"key": "heated_seats"}, {"key": "ventilated_seats"},
    {"key": "apple_carplay"}, {"key": "panoramic_roof"}, {"key": "adaptive_cruise"}, {"key": "parking_camera"}]'::jsonb,
  '{"min_age": 25, "min_license_years": 5, "min_rental_days": 1, "mileage_limit_km_per_day": 250,
    "allowed_rental_types": ["daily", "weekly"]}'::jsonb,
  3000,
  '#1C1F24',
  'draft',
  1000,
  'none'
from public.makes mk
join public.vehicle_models vm on vm.make_id = mk.id and vm.slug = 'panamera'
where mk.slug = 'porsche'
on conflict (slug) do nothing;

-- ── Summary — shown as the result in the Supabase SQL Editor ───────────────
-- Expected after a fresh install: settings 6, categories 3, makes 35, vehicle_models 87,
-- cars 6, storage_buckets 3, rls_policies 47, storage_policies 4, realtime_tables 2.
select
  case
    when (select count(*) from public.cars) >= 6
     and (select count(*) from public.categories) >= 3
     and (select count(*) from public.settings) >= 6
     and (select count(*) from storage.buckets where id in ('car-images', 'models', 'model-inputs')) = 3
    then 'OK' else 'CHECK'
  end                                                                                     as status,
  (select count(*) from public.settings)                                                  as settings,
  (select count(*) from public.categories)                                                as categories,
  (select count(*) from public.makes)                                                     as makes,
  (select count(*) from public.vehicle_models)                                            as vehicle_models,
  (select count(*) from public.cars)                                                      as cars,
  (select count(*) from storage.buckets where id in ('car-images', 'models', 'model-inputs')) as storage_buckets,
  (select count(*) from pg_policies where schemaname = 'public')                          as rls_policies,
  (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'media:%') as storage_policies,
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public') as realtime_tables;
