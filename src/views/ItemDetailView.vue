<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getCraftableItemDetail, getRunesLookup,
  getLatestCraftItemPrice, insertCraftItemPrice,
} from '../lib/db.js'
import {
  computePdb, computeRuneQtyNoFocus, computeRuneQtyWithFocus,
  COEFFICIENT_ESTIMATE_LOW, COEFFICIENT_ESTIMATE_HIGH,
} from '../lib/dropFormula.js'
import { getPoidsLigne } from '../lib/runeWeights.js'

function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const props = defineProps(['id'])
const router = useRouter()

const loading = ref(true)
const loadError = ref(null)
const selected = ref(null)
const rawDebug = ref(null)

const runesLookup = ref({ byCharId: {}, byName: {} })

// Fourchette DoFocus : seulement pertinente si l'item n'a AUCUN coefficient
// réel en cache. Toggle purement local à la page, jamais écrit en base —
// le jour où refresh-dofocus.js ramène un vrai coefficient pour cet item,
// hasRealCoeff repasse à true tout seul et le toggle disparaît.
const estimateBound = ref(COEFFICIENT_ESTIMATE_LOW)
const hasRealCoeff = computed(() => selected.value?.realCoefficient != null)
const effectiveCoefficient = computed(() => {
  if (!selected.value) return null
  return hasRealCoeff.value ? selected.value.realCoefficient : estimateBound.value
})

async function load() {
  loading.value = true
  loadError.value = null
  selected.value = null
  try {
    const [detail, manualPrice] = await Promise.all([
      getCraftableItemDetail(props.id),
      getLatestCraftItemPrice(props.id),
    ])
    runesLookup.value = await getRunesLookup()
    if (!detail) {
      loadError.value = `Cet item (id "${props.id}") n'existe pas dans cache_craftable_items — pas encore importé via scripts/import-craftable-items.js.`
      return
    }
    rawDebug.value = detail

    // Le prix affiché est le plus RÉCENT des deux sources, peu importe
    // laquelle — DoFocus (cache_item_coefficients) ou une saisie manuelle
    // validée depuis cette page. Le coefficient, lui, ne vient jamais que
    // de DoFocus (pas de notion de "coefficient saisi à la main").
    const coeffPrice = detail.latestCoefficient?.prix_estime ?? null
    const coeffPriceAt = detail.latestCoefficient?.created_at ?? null
    const manualAt = manualPrice?.created_at ?? null
    const manualIsNewer = manualAt && (!coeffPriceAt || new Date(manualAt) > new Date(coeffPriceAt))
    const effectivePrice = manualIsNewer ? manualPrice.valeur : coeffPrice
    const effectivePriceAt = manualIsNewer ? manualAt : coeffPriceAt

    const stats = (detail.characteristics || []).map((c) => {
      const min = c.min ?? c.jetMin ?? 0
      const max = c.max ?? c.jetMax ?? 0
      const charId = c.characteristicId != null ? String(c.characteristicId) : null
      const rune = (charId && runesLookup.value.byCharId[charId])
        || runesLookup.value.byName[c.rune?.name?.fr || c.runeName || c.rune]
        || null
      return {
        stat: c.characteristic || c.name || c.label || '—',
        min, max,
        jet: Math.round((min + max) / 2),
        runeName: rune?.name || c.runeName || c.rune?.name?.fr || '—',
        poidsRune: rune?.weight ?? null,
        price: rune?.price ?? 0,
        poidsLigne: getPoidsLigne(c.characteristic || c.name || c.label),
      }
    })

    selected.value = {
      id: props.id,
      name: detail.name,
      level: detail.level,
      imageUrl: detail.image_url,
      marketPrice: effectivePrice ?? 0,
      marketPriceUpdatedAt: effectivePriceAt,
      realCoefficient: detail.latestCoefficient?.coefficient ?? null,
      updatedAt: detail.latestCoefficient?.created_at ?? null,
      stats,
    }
    estimateBound.value = COEFFICIENT_ESTIMATE_LOW
  } catch (e) {
    console.error('Erreur au chargement de la fiche item :', e)
    loadError.value = 'Erreur inattendue au chargement de cette fiche — regarde la console pour le détail.'
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })

const marketPrice = computed({
  get: () => selected.value?.marketPrice ?? 0,
  set: (v) => { if (selected.value) selected.value.marketPrice = v },
})
const priceDaysAgo = computed(() => daysAgo(selected.value?.marketPriceUpdatedAt))

async function validatePrice() {
  if (!selected.value) return
  await insertCraftItemPrice(props.id, selected.value.marketPrice, session.characterId)
  selected.value.marketPriceUpdatedAt = new Date().toISOString()
}

const focusedStat = ref(null)

