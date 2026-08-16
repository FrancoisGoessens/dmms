// Poids de ligne fixes, donnés par François (table communautaire) — ne
// dépendent d'aucun appel API, juste du nom de la caractéristique.
const WEIGHT_TABLE = [
  { keywords: ["points d'action", 'ga pa'], weight: 100 },
  { keywords: ['points de mouvement', 'ga pm'], weight: 90 },
  { keywords: ['portée'], weight: 51 },
  { keywords: ['invocation'], weight: 30 },
  { keywords: ['dommages perte', 'do per'], weight: 15 },
  { keywords: ['résistance perte', 'ré per'], weight: 15 },
  { keywords: ['dommages'], weight: 20 }, // avant les lignes plus spécifiques ci-dessous
  { keywords: ['soin'], weight: 10 },
  { keywords: ['critique'], weight: 10 }, // % critique — écrasé plus bas si "dommage critique"
  { keywords: ['renvoi de dommage'], weight: 10 },
  { keywords: ['retrait pm', 'retrait pa'], weight: 7 },
  { keywords: ['esquive pm', 'esquive pa', 'ré pm', 'ré pa'], weight: 7 },
  { keywords: ['résistance terre', 'résistance eau', 'résistance neutre', 'résistance feu', 'résistance air', '% résistance'], weight: 6 },
  { keywords: ['dommages terre', 'dommages eau', 'dommages neutre', 'dommages feu', 'dommages air'], weight: 5 },
  { keywords: ['dommages critique'], weight: 5 },
  { keywords: ['dommages de poussée', 'dommages poussée'], weight: 5 },
  { keywords: ['dommages piège'], weight: 5 },
  { keywords: ['chasse'], weight: 5 },
  { keywords: ['tacle'], weight: 4 },
  { keywords: ['fuite'], weight: 4 },
  { keywords: ['prospection'], weight: 3 },
  { keywords: ['sagesse'], weight: 3 },
  { keywords: ['puissance piège'], weight: 2 },
  { keywords: ['puissance'], weight: 2 },
  { keywords: ['résistance fixe'], weight: 2 },
  { keywords: ['résistance critique'], weight: 2 },
  { keywords: ['résistance poussée'], weight: 2 },
  { keywords: ['force', 'intelligence', 'chance', 'agilité'], weight: 1 },
  { keywords: ['pods'], weight: 0.25 },
  { keywords: ['vitalité'], weight: 0.2 },
]

export function getPoidsLigne(statName) {
  if (!statName) return null
  const raw = statName.toLowerCase()
  for (const entry of WEIGHT_TABLE) {
    if (entry.keywords.some((k) => raw.includes(k))) return entry.weight
  }
  return null
}
