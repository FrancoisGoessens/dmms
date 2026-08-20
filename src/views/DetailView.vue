<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getDungeon, getCharacterDungeon, getMonsterItems, getPriceHistory,
  insertPriceEntry, getDungeonNotesFull, saveDungeonNotes, setDungeonFlag,
  getSoulStones, getSoulStoneForLevel, setDungeonStone, getCharacter,
  propagateFait, updateItemVentes30j, getLatestPrice,
} from '../lib/db.js'
import { priorityColor } from '../lib/theme.js'
import { computeDropWithPP } from '../lib/dropFormula.js'
import { netCaptureToPercent } from '../lib/rentability.js'
import { invalidateDungeonCache } from '../lib/dungeonCache.js'
import { formatPercent, truncateText } from '../lib/format.js'

const props = defineProps(['id'])
const router = useRouter()

const loading = ref(true)
const dungeon = ref(null)
const charDungeon = ref(null)
const character = ref(null)
const notes = ref('')
const actif = ref([])
const passif = ref([])

const priceFields = reactive({ capture: null, simple: null, rare: null })
const soulStones = ref([])
const selectedStoneId = ref(null)
const pierrePrice = ref(0)

const chartTarget = ref('capture')
const duration = ref('3m')
const durationDays = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 }
const chartHistory = ref([])

function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

async function load() {
  loading.value = true
  dungeon.value = await getDungeon(props.id)
  charDungeon.value = await getCharacterDungeon(session.characterId, props.id)
  character.value = await getCharacter(session.characterId)

  const notesFull = await getDungeonNotesFull(props.id)
  notes.value = notesFull.notes
  actif.value = notesFull.actif
  passif.value = notesFull.passif

  const monsterItems = await getMonsterItems(props.id)
  for (const mi of monsterItems) {
    if (!(mi.categorie in priceFields)) continue
    const history = await getPriceHistory(mi.item_id, 1)
    priceFields[mi.categorie] = {
      itemId: mi.item_id,
      name: mi.cache_items?.name || mi.categorie,
      rateBase: mi.taux_drop_base ?? null,
      ratePP: mi.taux_drop_base != null ? computeDropWithPP(mi.taux_drop_base, character.value.prospection || 0, mi.affecte_par_pp) : null,
      value: history[0]?.valeur ?? 0,
      daysAgo: history[0] ? daysAgo(history[0].created_at) : null,
      ventes30j: mi.cache_items?.ventes_30j ?? null,
    }
  }
  await loadChart()
  soulStones.value = await getSoulStones()
  if (dungeon.value.soul_stone_item_id) {
    selectedStoneId.value = dungeon.value.soul_stone_item_id
  } else {
    const suggested = await getSoulStoneForLevel(dungeon.value.niveau)
    selectedStoneId.value = suggested?.item_id ?? null
  }
  if (selectedStoneId.value) pierrePrice.value = await getLatestPrice(selectedStoneId.value)
  loading.value = false
}
async function onStoneChange(e) {
  selectedStoneId.value = e.target.value
  await setDungeonStone(props.id, e.target.value)
  pierrePrice.value = await getLatestPrice(e.target.value)
}
onMounted(load)
watch(() => props.id, load)

async function loadChart() {
  const field = priceFields[chartTarget.value]
  if (!field) { chartHistory.value = []; return }
  const cutoff = Date.now() - durationDays[duration.value] * 86400000
  const all = await getPriceHistory(field.itemId, 200)
  chartHistory.value = all.filter((h) => new Date(h.created_at).getTime() >= cutoff).reverse()
}
function selectChart(cat) { chartTarget.value = cat; loadChart() }
function selectDuration(d) { duration.value = d; loadChart() }

