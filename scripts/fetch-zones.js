#!/usr/bin/env node
/**
 * Récupère la zone de chaque donjon via DofusDB — à lancer par François.
 * Usage : node fetch-zones.js
 *
 * On ne connaît pas avec certitude la forme exacte du champ "subarea"
 * (objet déjà résolu, ou juste un id à requêter séparément) — le script
 * gère les deux cas automatiquement.
 */

const BASE = 'https://api.dofusdb.fr'

async function fetchAllPaginated(path, limit = 50) {
  let skip = 0, total = Infinity
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

async function resolveSubareaName(subarea, cache) {
  if (!subarea) return null
  if (typeof subarea === 'object' && subarea.name?.fr) return subarea.name.fr
  const id = typeof subarea === 'object' ? subarea.id : subarea
  if (cache.has(id)) return cache.get(id)
  const res = await fetch(`${BASE}/subareas/${id}?lang=fr`)
  const json = await res.json()
  const name = json?.name?.fr ?? null
  cache.set(id, name)
  await new Promise((r) => setTimeout(r, 100))
  return name
}

async function main() {
  const fs = await import('fs')
  console.log('Récupération des donjons...')
  const dungeons = await fetchAllPaginated('/dungeons?lang=fr')
  console.log(`${dungeons.length} donjons trouvés.`)

  // Diagnostic : montre la forme réelle du champ subarea sur le premier donjon
  if (dungeons[0]) {
    console.log('\nExemple de champ "subarea" brut (diagnostic) :')
    console.log(JSON.stringify(dungeons[0].subarea, null, 2))
  }

  const cache = new Map()
  const output = []
  for (const d of dungeons) {
    if (!d.bosses?.[0]) continue
    const zoneName = await resolveSubareaName(d.subarea, cache)
    output.push({ monsterId: d.bosses[0], dungeonName: d.name.fr, zone: zoneName })
  }

  fs.writeFileSync('dungeon-zones.json', JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\nTerminé — ${output.length} zones écrites dans dungeon-zones.json`)
  console.log('Envoie-moi ce fichier.')
}

main()
