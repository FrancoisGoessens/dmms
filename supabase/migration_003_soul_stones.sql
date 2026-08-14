-- À lancer dans le SQL Editor Supabase.
-- Remplace l'idée d'une pierre par donjon par 4 pierres fixes, choisies
-- automatiquement selon le niveau du boss (règle donnée par François).

create table cache_soul_stones (
  item_id text primary key,
  name text not null,
  level_max int not null   -- capture d'âme jusqu'à ce niveau inclus
);

insert into cache_soul_stones (item_id, name, level_max) values
  ('9687', 'Moyenne pierre d''âme', 100),
  ('9688', 'Grande pierre d''âme', 150),
  ('9689', 'Énorme pierre d''âme', 190),
  ('9690', 'Gigantesque pierre d''âme', 1000);

alter table cache_soul_stones enable row level security;
create policy "authenticated full access" on cache_soul_stones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- La catégorie 'pierre' n'est plus utilisée dans cache_monster_items
-- (elle reste acceptée par la contrainte pour compatibilité, simplement
-- plus renseignée pour les nouveaux imports).
