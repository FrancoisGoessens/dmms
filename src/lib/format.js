// Arrondit à 2 décimales max, sans forcer les zéros inutiles (32 plutôt
// que 32.00, mais 19.97 reste 19.97).
export function formatPercent(val) {
  if (val == null) return null
  return parseFloat(val.toFixed(2))
}

// Tronque un texte au-delà de maxLen caractères (espaces compris), avec
// "..." à la fin. Le texte complet est à passer séparément en title="".
export function truncateText(text, maxLen = 20) {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// Affichage JJ/MM/AAAA à partir d'une date ISO (AAAA-MM-JJ) — la valeur
// stockée en base ne change pas, uniquement l'affichage.
export function formatDateFr(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
