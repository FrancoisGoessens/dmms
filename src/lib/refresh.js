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

// Devine la catégorie d'une rune à partir de son nom de caractéristique —
// heuristique raisonnable, pas une vérité officielle DoFocus. À corriger
// à la main si une rune tombe dans la mauvaise colonne.
function categorizeRune(characteristicName) {
  const name = (characteristicName || '').toLowerCase()
  if (name.startsWith('dommages')) return 'dommages'
  if (name.startsWith('résistance') || name.startsWith('resistance')) return 'resistances'
  const caracKeywords = ['intelligence', 'force', 'chance', 'agilité', 'agilite', 'vitalité', 'vitalite', 'sagesse', 'vie']
  if (caracKeywords.some((k) => name.includes(k))) return 'caracteristiques'
  const caracExtra = ["point d'action", "points d'action", 'point de mouvement', 'points de mouvement', 'portée', 'portee', 'invocation', 'critique']
  if (caracExtra.some((k) => name.includes(k))) return 'caracteristiques'
  return 'secondaires'
}

// Un seul appel DoFocus (pas de boucle) : /api/runes renvoie tout d'un coup,
// prix par serveur inclus. On ne garde que Dakal.
export async function refreshDofocusRunes() {
  const { getDofocusRunes } = await import('./dofocus.js')
  const runes = await getDofocusRunes()

  let updated = 0
  for (const r of runes) {
    const runeId = String(r.id)
    const dakalPrice = r.latestPrices?.find((p) => p.serverName === 'Dakal')?.price
    if (dakalPrice == null) continue

    await supabase.from('cache_runes').upsert({
      id: runeId,
      name: r.name?.fr,
      categorie: categorizeRune(r.characteristicName?.fr),
      weight: r.weight ?? null,
      characteristic_id: r.characteristicId != null ? String(r.characteristicId) : null,
    })
    await supabase.from('rune_price_log').insert({ rune_id: runeId, valeur: dakalPrice })
    updated++
  }
  return { updated, total: runes.length }
}

// Rafraîchit le coefficient + prix DoFocus de tous les items craftables déjà
// connus en base — UNIQUEMENT déclenché par ce clic, jamais en live pendant
// une recherche. Écrit une nouvelle ligne (historique), n'écrase jamais.
export async function refreshDofocusItemCoefficients() {
  const { getDofocusCoefficientHistory } = await import('./dofocus.js')

  const { data: craftables, error } = await supabase.from('cache_craftable_items').select('item_id')
  if (error) throw error
  if (craftables.length === 0) return { updated: 0, failed: 0 }

  let updated = 0, failed = 0
  for (const { item_id } of craftables) {
    try {
      const history = await getDofocusCoefficientHistory(item_id)
      const latest = Array.isArray(history) ? history[history.length - 1] : null
      if (!latest) { failed++; continue }

      await supabase.from('cache_item_coefficients').insert({
        item_id,
        coefficient: latest.coefficient ?? null,
        prix_estime: latest.price ?? latest.marketPrice ?? null,
      })
      updated++
    } catch {
      failed++
    }
    await new Promise((r) => setTimeout(r, 150)) // on ne matraque pas leur serveur
  }
  return { updated, failed }
}

// Fonction appelée par le bouton "F" du header : fait les deux d'un coup.
export async function refreshDoFocusData() {
  const runesResult = await refreshDofocusRunes()
  const itemsResult = await refreshDofocusItemCoefficients()
  return { runesResult, itemsResult }
}
