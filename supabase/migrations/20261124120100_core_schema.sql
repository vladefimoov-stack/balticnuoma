-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 02 · Core schema: staff, catalog (categories, makes, models),
-- cars, photos, 3D (base models, versions, generation jobs), settings
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Staff profiles ───────────────────────────────────────────────────────────
-- Public sign-up is disabled; users are created by the seed script / an admin.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (length(full_name) <= 120),
  role        public.app_role not null default 'manager',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Admin-panel users (2 people). role admin: everything · manager: no car deletes, no settings.';

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- New auth user → profile. Role comes from app_metadata (only settable with the
-- service role), so nobody can make themselves admin from the client.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.app_role
         else 'manager'::public.app_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Categories (Ekonominė / Taksi, Premium, Prabangi, …) ─────────────────────
create table public.categories (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (private.is_valid_slug(slug)),
  name_lt              text not null check (length(btrim(name_lt)) between 1 and 80),
  name_en              text not null check (length(btrim(name_en)) between 1 and 80),
  description_lt       text,
  description_en       text,
  icon                 text check (length(icon) <= 60),
  -- Partial overrides of settings.pricing; {} = inherit the global tariffs.
  default_pricing      jsonb not null default '{}'::jsonb check (jsonb_typeof(default_pricing) = 'object'),
  -- Partial overrides of settings.rental_rules (min age, experience, mileage limit …).
  default_rental_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(default_rental_rules) = 'object'),
  sort                 integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on column public.categories.default_pricing is 'Pricing resolution: settings.pricing ← categories.default_pricing ← cars.price_overrides (later wins).';

create trigger categories_set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();

-- ── Makes & models directory (autocomplete + free input) ────────────────────
create table public.makes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 60),
  slug        text not null unique check (private.is_valid_slug(slug)),
  created_at  timestamptz not null default now()
);
create unique index makes_name_ci_key on public.makes (lower(name));

create table public.vehicle_models (
  id          uuid primary key default gen_random_uuid(),
  make_id     uuid not null references public.makes (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 80),
  slug        text not null check (private.is_valid_slug(slug)),
  body_type   public.body_type,
  created_at  timestamptz not null default now(),
  unique (make_id, slug)
);
create unique index vehicle_models_make_name_ci_key on public.vehicle_models (make_id, lower(name));

-- ── Shared 3D base models (e.g. one Prius model for five identical cars) ────
create table public.base_models (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(btrim(name)) between 1 and 120),
  make               text,
  model              text,
  generation         text,
  glb_path           text not null,                 -- path in the `models` storage bucket
  poster_path        text,
  scale              numeric(8, 4) not null default 1 check (scale > 0),
  camera_json        jsonb not null default '{}'::jsonb check (jsonb_typeof(camera_json) = 'object'),
  -- Regex matched against mesh names that receive body color / livery decal.
  body_mesh_pattern  text not null default '^body',
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger base_models_set_updated_at before update on public.base_models
  for each row execute function private.set_updated_at();

-- ── Cars ─────────────────────────────────────────────────────────────────────
create table public.cars (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique check (private.is_valid_slug(slug)),
  category_id              uuid not null references public.categories (id) on delete restrict,
  make_id                  uuid references public.makes (id) on delete set null,
  vehicle_model_id         uuid references public.vehicle_models (id) on delete set null,
  year                     smallint check (year between 1950 and 2100),
  body_type                public.body_type,
  title_lt                 text not null check (length(btrim(title_lt)) between 1 and 120),
  title_en                 text check (length(title_en) <= 120),           -- null → use title_lt
  description_lt           text,                                            -- sanitized rich text (HTML)
  description_en           text,
  -- Standard specs: fuel, transmission, drive, power_hp, acceleration_0_100_s, seats, doors,
  -- consumption_l_100km, range_km, trunk_l, engine_l, livery … (validated by zod in the app)
  specs                    jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  -- Free "label — value" pairs: [{label_lt, label_en, value_lt, value_en}]
  custom_specs             jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_specs) = 'array'),
  -- Equipment list: [{key, icon?, label_lt?, label_en?}] — known keys are translated in the app
  features                 jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  -- Partial overrides of category/global rules: min_age, min_license_years, min_rental_days,
  -- mileage_limit_km_per_day, allowed_rental_types …
  rental_rules             jsonb not null default '{}'::jsonb check (jsonb_typeof(rental_rules) = 'object'),
  color                    text check (color ~ '^#[0-9A-Fa-f]{6}$'),       -- body color for base_model tint
  plate                    text check (length(plate) <= 16),
  model_source             public.model_source not null default 'none',
  base_model_id            uuid references public.base_models (id) on delete set null,
  active_model_version_id  uuid,                                            -- FK added below
  livery_texture_path      text,                                            -- PNG with alpha, `models` bucket
  price_overrides          jsonb not null default '{}'::jsonb check (jsonb_typeof(price_overrides) = 'object'),
  deposit                  numeric(10, 2) check (deposit >= 0),             -- null → category / global deposit
  status                   public.car_status not null default 'draft',
  sort                     integer not null default 0,
  published_at             timestamptz,
  created_by               uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint cars_base_model_required
    check (model_source <> 'base_model' or base_model_id is not null or status = 'draft')
);
create index cars_listing_idx on public.cars (status, category_id, sort);
create index cars_make_idx on public.cars (make_id);