const chartStats = computed(() => {
  if (chartHistory.value.length === 0) return { min: 0, max: 0, current: 0 }
  const values = chartHistory.value.map((h) => h.valeur)
  return { min: Math.min(...values), max: Math.max(...values), current: values[values.length - 1] }
})
const chartPoints = computed(() => {
  const values = chartHistory.value.map((h) => h.valeur)
  if (values.length < 2) return ''
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * 340
    const y = 90 - ((v - min) / range) * 80
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})
const chartDates = computed(() => {
  if (chartHistory.value.length === 0) return { first: '', last: '' }
  const fmt = (d) => new Date(d).toLocaleDateString('fr-FR')
  return {
    first: fmt(chartHistory.value[0].created_at),
    last: fmt(chartHistory.value[chartHistory.value.length - 1].created_at),
  }
})
// Valeurs affichées à côté des 3 lignes de repère horizontales (y=10/50/90).
const chartGridLabels = computed(() => {
  const { min, max } = chartStats.value
  return [
    { y: 10, value: max },
    { y: 50, value: Math.round((min + max) / 2) },
    { y: 90, value: min },
  ]
})

// Un bouton "Valider" par champ : aucune ambiguïté possible sur quel input
// est concerné. Toujours en observation HDV — les ventes réelles se
// saisissent depuis la page HDV.
async function validateField(cat) {
  const f = priceFields[cat]
  await insertPriceEntry(f.itemId, f.value, 'observation_hdv', session.characterId)
  f.daysAgo = 0
  await loadChart()
  invalidateDungeonCache(session.characterId)
}

async function toggleCaptured() {
  charDungeon.value.capture = !charDungeon.value.capture
  await setDungeonFlag(session.characterId, props.id, 'capture', charDungeon.value.capture)
  if (charDungeon.value.capture && !charDungeon.value.fait_cette_semaine) {
    charDungeon.value.fait_cette_semaine = true
    await setDungeonFlag(session.characterId, props.id, 'fait_cette_semaine', true)
  }
  if (charDungeon.value.fait_cette_semaine) await propagateFait(session.characterId, props.id)
  invalidateDungeonCache(session.characterId)
}
async function toggleDone() {
  charDungeon.value.fait_cette_semaine = !charDungeon.value.fait_cette_semaine
  await setDungeonFlag(session.characterId, props.id, 'fait_cette_semaine', charDungeon.value.fait_cette_semaine)
  if (charDungeon.value.fait_cette_semaine) await propagateFait(session.characterId, props.id)
  invalidateDungeonCache(session.characterId)
}

let notesTimer = null
function onNotesChange(val) {
  notes.value = val
  clearTimeout(notesTimer)
  notesTimer = setTimeout(() => saveDungeonNotes(props.id, val, actif.value, passif.value), 600)
}

const netCapture = computed(() => (priceFields.capture?.value || 0) - pierrePrice.value)
const rentability = computed(() => netCaptureToPercent(netCapture.value))
const ICON_BASE = 'https://dofusdb.fr/icons/effects'
const bossStatsRows = computed(() => {
  const s = dungeon.value?.boss_stats
  if (!s) return []
  const row1 = [
    { label: 'Vie', field: 'lifePoints', icon: `${ICON_BASE}/pv.png` },
    { label: 'PA', field: 'actionPoints', icon: `${ICON_BASE}/pa.png` },
    { label: 'PM', field: 'movementPoints', icon: `${ICON_BASE}/pm.png` },
    { label: 'PO', field: 'bonusRange', icon: `${ICON_BASE}/po.png` },
  ]
  const row2 = [
    { label: 'Force', field: 'strength', icon: `${ICON_BASE}/terre.png` },
    { label: 'Intelligence', field: 'intelligence', icon: `${ICON_BASE}/feu.png` },
    { label: 'Chance', field: 'chance', icon: `${ICON_BASE}/eau.png` },
    { label: 'Agilité', field: 'agility', icon: `${ICON_BASE}/air.png` },
  ]
  const row3 = [
    { label: 'Rés. Neutre', field: 'neutralResistance', icon: `${ICON_BASE}/resNeutre.png` },
    { label: 'Rés. Terre', field: 'earthResistance', icon: `${ICON_BASE}/resTerre.png` },
    { label: 'Rés. Intelligence', field: 'fireResistance', icon: `${ICON_BASE}/resFeu.png` },
    { label: 'Rés. Chance', field: 'waterResistance', icon: `${ICON_BASE}/resEau.png` },
    { label: 'Rés. Agilité', field: 'airResistance', icon: `${ICON_BASE}/resAir.png` },
  ]
  const build = (row) =>
    row.filter((r) => typeof s[r.field] === 'number').map((r) => ({ ...r, val: s[r.field] }))
  return [build(row1), build(row2), build(row3)].filter((r) => r.length > 0)
})

