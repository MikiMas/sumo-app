-- SUMO Supermotard - Schema inicial (Supabase/Postgres)
-- Ejecutar en SQL Editor de Supabase.

create extension if not exists pgcrypto;
create extension if not exists postgis;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'route_difficulty') then
    create type public.route_difficulty as enum ('easy', 'medium', 'hard');
  end if;

  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type public.session_status as enum ('active', 'completed', 'cancelled');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) >= 3),
  display_name text,
  avatar_url text,
  home_city text,
  bio text,
  default_share_live_location boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  brand text not null,
  model text not null,
  year int check (year between 1980 and (extract(year from now())::int + 1)),
  nickname text,
  displacement_cc int check (displacement_cc is null or displacement_cc > 0),
  plate text,
  photo_url text,
  notes text,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bike_mods (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  city text,
  difficulty public.route_difficulty not null default 'medium',
  distance_km numeric(6, 2),
  estimated_minutes int,
  start_lat double precision not null check (start_lat between -90 and 90),
  start_lng double precision not null check (start_lng between -180 and 180),
  start_point geography(Point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(start_lng, start_lat), 4326)::geography
  ) stored,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.route_points (
  id bigserial primary key,
  route_id uuid not null references public.routes(id) on delete cascade,
  point_order int not null check (point_order >= 0),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  point geography(Point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) stored,
  created_at timestamptz not null default timezone('utc', now()),
  unique(route_id, point_order)
);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  city text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  point geography(Point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) stored,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.route_sessions (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.session_status not null default 'active',
  is_location_shared boolean not null default true,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  last_lat double precision check (last_lat is null or last_lat between -90 and 90),
  last_lng double precision check (last_lng is null or last_lng between -180 and 180),
  last_point geography(Point, 4326) generated always as (
    case
      when last_lat is null or last_lng is null then null
      else ST_SetSRID(ST_MakePoint(last_lng, last_lat), 4326)::geography
    end
  ) stored,
  last_speed_mps double precision,
  last_heading_deg double precision,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.session_locations (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.route_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  point geography(Point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) stored,
  speed_mps double precision,
  heading_deg double precision,
  accuracy_m double precision,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists bikes_owner_idx on public.bikes(owner_id);
create index if not exists bike_mods_bike_idx on public.bike_mods(bike_id);
create index if not exists routes_creator_idx on public.routes(created_by);
create index if not exists routes_start_point_idx on public.routes using gist(start_point);
create index if not exists route_points_route_order_idx on public.route_points(route_id, point_order);
create index if not exists spots_point_idx on public.spots using gist(point);
create index if not exists route_sessions_route_status_idx on public.route_sessions(route_id, status, last_seen_at desc);
create index if not exists route_sessions_user_status_idx on public.route_sessions(user_id, status);
create index if not exists route_sessions_last_point_idx on public.route_sessions using gist(last_point);
create index if not exists session_locations_session_time_idx on public.session_locations(session_id, captured_at desc);
create index if not exists session_locations_route_time_idx on public.session_locations(route_id, captured_at desc);
create index if not exists session_locations_point_idx on public.session_locations using gist(point);

create unique index if not exists route_sessions_one_active_per_user_route_idx
on public.route_sessions(route_id, user_id)
where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_bikes_updated_at on public.bikes;
create trigger set_bikes_updated_at
before update on public.bikes
for each row execute function public.set_updated_at();

drop trigger if exists set_routes_updated_at on public.routes;
create trigger set_routes_updated_at
before update on public.routes
for each row execute function public.set_updated_at();

drop trigger if exists set_spots_updated_at on public.spots;
create trigger set_spots_updated_at
before update on public.spots
for each row execute function public.set_updated_at();

drop trigger if exists set_route_sessions_updated_at on public.route_sessions;
create trigger set_route_sessions_updated_at
before update on public.route_sessions
for each row execute function public.set_updated_at();

create or replace function public.handle_session_location_insert()
returns trigger
language plpgsql
as $$
declare
  v_user_id uuid;
  v_route_id uuid;
begin
  select rs.user_id, rs.route_id
  into v_user_id, v_route_id
  from public.route_sessions rs
  where rs.id = new.session_id and rs.status = 'active';

  if v_user_id is null then
    raise exception 'session_id invalida o no activa';
  end if;

  if auth.uid() is distinct from v_user_id then
    raise exception 'no permitido en sesion de otro usuario';
  end if;

  new.user_id := v_user_id;
  new.route_id := v_route_id;

  update public.route_sessions
  set
    last_lat = new.lat,
    last_lng = new.lng,
    last_speed_mps = new.speed_mps,
    last_heading_deg = new.heading_deg,
    last_seen_at = coalesce(new.captured_at, timezone('utc', now()))
  where id = new.session_id;

  return new;
end;
$$;

drop trigger if exists fill_session_location_data on public.session_locations;
create trigger fill_session_location_data
before insert on public.session_locations
for each row execute function public.handle_session_location_insert();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username :=
    coalesce(
      nullif(regexp_replace(lower(new.raw_user_meta_data ->> 'username'), '[^a-z0-9_]+', '', 'g'), ''),
      regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]+', '', 'g')
    );

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(base_username || '_' || replace(left(new.id::text, 6), '-', ''), 32),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_point_near_route_start(
  p_route_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 500
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.routes r
    where r.id = p_route_id
      and ST_DWithin(
        r.start_point,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_m
      )
  );
$$;

create or replace function public.active_route_riders(p_route_id uuid)
returns table (
  session_id uuid,
  user_id uuid,
  username text,
  last_lat double precision,
  last_lng double precision,
  last_seen_at timestamptz
)
language sql
stable
as $$
  select
    rs.id as session_id,
    rs.user_id,
    p.username,
    rs.last_lat,
    rs.last_lng,
    rs.last_seen_at
  from public.route_sessions rs
  join public.profiles p on p.id = rs.user_id
  where rs.route_id = p_route_id
    and rs.status = 'active'
    and rs.is_location_shared = true;
$$;

alter table public.profiles enable row level security;
alter table public.bikes enable row level security;
alter table public.bike_mods enable row level security;
alter table public.routes enable row level security;
alter table public.route_points enable row level security;
alter table public.spots enable row level security;
alter table public.route_sessions enable row level security;
alter table public.session_locations enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select
to authenticated
using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists bikes_select on public.bikes;
create policy bikes_select
on public.bikes
for select
to authenticated
using (is_public = true or owner_id = auth.uid());

drop policy if exists bikes_insert_own on public.bikes;
create policy bikes_insert_own
on public.bikes
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists bikes_update_own on public.bikes;
create policy bikes_update_own
on public.bikes
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists bikes_delete_own on public.bikes;
create policy bikes_delete_own
on public.bikes
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists bike_mods_select on public.bike_mods;
create policy bike_mods_select
on public.bike_mods
for select
to authenticated
using (
  exists (
    select 1
    from public.bikes b
    where b.id = bike_mods.bike_id
      and (b.is_public = true or b.owner_id = auth.uid())
  )
);

drop policy if exists bike_mods_insert_owner on public.bike_mods;
create policy bike_mods_insert_owner
on public.bike_mods
for insert
to authenticated
with check (
  exists (
    select 1
    from public.bikes b
    where b.id = bike_mods.bike_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists bike_mods_update_owner on public.bike_mods;
create policy bike_mods_update_owner
on public.bike_mods
for update
to authenticated
using (
  exists (
    select 1
    from public.bikes b
    where b.id = bike_mods.bike_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.bikes b
    where b.id = bike_mods.bike_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists bike_mods_delete_owner on public.bike_mods;
create policy bike_mods_delete_owner
on public.bike_mods
for delete
to authenticated
using (
  exists (
    select 1
    from public.bikes b
    where b.id = bike_mods.bike_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists routes_select on public.routes;
create policy routes_select
on public.routes
for select
to authenticated
using (is_public = true or created_by = auth.uid());

drop policy if exists routes_insert_owner on public.routes;
create policy routes_insert_owner
on public.routes
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists routes_update_owner on public.routes;
create policy routes_update_owner
on public.routes
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists routes_delete_owner on public.routes;
create policy routes_delete_owner
on public.routes
for delete
to authenticated
using (created_by = auth.uid());

drop policy if exists route_points_select on public.route_points;
create policy route_points_select
on public.route_points
for select
to authenticated
using (
  exists (
    select 1
    from public.routes r
    where r.id = route_points.route_id
      and (r.is_public = true or r.created_by = auth.uid())
  )
);

drop policy if exists route_points_insert_owner on public.route_points;
create policy route_points_insert_owner
on public.route_points
for insert
to authenticated
with check (
  exists (
    select 1
    from public.routes r
    where r.id = route_points.route_id
      and r.created_by = auth.uid()
  )
);

drop policy if exists route_points_update_owner on public.route_points;
create policy route_points_update_owner
on public.route_points
for update
to authenticated
using (
  exists (
    select 1
    from public.routes r
    where r.id = route_points.route_id
      and r.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routes r
    where r.id = route_points.route_id
      and r.created_by = auth.uid()
  )
);

drop policy if exists route_points_delete_owner on public.route_points;
create policy route_points_delete_owner
on public.route_points
for delete
to authenticated
using (
  exists (
    select 1
    from public.routes r
    where r.id = route_points.route_id
      and r.created_by = auth.uid()
  )
);

drop policy if exists spots_select on public.spots;
create policy spots_select
on public.spots
for select
to authenticated
using (is_public = true or created_by = auth.uid());

drop policy if exists spots_insert_owner on public.spots;
create policy spots_insert_owner
on public.spots
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists spots_update_owner on public.spots;
create policy spots_update_owner
on public.spots
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists spots_delete_owner on public.spots;
create policy spots_delete_owner
on public.spots
for delete
to authenticated
using (created_by = auth.uid());

drop policy if exists route_sessions_select on public.route_sessions;
create policy route_sessions_select
on public.route_sessions
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    status = 'active'
    and is_location_shared = true
    and exists (
      select 1
      from public.routes r
      where r.id = route_sessions.route_id
        and (r.is_public = true or r.created_by = auth.uid())
    )
  )
);

drop policy if exists route_sessions_insert_self on public.route_sessions;
create policy route_sessions_insert_self
on public.route_sessions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.routes r
    where r.id = route_sessions.route_id
      and (r.is_public = true or r.created_by = auth.uid())
  )
);

drop policy if exists route_sessions_update_self on public.route_sessions;
create policy route_sessions_update_self
on public.route_sessions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists route_sessions_delete_self on public.route_sessions;
create policy route_sessions_delete_self
on public.route_sessions
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists session_locations_select_self on public.session_locations;
create policy session_locations_select_self
on public.session_locations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists session_locations_insert_self on public.session_locations;
create policy session_locations_insert_self
on public.session_locations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.route_sessions rs
    where rs.id = session_locations.session_id
      and rs.user_id = auth.uid()
      and rs.status = 'active'
  )
);

drop policy if exists session_locations_delete_self on public.session_locations;
create policy session_locations_delete_self
on public.session_locations
for delete
to authenticated
using (user_id = auth.uid());

do $$
begin
  begin
    alter publication supabase_realtime add table public.route_sessions;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Datos de ejemplo opcionales (descomentar si quieres seed inicial).
-- insert into public.routes (created_by, title, description, city, difficulty, distance_km, estimated_minutes, start_lat, start_lng)
-- values
--   ('YOUR_USER_ID', 'Ruta Costa', 'Tramo mixto urbano + curvas', 'Barcelona', 'medium', 42.5, 75, 41.3851, 2.1734),
--   ('YOUR_USER_ID', 'Ruta Montanya', 'Asfalto tecnico y vistas', 'Girona', 'hard', 68.2, 130, 41.9794, 2.8214);
