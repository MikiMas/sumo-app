-- SUMO: posts solo vinculados a ruta/spot.
-- Ejecutar una sola vez sobre BD existente.

begin;

delete from public.posts
where route_id is null;

alter table public.posts
  drop constraint if exists posts_route_id_fkey;

alter table public.posts
  add constraint posts_route_id_fkey
  foreign key (route_id)
  references public.routes(id)
  on delete cascade;

alter table public.posts
  alter column route_id set not null;

commit;
