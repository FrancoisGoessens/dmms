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

export async function insertPriceEntry(itemId, valeur, type, characterId = null) {
  const { error } = await supabase
    .from('price_log')
    .insert({ item_id: itemId, valeur, type, character_id: characterId })
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
// bornées dans le temps et/ou filtrées sur un personnage précis.
export async function getSales(sinceDate = null, characterId = null) {
  let query = supabase.from('price_log').select('valeur, quantite, created_at').eq('type', 'vente')
  if (sinceDate) query = query.gte('created_at', sinceDate)
  if (characterId) query = query.eq('character_id', characterId)
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
export async function setStonePrice(itemId, value, characterId = null) {
  await insertPriceEntry(itemId, value, 'observation_hdv', characterId)
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

export async function addSaleEntry(itemId, date, qty, price, characterId = null) {
  const { error } = await supabase
    .from('price_log')
    .insert({ item_id: itemId, valeur: price, type: 'vente', quantite: qty, created_at: date, character_id: characterId })
  if (error) throw error
}

export async function getAllItemsForSalesForm() {
  const { data, error } = await supabase.from('cache_items').select('id, name').order('name')
  if (error) throw error
  return data
}

// --- Requêtes groupées (perf) : remplace les boucles avec await un par un ---

export async function getMonsterItemsForDungeons(dungeonIds) {
  if (dungeonIds.length === 0) return []
  const { data, error } = await supabase
    .from('cache_monster_items')
    .select('*, cache_items(*)')
    .in('dungeon_id', dungeonIds)
  if (error) throw error
  return data
}

// Renvoie { item_id: dernierPrix } en UNE requête au lieu d'une par item
// (price_log est trié desc, donc la première occurrence par item = la plus récente).
export async function getLatestPricesForItems(itemIds) {
  if (itemIds.length === 0) return {}
  const { data, error } = await supabase
    .from('price_log')
    .select('item_id, valeur, created_at')
    .in('item_id', itemIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  const map = {}
  for (const row of data) {
    if (!(row.item_id in map)) map[row.item_id] = row
  }
  return map
}

// --- Liens entre donjons (ex. Blop Royaux) ---
export async function getLinkedDungeons(dungeonId) {
  const { data, error } = await supabase
    .from('dungeon_links')
    .select('linked_dungeon_id')
    .eq('dungeon_id', dungeonId)
  if (error) throw error
  return data.map((d) => d.linked_dungeon_id)
}

export async function propagateFait(characterId, dungeonId) {
  const linked = await getLinkedDungeons(dungeonId)
  for (const id of linked) {
    await setDungeonFlag(characterId, id, 'fait_cette_semaine', true)
  }
}

// --- Volume de ventes /30j (optionnel, saisi à la main) ---
export async function updateItemVentes30j(itemId, value) {
  const { error } = await supabase.from('cache_items').update({ ventes_30j: value }).eq('id', itemId)
  if (error) throw error
}
export async function getItemVentes30j(itemId) {
  const { data, error } = await supabase.from('cache_items').select('ventes_30j').eq('id', itemId).maybeSingle()
  if (error) throw error
  return data?.ventes_30j ?? null
}

// --- Routes (zones + donjons ordonnés) ---
export async function getRouteZones() {
  const { data, error } = await supabase.from('route_zones').select('*').order('name')
  if (error) throw error
  return data
}
export async function createRouteZone(name) {
  const { data, error } = await supabase.from('route_zones').insert({ name }).select().single()
  if (error) throw error
  return data
}
export async function deleteRouteZone(id) {
  const { error } = await supabase.from('route_zones').delete().eq('id', id)
  if (error) throw error
}
export async function getAllRouteZoneDungeons() {
  const { data, error } = await supabase
    .from('route_zone_dungeons')
    .select('*, cache_dungeons(*)')
    .order('ordre')
  if (error) throw error
  return data
}
export async function addDungeonToZone(zoneId, dungeonId, ordre) {
  const { error } = await supabase.from('route_zone_dungeons').insert({ zone_id: zoneId, dungeon_id: dungeonId, ordre })
  if (error) throw error
}
export async function removeDungeonFromZone(zoneId, dungeonId) {
  const { error } = await supabase.from('route_zone_dungeons').delete().eq('zone_id', zoneId).eq('dungeon_id', dungeonId)
  if (error) throw error
}
export async function reorderZoneDungeon(zoneId, dungeonId, ordre) {
  const { error } = await supabase.from('route_zone_dungeons').update({ ordre }).eq('zone_id', zoneId).eq('dungeon_id', dungeonId)
  if (error) throw error
}

// --- À vérifier : tous les items suivis, avec leur dernier prix connu ---
export async function getAllMonsterItemsFull() {
  const { data, error } = await supabase
    .from('cache_monster_items')
    .select('*, cache_items(*), cache_dungeons(*)')
  if (error) throw error
  return data
}

// --- Métiers / craft (lecture pure base, jamais d'appel live) ---
export async function getCraftableItemsFor(professionId, levelMin, levelMax) {
  const { data, error } = await supabase
    .from('cache_craftable_items')
    .select('*')
    .eq('profession_id', professionId)
    .gte('level', levelMin)
    .lte('level', levelMax)
  if (error) throw error
  return data
}
export async function getLatestCoefficientsForItems(itemIds) {
  if (itemIds.length === 0) return {}
  const { data, error } = await supabase
    .from('cache_item_coefficients')
    .select('item_id, coefficient, prix_estime, created_at')
    .in('item_id', itemIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  const map = {}
  for (const row of data) if (!(row.item_id in map)) map[row.item_id] = row
  return map
}
export async function getProfessions() {
  const { data, error } = await supabase.from('cache_professions').select('*').order('name')
  if (error) throw error
  return data
}

// --- Runes ---
export async function getRunesWithLatestPrice() {
  const { data: runes, error } = await supabase.from('cache_runes').select('*')
  if (error) throw error
  const ids = runes.map((r) => r.id)
  if (ids.length === 0) return []

  const { data: prices, error: e2 } = await supabase
    .from('rune_price_log')
    .select('rune_id, valeur, created_at')
    .in('rune_id', ids)
    .order('created_at', { ascending: false })
  if (e2) throw e2

  const latestByRune = {}
  for (const p of prices) if (!(p.rune_id in latestByRune)) latestByRune[p.rune_id] = p

  return runes.map((r) => ({
    ...r,
    price: latestByRune[r.id]?.valeur ?? null,
    updatedAt: latestByRune[r.id]?.created_at ?? null,
  }))
}
export async function getRunePriceHistory(runeId, limit = 200) {
  const { data, error } = await supabase
    .from('rune_price_log')
    .select('valeur, created_at')
    .eq('rune_id', runeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// Récupère toutes les runes en cache, indexées par characteristic_id ET par
// nom — pour matcher une ligne d'item à sa rune même si le lien exact
// (characteristicId) n'est pas confirmé.
export async function getRunesLookup() {
  const { data, error } = await supabase.from('cache_runes').select('*')
  if (error) throw error
  const ids = data.map((r) => r.id)

  let latestByRune = {}
  if (ids.length > 0) {
    const { data: prices, error: e2 } = await supabase
      .from('rune_price_log')
      .select('rune_id, valeur, created_at')
      .in('rune_id', ids)
      .order('created_at', { ascending: false })
    if (e2) throw e2
    for (const p of prices) if (!(p.rune_id in latestByRune)) latestByRune[p.rune_id] = p.valeur
  }

  const byCharId = {}
  const byName = {}
  for (const r of data) {
    const withPrice = { ...r, price: latestByRune[r.id] ?? 0 }
    if (r.characteristic_id) byCharId[r.characteristic_id] = withPrice
    byName[r.name] = withPrice
  }
  return { byCharId, byName }
}

export async function setDungeonBossImage(dungeonId, imageUrl) {
  const { error } = await supabase.from('cache_dungeons').update({ boss_image_url: imageUrl }).eq('id', dungeonId)
  if (error) throw error
}

export async function setDungeonBossStats(dungeonId, stats) {
  const { error } = await supabase.from('cache_dungeons').update({ boss_stats: stats }).eq('id', dungeonId)
  if (error) throw error
}

// --- Items craftables : lecture pure base (jamais d'appel DoFocus en live) ---
export async function searchCraftableItems(query) {
  if (!query || query.length < 2) return []
  const { data, error } = await supabase
    .from('cache_craftable_items')
    .select('item_id, name, level, image_url')
    .ilike('name', `%${query}%`)
    .limit(20)
  if (error) throw error
  return data
}

export async function getCraftableItemDetail(itemId) {
  const { data: item, error } = await supabase
    .from('cache_craftable_items')
    .select('*')
    .eq('item_id', itemId)
    .single()
  if (error) throw error

  const { data: coeffs, error: e2 } = await supabase
    .from('cache_item_coefficients')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (e2) throw e2

  return { ...item, latestCoefficient: coeffs?.[0] ?? null }
}
