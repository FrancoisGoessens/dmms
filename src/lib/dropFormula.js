// Formule exacte donnée par François, vérifiée sur son exemple
// (PP 406, drop base 39% -> 92,28%).
export function computeDropWithPP(baseRatePercent, prospection, affectePP = true) {
  if (baseRatePercent == null) return null
  if (affectePP === false) return baseRatePercent

  const multiplicateur = 0.74 + 1.755 / (1 + Math.exp((250 - prospection) / 85))
  const result = baseRatePercent * multiplicateur * 1.05
  return Math.min(100, result)
}

// Poids de brisage (Pdb) d'une ligne de caractéristique — formules
// confirmées par François (vérifiées sur plusieurs exemples croisés).
export function computePdb(jet, poidsLigne, niveauItem) {
  if (jet == null || poidsLigne == null || niveauItem == null) return null
  const raw = (3 * jet * poidsLigne * niveauItem) / 200 + 1
  return jet < 0 ? raw / 10 : raw
}

// Quantité de runes obtenues sur UNE ligne, sans focus.
export function computeRuneQtyNoFocus(pdbLigne, poidsRune, coefficientPercent) {
  if (pdbLigne == null || !poidsRune || coefficientPercent == null) return null
  return (pdbLigne / poidsRune) * (coefficientPercent / 100)
}

// Quantité de runes sur la ligne focalisée : elle-même compte à 100%,
// toutes les autres lignes ne contribuent qu'à 50% (additionnées avant division).
export function computeRuneQtyWithFocus(pdbFocus, pdbAutresSum, poidsRuneFocus, coefficientPercent) {
  if (pdbFocus == null || !poidsRuneFocus || coefficientPercent == null) return null
  return ((pdbFocus + 0.5 * (pdbAutresSum ?? 0)) / poidsRuneFocus) * (coefficientPercent / 100)
}
