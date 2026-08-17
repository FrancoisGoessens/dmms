#!/usr/bin/env node
/**
 * Refresh DoFocus (runes + coefficients des items craftables) — à lancer
 * par François, depuis son réseau maison (IP whitelistée par DoFocus).
 *
 * Pourquoi un script et pas le bouton dans l'app : DoFocus ne renvoie pas
 * d'en-tête CORS, donc AUCUN navigateur ne peut lire leurs réponses, peu
 * importe l'IP. Node n'est pas un navigateur, CORS ne s'applique pas ici —
 * ce script écrit directement dans Supabase.
 *
 * Usage : node refresh-dofocus.js
 * Prérequis : un fichier .env à côté de ce script (ou dans le dossier
 * racine du projet) avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY,
 * + un compte Supabase Auth valide (email/mot de passe) pour passer la RLS.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

// --- Chargement simple du .env (sans dépendance dotenv) ---
function loadEnv(path) {
  if (!existsSync(path)) return {}
  const content = readFileSync(path, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}
const env = { ...loadEnv('.env'), ...loadEnv('../.env') }

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_EMAIL = env.SUPABASE_EMAIL || process.env.SUPABASE_EMAIL
const SUPABASE_PASSWORD = env.SUPABASE_PASSWORD || process.env.SUPABASE_PASSWORD
const DOFOCUS_BASE = 'https://dofocus.fr/api'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY introuvables — vérifie ton .env.')
  process.exit(1)
}
if (!SUPABASE_EMAIL || !SUPABASE_PASSWORD) {
  console.error(
    "SUPABASE_EMAIL / SUPABASE_PASSWORD introuvables dans .env.\n" +
    "Ajoute ces deux lignes dans ton .env (le compte que tu utilises pour te connecter sur le site) :\n" +
    "SUPABASE_EMAIL=...\nSUPABASE_PASSWORD=..."
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function categorizeRune(characteristicName) {
  const name = (characteristicName || '').toLowerCase()
  if (name.startsWith('dommages')) return 'dommages'
  if (name.startsWith('résistance') || name.startsWith('resistance')) return 'resistances'
  const carac = ['intelligence', 'force', 'chance', 'agilité', 'agilite', 'vitalité', 'vitalite', 'sagesse', 'vie']
  if (carac.some((k) => name.includes(k))) return 'caracteristiques'
  const extra = ["point d'action", "points d'action", 'point de mouvement', 'points de mouvement', 'portée', 'portee', 'invocation', 'critique']
  if (extra.some((k) => name.includes(k))) return 'caracteristiques'
  return 'secondaires'
}

async function refreshRunes() {
  console.log('Récupération des runes...')
  const res = await fetch(`${DOFOCUS_BASE}/runes`)
  const runes = await res.json()

  let updated = 0, failed = 0
  for (const r of runes) {
    const runeId = String(r.id)
    const dakalPrice = r.latestPrices?.find((p) => p.serverName === 'Dakal')?.price
    if (dakalPrice == null) continue

    const { error: e1 } = await supabase.from('cache_runes').upsert({
      id: runeId,
      name: r.name?.fr,
      categorie: categorizeRune(r.characteristicName?.fr),
      weight: r.weight ?? null,
      characteristic_id: r.characteristicId != null ? String(r.characteristicId) : null,
    })
    const { error: e2 } = await supabase.from('rune_price_log').insert({ rune_id: runeId, valeur: dakalPrice })

    if (e1 || e2) {
      failed++
      if (failed <= 3) console.error(`  Échec rune ${r.name?.fr} :`, (e1 || e2).message)
    } else {
      updated++
    }
  }
  console.log(`Runes : ${updated}/${runes.length} mises à jour${failed ? ` (${failed} échec(s))` : ''}.`)
}

async function refreshItemCoefficients() {
  console.log('Récupération des items craftables déjà importés...')

  // Supabase plafonne à 1000 lignes par requête par défaut — on pagine
  // pour vraiment tous les récupérer.
  let craftables = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('cache_craftable_items')
      .select('item_id')
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('Impossible de lire cache_craftable_items :', error.message)
      return
    }
    craftables.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  if (craftables.length === 0) {
    console.log('Aucun item craftable en base — as-tu bien lancé migration_016_craftable_items_data.sql ?')
    return
  }
  console.log(`${craftables.length} items à traiter.`)

  let updated = 0, failed = 0
  for (let i = 0; i < craftables.length; i++) {
    const { item_id } = craftables[i]
    try {
      const [detailRes, coeffRes] = await Promise.all([
        fetch(`${DOFOCUS_BASE}/items/${item_id}`),
        fetch(`${DOFOCUS_BASE}/items/${item_id}/coefficients/history?serverName=Dakal`),
      ])
      const detail = await detailRes.json()
      const history = await coeffRes.json()
      const latest = Array.isArray(history) ? history[history.length - 1] : null

      const { error: e1 } = await supabase.from('cache_craftable_items').update({
        characteristics: detail.characteristics ?? null,
        image_url: detail.imageUrl ?? null,
      }).eq('item_id', String(item_id))

      if (latest) {
        const { error: e2 } = await supabase.from('cache_item_coefficients').insert({
          item_id: String(item_id),
          coefficient: latest.coefficient ?? null,
          prix_estime: latest.price ?? latest.marketPrice ?? null,
        })
        if (e1 || e2) {
          failed++
          if (failed <= 3) console.error(`  Échec item ${item_id} :`, (e1 || e2).message)
        } else {
          updated++
        }
      } else {
        failed++
      }
    } catch (e) {
      failed++
      if (failed <= 3) console.error(`  Échec item ${item_id} :`, e.message)
    }
    await new Promise((r) => setTimeout(r, 150)) // on ne matraque pas leur serveur
    if ((i + 1) % 50 === 0 || i === craftables.length - 1) {
      console.log(`  ... ${i + 1}/${craftables.length} traités (${updated} ok, ${failed} échecs)`)
    }
  }
  console.log(`Items craftables : ${updated} mis à jour, ${failed} échec(s).`)
}

async function main() {
  console.log('Connexion à Supabase...')
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: SUPABASE_EMAIL, password: SUPABASE_PASSWORD,
  })
  if (authError) {
    console.error('Échec de connexion Supabase :', authError.message)
    process.exit(1)
  }
  console.log('Connecté.\n')

  await refreshRunes()
  await refreshItemCoefficients()
  console.log('\nTerminé.')
}

main()
