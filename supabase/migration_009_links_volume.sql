-- À lancer dans le SQL Editor Supabase.

-- Lien générique entre donjons : marquer "fait" sur l'un propage "fait"
-- aux donjons liés (cas d'usage : les 4 Blop Royaux).
create table if not exists dungeon_links (
  dungeon_id text references cache_dungeons(id) on delete cascade,
  linked_dungeon_id text references cache_dungeons(id) on delete cascade,
  primary key (dungeon_id, linked_dungeon_id)
);
alter table dungeon_links enable row level security;
create policy "authenticated full access" on dungeon_links
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Volume de ventes /30j, saisi à la main (optionnel), pour l'indicateur
-- de liquidité (↗ gros volume / → normal / ↘ faible) sur la capture.
alter table cache_items add column if not exists ventes_30j integer;
