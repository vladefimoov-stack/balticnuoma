-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 09 · Bookings entered by staff (phone / ad callers)
--
-- `source` tells where a booking came from: the website form or the admin panel.
-- Website requests keep every requirement (email, licence year, consent time);
-- staff may enter a booking with just a name and a phone number.
-- `created_by` = the staff member who entered it (auth.uid(); null for the website).
-- Safe to run twice (owners apply it by hand in the SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists source text not null default 'website',
  add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null;

alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings add constraint bookings_source_check check (source in ('website', 'admin'));

-- Optional for staff-entered bookings only (the existing format checks still apply when filled in).
alter table public.bookings alter column customer_email drop not null;
alter table public.bookings alter column license_year drop not null;
alter table public.bookings alter column terms_accepted_at drop not null;

alter table public.bookings drop constraint if exists bookings_website_fields_required;
alter table public.bookings add constraint bookings_website_fields_required check (
  source <> 'website'
  or (customer_email is not null and license_year is not null and terms_accepted_at is not null)
);

comment on column public.bookings.source is 'website = request from the site form, admin = entered by staff (phone)';
comment on column public.bookings.created_by is 'Staff member who entered the booking (null for website requests)';

select
  (select count(*) from public.bookings where source = 'website') as website_bookings,
  (select count(*) from public.bookings where source = 'admin')   as admin_bookings;
