-- À lancer dans le SQL Editor Supabase, une fois le compte créé dans Authentication > Users.
-- Remplace la désactivation RLS précédente par une vraie protection :
-- seules les requêtes authentifiées (avec le compte partagé) passent.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'players','characters','groups','group_characters',
      'cache_dungeons','cache_items','cache_monster_items',
      'character_dungeons','price_log','route_zones',
      'route_zone_dungeons','dungeon_notes','cache_runes',
      'rune_price_log','craft_searches'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'drop policy if exists "authenticated full access" on %I;', t
    );
    execute format(
      'create policy "authenticated full access" on %I for all using (auth.role() = %L) with check (auth.role() = %L);',
      t, 'authenticated', 'authenticated'
    );
  end loop;
end $$;
