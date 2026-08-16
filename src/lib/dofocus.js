const BASE = 'https://dofocus.fr/api'
const SERVER = 'Dakal'

export async function searchDofocusItems(query, limit = 20) {
  const params = new URLSearchParams({
    q: query, limit: String(limit), lang: 'fr',
    fields: 'id name.fr level imageUrl type supertype characteristics',
  })
  const res = await fetch(`${BASE}/items?${params}`)
  if (!res.ok) throw new Error(`DoFocus search a échoué (${res.status})`)
  return res.json()
}

export async function getDofocusItem(id) {
  const res = await fetch(`${BASE}/items/${id}`)
  if (!res.ok) throw new Error(`DoFocus item introuvable (${res.status})`)
  return res.json()
}

export async function getDofocusRunes() {
  const res = await fetch(`${BASE}/runes`)
  if (!res.ok) throw new Error(`DoFocus runes indisponible (${res.status})`)
  return res.json()
}

export async function getDofocusCoefficientHistory(id, serverName = SERVER) {
  const params = new URLSearchParams({ serverName })
  const res = await fetch(`${BASE}/items/${id}/coefficients/history?${params}`)
  if (!res.ok) throw new Error(`DoFocus coefficient indisponible (${res.status})`)
  return res.json()
}