create trigger cars_set_updated_at before update on public.cars
  for each row execute function private.set_updated_at();

create function private.set_car_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger cars_set_published_at before insert or update of status on public.cars
  for each row execute function private.set_car_published_at();

-- ── Car photos ───────────────────────────────────────────────────────────────
create table public.car_images (
  id             uuid primary key default gen_random_uuid(),
  car_id         uuid not null references public.cars (id) on delete cascade,
  path           text not null unique,              -- path in the `car-images` bucket
  alt_lt         text check (length(alt_lt) <= 200),
  alt_en         text check (length(alt_en) <= 200),
  width          integer check (width > 0),
  height         integer check (height > 0),
  blur_data_url  text check (length(blur_data_url) <= 2000),  -- tiny placeholder for next/image
  sort           integer not null default 0,
  is_cover       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index car_images_car_sort_idx on public.car_images (car_id, sort);
create unique index car_images_one_cover_per_car on public.car_images (car_id) where is_cover;

-- ── 3D model versions (history, rollback) ───────────────────────────────────
create table public.car_model_versions (
  id             uuid primary key default gen_random_uuid(),
  car_id         uuid not null references public.cars (id) on delete cascade,
  source         public.model_source not null check (source in ('generated', 'uploaded')),
  glb_path       text not null,                     -- models/cars/{car_id}/{id}.glb
  poster_path    text,                              -- webp poster shown before the 3D loads
  size_bytes     bigint check (size_bytes >= 0),
  triangles      integer check (triangles >= 0),
  -- {scale, y_offset, rotation_y, camera: {position, target, fov}, env_intensity, initial_view}
  view_settings  jsonb not null default '{}'::jsonb check (jsonb_typeof(view_settings) = 'object'),
  job_id         uuid,                              -- FK added after model_jobs
  approved_at    timestamptz,
  rejected_at    timestamptz,
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (id, car_id)                               -- target of the composite FK from cars
);
create index car_model_versions_car_idx on public.car_model_versions (car_id, created_at desc);

-- The active version must belong to the same car. Deleting the version only
-- clears the pointer (PG15+ column list for SET NULL).
alter table public.cars
  add constraint cars_active_model_version_fk
  foreign key (active_model_version_id, id)
  references public.car_model_versions (id, car_id)
  on delete set null (active_model_version_id);

-- ── 3D generation jobs (Meshy / Tripo / mock) ───────────────────────────────
create table public.model_jobs (
  id                 uuid primary key default gen_random_uuid(),
  car_id             uuid not null references public.cars (id) on delete cascade,
  provider           text not null check (provider ~ '^[a-z0-9_-]{2,32}$'),
  ai_model           text check (length(ai_model) <= 64),       -- from settings; never hard-coded
  provider_task_id   text,
  input_image_ids    uuid[] not null default '{}' check (cardinality(input_image_ids) <= 4),
  -- [{image_id, angle: front|side|back|three_quarter, path}]
  angles             jsonb not null default '[]'::jsonb check (jsonb_typeof(angles) = 'array'),
  options            jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  status             public.model_job_status not null default 'queued',
  progress           smallint not null default 0 check (progress between 0 and 100),
  error              text,
  cost_credits       numeric(10, 2) check (cost_credits >= 0),
  result_version_id  uuid references public.car_model_versions (id) on delete set null,
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  updated_at         timestamptz not null default now()
);
create index model_jobs_car_idx on public.model_jobs (car_id, created_at desc);
create index model_jobs_unfinished_idx on public.model_jobs (created_at) where status in ('queued', 'processing');
create unique index model_jobs_provider_task_key on public.model_jobs (provider, provider_task_id)
  where provider_task_id is not null;

create trigger model_jobs_set_updated_at before update on public.model_jobs
  for each row execute function private.set_updated_at();

alter table public.car_model_versions
  add constraint car_model_versions_job_fk
  foreign key (job_id) references public.model_jobs (id) on delete set null;

-- ── Settings (key → JSON) ────────────────────────────────────────────────────
create table public.settings (
  key          text primary key check (key ~ '^[a-z0-9_]{2,64}$'),
  value        jsonb not null,
  is_public    boolean not null default false,       -- readable by site visitors
  description  text,
  updated_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

create trigger settings_set_updated_at before update on public.settings
  for each row execute function private.set_updated_at();

create function private.set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

create trigger settings_set_updated_by before update on public.settings
  for each row execute function private.set_updated_by();
