-- ============================================================
-- Almaworks Mentor-Startup Platform — Full Database Schema
-- Supabase / PostgreSQL
--
-- Run this in Supabase → SQL Editor
-- Run in order — tables with foreign keys depend on earlier ones
-- Last updated: March 2026
--
-- To apply to a fresh Supabase project:
--   1. Go to Supabase → SQL Editor
--   2. Paste this entire file and run it
--   3. Uncomment and run the SEED sections at the bottom
--   4. Run: supabase gen types typescript --linked > src/db/types.ts
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('mentor', 'startup', 'admin');
create type startup_stage as enum ('idea', 'mvp', 'growth');
create type session_status as enum ('pending', 'confirmed', 'declined');
create type outreach_status as enum ('prospect', 'contacted', 'responded', 'onboarded');


-- ============================================================
-- TABLE: semesters
-- ============================================================

create table semesters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index one_active_semester on semesters (is_active)
  where is_active = true;

alter table semesters enable row level security;

create policy "authenticated users can read semesters"
  on semesters for select
  using (auth.uid() is not null);

create policy "admins can manage semesters"
  on semesters for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- TABLE: profiles
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         user_role,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  semester_id  uuid references semesters(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- On first sign-in via OAuth, create a pending profile.
-- Admin must set role and approve before the user can access the platform.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table profiles enable row level security;

create policy "users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- SECURITY DEFINER function to avoid infinite recursion in profiles RLS
create or replace function public.get_my_role()
returns user_role language sql security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create policy "admins can view all profiles"
  on profiles for select
  using (public.get_my_role() = 'admin');

create policy "admins can update all profiles"
  on profiles for update
  using (public.get_my_role() = 'admin');


-- ============================================================
-- TABLE: mentors
-- ============================================================

create table mentors (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  semester_id       uuid not null references semesters(id),
  full_name         text not null,
  company           text,
  role_title        text,
  bio               text,
  linkedin_url      text,
  website_url       text,
  photo_url         text,
  expertise_tags    text[] not null default '{}',
  mentorship_goals  text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, semester_id)
);

create index mentors_semester_idx on mentors(semester_id);
create index mentors_tags_idx on mentors using gin(expertise_tags);

alter table mentors enable row level security;

create policy "all users can view mentor profiles"
  on mentors for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('mentor', 'startup', 'admin')
  );

create policy "mentors can update own profile"
  on mentors for update
  using (user_id = auth.uid());

create policy "admins can insert mentor profiles"
  on mentors for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admins can delete mentor profiles"
  on mentors for delete
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- TABLE: startups
-- ============================================================

create table startups (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  semester_id          uuid not null references semesters(id),
  name                 text not null,
  description          text,
  industry             text,
  stage                startup_stage,
  logo_url             text,
  website              text,
  founder_name         text,
  founders             jsonb not null default '[]',
  mentor_preferences   text,
  preferred_tags       text[] not null default '{}',
  semester_goals       text[] not null default '{}',
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, semester_id)
);

create index startups_semester_idx on startups(semester_id);
create index startups_tags_idx on startups using gin(preferred_tags);

alter table startups enable row level security;

create policy "startups can view own profile"
  on startups for select
  using (user_id = auth.uid());

create policy "mentors and admins can view all startups"
  on startups for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('mentor', 'admin')
  );

create policy "startups can update own profile"
  on startups for update
  using (user_id = auth.uid());

create policy "admins can insert startup profiles"
  on startups for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admins can delete startup profiles"
  on startups for delete
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- TABLE: session_dates
-- ============================================================

create table session_dates (
  id           uuid primary key default gen_random_uuid(),
  semester_id  uuid not null references semesters(id),
  date         date not null,
  label        text,
  created_at   timestamptz not null default now(),
  unique (semester_id, date)
);

create index session_dates_semester_idx on session_dates(semester_id);

alter table session_dates enable row level security;

create policy "all authenticated users can view session dates"
  on session_dates for select
  using (auth.uid() is not null);

create policy "admins can manage session dates"
  on session_dates for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- TABLE: availability
-- ============================================================

create table availability (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  session_date_id  uuid not null references session_dates(id) on delete cascade,
  is_available     boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (user_id, session_date_id)
);

create index availability_user_idx on availability(user_id);
create index availability_date_idx on availability(session_date_id);

alter table availability enable row level security;

