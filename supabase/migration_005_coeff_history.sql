-- À lancer dans le SQL Editor Supabase.
-- Remplace la table à une seule ligne par item par un vrai historique
-- append-only, cohérent avec price_log et rune_price_log.

drop table if exists cache_item_coefficients;

create table cache_item_coefficients (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  coefficient numeric not null,
  prix_estime numeric,
  created_at timestamptz default now()
);

alter table cache_item_coefficients enable row level security;
create policy "authenticated full access" on cache_item_coefficients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
