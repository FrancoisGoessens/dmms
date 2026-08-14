import { supabase } from './supabase.js'

export async function getPlayers() {
  const { data, error } = await supabase.from('players').select('*')
  if (error) throw error
  return data
}

export async function getCharacters(playerId) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('player_id', playerId)
  if (error) throw error
  return data
}

export async function getCharacter(characterId) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single()
  if (error) throw error
  return data
}

export async function getCharacterDungeons(characterId) {
  const { data, error } = await supabase
    .from('character_dungeons')
    .select('*, cache_dungeons(*)')
    .eq('character_id', characterId)
  if (error) throw error
  return data
}

export async function getMonsterItems(dungeonId) {
  const { data, error } = await supabase
    .from('cache_monster_items')
    .select('*, cache_items(*)')
    .eq('dungeon_id', dungeonId)
  if (error) throw error
  return data
}

// Dernier prix connu pour un item (append-only price_log : on prend le plus récent)
export async function getLatestPrice(itemId) {
  const { data, error } = await supabase
    .from('price_log')
    .select('valeur, created_at')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.valeur ?? 0
}

export async function setDungeonFlag(characterId, dungeonId, field, value) {
  const { error } = await supabase
    .from('character_dungeons')
    .update({ [field]: value })
    .eq('character_id', characterId)
    .eq('dungeon_id', dungeonId)
  if (error) throw error
}

