// Formule exacte donnée par François, vérifiée sur son exemple
// (PP 406, drop base 39% -> 92,28%).
export function computeDropWithPP(baseRatePercent, prospection, affectePP = true) {
  if (baseRatePercent == null) return null
  if (affectePP === false) return baseRatePercent

  const multiplicateur = 0.74 + 1.755 / (1 + Math.exp((250 - prospection) / 85))
  const result = baseRatePercent * multiplicateur * 1.05
  return Math.min(100, result)
}
