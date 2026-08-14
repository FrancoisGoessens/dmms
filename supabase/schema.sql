-- Schéma DMMS — à exécuter dans Supabase (SQL editor).
-- Convention : les tables préfixées "cache_" contiennent des données
-- importées depuis des sources externes (DofusDB / DoFocus), rafraîchies
-- périodiquement, jamais éditées à la main.

-- ── Utilisateurs & personnages ─────────────────────────────────────────

create table players (
  id text primary key,           -- ex. 'moi', 'copine'
  name text not null
);

create table characters (
  id uuid primary key default gen_random_uuid(),
  player_id text references players(id) not null,
  name text not null,
  classe text,
  niveau int,
  prospection int default 0
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table group_characters (
  group_id uuid references groups(id) on delete cascade,
  character_id uuid references characters(id) on delete cascade,
  primary key (group_id, character_id)
);

-- ── Données de jeu (snapshot DofusDB) ──────────────────────────────────

create table cache_dungeons (
  id text primary key,           -- id DofusDB du monstre "gardien"
  name text not null,
  zone text,
  niveau int
);

create table cache_items (
  id text primary key,           -- id DofusDB de l'item
  name text not null,
  type text check (type in ('pierre_ame', 'ressource_boss', 'ressource_rare'))
);

create table cache_monster_items (
  dungeon_id text references cache_dungeons(id) on delete cascade,
  item_id text references cache_items(id) on delete cascade,
  categorie text check (categorie in ('simple', 'rare')),
  taux_drop_base numeric,
  affecte_par_pp boolean default true,
  primary key (dungeon_id, item_id)
);

-- ── Suivi perso par personnage ─────────────────────────────────────────

create table character_dungeons (
  character_id uuid references characters(id) on delete cascade,
  dungeon_id text references cache_dungeons(id) on delete cascade,
  difficulte int default 3,
  peut_capturer boolean default true,
  capture boolean default false,
  fait_cette_semaine boolean default false,
  primary key (character_id, dungeon_id)
);

-- ── Historique de prix (donjons/items) ─────────────────────────────────

create table price_log (
  id uuid primary key default gen_random_uuid(),
  item_id text references cache_items(id) not null,
  valeur numeric not null,
  type text check (type in ('observation_hdv', 'vente')) not null,
  quantite numeric default 1,
  character_id uuid references characters(id),
  created_at timestamptz default now()
);

-- ── Routes (playlists de donjons par zone) ─────────────────────────────

create table route_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table route_zone_dungeons (
  zone_id uuid references route_zones(id) on delete cascade,
  dungeon_id text references cache_dungeons(id) on delete cascade,
  ordre int not null,
  primary key (zone_id, dungeon_id)
);

-- ── Notes de stratégie perso par donjon ─────────────────────────────────

create table dungeon_notes (
  dungeon_id text references cache_dungeons(id) primary key,
  notes text default ''
);

-- ── Runes (snapshot DoFocus) ────────────────────────────────────────────

create table cache_runes (
  id text primary key,           -- nom normalisé de la rune
  name text not null,
  categorie text check (categorie in ('dommages', 'resistances', 'caracteristiques', 'secondaires'))
);

create table rune_price_log (
  id uuid primary key default gen_random_uuid(),
  rune_id text references cache_runes(id) not null,
  valeur numeric not null,
  created_at timestamptz default now()
);

-- ── Historique des recherches craft ──────────────────────────────────────

create table craft_searches (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  level_min int not null,
  level_max int not null,
  created_at timestamptz default now()
);
