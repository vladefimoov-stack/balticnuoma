-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 04 · Row Level Security
--
-- Visitors (anon) can read: categories, makes/models, base models, PUBLISHED cars
-- with their photos and active 3D version, busy periods of published cars and
-- public settings. Nothing else.
-- Staff (authenticated with a profile role admin|manager) manage everything;
-- only admin may delete cars / catalog entries and change settings or roles.
-- Public booking requests are inserted by server code with the service role
-- (which bypasses RLS) after validation, rate limiting and a honeypot check.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Role helpers (security definer → no RLS recursion on profiles) ──────────
create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'manager')
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create function private.is_car_published(p_car_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.cars c where c.id = p_car_id and c.status = 'published');
$$;

grant execute on function private.is_staff(), private.is_admin(), private.is_car_published(uuid)
  to anon, authenticated, service_role;

-- Only an admin may change roles (managers can still edit their own name).
create function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user = 'authenticated'
     and not (select private.is_admin()) then
    raise exception 'Only an admin can change roles' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update of role on public.profiles
  for each row execute function private.guard_profile_role();

-- ── Defense in depth: visitors never write; nobody truncates via the API ────
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;
revoke insert, update, delete on public.car_occupancy from authenticated;   -- triggers only
-- Same for tables created by future migrations (they still need their own RLS policies).
alter default privileges for role postgres in schema public revoke insert, update, delete, truncate on tables from anon;
alter default privileges for role postgres in schema public revoke truncate on tables from authenticated;

-- ── Enable RLS everywhere ───────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.makes               enable row level security;
alter table public.vehicle_models      enable row level security;
alter table public.base_models         enable row level security;
alter table public.cars                enable row level security;
alter table public.car_images          enable row level security;
alter table public.car_model_versions  enable row level security;
alter table public.model_jobs          enable row level security;
alter table public.settings            enable row level security;
alter table public.bookings            enable row level security;
alter table public.blocks              enable row level security;
alter table public.car_occupancy       enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy "profiles: staff read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "profiles: self or admin update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- ── Public catalog: categories, makes, vehicle_models, base_models ──────────
create policy "categories: public read" on public.categories for select to anon, authenticated using (true);
create policy "categories: staff insert" on public.categories for insert to authenticated with check ((select private.is_staff()));
create policy "categories: staff update" on public.categories for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "categories: admin delete" on public.categories for delete to authenticated using ((select private.is_admin()));

create policy "makes: public read" on public.makes for select to anon, authenticated using (true);
create policy "makes: staff insert" on public.makes for insert to authenticated with check ((select private.is_staff()));
create policy "makes: staff update" on public.makes for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "makes: admin delete" on public.makes for delete to authenticated using ((select private.is_admin()));

create policy "vehicle_models: public read" on public.vehicle_models for select to anon, authenticated using (true);
create policy "vehicle_models: staff insert" on public.vehicle_models for insert to authenticated with check ((select private.is_staff()));
create policy "vehicle_models: staff update" on public.vehicle_models for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "vehicle_models: admin delete" on public.vehicle_models for delete to authenticated using ((select private.is_admin()));

create policy "base_models: public read" on public.base_models for select to anon, authenticated using (true);
create policy "base_models: staff insert" on public.base_models for insert to authenticated with check ((select private.is_staff()));
create policy "base_models: staff update" on public.base_models for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "base_models: admin delete" on public.base_models for delete to authenticated using ((select private.is_admin()));

-- ── cars ────────────────────────────────────────────────────────────────────
create policy "cars: public read published" on public.cars
  for select to anon, authenticated
  using (status = 'published' or (select private.is_staff()));
create policy "cars: staff insert" on public.cars for insert to authenticated with check ((select private.is_staff()));
create policy "cars: staff update" on public.cars for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "cars: admin delete" on public.cars for delete to authenticated using ((select private.is_admin()));

-- ── car_images ──────────────────────────────────────────────────────────────
create policy "car_images: public read of published cars" on public.car_images
  for select to anon, authenticated
  using (private.is_car_published(car_id) or (select private.is_staff()));
create policy "car_images: staff insert" on public.car_images for insert to authenticated with check ((select private.is_staff()));
create policy "car_images: staff update" on public.car_images for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "car_images: staff delete" on public.car_images for delete to authenticated using ((select private.is_staff()));

-- ── car_model_versions: visitors see only the ACTIVE version of a published car
create policy "car_model_versions: public read active" on public.car_model_versions
  for select to anon, authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1 from public.cars c
      where c.id = car_model_versions.car_id
        and c.status = 'published'
        and c.active_model_version_id = car_model_versions.id
    )
  );
create policy "car_model_versions: staff insert" on public.car_model_versions for insert to authenticated with check ((select private.is_staff()));
create policy "car_model_versions: staff update" on public.car_model_versions for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "car_model_versions: staff delete" on public.car_model_versions for delete to authenticated using ((select private.is_staff()));

-- ── model_jobs: staff only ──────────────────────────────────────────────────
create policy "model_jobs: staff read" on public.model_jobs for select to authenticated using ((select private.is_staff()));
create policy "model_jobs: staff insert" on public.model_jobs for insert to authenticated with check ((select private.is_staff()));
create policy "model_jobs: staff update" on public.model_jobs for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "model_jobs: admin delete" on public.model_jobs for delete to authenticated using ((select private.is_admin()));

-- ── settings: public keys readable by everyone; only admin writes ───────────
create policy "settings: read public or staff" on public.settings
  for select to anon, authenticated
  using (is_public or (select private.is_staff()));
create policy "settings: admin insert" on public.settings for insert to authenticated with check ((select private.is_admin()));
create policy "settings: admin update" on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "settings: admin delete" on public.settings for delete to authenticated using ((select private.is_admin()));

-- ── bookings: personal data → staff only (no anon access at all) ────────────
create policy "bookings: staff read" on public.bookings for select to authenticated using ((select private.is_staff()));
create policy "bookings: staff insert (phone bookings)" on public.bookings for insert to authenticated with check ((select private.is_staff()));
create policy "bookings: staff update" on public.bookings for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "bookings: admin delete" on public.bookings for delete to authenticated using ((select private.is_admin()));

-- ── blocks: staff only ──────────────────────────────────────────────────────
create policy "blocks: staff read" on public.blocks for select to authenticated using ((select private.is_staff()));
create policy "blocks: staff insert" on public.blocks for insert to authenticated with check ((select private.is_staff()));
create policy "blocks: staff update" on public.blocks for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "blocks: staff delete" on public.blocks for delete to authenticated using ((select private.is_staff()));

-- ── car_occupancy: read-only, published cars for visitors ───────────────────
create policy "car_occupancy: public read of published cars" on public.car_occupancy
  for select to anon, authenticated
  using (private.is_car_published(car_id) or (select private.is_staff()));
