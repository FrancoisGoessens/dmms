<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRunesWithLatestPrice, getRunePriceHistory } from '../lib/db.js'

const CATEGORIES = [
  { id: 'dommages', label: 'Dommages' }, { id: 'resistances', label: 'Résistances' },
  { id: 'caracteristiques', label: 'Caractéristiques' }, { id: 'secondaires', label: 'Secondaires' },
]

const loading = ref(true)
const allRunes = ref([])

async function load() {
  loading.value = true
  allRunes.value = await getRunesWithLatestPrice()
  loading.value = false
}
onMounted(load)

const columns = computed(() =>
  CATEGORIES.map((c) => ({ ...c, rows: allRunes.value.filter((r) => r.categorie === c.id) }))
)

const selected = ref(null)
const history = ref([])
const duration = ref('3m')
const durationDays = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 }

async function openRune(rune) {
  selected.value = rune
  duration.value = '3m'
  await loadHistory()
}
async function loadHistory() {
  const all = await getRunePriceHistory(selected.value.id)
  const cutoff = Date.now() - durationDays[duration.value] * 86400000
  history.value = all.filter((h) => new Date(h.created_at).getTime() >= cutoff).reverse()
}
function selectDuration(d) { duration.value = d; loadHistory() }

const stats = computed(() => {
  if (history.value.length === 0) return { min: 0, max: 0 }
  const values = history.value.map((h) => h.valeur)
  return { min: Math.min(...values), max: Math.max(...values) }
})
</script>

<template>
  <div>
    <p v-if="loading">Chargement…</p>
    <div v-else class="grid">
      <div v-for="col in columns" :key="col.id" class="panel">
        <div class="col-head">{{ col.label }}</div>
        <div v-for="r in col.rows" :key="r.id" class="rune-row" @click="openRune(r)">
          <div class="rune-icon">{{ r.name.replace('Rune ', '').slice(0, 3) }}</div>
          <div class="rune-info">
            <div class="rune-name">{{ r.name }}</div>
            <div class="rune-date">{{ r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : 'jamais' }}</div>
          </div>
          <div class="rune-price">{{ r.price == null ? '—' : r.price.toLocaleString('fr-FR') }}</div>
        </div>
        <div v-if="col.rows.length === 0" class="empty-col">Rien — lance le refresh DoFocus</div>
      </div>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ selected.name }}</div>
          <div class="segmented">
            <div v-for="d in ['1m', '3m', '6m', '1y']" :key="d" :class="{ active: duration === d }" @click="selectDuration(d)">
              {{ { '1m': '1M', '3m': '3M', '6m': '6M', '1y': '1A' }[d] }}
            </div>
          </div>
        </div>
        <div class="modal-stats">
          <div class="stat-card"><div class="stat-label">Prix min</div><div class="stat-value">{{ stats.min.toLocaleString('fr-FR') }} k</div></div>
          <div class="stat-card"><div class="stat-label">Prix max</div><div class="stat-value">{{ stats.max.toLocaleString('fr-FR') }} k</div></div>
        </div>
        <div class="modal-graph">{{ history.length }} point(s) sur la période — serveur Dakal</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: start; }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.col-head { padding: 12px 16px; font-size: 13px; font-weight: 700; border-bottom: 1px solid var(--border); }
.rune-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.rune-row:hover { background: var(--hover); }
.rune-icon { width: 26px; height: 26px; border-radius: 6px; background: var(--panel-2); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0; }
.rune-info { flex: 1; min-width: 0; }
.rune-name { font-size: 12px; font-weight: 600; }
.rune-date { font-size: 10px; color: var(--text-secondary); }
.rune-price { font-size: 12px; font-weight: 700; background: var(--panel-2); padding: 4px 8px; border-radius: 6px; }
.empty-col { font-size: 11px; color: var(--text-secondary); font-style: italic; padding: 10px 16px; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 30; }
.modal { width: 420px; background: var(--panel); border-radius: 14px; padding: 24px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-title { font-size: 16px; font-weight: 700; }
.segmented { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.segmented div { font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
.segmented div.active { background: var(--accent); color: #fff; }
.modal-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.stat-card { background: var(--panel-2); border-radius: 10px; padding: 12px; }
.stat-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: 800; }
.modal-graph { background: var(--panel-2); border-radius: 8px; padding: 30px; text-align: center; font-size: 11px; color: var(--text-secondary); }
</style>