function volumeArrow(ventes30j) {
  if (ventes30j == null) return null
  if (ventes30j > 250) return '↗'
  if (ventes30j >= 101) return '→'
  return '↘'
}
const VOLUME_REPRESENTATIVE = { up: 300, flat: 150, down: 50 }
function activeVolumeTier(ventes30j) {
  if (ventes30j == null) return null
  if (ventes30j > 250) return 'up'
  if (ventes30j >= 101) return 'flat'
  return 'down'
}
let volumeDirty = false
function setVolumeTier(tier) {
  const f = priceFields.capture
  if (!f) return
  f.ventes30j = VOLUME_REPRESENTATIVE[tier]
  volumeDirty = true
}

// On envoie le volume de ventes seulement en quittant la fiche, pas à
// chaque clic — évite de spammer la base pendant qu'on hésite entre les
// 3 flèches, sans toucher au reste de la logique (prix, badges...).
onBeforeRouteLeave(async () => {
  if (volumeDirty && priceFields.capture) {
    try {
      await updateItemVentes30j(priceFields.capture.itemId, priceFields.capture.ventes30j)
    } catch (e) {
      // On ne bloque JAMAIS la navigation pour ça — au pire le volume ne
      // se sauvegarde pas cette fois, mais on log pour comprendre pourquoi.
      console.error('Échec de sauvegarde du volume de ventes :', e)
    }
  }
})
</script>

