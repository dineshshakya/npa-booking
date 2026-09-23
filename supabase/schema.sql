-- ============================================================================
-- NPA Booking — Supabase schema
-- Paste this ENTIRE file into the Supabase SQL editor and run it once.
-- (Dashboard → SQL Editor → New query → paste → Run)
--
-- What it creates:
--   1. bookings table with format CHECKs + a DB-level no-overlap rule
--      (two bookings can never overlap, even if submitted at the same second)
--   2. Row Level Security: the public website can only INSERT bookings and
--      read booked start times; only signed-in staff can read/delete bookings
--   3. booked_starts() function the website uses to render availability
--   4. Private 'insurance-cards' storage bucket for insurance photos
-- ============================================================================

-- 1) Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";    -- gen_random_uuid()
create extension if not exists "btree_gist";  -- EXCLUDE USING gist

-- 2) Bookings table -----------------------------------------------------------
-- NOTE: CHECK constraints may only use immutable expressions, so the 14-day
-- booking window and the "DOB not in future" rule live in the RLS INSERT
-- policy below (policies allow now()). Everything else is enforced here.
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text not null check (char_length(name) between 2 and 120),
  dob            date not null check (dob >= date '1900-01-01'),
  phone          text not null check (char_length(regexp_replace(phone, '\D', '', 'g')) between 7 and 25),
  email          text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  street         text not null check (char_length(street) between 2 and 200),
  city           text not null check (char_length(city) between 1 and 100),
  state          text not null check (char_length(state) between 1 and 50),
  zip            text not null check (zip ~ '^\d{5}(-\d{4})?$'),
  patient_type   text not null check (patient_type in ('new', 'returning')),
  reason         text not null check (char_length(reason) between 3 and 200),
  notes          text not null default '' check (char_length(notes) <= 2000),
  date           date not null,
  start_at       timestamptz not null,
  end_at         timestamptz not null,  -- always start_at + 60 min, set by trigger
  ins_front_path text not null,
  ins_back_path  text,
  -- No two 60-minute appointments may overlap, at the database level.
  -- (The range is built from plain columns: tstzrange() is immutable, but
  -- timestamptz + interval is not, so the +60 min math lives in the trigger.)
  constraint no_overlap exclude using gist (tstzrange(start_at, end_at) with &&)
);

-- end_at is always exactly 60 minutes after start_at, no matter what the
-- client sends. Triggers may use non-immutable expressions.
create or replace function public.set_booking_end()
returns trigger
language plpgsql
as $$
begin
  NEW.end_at := NEW.start_at + interval '60 minutes';
  return NEW;
end;
$$;

drop trigger if exists trg_set_booking_end on public.bookings;
create trigger trg_set_booking_end
  before insert or update on public.bookings
  for each row execute function public.set_booking_end();

create index if not exists idx_bookings_date on public.bookings (date);

-- 3) Row Level Security -------------------------------------------------------
alter table public.bookings enable row level security;

-- The public website can INSERT bookings. The window (today … today+13,
-- Pacific time) and "DOB not in the future" are enforced here because
-- CHECK constraints cannot call now().
drop policy if exists "anon insert bookings" on public.bookings;
create policy "anon insert bookings"
  on public.bookings for insert to anon
  with check (
    date between (now() at time zone 'America/Los_Angeles')::date
             and (now() at time zone 'America/Los_Angeles')::date + 13
    and dob <= (now() at time zone 'America/Los_Angeles')::date
  );

-- Signed-in staff can read and delete bookings. Nobody can UPDATE.
drop policy if exists "staff read bookings" on public.bookings;
create policy "staff read bookings"
  on public.bookings for select to authenticated
  using (true);

drop policy if exists "staff delete bookings" on public.bookings;
create policy "staff delete bookings"
  on public.bookings for delete to authenticated
  using (true);

-- 4) Availability helper ------------------------------------------------------
-- The website needs booked start times per day, but must NOT see patient
-- data. This SECURITY DEFINER function returns only start_at values.
-- (A plain view would return zero rows to anon because of RLS.)
create or replace function public.booked_starts(p_day date)
returns table (start_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_at
  from public.bookings b
  where (b.start_at at time zone 'America/Los_Angeles')::date = p_day
$$;

revoke all on function public.booked_starts(date) from public;
grant execute on function public.booked_starts(date) to anon, authenticated;

-- Convenience view for staff / debugging (anon gets no rows through RLS).
create or replace view public.slot_usage as
  select (start_at at time zone 'America/Los_Angeles')::date as day, start_at
  from public.bookings;
grant select on public.slot_usage to anon, authenticated;

-- 5) Insurance photo storage --------------------------------------------------
insert into storage.buckets (id, name, public)
values ('insurance-cards', 'insurance-cards', false)
on conflict (id) do nothing;

-- Anyone on the website can upload a photo (needed before the booking row
-- exists). Only signed-in staff can view or delete photos.
drop policy if exists "anon upload insurance cards" on storage.objects;
create policy "anon upload insurance cards"
  on storage.objects for insert to anon
  with check (bucket_id = 'insurance-cards');

drop policy if exists "staff read insurance cards" on storage.objects;
create policy "staff read insurance cards"
  on storage.objects for select to authenticated
  using (bucket_id = 'insurance-cards');

drop policy if exists "staff delete insurance cards" on storage.objects;
create policy "staff delete insurance cards"
  on storage.objects for delete to authenticated
  using (bucket_id = 'insurance-cards');
