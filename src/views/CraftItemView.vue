<script setup>
import { ref, computed, onMounted } from 'vue'
import { searchCraftableItems, getCraftableItemDetail, getRunesLookup } from '../lib/db.js'
import { computePdb, computeRuneQtyNoFocus, computeRuneQtyWithFocus } from '../lib/dropFormula.js'
import { getPoidsLigne } from '../lib/runeWeights.js'

const query = ref('')
const results = ref([])
const searching = ref(false)
const selected = ref(null)
const loadingDetail = ref(false)
const errorMsg = ref('')
const rawDebug = ref(null)

const runesLookup = ref({ byCharId: {}, byName: {} })
onMounted(async () => { runesLookup.value = await getRunesLookup() })

let searchTimer = null
function onQueryInput() {
  clearTimeout(searchTimer)
  if (query.value.length < 2) { results.value = []; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      results.value = await searchCraftableItems(query.value)
    } catch (e) {
      errorMsg.value = e.message
    } finally {
      searching.value = false
    }
  }, 250)
}

async function selectItem(item) {
  loadingDetail.value = true
  errorMsg.value = ''
  results.value = []
  query.value = item.name
  try {
    const detail = await getCraftableItemDetail(item.item_id)
    rawDebug.value = detail

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
      id: item.item_id,
      name: detail.name,
      level: detail.level,
      imageUrl: detail.image_url,
      marketPrice: detail.latestCoefficient?.prix_estime ?? null,
      coefficient: detail.latestCoefficient?.coefficient ?? null,
      updatedAt: detail.latestCoefficient?.created_at ?? null,
      stats,
    }
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loadingDetail.value = false
  }
}

const marketPrice = computed({
  get: () => selected.value?.marketPrice ?? 0,
  set: (v) => { if (selected.value) selected.value.marketPrice = v },
})
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
  return computeRuneQtyNoFocus(pdb, row.poidsRune, selected.value?.coefficient)
}
function qtyFocus(row) {
  if (!selected.value) return null
  const pdb = pdbOf(row)
  const autresSum = selected.value.stats
    .filter((r) => r.stat !== row.stat)
    .reduce((s, r) => s + (pdbOf(r) ?? 0), 0)
  return computeRuneQtyWithFocus(pdb, autresSum, row.poidsRune, selected.value.coefficient)
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
  <div>
    <p class="info-note">
      Recherche parmi les items déjà importés (script) — aucun appel DoFocus en direct.
      Coefficient/prix rafraîchis via <code>node scripts/refresh-dofocus.js</code>.
    </p>

    <div class="panel-pad top-card">
      <div class="field">
        <div class="field-label">Chercher un item déjà importé</div>
        <input v-model="query" @input="onQueryInput" class="input-small item-search" placeholder="ex. Cape Craqueleuse..." />
        <div v-if="results.length" class="results-dropdown">
          <div v-for="r in results" :key="r.item_id" class="result-item" @click="selectItem(r)">
            {{ r.name }} <span class="muted">niv. {{ r.level }}</span>
          </div>
        </div>
      </div>
      <p v-if="searching" class="muted">Recherche…</p>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </div>

    <p v-if="loadingDetail">Chargement de l'item…</p>

    <template v-if="selected">
      <div class="panel-pad top-card">
        <div class="top-row">
          <div class="field">
            <div class="field-label">Prix de l'item (marché)</div>
            <input type="number" v-model.number="marketPrice" class="input-small price-input" />
          </div>
          <div class="top-stats">
            <div class="stat">
              <div class="stat-label">Coefficient DoFocus</div>
              <div class="stat-value">{{ selected.coefficient ?? '—' }}</div>
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
      </div>

      <div class="panel" v-if="selected.stats.length">
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
        <p v-if="selected.coefficient == null" class="warning">
          ⚠ Aucun coefficient en cache pour cet item — lance le script de refresh pour le récupérer.
        </p>
      </div>

      <details class="debug-panel">
        <summary>Debug — donnée brute stockée pour cet item</summary>
        <pre>{{ JSON.stringify(rawDebug, null, 2) }}</pre>
      </details>
    </template>
  </div>
</template>

<style scoped>
.info-note { font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; }
.top-card { margin-bottom: 16px; position: relative; }
.field-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.item-search { width: 320px; }
.results-dropdown { position: absolute; top: 62px; left: 18px; width: 320px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25); z-index: 20; max-height: 260px; overflow: auto; }
.result-item { padding: 8px 12px; cursor: pointer; font-size: 13px; }
.result-item:hover { background: var(--hover); }
.muted { color: var(--text-secondary); }
.error { color: var(--red); font-size: 12px; }
.top-row { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.price-input { width: 140px; }
.top-stats { display: flex; gap: 28px; text-align: right; }
.stat-label { font-size: 11px; color: var(--text-secondary); }
.stat-value { font-size: 20px; font-weight: 800; }
.stat-value.accent { color: var(--accent); }
.item-identity { display: flex; align-items: center; gap: 14px; }
.item-image { width: 56px; height: 56px; border-radius: 10px; object-fit: contain; background: var(--panel-2); }
.item-image.placeholder { background: var(--panel-2); }
.item-title { font-size: 18px; font-weight: 800; }
.item-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
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
