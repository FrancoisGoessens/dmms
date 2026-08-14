-- À lancer dans le SQL Editor Supabase.

-- Chaque donjon est lié à UNE des 4 pierres (au lieu d'être calculé
-- uniquement par palier de niveau) — modifiable au cas par cas (ex. donjons
-- dont le niveau affiché ne correspond pas au niveau réel du boss).
alter table cache_dungeons
  add column if not exists soul_stone_item_id text references cache_soul_stones(item_id);

-- Petite table clé/valeur pour retenir la date du dernier reset hebdomadaire
-- (mardi 12h, heure de Paris) déclenché côté client.
create table if not exists app_meta (
  key text primary key,
  value text
);
alter table app_meta enable row level security;
create policy "authenticated full access" on app_meta
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
