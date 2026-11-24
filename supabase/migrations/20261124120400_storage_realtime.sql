-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 05 · Storage buckets & policies, Realtime
--
--   car-images    public   car photos (webp), path: cars/{car_id}/{uuid}.webp
--   models        public   optimized GLB + posters + liveries,
--                          path: cars/{car_id}/{version_id}.glb | base/{id}.glb | liveries/{car_id}.png
--   model-inputs  private  photos sent to 3D providers via short-lived signed URLs,
--                          path: jobs/{job_id}/{angle}.webp
-- Public buckets are served by URL/CDN without policies; writes are staff-only.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('car-images',   'car-images',   true,  10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('models',       'models',       true,  52428800, array['model/gltf-binary', 'application/octet-stream', 'image/webp', 'image/png', 'image/jpeg']),
  ('model-inputs', 'model-inputs', false, 20971520, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media: staff read" on storage.objects
  for select to authenticated
  using (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

create policy "media: staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

create policy "media: staff update" on storage.objects
  for update to authenticated
  using (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()))
  with check (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

create policy "media: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('car-images', 'models', 'model-inputs') and (select private.is_staff()));

-- ── Realtime: live 3D job progress and new bookings in the admin panel ──────
-- postgres_changes respects RLS, so only staff receive these events.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.model_jobs, public.bookings;
  end if;
end;
$$;
