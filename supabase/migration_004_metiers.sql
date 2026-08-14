-- À lancer dans le SQL Editor Supabase.

create table cache_professions (
  id text primary key,      -- id DofusDB du métier
  name text not null
);

-- Snapshot des items craftables par métier/niveau (alimenté par le bouton
-- refresh, comme le reste des caches DofusDB).
create table cache_craftable_items (
  item_id text primary key,
  profession_id text references cache_professions(id) not null,
  name text not null,
  level int not null
);

-- Coefficient ET prix estimé par item (les deux données DoFocus qui bougent
-- dans le temps), alimentés par le même bouton refresh que les prix de
-- runes. Tout le calcul de rentabilité (jet, focus, runes obtenues) se fait
-- en local à partir de ça + des données statiques DofusDB — aucun appel
-- DoFocus au moment du calcul lui-même.
create table cache_item_coefficients (
  item_id text primary key,
  coefficient numeric not null,
  prix_estime numeric,
  updated_at timestamptz default now()
);

-- Une recherche = un calcul top 10 lancé, avec son résultat figé pour
-- pouvoir le rouvrir plus tard sans tout recalculer.
alter table craft_searches
  add column if not exists resultats jsonb;

alter table cache_professions enable row level security;
alter table cache_craftable_items enable row level security;
alter table cache_item_coefficients enable row level security;
create policy "authenticated full access" on cache_professions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on cache_craftable_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on cache_item_coefficients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