create policy "users can view own availability"
  on availability for select
  using (user_id = auth.uid());

create policy "users can insert own availability"
  on availability for insert
  with check (user_id = auth.uid());

create policy "users can update own availability"
  on availability for update
  using (user_id = auth.uid());

create policy "admins can view all availability"
  on availability for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- TABLE: sessions
-- ============================================================

create table sessions (
  id               uuid primary key default gen_random_uuid(),
  startup_id       uuid not null references startups(id) on delete cascade,
  mentor_id        uuid not null references mentors(id) on delete cascade,
  session_date_id  uuid not null references session_dates(id),
  semester_id      uuid not null references semesters(id),
  topic            text,
  status           session_status not null default 'pending',
  notes            text,
  requested_at     timestamptz not null default now(),
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index sessions_startup_idx on sessions(startup_id);
create index sessions_mentor_idx on sessions(mentor_id);
create index sessions_semester_idx on sessions(semester_id);
create index sessions_status_idx on sessions(status);

alter table sessions enable row level security;

create policy "startups can view own sessions"
  on sessions for select
  using (
    startup_id in (select id from startups where user_id = auth.uid())
  );

create policy "mentors can view own sessions"
  on sessions for select
  using (
    mentor_id in (select id from mentors where user_id = auth.uid())
  );

create policy "startups can insert session requests"
  on sessions for insert
  with check (
    startup_id in (select id from startups where user_id = auth.uid())
  );

create policy "admins can view all sessions"
  on sessions for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admins can insert sessions"
  on sessions for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admins can update sessions"
  on sessions for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admins can delete sessions"
  on sessions for delete
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- TABLE: outreach
-- ============================================================

create table outreach (
  id                  uuid primary key default gen_random_uuid(),
  admin_id            uuid not null references profiles(id),
  semester_id         uuid not null references semesters(id),
  prospect_name       text not null,
  prospect_email      text,
  linkedin_url        text,
  company             text,
  expertise_tags      text[] not null default '{}',
  status              outreach_status not null default 'prospect',
  notes               text,
  last_contacted_at   timestamptz,
  converted_mentor_id uuid references mentors(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index outreach_semester_idx on outreach(semester_id);
create index outreach_status_idx on outreach(status);
create index outreach_tags_idx on outreach using gin(expertise_tags);

alter table outreach enable row level security;

create policy "admins can manage all outreach"
  on outreach for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values ('mentor-photos', 'mentor-photos', true);

create policy "anyone can view mentor photos"
  on storage.objects for select
  using (bucket_id = 'mentor-photos');

create policy "authenticated users can upload mentor photos"
  on storage.objects for insert
  with check (bucket_id = 'mentor-photos' and auth.uid() is not null);

create policy "users can update own mentor photo"
  on storage.objects for update
  using (
    bucket_id = 'mentor-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

insert into storage.buckets (id, name, public)
values ('startup-logos', 'startup-logos', true);

create policy "anyone can view startup logos"
  on storage.objects for select
  using (bucket_id = 'startup-logos');

create policy "authenticated users can upload startup logos"
  on storage.objects for insert
  with check (bucket_id = 'startup-logos' and auth.uid() is not null);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger mentors_updated_at
  before update on mentors
  for each row execute function update_updated_at();

create trigger startups_updated_at
  before update on startups
  for each row execute function update_updated_at();

create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

create trigger outreach_updated_at
  before update on outreach
  for each row execute function update_updated_at();

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();


-- ============================================================
-- SEED: First semester
-- Uncomment and run after schema is applied.
-- ============================================================

-- insert into semesters (name, start_date, end_date, is_active)
-- values ('Spring 2025', '2025-03-27', '2025-04-17', true);


-- ============================================================
-- SEED: Session dates
-- Uncomment after inserting the semester row above.
-- ============================================================

-- insert into session_dates (semester_id, date, label)
-- select
--   s.id,
--   unnest(array[
--     '2025-03-27'::date,
--     '2025-04-03'::date,
--     '2025-04-10'::date,
--     '2025-04-17'::date
--   ]),
--   unnest(array['Week 1', 'Week 2', 'Week 3', 'Week 4'])
-- from semesters s
-- where s.is_active = true;


-- ============================================================
-- VERIFICATION
-- ============================================================

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Expected output:
-- availability
-- mentors
-- outreach
-- profiles
-- session_dates
-- sessions
-- semesters
-- startups