begin;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),

  full_name text not null,
  nickname text,
  slug text not null unique,

  position text not null,
  shirt_number integer,

  profile_section text not null default 'first_team',
  player_status text not null default 'active',

  photo_url text,
  biography text,
  legacy_title text,

  is_captain boolean not null default false,
  featured boolean not null default false,
  published boolean not null default true,

  joined_year integer,
  departed_year integer,

  appearances integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  clean_sheets integer not null default 0,

  photo_scale integer not null default 100,
  photo_offset_x integer not null default 0,
  photo_offset_y integer not null default 0,

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint players_full_name_not_blank
    check (length(trim(full_name)) > 0),

  constraint players_position_not_blank
    check (length(trim(position)) > 0),

  constraint players_slug_format
    check (
      slug = lower(slug)
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),

  constraint players_profile_section_valid
    check (
      profile_section in (
        'first_team',
        'legacy'
      )
    ),

  constraint players_status_valid
    check (
      player_status in (
        'active',
        'injured',
        'unavailable',
        'suspended',
        'released',
        'retired'
      )
    ),

  constraint players_shirt_number_valid
    check (
      shirt_number is null
      or shirt_number between 1 and 99
    ),

  constraint players_joined_year_valid
    check (
      joined_year is null
      or joined_year between 2023 and 2100
    ),

  constraint players_departed_year_valid
    check (
      departed_year is null
      or departed_year between 2023 and 2100
    ),

  constraint players_year_order_valid
    check (
      joined_year is null
      or departed_year is null
      or departed_year >= joined_year
    ),

  constraint players_appearances_nonnegative
    check (appearances >= 0),

  constraint players_goals_nonnegative
    check (goals >= 0),

  constraint players_assists_nonnegative
    check (assists >= 0),

  constraint players_clean_sheets_nonnegative
    check (clean_sheets >= 0),

  constraint players_display_order_nonnegative
    check (display_order >= 0),

  constraint players_photo_scale_valid
    check (photo_scale between 50 and 250),

  constraint players_photo_offset_x_valid
    check (photo_offset_x between -40 and 40),

  constraint players_photo_offset_y_valid
    check (photo_offset_y between -40 and 40)
);

create unique index if not exists
players_current_shirt_number_unique
on public.players(shirt_number)
where
  profile_section = 'first_team'
  and shirt_number is not null;

create index if not exists
players_public_directory_idx
on public.players(
  published,
  profile_section,
  display_order,
  full_name
);

alter table public.players
enable row level security;

drop policy if exists
"public read published players"
on public.players;

create policy
"public read published players"
on public.players
for select
to anon, authenticated
using (published = true);

drop policy if exists
"admins manage players"
on public.players;

create policy
"admins manage players"
on public.players
for all
to authenticated
using (public.is_club_admin())
with check (public.is_club_admin());

create or replace function
public.set_players_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
players_set_updated_at
on public.players;

create trigger players_set_updated_at
before update
on public.players
for each row
execute function public.set_players_updated_at();

commit;
