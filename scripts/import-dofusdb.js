#!/usr/bin/env node
/**
 * Import DofusDB pour le DMMS — à lancer par François lui-même.
 * Usage : node import-dofusdb.js [chemin-vers-monsters_cleaned.json]
 *
 * v2 : part directement des monstres marqués "isBoss" (couvre aussi les
 * boss de zone en monde ouvert, absents de /dungeons), et ne filtre plus
 * les drops conditionnels (hasCriterions reste visible dans la sortie).
 */

const BASE = 'https://api.dofusdb.fr'
const notesPath = process.argv[2] || './monsters_cleaned.json'

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

async function fetchAllPaginated(path, limit = 50) {
  let skip = 0
  let total = Infinity
  const all = []
  while (skip < total) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`${BASE}${path}${sep}$limit=${limit}&$skip=${skip}`)
    const json = await res.json()
    total = json.total
    all.push(...json.data)
    skip += limit
    await new Promise((r) => setTimeout(r, 150))
  }
  return all
}

async function fetchByIds(path, ids) {
  if (ids.length === 0) return []
  const out = []
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const query = chunk.map((id) => `id[$in][]=${id}`).join('&')
    const res = await fetch(`${BASE}${path}?${query}&lang=fr&$limit=${chunk.length}`)
    const json = await res.json()
    out.push(...json.data)
    await new Promise((r) => setTimeout(r, 150))
  }
  return out
}

async function main() {
  const fs = await import('fs')

  let notes = []
  try {
    notes = JSON.parse(fs.readFileSync(notesPath, 'utf-8'))
  } catch {
    console.warn(`Fichier de notes introuvable (${notesPath}) — on continue sans.`)
  }
  const notesByName = new Map(notes.map((n) => [normalize(n.name), n]))

  console.log('Récupération de tous les monstres marqués "boss"...')
  const bosses = await fetchAllPaginated('/monsters?lang=fr&isBoss=true')
  console.log(`${bosses.length} boss trouvés.`)

  const allDropItemIds = [...new Set(bosses.flatMap((b) => (b.drops || []).map((d) => d.objectId)))]
  console.log(`Récupération de ${allDropItemIds.length} items droppés...`)
  const items = await fetchByIds('/items', allDropItemIds)
  const itemById = new Map(items.map((i) => [i.id, i]))

  const output = bosses.map((b) => {
    const personalNote = notesByName.get(normalize(b.name.fr))
    return {
      bossId: b.id,
      bossName: b.name.fr,
      bossLevel: b.grades?.[0]?.level ?? null,
      notesFromFile: personalNote ? { actif: personalNote.actif, passif: personalNote.passif } : null,
      drops: (b.drops || [])
        .map((drop) => ({
          itemId: drop.objectId,
          itemName: itemById.get(drop.objectId)?.name?.fr || `item ${drop.objectId}`,
          ratePercent: drop.percentDropForGrade5,
          conditionnel: drop.hasCriterions, // true = drop sous condition (souvent les items exclusifs)
        }))
        .sort((a, b2) => b2.ratePercent - a.ratePercent),
    }
  })

  fs.writeFileSync('bosses-import.json', JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\nTerminé — ${output.length} boss écrits dans bosses-import.json`)
}

main()
