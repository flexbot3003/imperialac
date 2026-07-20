-- Imperial AC live-content database for Supabase
-- Run this entire file in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.standings (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 1 check (position > 0),
  team_name text not null,
  played integer not null default 0 check (played >= 0),
  won integer not null default 0 check (won >= 0),
  drawn integer not null default 0 check (drawn >= 0),
  lost integer not null default 0 check (lost >= 0),
  goals_for integer not null default 0 check (goals_for >= 0),
  goals_against integer not null default 0 check (goals_against >= 0),
  goal_difference integer not null default 0,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  competition text not null default 'MPL',
  match_date date,
  kickoff_time time,
  home_team text not null,
  away_team text not null,
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  venue text,
  status text not null default 'upcoming' check (status in ('upcoming','result','postponed','cancelled')),
  notes text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Club News',
  excerpt text,
  body text,
  image_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text not null default 'Club',
  image_url text not null,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.standings (position, team_name)
select 1, 'Imperial AC'
where not exists (select 1 from public.standings);

insert into public.site_settings (key, value)
values ('show_standings', true), ('show_news', false), ('show_gallery', false)
on conflict (key) do nothing;

alter table public.standings enable row level security;
alter table public.fixtures enable row level security;
alter table public.news_posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.site_settings enable row level security;

-- Drop and recreate policies safely when reinstalling.
drop policy if exists "public read standings" on public.standings;
drop policy if exists "public read fixtures" on public.fixtures;
drop policy if exists "public read settings" on public.site_settings;
drop policy if exists "public read published news" on public.news_posts;
drop policy if exists "public read published gallery" on public.gallery_items;
drop policy if exists "admin manage standings" on public.standings;
drop policy if exists "admin manage fixtures" on public.fixtures;
drop policy if exists "admin manage news" on public.news_posts;
drop policy if exists "admin manage gallery" on public.gallery_items;
drop policy if exists "admin manage settings" on public.site_settings;

create policy "public read standings" on public.standings for select to anon, authenticated using (true);
create policy "public read fixtures" on public.fixtures for select to anon, authenticated using (published = true);
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "public read published news" on public.news_posts for select to anon, authenticated using (published = true);
create policy "public read published gallery" on public.gallery_items for select to anon, authenticated using (published = true);

-- This matches the original repo's trusted-admin model.
-- Only create Supabase Auth accounts for trusted club administrators.
create policy "admin manage standings" on public.standings for all to authenticated using (true) with check (true);
create policy "admin manage fixtures" on public.fixtures for all to authenticated using (true) with check (true);
create policy "admin manage news" on public.news_posts for all to authenticated using (true) with check (true);
create policy "admin manage gallery" on public.gallery_items for all to authenticated using (true) with check (true);
create policy "admin manage settings" on public.site_settings for all to authenticated using (true) with check (true);

grant select on public.standings, public.fixtures, public.news_posts, public.gallery_items, public.site_settings to anon;
grant select, insert, update, delete on public.standings, public.fixtures, public.news_posts, public.gallery_items, public.site_settings to authenticated;

insert into storage.buckets (id, name, public)
values ('club-media', 'club-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read club media" on storage.objects;
drop policy if exists "authenticated upload club media" on storage.objects;
drop policy if exists "authenticated update club media" on storage.objects;
drop policy if exists "authenticated delete club media" on storage.objects;

create policy "public read club media" on storage.objects for select to public using (bucket_id = 'club-media');
create policy "authenticated upload club media" on storage.objects for insert to authenticated with check (bucket_id = 'club-media');
create policy "authenticated update club media" on storage.objects for update to authenticated using (bucket_id = 'club-media') with check (bucket_id = 'club-media');
create policy "authenticated delete club media" on storage.objects for delete to authenticated using (bucket_id = 'club-media');


-- News grouping and category management

create extension if not exists pgcrypto;

create table if not exists public.news_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_groups_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.news_posts
  add column if not exists group_id uuid;

do $$
begin
  alter table public.news_posts
    add constraint news_posts_group_id_fkey
    foreign key (group_id)
    references public.news_groups(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists news_posts_group_id_idx
  on public.news_posts(group_id);

create index if not exists news_groups_public_order_idx
  on public.news_groups(published, display_order, name);

insert into public.news_groups (name, slug, description, display_order, published)
values
  ('Club News', 'club-news', 'General updates from Imperial Athletic Club.', 10, true),
  ('Signings', 'signings', 'New players joining the Imperial AC journey.', 20, true),
  ('Birthdays', 'birthdays', 'Birthday messages and player celebrations.', 30, true),
  ('Match Reports', 'match-reports', 'Reports, results and stories from matchday.', 40, true),
  ('Player Profiles', 'player-profiles', 'Meet the players representing Imperial AC.', 50, true),
  ('Announcements', 'announcements', 'Official club notices and important updates.', 60, true)
on conflict (slug) do nothing;

-- Convert any existing free-text categories into reusable groups.
insert into public.news_groups (name, slug, description, display_order, published)
select distinct
  trim(category),
  trim(both '-' from regexp_replace(lower(trim(category)), '[^a-z0-9]+', '-', 'g')),
  'Imported from an existing news category.',
  500,
  true
from public.news_posts
where category is not null
  and trim(category) <> ''
  and trim(both '-' from regexp_replace(lower(trim(category)), '[^a-z0-9]+', '-', 'g')) <> ''
on conflict (slug) do nothing;

-- Link existing stories to a group with the same category name.
update public.news_posts post
set group_id = news_group.id
from public.news_groups news_group
where post.group_id is null
  and lower(trim(post.category)) = lower(trim(news_group.name));

alter table public.news_groups enable row level security;

drop policy if exists "public read published news groups" on public.news_groups;
drop policy if exists "admin manage news groups" on public.news_groups;

create policy "public read published news groups"
on public.news_groups
for select
to anon, authenticated
using (published = true);

create policy "admin manage news groups"
on public.news_groups
for all
to authenticated
using (public.is_club_admin())
with check (public.is_club_admin());

grant select on public.news_groups to anon;
grant select, insert, update, delete on public.news_groups to authenticated;
