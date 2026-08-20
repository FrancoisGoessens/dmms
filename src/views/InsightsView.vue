<script setup>
import { ref, computed, onMounted } from 'vue'
import { session } from '../lib/session.js'
import { getCharacter, getSales, countDoneDungeons, countCapturedDungeons, getSalesByCharacter } from '../lib/db.js'
import { lastTuesdayNoonParis } from '../lib/weeklyReset.js'

const period = ref('semaine') // 'semaine' | '30' | 'all'
const loading = ref(true)
const character = ref(null)

const kamasPerso = ref(0)
const kamasFoyer = ref(0)
const salesCountPerso = ref(0)
const doneCount = ref(0)
const capturedCount = ref(0)
const byCharacter = ref([])

const PIE_COLORS = ['var(--accent)', 'oklch(0.6 0.15 260)', 'oklch(0.72 0.14 75)', 'oklch(0.6 0.15 340)', 'oklch(0.65 0.15 30)']

function sinceDateFor(p) {
  if (p === 'semaine') return lastTuesdayNoonParis().toISOString()
  if (p === '30') return new Date(Date.now() - 30 * 86400000).toISOString()
  return null // 'all'
}

async function load() {
  loading.value = true
  character.value = await getCharacter(session.characterId)
  const since = sinceDateFor(period.value)

  const [salesPerso, salesFoyer, byChar] = await Promise.all([
    getSales(since, session.characterId),
    getSales(since, null, session.playerId),
    getSalesByCharacter(since, session.playerId),
  ])
  kamasPerso.value = salesPerso.reduce((sum, s) => sum + s.valeur * (s.quantite || 1), 0)
  salesCountPerso.value = salesPerso.length
  kamasFoyer.value = salesFoyer.reduce((sum, s) => sum + s.valeur * (s.quantite || 1), 0)
  byCharacter.value = byChar.sort((a, b) => b.total - a.total)

  doneCount.value = await countDoneDungeons(session.characterId)
  capturedCount.value = await countCapturedDungeons(session.characterId)

  loading.value = false
}
onMounted(load)

const pieSlices = computed(() => {
  const total = byCharacter.value.reduce((s, c) => s + c.total, 0)
  if (total === 0) return []
  let acc = 0
  return byCharacter.value.map((c, i) => {
    const pct = (c.total / total) * 100
    const slice = { ...c, pct, color: PIE_COLORS[i % PIE_COLORS.length], start: acc }
    acc += pct
    return slice
  })
})
const pieGradient = computed(() =>
  pieSlices.value.map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ')
)
</script>

<template>
  <div>
    <div class="header-row">
      <h1 class="title">Insights</h1>
      <div class="segmented">
        <div :class="{ active: period === 'semaine' }" @click="period = 'semaine'; load()">Cette semaine</div>
        <div :class="{ active: period === '30' }" @click="period = '30'; load()">30j</div>
        <div :class="{ active: period === 'all' }" @click="period = 'all'; load()">Tout</div>
      </div>
    </div>

    <p v-if="loading">Chargement…</p>
    <template v-else>
      <div class="section-label">Par personnage — {{ character?.name }}</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">{{ kamasPerso.toLocaleString('fr-FR') }} k</div>
          <div class="stat-label">Kamas générés</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ salesCountPerso }}</div>
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

      <div class="section-label">Foyer complet (tous personnages)</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value accent">{{ kamasFoyer.toLocaleString('fr-FR') }} k</div>
          <div class="stat-label">Kamas générés — tout le compte</div>
        </div>
        <div v-if="pieSlices.length" class="stat pie-block">
          <div class="pie" :style="{ background: `conic-gradient(${pieGradient})` }"></div>
          <div class="pie-legend">
            <div v-for="s in pieSlices" :key="s.name" class="legend-item">
              <span class="legend-dot" :style="{ background: s.color }"></span>
              <span class="legend-name">{{ s.name }}</span>
              <span class="legend-pct">{{ s.pct.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: 800; }
.segmented { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.segmented div { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
.segmented div.active { background: var(--accent); color: #fff; }
.section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); margin: 20px 0 10px; }
.section-label:first-of-type { margin-top: 0; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
.stat.wide { grid-column: span 2; }
.stat-value { font-size: 26px; font-weight: 800; }
.stat-value.accent { color: var(--accent); }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.pie-block { display: flex; align-items: center; gap: 16px; }
.pie { width: 60px; height: 60px; border-radius: 50%; flex-shrink: 0; }
.pie-legend { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-name { font-weight: 600; }
.legend-pct { font-weight: 700; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; }
</style>