function dec(row) { row.jet = Math.max(0, row.jet - 1) }
function inc(row) { row.jet++ }
function isOver(row) { return row.jet > row.max }
function isUnder(row) { return row.jet < row.min }

function pdbOf(row) {
  if (!selected.value?.level) return null
  return computePdb(row.jet, row.poidsLigne, selected.value.level)
}
function qtyNoFocus(row) {
  const pdb = pdbOf(row)
  return computeRuneQtyNoFocus(pdb, row.poidsRune, effectiveCoefficient.value)
}
function qtyFocus(row) {
  if (!selected.value) return null
  const pdb = pdbOf(row)
  const autresSum = selected.value.stats
    .filter((r) => r.stat !== row.stat)
    .reduce((s, r) => s + (pdbOf(r) ?? 0), 0)
  return computeRuneQtyWithFocus(pdb, autresSum, row.poidsRune, effectiveCoefficient.value)
}
function kamas(qty, price) { return qty == null ? null : Math.floor(qty) * price }

const totalNoFocus = computed(() => {
  if (!selected.value) return 0
  return selected.value.stats.reduce((s, r) => {
    const v = kamas(qtyNoFocus(r), r.price || 0)
    return s + (v || 0)
  }, 0)
})
</script>

<template>
  <div class="detail-error" v-if="!loading && loadError">
    <a href="#" class="back" @click.prevent="router.back()">← Retour</a>
    <p class="error-text">⚠ {{ loadError }}</p>
  </div>

  <div v-else-if="!loading && selected">
    <a href="#" class="back" @click.prevent="router.back()">← Retour</a>
    <p class="info-note">
      Donnée déjà importée (script) — aucun appel DoFocus en direct.
      Coefficient/prix rafraîchis via <code>node scripts/refresh-dofocus.js</code>.
    </p>

    <div class="panel-pad top-card">
      <div class="top-row">
        <div class="field">
          <div class="field-label">Prix de l'item (marché)</div>
          <div class="price-input-row">
            <input type="number" v-model.number="marketPrice" class="input-small price-input" @keydown.enter="validatePrice" />
            <button class="validate-btn" @click="validatePrice" title="Valider ce prix">✓</button>
          </div>
          <div class="price-days">{{ priceDaysAgo == null ? 'jamais mis à jour' : `maj il y a ${priceDaysAgo} j` }}</div>
        </div>
        <div class="top-stats">
          <div class="stat">
            <div class="stat-label">Coefficient</div>
            <div v-if="hasRealCoeff" class="stat-value">{{ selected.realCoefficient }}</div>
            <div v-else class="estimate-toggle">
              <div class="estimate-btn" :class="{ active: estimateBound === 50 }" @click="estimateBound = 50">50%</div>
              <div class="estimate-btn" :class="{ active: estimateBound === 100 }" @click="estimateBound = 100">100%</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Estimation (sans focus)</div>
            <div class="stat-value accent">{{ totalNoFocus.toLocaleString('fr-FR') }} k</div>
          </div>
        </div>
      </div>
      <div class="item-identity">
        <img v-if="selected.imageUrl" :src="selected.imageUrl" class="item-image" />
        <div v-else class="item-image placeholder"></div>
        <div>
          <div class="item-title">{{ selected.name }}</div>
          <div class="item-sub">
            Niveau {{ selected.level }}
            <span v-if="selected.updatedAt" class="muted"> · coeff. rafraîchi le {{ new Date(selected.updatedAt).toLocaleDateString('fr-FR') }}</span>
            <span v-else class="muted"> · jamais rafraîchi</span>
          </div>
        </div>
      </div>
      <p v-if="!hasRealCoeff" class="estimate-warning">
        ⚠ Pas de coefficient DoFocus pour cet item — tous les résultats ci-dessous sont calculés
        avec une fourchette estimée ({{ estimateBound }}%), <strong>pas une vraie donnée</strong>.
        Si DoFocus référence un jour cet item, le vrai coefficient prendra le relais automatiquement.
      </p>
    </div>

    <div class="panel" v-if="selected.stats.length" :class="{ 'is-estimate': !hasRealCoeff }">
      <div class="table-grid table-head">
        <div>Caractéristique</div>
        <div>Jet (min · valeur · max)</div>
        <div>Rune</div>
        <div class="band band-no-focus group-head">Sans focus</div>
        <div class="band band-focus group-head">Avec focus</div>
      </div>
      <div v-for="row in selected.stats" :key="row.stat" class="table-grid table-row">
        <div class="stat-name">{{ row.stat }}</div>
        <div class="jet-cell">
          <span class="muted">{{ row.min }}</span>
          <button class="step-btn" @click="dec(row)">−</button>
          <input type="number" class="jet-input" :class="{ over: isOver(row), under: isUnder(row) }" v-model.number="row.jet" />
          <button class="step-btn" @click="inc(row)">+</button>
          <span class="muted">{{ row.max }}</span>
        </div>
        <div class="rune-cell">
          <div class="rune-icon" :class="{ focused: focusedStat === row.stat }" @click="focusedStat = focusedStat === row.stat ? null : row.stat">
            {{ row.runeName.slice(0, 3) }}
          </div>
          {{ row.runeName }}
        </div>
        <div class="band band-no-focus right">
          {{ qtyNoFocus(row) == null ? '—' : Math.floor(qtyNoFocus(row)) }}
          <span v-if="qtyNoFocus(row) != null" class="kamas-sub">{{ kamas(qtyNoFocus(row), row.price).toLocaleString('fr-FR') }} k</span>
        </div>
        <div class="band band-focus right">
          {{ qtyFocus(row) == null ? '—' : Math.floor(qtyFocus(row)) }}
          <span v-if="qtyFocus(row) != null" class="kamas-sub">{{ kamas(qtyFocus(row), row.price).toLocaleString('fr-FR') }} k</span>
        </div>
      </div>
      <p v-if="selected.stats.some(r => r.poidsLigne == null)" class="warning">
        ⚠ Caractéristique non reconnue dans la table de poids pour au moins une ligne.
      </p>
    </div>

    <details class="debug-panel">
      <summary>Debug — donnée brute stockée pour cet item</summary>
      <pre>{{ JSON.stringify(rawDebug, null, 2) }}</pre>
    </details>
  </div>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.back { font-size: 12px; display: inline-block; margin-bottom: 14px; }
