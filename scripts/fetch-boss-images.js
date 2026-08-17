#!/usr/bin/env node
/**
 * Récupère l'image de chaque boss via DofusDB — à lancer par François.
 * Usage : node fetch-boss-images.js
 *
 * Les ids de donjon sont sous la forme "m<idMonstre>" (ex. m4051 pour
 * Kardorim) — on extrait l'id du monstre directement dessus, pas besoin
 * de re-parcourir la base.
 */

const BASE = 'https://api.dofusdb.fr'

async function fetchMonsterBatch(ids) {
  const query = ids.map((id) => `id[$in][]=${id}`).join('&')
  const res = await fetch(`${BASE}/monsters?${query}&lang=fr&$limit=${ids.length}`)
  return res.json()
}

async function main() {
  const fs = await import('fs')
  const DUNGEON_IDS = JSON.parse(fs.readFileSync('dungeon-ids.json', 'utf-8'))
  const monsterIds = DUNGEON_IDS.map((d) => d.replace(/^m/, ''))

  if (monsterIds.length === 0) {
    console.log('DUNGEON_IDS est vide — remplis-le ou demande-moi de le générer.')
    return
  }

  const output = []
  for (let i = 0; i < monsterIds.length; i += 30) {
    const chunk = monsterIds.slice(i, i + 30)
    const json = await fetchMonsterBatch(chunk)

    if (i === 0 && json.data?.[0]) {
      console.log('Diagnostic — premier monstre brut :')
      console.log(JSON.stringify(json.data[0], null, 2))
    }

    for (const m of json.data || []) {
      const imageUrl = m.img || (m.gfxId ? `${BASE}/img/monsters/${m.gfxId}.png` : null)
      // On prend le dernier grade dispo (le plus haut niveau du monstre), qui
      // contient normalement vie/stats/résistances — forme exacte à vérifier
      // dans le diagnostic ci-dessus.
      const stats = Array.isArray(m.grades) ? m.grades[m.grades.length - 1] : null
      output.push({ dungeonId: `m${m.id}`, imageUrl, stats })
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  fs.writeFileSync('boss-images.json', JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\nTerminé — ${output.length} images écrites dans boss-images.json. Envoie-le moi.`)
}

main()
