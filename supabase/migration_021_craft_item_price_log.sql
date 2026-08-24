-- À lancer dans le SQL Editor Supabase.
--
-- Historique append-only des prix saisis à la main sur la fiche item
-- (craft/brisage), même principe que price_log côté donjons : chaque
-- validation ajoute une ligne, jamais d'update. La fiche item affiche
-- toujours le prix le plus RÉCENT tous sources confondues (DoFocus via
-- cache_item_coefficients OU saisie manuelle ici) — peu importe lequel des
-- deux a été mis à jour en dernier.
--
-- Pas de contrainte FK vers cache_craftable_items(item_id), volontairement,
-- même choix que cache_item_coefficients (migration_005) : un item peut
-- être re-importé/retiré du cache sans casser l'historique de prix déjà
-- saisi dessus.
create table craft_item_price_log (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  valeur numeric not null,
  character_id uuid references characters(id),
  created_at timestamptz default now()
);

alter table craft_item_price_log enable row level security;
create policy "authenticated full access" on craft_item_price_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
