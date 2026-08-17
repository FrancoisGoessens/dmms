#!/usr/bin/env node
/**
 * Import des items craftables par métier — à lancer par François.
 * Usage : node import-craftable-items.js
 *
 * Corrigé : DofusDB filtre par "typeId" (numérique), pas par nom de texte.
 * Ce script résout d'abord les noms de type (Chapeau, Cape...) vers leurs
 * vrais ids via /item-types, puis interroge /items avec ces ids — un seul
 * passage, pas besoin d'aller-retour.
 */

const BASE = 'https://api.dofusdb.fr'

const PROFESSIONS = {
  tailleur: ['Chapeau', 'Cape'],
  bijoutier: ['Amulette', 'Anneau'],
  cordonnier: ['Ceinture', 'Bottes'],
  faconneur: ['Bouclier', 'Trophée'],
  sculpteur: ['Arc', 'Baguette', 'Bâton'],
  forgeron: ['Épée', 'Hache', 'Pelle', 'Marteau', 'Dague', 'Lance', 'Faux'],
}

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

async function main() {
  const fs = await import('fs')

  console.log("Récupération de la liste des types d'items...")
  const itemTypes = await fetchAllPaginated('/item-types?lang=fr')
  console.log(`${itemTypes.length} types trouvés.\n`)
  fs.writeFileSync('item-types.json', JSON.stringify(itemTypes, null, 2), 'utf-8')

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const typeByName = new Map(itemTypes.map((t) => [norm(t.name?.fr), t.id]))

  const output = {}

  for (const [profession, typeNames] of Object.entries(PROFESSIONS)) {
    const ids = []
    for (const name of typeNames) {
      const id = typeByName.get(norm(name))
      if (id == null) {
        console.log(`  ⚠ "${name}" introuvable dans /item-types pour ${profession}`)
      } else {
        ids.push(id)
      }
    }
    if (ids.length === 0) {
      console.log(`--- ${profession} : aucun type résolu, on saute ---\n`)
      output[profession] = []
      continue
    }

    const query = ids.map((id) => `typeId[$in][]=${id}`).join('&')
    const items = await fetchAllPaginated(`/items?${query}&lang=fr`)
    console.log(`--- ${profession} (typeIds ${ids.join(', ')}) : ${items.length} items ---`)

    output[profession] = items.map((it) => ({
      id: it.id, name: it.name.fr, level: it.level, typeId: it.typeId,
    }))
  }

  fs.writeFileSync('craftable-items.json', JSON.stringify(output, null, 2), 'utf-8')
  console.log('\nTerminé — craftable-items.json écrit. Envoie-le moi (+ item-types.json si un métier a échoué).')
}

main()
