-- À lancer dans le SQL Editor Supabase.
-- price_log.item_id exige que l'item existe dans cache_items — les 4
-- pierres n'y étaient que dans cache_soul_stones, donc leur prix ne
-- pouvait jamais s'enregistrer (erreur de contrainte silencieuse).

insert into cache_items (id, name, type)
select item_id, name, 'pierre_ame' from cache_soul_stones
on conflict (id) do nothing;