.detail-error { max-width: 1200px; }
.error-text { font-size: 13px; color: var(--red); background: color-mix(in oklch, var(--red) 10%, transparent); border-radius: 10px; padding: 16px; }
.info-note { font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; }
.top-card { margin-bottom: 16px; position: relative; }
.field-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.muted { color: var(--text-secondary); }
.top-row { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.price-input-row { display: flex; gap: 4px; align-items: center; }
.price-input { width: 120px; font-size: 14px; font-weight: 700; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; background: var(--input); color: var(--text); }
.validate-btn { width: 26px; height: 26px; flex-shrink: 0; border-radius: 6px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.price-days { font-size: 10px; color: var(--text-secondary); margin-top: 4px; }
.top-stats { display: flex; gap: 28px; text-align: right; }
.stat-label { font-size: 11px; color: var(--text-secondary); }
.stat-value { font-size: 20px; font-weight: 800; }
.stat-value.accent { color: var(--accent); }
.estimate-toggle { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.estimate-btn { font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
.estimate-btn.active { background: var(--amber); color: #1a1200; }
.estimate-warning { font-size: 11px; color: var(--amber); background: color-mix(in oklch, var(--amber) 12%, transparent); border-radius: 8px; padding: 10px 12px; margin-top: 12px; }
.item-identity { display: flex; align-items: center; gap: 14px; }
.item-image { width: 56px; height: 56px; border-radius: 10px; object-fit: contain; background: var(--panel-2); }
.item-image.placeholder { background: var(--panel-2); }
.item-title { font-size: 18px; font-weight: 800; }
.item-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.panel.is-estimate { border: 1px solid color-mix(in oklch, var(--amber) 40%, var(--border)); }
.table-grid { display: grid; grid-template-columns: 1.3fr 1.8fr 1fr 1fr 1fr; align-items: center; }
.table-grid > div { padding: 10px; }
.table-head { font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.table-row { border-top: 1px solid var(--border-light); font-size: 13px; }
.right { text-align: right; }
.stat-name { font-weight: 600; }
.jet-cell { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.jet-input { width: 44px; font-size: 13px; font-weight: 700; text-align: center; padding: 2px; border: 1px solid var(--border); border-radius: 6px; background: var(--input); color: var(--text); }
.jet-input.over { color: var(--amber); border-color: var(--amber); }
.jet-input.under { color: var(--info); border-color: var(--info); }
.step-btn { width: 22px; height: 22px; border-radius: 6px; background: var(--panel-2); border: none; cursor: pointer; font-weight: 700; color: var(--text); }
.rune-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.rune-icon { width: 26px; height: 26px; border-radius: 6px; background: var(--panel-2); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: var(--text-secondary); cursor: pointer; }
.rune-icon.focused { background: var(--soft-accent-bg); color: var(--accent-text); }
.band-no-focus { background: var(--panel-2); }
.band-focus { background: var(--soft-accent-bg); }
.kamas-sub { display: block; font-size: 10px; color: var(--text-secondary); font-weight: 600; }
.warning { font-size: 11px; color: var(--amber); padding: 10px 16px; }
.debug-panel { margin-top: 16px; font-size: 11px; color: var(--text-secondary); }
.debug-panel pre { background: var(--panel-2); padding: 12px; border-radius: 8px; overflow: auto; max-height: 300px; }
</style>
