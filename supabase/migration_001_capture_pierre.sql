-- À exécuter dans le SQL Editor Supabase (une fois, en plus du schema.sql initial)

alter table cache_monster_items
  drop constraint cache_monster_items_categorie_check;

alter table cache_monster_items
  add constraint cache_monster_items_categorie_check
  check (categorie in ('capture', 'pierre', 'simple', 'rare'));
