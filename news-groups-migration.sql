-- Imperial AC news groups migration
-- Run this once in Supabase > SQL Editor for an existing installation.

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
using (published = true or auth.role() = 'authenticated');

create policy "admin manage news groups"
on public.news_groups
for all
to authenticated
using (true)
with check (true);

grant select on public.news_groups to anon;
grant select, insert, update, delete on public.news_groups to authenticated;
