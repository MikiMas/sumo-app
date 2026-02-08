-- Feed social + rendimiento rutas (SUMO)
-- Ejecutar en Supabase SQL editor.

create extension if not exists pgcrypto;

-- 1) POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  route_id uuid null references public.routes(id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists posts_route_idx on public.posts (route_id);

-- 2) MEDIA de post
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  media_url text not null,
  thumb_url text null,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_media_post_idx on public.post_media (post_id, sort_order asc);

-- 3) LIKES
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes (user_id);

-- 4) COMENTARIOS
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid null references public.post_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at asc);
create index if not exists post_comments_user_idx on public.post_comments (user_id);

-- 5) MENCIONES (@usuario)
create table if not exists public.post_mentions (
  post_id uuid not null references public.posts(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, mentioned_user_id)
);

create index if not exists post_mentions_user_idx on public.post_mentions (mentioned_user_id);

-- 6) Trigger updated_at si existe la funcion set_updated_at()
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    if not exists (
      select 1 from pg_trigger where tgname = 'set_posts_updated_at'
    ) then
      create trigger set_posts_updated_at
      before update on public.posts
      for each row execute function set_updated_at();
    end if;

    if not exists (
      select 1 from pg_trigger where tgname = 'set_post_comments_updated_at'
    ) then
      create trigger set_post_comments_updated_at
      before update on public.post_comments
      for each row execute function set_updated_at();
    end if;
  end if;
end $$;

-- 7) RLS
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_mentions enable row level security;

-- Lectura publica de posts public
drop policy if exists posts_select_public on public.posts;
create policy posts_select_public
on public.posts for select
using (visibility = 'public');

drop policy if exists post_media_select_public on public.post_media;
create policy post_media_select_public
on public.post_media for select
using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and p.visibility = 'public'
  )
);

drop policy if exists post_likes_select_public on public.post_likes;
create policy post_likes_select_public
on public.post_likes for select
using (
  exists (
    select 1 from public.posts p
    where p.id = post_likes.post_id
      and p.visibility = 'public'
  )
);

drop policy if exists post_comments_select_public on public.post_comments;
create policy post_comments_select_public
on public.post_comments for select
using (
  exists (
    select 1 from public.posts p
    where p.id = post_comments.post_id
      and p.visibility = 'public'
  )
);

drop policy if exists post_mentions_select_public on public.post_mentions;
create policy post_mentions_select_public
on public.post_mentions for select
using (
  exists (
    select 1 from public.posts p
    where p.id = post_mentions.post_id
      and p.visibility = 'public'
  )
);

-- Insercion/edicion solo autenticado propietario
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts for insert
with check (auth.uid() = author_id);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own
on public.posts for delete
using (auth.uid() = author_id);

drop policy if exists post_media_insert_own on public.post_media;
create policy post_media_insert_own
on public.post_media for insert
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists post_media_delete_own on public.post_media;
create policy post_media_delete_own
on public.post_media for delete
using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists post_likes_insert_auth on public.post_likes;
create policy post_likes_insert_auth
on public.post_likes for insert
with check (auth.uid() = user_id);

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own
on public.post_likes for delete
using (auth.uid() = user_id);

drop policy if exists post_comments_insert_auth on public.post_comments;
create policy post_comments_insert_auth
on public.post_comments for insert
with check (auth.uid() = user_id);

drop policy if exists post_comments_update_own on public.post_comments;
create policy post_comments_update_own
on public.post_comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists post_comments_delete_own on public.post_comments;
create policy post_comments_delete_own
on public.post_comments for delete
using (auth.uid() = user_id);

drop policy if exists post_mentions_insert_post_owner on public.post_mentions;
create policy post_mentions_insert_post_owner
on public.post_mentions for insert
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_mentions.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists post_mentions_delete_post_owner on public.post_mentions;
create policy post_mentions_delete_post_owner
on public.post_mentions for delete
using (
  exists (
    select 1 from public.posts p
    where p.id = post_mentions.post_id
      and p.author_id = auth.uid()
  )
);

-- 8) Funciones utiles feed
create or replace function public.feed_posts(limit_count int default 20, offset_count int default 0)
returns table (
  id uuid,
  author_id uuid,
  username text,
  display_name text,
  avatar_url text,
  body text,
  route_id uuid,
  created_at timestamptz,
  likes_count int,
  comments_count int
)
language sql
stable
as $$
  select
    p.id,
    p.author_id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    p.body,
    p.route_id,
    p.created_at,
    coalesce((select count(*)::int from public.post_likes pl where pl.post_id = p.id), 0) as likes_count,
    coalesce((select count(*)::int from public.post_comments pc where pc.post_id = p.id), 0) as comments_count
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.visibility = 'public'
  order by p.created_at desc
  limit greatest(limit_count, 1)
  offset greatest(offset_count, 0);
$$;

-- 9) Rendimiento mapa (para endpoint bbox futuro)
create index if not exists routes_public_lat_lng_idx
on public.routes (is_public, start_lat, start_lng);

create or replace function public.routes_in_bbox(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  limit_count int default 200
)
returns setof public.routes
language sql
stable
as $$
  select r.*
  from public.routes r
  where r.is_public = true
    and r.start_lat between min_lat and max_lat
    and r.start_lng between min_lng and max_lng
  order by r.created_at desc
  limit greatest(limit_count, 1);
$$;

create or replace function public.route_presence_counts(p_route_ids uuid[])
returns table (route_id uuid, riders int)
language sql
stable
as $$
  select rs.route_id, count(*)::int as riders
  from public.route_sessions rs
  where rs.status = 'active'
    and rs.route_id = any(p_route_ids)
  group by rs.route_id;
$$;
