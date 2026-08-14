<script setup>
import { ref, onMounted } from 'vue'
import { session } from '../lib/session.js'
import { getSales, countDoneDungeons, countCapturedDungeons } from '../lib/db.js'

const period = ref('30') // '7' | '30' | 'all'
const loading = ref(true)
const totalKamas = ref(0)
const salesCount = ref(0)
const doneCount = ref(0)
const capturedCount = ref(0)

async function load() {
  loading.value = true
  const since =
    period.value === 'all'
      ? null
      : new Date(Date.now() - Number(period.value) * 86400000).toISOString()

  const sales = await getSales(since)
  totalKamas.value = sales.reduce((sum, s) => sum + s.valeur * (s.quantite || 1), 0)
  salesCount.value = sales.length

  doneCount.value = await countDoneDungeons(session.characterId)
  capturedCount.value = await countCapturedDungeons(session.characterId)

  loading.value = false
}

onMounted(load)
</script>

<template>
  <div>
    <div class="header-row">
      <h1 class="title">Insights</h1>
      <div class="segmented">
        <div :class="{ active: period === '7' }" @click="period = '7'; load()">7j</div>
        <div :class="{ active: period === '30' }" @click="period = '30'; load()">30j</div>
        <div :class="{ active: period === 'all' }" @click="period = 'all'; load()">Tout</div>
      </div>
    </div>

    <p v-if="loading">Chargement…</p>
    <div v-else class="stats">
      <div class="stat">
        <div class="stat-value">{{ totalKamas.toLocaleString('fr-FR') }} k</div>
        <div class="stat-label">Kamas générés</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ salesCount }}</div>
        <div class="stat-label">Ventes</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ doneCount }}</div>
        <div class="stat-label">Donjons faits (cumulé)</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ capturedCount }}</div>
        <div class="stat-label">Captures réussies (cumulé)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: 800; }
.segmented { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.segmented div { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
.segmented div.active { background: var(--accent); color: #fff; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
.stat-value { font-size: 26px; font-weight: 800; }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
</style>
