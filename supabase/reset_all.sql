-- À lancer en PREMIER dans le SQL Editor Supabase pour repartir propre.
-- Supprime toutes les tables du DMMS (CASCADE = supprime aussi ce qui en dépend).
-- Sans risque si certaines n'existent pas encore (IF EXISTS).

drop table if exists app_meta cascade;
drop table if exists cache_item_coefficients cascade;
drop table if exists cache_craftable_items cascade;
drop table if exists cache_professions cascade;
drop table if exists craft_searches cascade;
drop table if exists rune_price_log cascade;
drop table if exists cache_runes cascade;
drop table if exists dungeon_notes cascade;
drop table if exists route_zone_dungeons cascade;
drop table if exists route_zones cascade;
drop table if exists price_log cascade;
drop table if exists character_dungeons cascade;
drop table if exists cache_monster_items cascade;
drop table if exists cache_items cascade;
drop table if exists cache_soul_stones cascade;
drop table if exists cache_dungeons cascade;
drop table if exists group_characters cascade;
drop table if exists groups cascade;
drop table if exists characters cascade;
drop table if exists players cascade;
