import { computeDropWithPP } from './dropFormula.js'

// Rentabilité = profit net de la capture (prix vente - prix pierre),
// ramené sur une échelle 0-100 000 kamas -> 0-100%. Les items ne sont
// qu'un bonus secondaire affiché à côté, pas intégrés au score
// (demande explicite : "les items sont des bonus anyway").
export function netCaptureToPercent(netCapture) {
  return Math.max(0, Math.min(100, (netCapture / 100000) * 100))
}

// Volume faible = flèche vers le bas (même seuil que la fiche donjon).
export function isLowVolume(ventes30j) {
  return ventes30j != null && ventes30j <= 100
}

// Calcule la rentabilité de tous les donjons d'un personnage EN UNE SEULE
// série de requêtes groupées (perf), au lieu d'une boucle avec plusieurs
// await par donjon. Utilisé par Dashboard et Kanban.
export async function computeDungeonRentabilities({
  charDungeons, character, soulStones,
  getMonsterItemsForDungeons, getLatestPricesForItems,
}) {
  const dungeons = charDungeons.map((cd) => cd.cache_dungeons).filter(Boolean)
  const dungeonIds = dungeons.map((d) => d.id)

  const monsterItems = await getMonsterItemsForDungeons(dungeonIds)
  const byDungeon = {}
  for (const mi of monsterItems) {
    byDungeon[mi.dungeon_id] ??= {}
    byDungeon[mi.dungeon_id][mi.categorie] = mi
  }

  const itemIds = [
    ...monsterItems.map((mi) => mi.item_id),
    ...soulStones.map((s) => s.item_id),
  ]
  const prices = await getLatestPricesForItems(itemIds)
  const priceOf = (id) => prices[id]?.valeur ?? 0

  const stoneForLevel = (level) => {
    const sorted = [...soulStones].sort((a, b) => a.level_max - b.level_max)
    return sorted.find((s) => level <= s.level_max) || sorted[sorted.length - 1]
  }

  const pp = character.prospection || 0

  const built = charDungeons.map((cd) => {
    const dungeon = cd.cache_dungeons
    if (!dungeon) return null
    const byCat = byDungeon[dungeon.id] || {}

    const capturePrice = priceOf(byCat.capture?.item_id)
    const stoneId = dungeon.soul_stone_item_id || stoneForLevel(dungeon.niveau)?.item_id
    const pierrePrice = priceOf(stoneId)
    const simplePrice = priceOf(byCat.simple?.item_id)
    const rarePrice = priceOf(byCat.rare?.item_id)

    const simpleRate = byCat.simple ? computeDropWithPP(byCat.simple.taux_drop_base, pp, byCat.simple.affecte_par_pp) : 0
    const rareRate = byCat.rare ? computeDropWithPP(byCat.rare.taux_drop_base, pp, byCat.rare.affecte_par_pp) : 0

    const netCapture = capturePrice - pierrePrice
    const itemsBonus = (simplePrice * (simpleRate || 0)) / 100 + (rarePrice * (rareRate || 0)) / 100

    return {
      dungeonId: dungeon.id, name: dungeon.name, zone: dungeon.zone, niveau: dungeon.niveau,
      bossName: byCat.capture?.cache_items?.name || dungeon.name,
      done: cd.fait_cette_semaine, captured: cd.capture,
      netCapture, itemsBonus,
      rentability: netCaptureToPercent(netCapture),
      lowVolume: isLowVolume(byCat.capture?.cache_items?.ventes_30j),
    }
  }).filter(Boolean)

  return built
}
