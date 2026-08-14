<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getDungeon, getCharacterDungeon, getMonsterItems, getPriceHistory,
  insertPriceEntry, getDungeonNotesFull, saveDungeonNotes, setDungeonFlag,
  getSoulStones, getSoulStoneForLevel, setDungeonStone, getLatestStonePrice,
} from '../lib/db.js'
import { priorityColor } from '../lib/theme.js'

const props = defineProps(['id'])
const router = useRouter()

const loading = ref(true)
const dungeon = ref(null)
const charDungeon = ref(null)
const notes = ref('')
const actif = ref([])
const passif = ref([])
const entryType = ref('observation')

const priceFields = reactive({ capture: null, simple: null, rare: null })
const priceLabels = { capture: 'Capture', simple: 'Ressource simple', rare: 'Ressource rare' }
const soulStones = ref([])
const selectedStoneId = ref(null)

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
      rate: mi.taux_drop_base ?? null,
      value: history[0]?.valeur ?? 0,
      daysAgo: history[0] ? daysAgo(history[0].created_at) : null,
      dirty: false,
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
  loading.value = false
}
async function onStoneChange(e) {
  selectedStoneId.value = e.target.value
  await setDungeonStone(props.id, e.target.value)
}
onMounted(load)

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

function onPriceChange(cat, val) {
  priceFields[cat].value = Number(val) || 0
  priceFields[cat].dirty = true
}
const hasDirty = () => Object.values(priceFields).some((f) => f?.dirty)

async function validatePrices() {
  for (const [cat, f] of Object.entries(priceFields)) {
    if (f?.dirty) {
      await insertPriceEntry(f.itemId, f.value, entryType.value)
      f.dirty = false
      f.daysAgo = 0
    }
  }
  await loadChart()
}

async function toggleCaptured() {
  charDungeon.value.capture = !charDungeon.value.capture
  await setDungeonFlag(session.characterId, props.id, 'capture', charDungeon.value.capture)
}
async function toggleDone() {
  charDungeon.value.fait_cette_semaine = !charDungeon.value.fait_cette_semaine
  await setDungeonFlag(session.characterId, props.id, 'fait_cette_semaine', charDungeon.value.fait_cette_semaine)
}

let notesTimer = null
function onNotesChange(val) {
  notes.value = val
  clearTimeout(notesTimer)
  notesTimer = setTimeout(() => saveDungeonNotes(props.id, val, actif.value, passif.value), 600)
}

const rentability = computed(() => {
  const cap = priceFields.capture?.value || 0
  const simple = priceFields.simple?.value || 0
  const rare = priceFields.rare?.value || 0
  const max = Math.max(cap + simple + rare, 1)
  return Math.max(1, Math.round(((cap + simple * 0.1 + rare * 0.05) / max) * 100))
})
</script>

