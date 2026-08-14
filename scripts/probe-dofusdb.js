#!/usr/bin/env node
/**
 * Sondage de l'API DofusDB — à lancer par François lui-même.
 * Usage : node probe-dofusdb.js
 *
 * Interroge quelques endpoints connus avec une petite limite, et sauvegarde
 * les réponses brutes dans dofusdb-probe-result.json pour analyse.
 */

const BASE = 'https://api.dofusdb.fr'

// Endpoints à tester — la doc n'étant pas officielle, certains peuvent
// 404 ou avoir un nom légèrement différent, ce n'est pas grave, le script
// continue et note juste le statut.
const CALLS = [
  { label: 'monstres (3 premiers)', path: '/monsters?lang=fr&$limit=3' },
  { label: 'items (3 premiers, typeId=1)', path: '/items?typeId[$in][]=1&$limit=3' },
  { label: 'donjons (3 premiers)', path: '/dungeons?lang=fr&$limit=3' },
  { label: 'recherche monstre par nom (Bouftou)', path: '/monsters?lang=fr&name.fr[$search]=Bouftou&$limit=5' },
  { label: 'sorts/effets (3 premiers)', path: '/spells?lang=fr&$limit=3' },
]

async function main() {
  console.log(`Sondage de ${BASE} ...\n`)
  const results = []

  for (const call of CALLS) {
    const url = BASE + call.path
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const contentType = res.headers.get('content-type') || ''
      const body = contentType.includes('application/json')
        ? await res.json()
        : (await res.text()).slice(0, 300)
      console.log(`[${res.status}] ${call.label}`)
      results.push({ label: call.label, url, status: res.status, body })
    } catch (err) {
      console.log(`[ERR] ${call.label} — ${err.message}`)
      results.push({ label: call.label, url, error: err.message })
    }
  }

  const fs = await import('fs')
  fs.writeFileSync(
    'dofusdb-probe-result.json',
    JSON.stringify(results, null, 2),
    'utf-8'
  )
  console.log('\nRésultat enregistré dans dofusdb-probe-result.json — envoie-le moi.')
}

main()
