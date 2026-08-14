alter table dungeon_notes add column if not exists actif jsonb default '[]'::jsonb;
alter table dungeon_notes add column if not exists passif jsonb default '[]'::jsonb;