<template>
  <div class="detail" v-if="!loading">
    <a href="#" class="back" @click.prevent="router.back()">← Retour</a>

    <div class="header-row">
      <div class="title">{{ dungeon.name }}</div>
      <div class="meta">{{ priceFields.capture?.name || dungeon.name }} - Niveau {{ dungeon.niveau }}</div>
      <div class="badges-row">
        <div class="badge" :class="{ on: charDungeon.capture }" @click="toggleCaptured">
          {{ charDungeon.capture ? 'Capturé' : 'Pas capturé' }}
        </div>
        <div class="badge" :class="{ on: charDungeon.fait_cette_semaine }" @click="toggleDone">
          {{ charDungeon.fait_cette_semaine ? 'Fait' : 'À faire' }}
        </div>
        <div class="rent-label" :style="{ color: priorityColor(netCapture) }">{{ Math.round(rentability) }}% rentabilité ({{ netCapture.toLocaleString('fr-FR') }} k net)</div>
        <select :value="selectedStoneId" @change="onStoneChange" class="stone-select">
          <option v-for="s in soulStones" :key="s.item_id" :value="s.item_id">{{ s.name }}</option>
        </select>
      </div>
    </div>

    <div class="layout">
      <div class="main-col">
        <div class="panel-pad section boss-card">
          <img v-if="dungeon.boss_image_url" :src="dungeon.boss_image_url" class="boss-img" />
          <div v-else class="boss-img placeholder">image du boss</div>
          <div class="boss-info">
            <div class="boss-name">{{ priceFields.capture?.name || dungeon.name }}</div>
            <div class="boss-level">Niveau {{ dungeon.niveau }}</div>
          </div>

          <div v-if="bossStatsRows.length" class="stats-rows">
            <div v-for="row in bossStatsRows" :key="row.label" class="stats-row">
              <div v-for="s in row" :key="s.label" class="stat-chip">
                <img :src="s.icon" class="stat-icon" :title="s.label" />
                <span class="stat-val">{{ s.val }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-pad section">
          <div class="panel-title-row">
          <div class="panel-title">Prix</div>
          <div class="volume-toggle" title="Volume de ventes /30j (capture)">
            <div class="vol-btn down" :class="{ active: activeVolumeTier(priceFields.capture?.ventes30j) === 'down' }" @click="setVolumeTier('down')">↘</div>
            <div class="vol-btn flat" :class="{ active: activeVolumeTier(priceFields.capture?.ventes30j) === 'flat' }" @click="setVolumeTier('flat')">→</div>
            <div class="vol-btn up" :class="{ active: activeVolumeTier(priceFields.capture?.ventes30j) === 'up' }" @click="setVolumeTier('up')">↗</div>
          </div>
        </div>
          <div class="price-grid">
            <div v-for="(field, cat) in priceFields" :key="cat" class="price-field" :class="{ selected: field && chartTarget === cat }">
              <template v-if="field">
                <div class="price-field-head" @click="selectChart(cat)">
                  <div class="price-label" :title="field.name">
                    {{ cat === 'capture' ? field.name : truncateText(field.name, 20) }}
                  </div>
                  <div v-if="field.rateBase != null" class="price-rate">
                    {{ formatPercent(field.rateBase) }}% — {{ formatPercent(field.ratePP) }}%
                  </div>
                </div>
                <div class="price-input-row">
                  <input
                    type="number"
                    v-model.number="field.value"
                    @keydown.enter="validateField(cat)"
                    @click.stop
                  />
                  <button class="validate-btn" @click.stop="validateField(cat)" title="Valider en observation HDV">✓</button>
                </div>
                <div class="price-days">{{ field.daysAgo == null ? 'jamais mis à jour' : `maj il y a ${field.daysAgo} j` }}</div>
              </template>
            </div>
          </div>

          <div class="chart-head">
            <div class="chart-target-label">Historique — {{ priceFields[chartTarget]?.name }}</div>
            <div class="segmented">
              <div v-for="d in ['1m', '3m', '6m', '1y']" :key="d" :class="{ active: duration === d }" @click="selectDuration(d)">
                {{ { '1m': '1M', '3m': '3M', '6m': '6M', '1y': '1A' }[d] }}
              </div>
            </div>
          </div>

          <svg viewBox="0 0 380 100" class="chart-svg">
            <line v-for="g in chartGridLabels" :key="g.y" x1="0" x2="340" :y1="g.y" :y2="g.y" class="grid-line" />
            <text v-for="g in chartGridLabels" :key="'t'+g.y" x="345" :y="g.y + 3" class="grid-label">{{ g.value.toLocaleString('fr-FR') }}</text>
            <polyline v-if="chartPoints" :points="chartPoints" fill="none" stroke="var(--accent)" stroke-width="2" />
          </svg>
          <div class="chart-dates">
            <span>{{ chartDates.first }}</span>
            <span>{{ chartDates.last }}</span>
          </div>
          <div class="chart-legend">
            <span>min {{ chartStats.min.toLocaleString('fr-FR') }} k</span>
            <span>prix actuel : {{ chartStats.current.toLocaleString('fr-FR') }} k</span>
            <span>max {{ chartStats.max.toLocaleString('fr-FR') }} k</span>
          </div>
        </div>
      </div>

      <div class="side-col">
        <div class="panel-pad section">
          <div class="panel-title">Actif</div>
          <ul v-if="actif.length" class="ref-list">
            <li v-for="(a, i) in actif" :key="i">{{ a }}</li>
          </ul>
          <div v-else class="ref-empty">Rien à signaler</div>
        </div>
        <div class="panel-pad section">
          <div class="panel-title">Passif</div>
          <ul v-if="passif.length" class="ref-list">
            <li v-for="(p, i) in passif" :key="i">{{ p }}</li>
          </ul>
          <div v-else class="ref-empty">Rien à signaler</div>
        </div>
        <div class="panel-pad">
          <div class="panel-title">Stratégie</div>
          <div class="strategy-summary">{{ notes ? 'Notes personnelles enregistrées' : 'Pas encore de notes pour ce combat' }}</div>
          <textarea :value="notes" @input="onNotesChange($event.target.value)" placeholder="Nos notes / astuces après avoir fait le combat..."></textarea>
        </div>
      </div>
    </div>
  </div>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.detail { max-width: 1200px; }
.back { font-size: 12px; display: inline-block; margin-bottom: 14px; }
.header-row { margin-bottom: 20px; }
.title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.title.small { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }
.meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
.badges-row { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; cursor: pointer; color: var(--text-secondary); background: var(--panel-2); }
.badge.on { color: var(--accent-text); background: var(--soft-accent-bg); }
.rent-label { font-size: 12px; font-weight: 700; }
.stone-select { font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text-secondary); }

.layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
.side-col { display: flex; flex-direction: column; gap: 16px; }

.boss-card { display: flex; align-items: center; gap: 20px; }
.boss-img { width: 72px; height: 72px; border-radius: 10px; flex-shrink: 0; object-fit: contain; background: var(--panel-2); }
.boss-img.placeholder { display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--text-secondary); text-align: center; }
.boss-info { flex-shrink: 0; }
.boss-name { font-size: 16px; font-weight: 700; }
.boss-level { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.boss-stats-note { font-size: 11px; color: var(--text-secondary); font-style: italic; margin-top: 6px; }
.stats-rows { display: flex; flex-direction: column; gap: 6px; flex: 1; padding-left: 20px; }
.stats-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.stat-chip { display: flex; align-items: center; gap: 6px; background: var(--panel-2); border-radius: 8px; padding: 6px 10px; font-size: 12px; }
.stat-icon { width: 16px; height: 16px; object-fit: contain; }
.stat-val { font-weight: 700; }

.section { margin-bottom: 16px; }
.side-col .section { margin-bottom: 0; }
.panel-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.panel-title { font-size: 13px; font-weight: 700; }
.volume-toggle { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.vol-btn { width: 26px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; color: var(--text-secondary); }
.vol-btn.down.active { background: #f15a5a; color: var(--text); }
.vol-btn.flat.active { background: #72acf0; color: var(--text); }
.vol-btn.up.active { background: #77ec74; color: var(--text); }
.price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.price-field { padding: 8px; border-radius: 10px; border: 1.5px solid transparent; }
.price-field.selected { border-color: var(--accent); background: var(--soft-accent-bg); }
.price-field-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; cursor: pointer; margin-bottom: 6px; }
.price-label { font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.price-rate { font-size: 10px; color: var(--text-secondary); white-space: nowrap; }
.price-input-row { display: flex; gap: 4px; align-items: center; }
.price-input-row input { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; background: var(--input); color: var(--text); }
.validate-btn { width: 26px; height: 26px; flex-shrink: 0; border-radius: 6px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.price-days { font-size: 10px; color: var(--text-secondary); margin-top: 4px; }
.chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.chart-target-label { font-size: 11px; color: var(--text-secondary); }
.segmented { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.segmented div { font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
.segmented div.active { background: var(--accent); color: #fff; }
.chart-svg { width: 100%; height: 120px; overflow: visible; }
.grid-label { font-size: 8px; fill: var(--text-secondary); }
.chart-dates { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-secondary); margin-top: 4px; }
.grid-line { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3, 3; }
.chart-legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); }
.ref-list { margin: 0; padding-left: 18px; font-size: 12px; color: var(--text); display: flex; flex-direction: column; gap: 4px; }
.ref-empty { font-size: 12px; color: var(--text-secondary); font-style: italic; }
.strategy-summary { font-size: 12px; color: var(--text-secondary); font-style: italic; margin-bottom: 12px; }
textarea { width: 100%; min-height: 90px; font-size: 13px; padding: 10px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; resize: vertical; background: var(--input); color: var(--text); }
</style>
