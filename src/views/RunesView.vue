<script setup>
import { ref, computed } from 'vue'

const RUNE_SEED = [
  { name: 'Rune Do Terre', cat: 'dommages', price: 1215 }, { name: 'Rune Do Feu', cat: 'dommages', price: 980 },
  { name: 'Rune Do Eau', cat: 'dommages', price: 1100 }, { name: 'Rune Do Air', cat: 'dommages', price: 1230 },
  { name: 'Rune Ré Per Terre', cat: 'resistances', price: 1450 }, { name: 'Rune Ré Per Feu', cat: 'resistances', price: 1100 },
  { name: 'Rune Ré Per Eau', cat: 'resistances', price: 1393 },
  { name: 'Rune Ga Pa', cat: 'caracteristiques', price: 23499 }, { name: 'Rune Ga Pme', cat: 'caracteristiques', price: 22200 },
  { name: 'Rune Invo', cat: 'caracteristiques', price: 4900 }, { name: 'Rune Cri', cat: 'caracteristiques', price: 2420 },
  { name: 'Rune de chasse', cat: 'secondaires', price: 12696 }, { name: 'Rune Do Ren', cat: 'secondaires', price: 279 },
  { name: 'Rune Ini', cat: 'secondaires', price: 74 }, { name: 'Rune Prospe', cat: 'secondaires', price: 440 },
]
const CATEGORIES = [
  { id: 'dommages', label: 'Dommages' }, { id: 'resistances', label: 'Résistances' },
  { id: 'caracteristiques', label: 'Caractéristiques' }, { id: 'secondaires', label: 'Secondaires' },
]

const columns = computed(() =>
  CATEGORIES.map((c) => ({ ...c, rows: RUNE_SEED.filter((r) => r.cat === c.id) }))
)

const selected = ref(null)
const duration = ref('3m')
function openRune(rune) { selected.value = rune; duration.value = '3m' }
</script>

<template>
  <div>
    <div class="grid">
      <div v-for="col in columns" :key="col.id" class="panel">
        <div class="col-head">{{ col.label }}</div>
        <div v-for="r in col.rows" :key="r.name" class="rune-row" @click="openRune(r)">
          <div class="rune-icon">{{ r.name.replace('Rune ', '').slice(0, 3) }}</div>
          <div class="rune-info">
            <div class="rune-name">{{ r.name }}</div>
            <div class="rune-date">13/08/2026 · à jour</div>
          </div>
          <div class="rune-price">{{ r.price.toLocaleString('fr-FR') }}</div>
        </div>
      </div>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ selected.name }}</div>
          <div class="segmented">
            <div v-for="d in ['1m', '3m', '6m', '1y']" :key="d" :class="{ active: duration === d }" @click="duration = d">
              {{ { '1m': '1M', '3m': '3M', '6m': '6M', '1y': '1A' }[d] }}
            </div>
          </div>
        </div>
        <div class="modal-stats">
          <div class="stat-card"><div class="stat-label">Prix min enregistré</div><div class="stat-value">{{ Math.round(selected.price * 0.8).toLocaleString('fr-FR') }} k</div></div>
          <div class="stat-card"><div class="stat-label">Prix max enregistré</div><div class="stat-value">{{ Math.round(selected.price * 1.25).toLocaleString('fr-FR') }} k</div></div>
        </div>
        <div class="modal-graph">Graph d'évolution — branché sur rune_price_log</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: start; }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.col-head { padding: 12px 16px; font-size: 13px; font-weight: 700; border-bottom: 1px solid var(--border); }
.rune-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); cursor: pointer; }
.rune-row:hover { background: var(--hover); }
.rune-icon { width: 26px; height: 26px; border-radius: 6px; background: var(--panel-2); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0; }
.rune-info { flex: 1; min-width: 0; }
.rune-name { font-size: 12px; font-weight: 600; }
.rune-date { font-size: 10px; color: var(--text-secondary); }
.rune-price { font-size: 12px; font-weight: 700; background: var(--panel-2); padding: 4px 8px; border-radius: 6px; }
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
