import { supabase } from './supabase.js'

const DOFUSDB_BASE = 'https://api.dofusdb.fr'

// Rafraîchit les items déjà en cache (pas une nouvelle exploration complète —
// ça reste le rôle du script scripts/import-dofusdb.js). Utile après une MAJ
// du jeu, pour resynchroniser les données statiques (nom, niveau, etc.).
export async function refreshDofusDbCache() {
  const { data: cachedItems, error: e1 } = await supabase.from('cache_items').select('id')
  if (e1) throw e1

  // On exclut nos pseudo-items de capture ("capture-6212"...) qui n'existent
  // pas côté DofusDB — les envoyer fait planter leur API.
  const ids = cachedItems.map((i) => i.id).filter((id) => /^\d+$/.test(id))
  if (ids.length === 0) return { updated: 0 }

  let updated = 0
  const CHUNK = 40 // évite une URL trop longue
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const query = chunk.map((id) => `id[$in][]=${id}`).join('&')
    const res = await fetch(`${DOFUSDB_BASE}/items?${query}&lang=fr&$limit=${chunk.length}`)
    const json = await res.json()

    if (!Array.isArray(json.data)) {
      console.warn('Réponse DofusDB inattendue pour ce lot :', json)
      continue
    }
    for (const item of json.data) {
      await supabase.from('cache_items').update({ name: item.name.fr }).eq('id', String(item.id))
      updated++
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  return { updated }
}

// TODO : à compléter dès que la vraie forme de l'API DoFocus est connue
// (cf. scripts/probe-dofocus.js, en attente de l'accès whitelisté). Doit
// écrire une ligne par item dans cache_item_coefficients et une ligne par
// rune dans rune_price_log — jamais écraser, toujours ajouter (historique).
export async function refreshDoFocusData() {
  throw new Error("Pas encore branché — en attente de l'accès API DoFocus.")
}
