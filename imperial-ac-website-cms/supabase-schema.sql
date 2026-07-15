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

insert into public.site_settings (key, value) values
  ('show_standings', true),
  ('show_news', false),
  ('show_gallery', false)
on conflict (key) do nothing;

alter table public.standings enable row level security;
alter table public.news_posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.site_settings enable row level security;

-- Public visitors can read standings, settings, published news and published gallery items.
create policy "public read standings" on public.standings for select to anon, authenticated using (true);
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "public read published news" on public.news_posts for select to anon, authenticated using (published = true or auth.role() = 'authenticated');
create policy "public read published gallery" on public.gallery_items for select to anon, authenticated using (published = true or auth.role() = 'authenticated');

-- Any authenticated dashboard user can manage content. Only create accounts for trusted club administrators.
create policy "admin manage standings" on public.standings for all to authenticated using (true) with check (true);
create policy "admin manage news" on public.news_posts for all to authenticated using (true) with check (true);
create policy "admin manage gallery" on public.gallery_items for all to authenticated using (true) with check (true);
create policy "admin manage settings" on public.site_settings for all to authenticated using (true) with check (true);

grant select on public.standings, public.news_posts, public.gallery_items, public.site_settings to anon;
grant select, insert, update, delete on public.standings, public.news_posts, public.gallery_items, public.site_settings to authenticated;

-- Public storage bucket for website images.
insert into storage.buckets (id, name, public)
values ('club-media', 'club-media', true)
on conflict (id) do update set public = true;

create policy "public read club media" on storage.objects for select to public using (bucket_id = 'club-media');
create policy "authenticated upload club media" on storage.objects for insert to authenticated with check (bucket_id = 'club-media');
create policy "authenticated update club media" on storage.objects for update to authenticated using (bucket_id = 'club-media') with check (bucket_id = 'club-media');
create policy "authenticated delete club media" on storage.objects for delete to authenticated using (bucket_id = 'club-media');
