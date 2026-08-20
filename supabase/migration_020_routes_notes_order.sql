-- Une ligne de route_zone_dungeons peut désormais être un donjon (comme
-- avant) OU une simple annotation texte (dungeon_id nul, note remplie).
-- Une clé primaire composite n'accepte pas les valeurs nulles côté
-- Postgres — on passe à un id de substitution.
alter table route_zone_dungeons drop constraint if exists route_zone_dungeons_pkey;
alter table route_zone_dungeons add column if not exists id uuid primary key default gen_random_uuid();
alter table route_zone_dungeons alter column dungeon_id drop not null;
alter table route_zone_dungeons add column if not exists note text;

-- Empêche toujours le doublon d'un même vrai donjon dans une même zone
-- (les annotations, elles, peuvent se répéter sans souci).
create unique index if not exists route_zone_dungeons_unique_dungeon
  on route_zone_dungeons (zone_id, dungeon_id)
  where dungeon_id is not null;

-- Ordre d'affichage des groupes de route eux-mêmes (réorganisables).
alter table route_zones add column if not exists ordre integer default 0;

