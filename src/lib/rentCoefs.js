import { reactive, watch } from 'vue'

const STORAGE_KEY = 'dmms_rent_coefs'

const DEFAULTS = { capture: 1, drop: 1, levelPenalty: 0.004 }

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export const rentCoefs = reactive(load())

watch(
  rentCoefs,
  (val) => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)),
  { deep: true }
)

export const rentCoefFields = [
  { key: 'capture', label: 'Poids valeur de capture', min: 0, max: 2, step: 0.1 },
  { key: 'drop', label: 'Poids valeur des drops', min: 0, max: 2, step: 0.1 },
  { key: 'levelPenalty', label: 'Pénalité de niveau', min: 0, max: 0.02, step: 0.001 },
]

// Formule provisoire — pas encore réfléchie en détail, juste de quoi rendre
// les 3 curseurs utiles en attendant mieux.
export function applyRentCoefs(netCapture, dropValue, dungeonLevel) {
  const raw = netCapture * rentCoefs.capture + dropValue * rentCoefs.drop
  const penalty = 1 - (dungeonLevel || 0) * rentCoefs.levelPenalty
  return raw * Math.max(0, penalty)
}