export async function getPriceHistory(itemId, limit = 60) {
  const { data, error } = await supabase
    .from('price_log')
    .select('valeur, type, created_at')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function insertPriceEntry(itemId, valeur, type) {
  const { error } = await supabase
    .from('price_log')
    .insert({ item_id: itemId, valeur, type })
  if (error) throw error
}

export async function getDungeonNotesFull(dungeonId) {
  const { data, error } = await supabase
    .from('dungeon_notes')
    .select('notes, actif, passif')
    .eq('dungeon_id', dungeonId)
    .maybeSingle()
  if (error) throw error
  return { notes: data?.notes ?? '', actif: data?.actif ?? [], passif: data?.passif ?? [] }
}

// La note est partagée par tous (une seule par donjon, pas par personnage) —
// n'importe qui peut la modifier. actif/passif restent inchangés à l'écriture.
export async function saveDungeonNotes(dungeonId, notes, actif = [], passif = []) {
  const { error } = await supabase
    .from('dungeon_notes')
    .upsert({ dungeon_id: dungeonId, notes, actif, passif })
  if (error) throw error
}

export async function getDungeon(dungeonId) {
  const { data, error } = await supabase
    .from('cache_dungeons')
    .select('*')
    .eq('id', dungeonId)
    .single()
  if (error) throw error
  return data
}

export async function getCharacterDungeon(characterId, dungeonId) {
  const { data, error } = await supabase
    .from('character_dungeons')
    .select('*')
    .eq('character_id', characterId)
    .eq('dungeon_id', dungeonId)
    .single()
  if (error) throw error
  return data
}

// Sélectionne automatiquement la bonne pierre d'âme selon le niveau du boss
// (règle fixe : 4 paliers, cf. migration_003_soul_stones.sql).
export async function getSoulStoneForLevel(level) {
  const { data, error } = await supabase
    .from('cache_soul_stones')
    .select('*')
    .gte('level_max', level)
    .order('level_max', { ascending: true })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

// Toutes les ventes réelles (type='vente') pour les insights, optionnellement
// bornées dans le temps.
export async function getSales(sinceDate = null) {
  let query = supabase.from('price_log').select('valeur, quantite, created_at').eq('type', 'vente')
  if (sinceDate) query = query.gte('created_at', sinceDate)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countDoneDungeons(characterId, sinceDate = null) {
  let query = supabase
    .from('character_dungeons')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId)
    .eq('fait_cette_semaine', true)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function countCapturedDungeons(characterId) {
  const { count, error } = await supabase
    .from('character_dungeons')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId)
    .eq('capture', true)
  if (error) throw error
  return count ?? 0
}

export async function searchDungeons(query) {
  if (!query || query.length < 2) return []
  const { data, error } = await supabase
    .from('cache_dungeons')
    .select('id, name, zone')
    .ilike('name', `%${query}%`)
    .limit(6)
  if (error) throw error
  return data
}

export async function getAllCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('*, players(name)')
  if (error) throw error
  return data
}

// Supprime les recherches de plus de 30 jours avant de renvoyer les
// restantes — auto-effacement demandé pour ne pas laisser grossir la table.
export async function getCraftHistory() {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
  await supabase.from('craft_searches').delete().lt('created_at', cutoff)

  const { data, error } = await supabase
    .from('craft_searches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export async function saveCraftSearch(jobId, levelMin, levelMax, resultats) {
  const { error } = await supabase
    .from('craft_searches')
    .insert({ job_id: jobId, level_min: levelMin, level_max: levelMax, resultats })
  if (error) throw error
}

// --- Personnages ---
export async function updateCharacter(id, fields) {
  const { error } = await supabase.from('characters').update(fields).eq('id', id)
  if (error) throw error
}
export async function createCharacter(playerId, name) {
  const { data, error } = await supabase
    .from('characters')
    .insert({ player_id: playerId, name, prospection: 0, niveau: 1 })
    .select()
    .single()
  if (error) throw error
  return data
}

// --- Groupes ---
export async function getAllGroups() {
  const { data, error } = await supabase.from('groups').select('*')
  if (error) throw error
  return data
}
export async function getGroupsForCharacter(characterId) {
  const { data, error } = await supabase
    .from('group_characters')
    .select('group_id, groups(*)')
    .eq('character_id', characterId)
  if (error) throw error
  return data.map((r) => r.groups)
}
export async function createGroup(name) {
  const { data, error } = await supabase.from('groups').insert({ name }).select().single()
  if (error) throw error
  return data
}
export async function joinGroup(characterId, groupId) {
  const { error } = await supabase.from('group_characters').insert({ character_id: characterId, group_id: groupId })
  if (error) throw error
}
export async function leaveGroup(characterId, groupId) {
  const { error } = await supabase
    .from('group_characters')
    .delete()
    .eq('character_id', characterId)
    .eq('group_id', groupId)
  if (error) throw error
}

// --- Donjons assignés à un personnage ---
export async function getAllDungeons() {
  const { data, error } = await supabase.from('cache_dungeons').select('*').order('name')
  if (error) throw error
  return data
}
export async function addDungeonToCharacter(characterId, dungeonId) {
  const { error } = await supabase
    .from('character_dungeons')
    .insert({ character_id: characterId, dungeon_id: dungeonId, difficulte: 3 })
  if (error) throw error
}
export async function removeDungeonFromCharacter(characterId, dungeonId) {
  const { error } = await supabase
    .from('character_dungeons')
    .delete()
    .eq('character_id', characterId)
    .eq('dungeon_id', dungeonId)
  if (error) throw error
}
export async function updateDifficulty(characterId, dungeonId, difficulte) {
  const { error } = await supabase
    .from('character_dungeons')
    .update({ difficulte })
    .eq('character_id', characterId)
    .eq('dungeon_id', dungeonId)
  if (error) throw error
}

// --- Pierres d'âme ---
export async function getSoulStones() {
  const { data, error } = await supabase.from('cache_soul_stones').select('*').order('level_max')
  if (error) throw error
  return data
}
export async function getLatestStonePrice(itemId) {
  return getLatestPrice(itemId)
}
export async function setStonePrice(itemId, value) {
  await insertPriceEntry(itemId, value, 'observation_hdv')
}
export async function setDungeonStone(dungeonId, stoneItemId) {
  const { error } = await supabase.from('cache_dungeons').update({ soul_stone_item_id: stoneItemId }).eq('id', dungeonId)
  if (error) throw error
}

// --- Reset hebdomadaire (mardi 12h, heure de Paris) ---
export async function getAppMeta(key) {
  const { data, error } = await supabase.from('app_meta').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return data?.value ?? null
}
export async function setAppMeta(key, value) {
  const { error } = await supabase.from('app_meta').upsert({ key, value })
  if (error) throw error
}
export async function resetAllDungeonFlags() {
  const { error } = await supabase
    .from('character_dungeons')
    .update({ capture: false, fait_cette_semaine: false })
    .not('character_id', 'is', null)
  if (error) throw error
}

export async function getSalesLog() {
  const { data, error } = await supabase
    .from('price_log')
    .select('id, valeur, type, quantite, created_at, cache_items(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data.map((r) => ({
    id: r.id, date: r.created_at.slice(0, 10), item: r.cache_items?.name || '—',
    qty: r.quantite || 1, unitPrice: r.valeur, type: r.type === 'vente' ? 'vente' : 'observation',
  }))
}

export async function addSaleEntry(itemId, date, qty, price) {
  const { error } = await supabase
    .from('price_log')
    .insert({ item_id: itemId, valeur: price, type: 'vente', quantite: qty, created_at: date })
  if (error) throw error
}

export async function getAllItemsForSalesForm() {
  const { data, error } = await supabase.from('cache_items').select('id, name').order('name')
  if (error) throw error
  return data
}
