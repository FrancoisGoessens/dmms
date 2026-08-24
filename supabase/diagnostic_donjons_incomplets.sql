-- À exécuter dans l'éditeur SQL de Supabase.
-- Objectif : comprendre pourquoi m107 (Hell Mina) et m3726 chargent à
-- l'infini sur la fiche donjon, et repérer d'autres donjons dans le même cas
-- avant de tomber dessus par surprise.
--
-- Important : cache_monster_items.dungeon_id a une contrainte FK vers
-- cache_dungeons(id) (on delete cascade) — donc la ligne dans cache_dungeons
-- EXISTE forcément pour m107/m3726 (impossible d'avoir un item enregistré
-- sinon). Le souci est donc que cette ligne est incomplète (niveau/zone
-- manquants) et/ou qu'il manque la ligne character_dungeons pour le
-- personnage actif.

-- 1) Donnée brute des 2 donjons signalés — regarde surtout niveau/zone/
--    boss_image_url/boss_stats/soul_stone_item_id.
select *
from cache_dungeons
where id in ('m107', 'm3726');

-- 2) Ce donjon est-il dans la liste d'un des personnages ? Si aucune ligne
--    ne remonte pour ton personnage actif, c'est ça qui déclenchait le
--    .single() qui plantait avant le correctif (getCharacterDungeon).
select cd.*, c.name as personnage
from character_dungeons cd
join characters c on c.id = cd.character_id
where cd.dungeon_id in ('m107', 'm3726');

-- 3) Les items suivis (capture + drops) pour ces 2 donjons, avec leur nom.
select cmi.dungeon_id, cmi.categorie, cmi.item_id, ci.name
from cache_monster_items cmi
join cache_items ci on ci.id = cmi.item_id
where cmi.dungeon_id in ('m107', 'm3726')
order by cmi.dungeon_id, cmi.categorie;

-- 4) Balayage complet : TOUS les donjons avec un champ essentiel manquant.
--    C'est la liste à réimporter via import-dofusdb.js pour éviter d'autres
--    surprises comme m107/m3726 sur des donjons pas encore testés.
select id, name, niveau, zone, boss_image_url, soul_stone_item_id
from cache_dungeons
where niveau is null or zone is null
order by name;