<template>
  <div class="detail" v-if="!loading">
    <a href="#" class="back" @click.prevent="router.back()">← Retour</a>

    <div class="header-row">
      <div class="boss-img">image du boss</div>
      <div class="header-info">
        <div class="title">{{ dungeon.name }}</div>
        <div class="meta">{{ dungeon.zone }} · niveau {{ dungeon.niveau }}</div>
        <div class="badges-row">
          <div class="badge" :class="{ on: charDungeon.capture }" @click="toggleCaptured">
            {{ charDungeon.capture ? 'Capturé' : 'Pas capturé' }}
          </div>
          <div class="badge" :class="{ on: charDungeon.fait_cette_semaine }" @click="toggleDone">
            {{ charDungeon.fait_cette_semaine ? 'Fait' : 'À faire' }}
          </div>
          <div class="rent-label" :style="{ color: priorityColor(rentability) }">{{ rentability }}% rentabilité</div>
          <select :value="selectedStoneId" @change="onStoneChange" class="stone-select">
            <option v-for="s in soulStones" :key="s.item_id" :value="s.item_id">{{ s.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="layout">
      <div class="main-col">
        <div class="panel-pad section">
          <div class="panel-head">
            <div class="panel-title">Prix</div>
            <div v-if="hasDirty()" class="dirty-actions">
              <div class="segmented">
                <div :class="{ active: entryType === 'observation' }" @click="entryType = 'observation'">Observation HDV</div>
                <div :class="{ active: entryType === 'vente' }" @click="entryType = 'vente'">Vente réelle</div>
              </div>
              <div class="accent-btn" @click="validatePrices">Valider → ajouter à HDV</div>
            </div>
          </div>

          <div class="price-grid">
            <div v-for="(field, cat) in priceFields" :key="cat" class="price-field" :class="{ selected: chartTarget === cat }" @click="field && selectChart(cat)">
              <template v-if="field">
                <div class="price-label">{{ priceLabels[cat] }}</div>
                <input type="number" :value="field.value" @input="onPriceChange(cat, $event.target.value)" @click.stop />
                <div class="price-days">{{ field.daysAgo == null ? 'jamais mis à jour' : `maj il y a ${field.daysAgo} j` }}</div>
              </template>
            </div>
          </div>

          <div class="chart-head">
            <div class="chart-target-label">Historique — {{ priceLabels[chartTarget] }}</div>
            <div class="segmented">
              <div v-for="d in ['1m', '3m', '6m', '1y']" :key="d" :class="{ active: duration === d }" @click="selectDuration(d)">
                {{ { '1m': '1M', '3m': '3M', '6m': '6M', '1y': '1A' }[d] }}
              </div>
            </div>
          </div>

          <svg viewBox="0 0 340 100" class="chart-svg">
            <line v-for="y in [10, 50, 90]" :key="y" x1="0" x2="340" :y1="y" :y2="y" class="grid-line" />
            <polyline v-if="chartPoints" :points="chartPoints" fill="none" stroke="var(--accent)" stroke-width="2" />
          </svg>
          <div class="chart-legend">
            <span>min {{ chartStats.min.toLocaleString('fr-FR') }} k</span>
            <span>prix actuel : {{ chartStats.current.toLocaleString('fr-FR') }} k</span>
            <span>max {{ chartStats.max.toLocaleString('fr-FR') }} k</span>
          </div>
        </div>

        <div class="panel-pad">
          <div class="panel-title">Drops</div>
          <div v-for="cat in ['simple', 'rare']" :key="cat">
            <div v-if="priceFields[cat]" class="drop-row">
              <div class="tag">{{ cat === 'simple' ? 'S' : 'R' }}</div>
              <div class="drop-name">{{ priceFields[cat].name }}</div>
              <div class="drop-rate">{{ priceFields[cat].rate }}%</div>
              <div class="drop-price">{{ priceFields[cat].value }} k</div>
            </div>
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
.header-row { display: flex; gap: 20px; margin-bottom: 20px; }
.boss-img { width: 96px; height: 96px; border-radius: 12px; background: var(--panel-2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-secondary); text-align: center; }
.header-info { flex: 1; }
.title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
.badges-row { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; cursor: pointer; color: var(--text-secondary); background: var(--panel-2); }
.badge.on { color: var(--accent-text); background: var(--soft-accent-bg); }
.rent-label { font-size: 12px; font-weight: 700; }
.stone-select { font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text-secondary); }

.layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
.side-col { display: flex; flex-direction: column; gap: 16px; }

.section { margin-bottom: 16px; }
.side-col .section { margin-bottom: 0; }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.panel-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.dirty-actions { display: flex; align-items: center; gap: 8px; }
.price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.price-field { cursor: pointer; padding: 8px; border-radius: 10px; border: 1.5px solid transparent; }
.price-field.selected { border-color: var(--accent); background: var(--soft-accent-bg); }
.price-field input { width: 100%; font-size: 16px; font-weight: 700; padding: 8px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; background: var(--input); color: var(--text); }
.price-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
.price-days { font-size: 10px; color: var(--text-secondary); margin-top: 4px; }
.chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.chart-target-label { font-size: 11px; color: var(--text-secondary); }
.chart-svg { width: 100%; height: 120px; overflow: visible; }
.grid-line { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3, 3; }
.chart-legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); }
.ref-list { margin: 0; padding-left: 18px; font-size: 12px; color: var(--text); display: flex; flex-direction: column; gap: 4px; }
.ref-empty { font-size: 12px; color: var(--text-secondary); font-style: italic; }
.strategy-summary { font-size: 12px; color: var(--text-secondary); font-style: italic; margin-bottom: 12px; }
textarea { width: 100%; min-height: 90px; font-size: 13px; padding: 10px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; resize: vertical; background: var(--input); color: var(--text); }
.drop-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.tag { width: 22px; height: 22px; border-radius: 6px; background: var(--panel-2); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.drop-name { flex: 1; font-size: 13px; font-weight: 600; }
.drop-rate { font-size: 12px; color: var(--text-secondary); width: 60px; text-align: right; }
.drop-price { font-size: 13px; font-weight: 700; width: 90px; text-align: right; }
</style>
