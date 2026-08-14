<script setup>
import { ref, computed, onMounted } from 'vue'
import { priorityColor } from '../lib/theme.js'
import { getCraftHistory, saveCraftSearch } from '../lib/db.js'

const craftJobId = ref('tailleur')
const craftLevelMin = ref(60)
const craftLevelMax = ref(80)
const jetTab = ref('moyen')
const showHistory = ref(false)
const history = ref([])

const jobs = ['tailleur', 'forgeron', 'bijoutier', 'sculpteur', 'cordonnier']

const mockRows = [
  { rank: 1, name: 'Cape Kanigrula', level: 72, noFocusValue: 9800, noFocusNet: 4200,
    focusRows: [{ stat: 'Intelligence', value: 14200, net: 11400 }, { stat: 'Sagesse', value: 8100, net: 3900 }] },
  { rank: 2, name: 'Sac à dos du Vagabond', level: 68, noFocusValue: 7600, noFocusNet: -1800,
    focusRows: [{ stat: 'Vitalité', value: 5200, net: 2200 }] },
  { rank: 3, name: 'Chapeau du Larve', level: 61, noFocusValue: 3100, noFocusNet: -3200,
    focusRows: [{ stat: 'Force', value: 900, net: -900 }] },
]
const rows = ref(mockRows)

async function loadHistory() {
  history.value = await getCraftHistory()
}
onMounted(loadHistory)

function relativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

async function runSearch() {
  // TODO : remplacer rows.value par le vrai calcul DofusDB + coefficients.
  rows.value = mockRows
  await saveCraftSearch(craftJobId.value, craftLevelMin.value, craftLevelMax.value, mockRows)
  await loadHistory()
}

function openHistoryEntry(h) {
  craftJobId.value = h.job_id
  craftLevelMin.value = h.level_min
  craftLevelMax.value = h.level_max
  rows.value = h.resultats || mockRows
  showHistory.value = false
}

const sorted = computed(() => rows.value.slice().sort((a, b) => b.noFocusNet - a.noFocusNet))
function netColor(net) { return priorityColor(net) }
</script>

<template>
  <div>
    <p class="placeholder-note">Données factices — en attente DofusDB + coefficients DoFocus.</p>

    <div class="panel-pad form-row">
      <div class="field">
        <div class="field-label">Métier</div>
        <select v-model="craftJobId" class="input-small" style="width:180px">
          <option v-for="j in jobs" :key="j" :value="j">{{ j }}</option>
        </select>
      </div>
      <div class="field">
        <div class="field-label">Niveau min</div>
        <input type="number" v-model="craftLevelMin" class="input-small" style="width:90px" />
      </div>
      <div class="field">
        <div class="field-label">Niveau max</div>
        <input type="number" v-model="craftLevelMax" class="input-small" style="width:90px" />
      </div>
      <div class="accent-btn" @click="runSearch">Rechercher</div>
      <div class="history-wrap">
        <div class="history-btn" @click="showHistory = !showHistory">Historique ({{ history.length }})</div>
        <div v-if="showHistory" class="history-panel">
          <div v-for="h in history" :key="h.id" class="history-item" @click="openHistoryEntry(h)">
            <div class="history-label">{{ h.job_id }} — niv. {{ h.level_min }}-{{ h.level_max }}</div>
            <div class="history-date">{{ relativeDate(h.created_at) }}</div>
          </div>
          <div v-if="history.length === 0" class="history-date" style="padding:8px 10px;">Aucune recherche sauvegardée</div>
        </div>
      </div>
    </div>

    <div class="header-row">
      <div class="subtitle">Top 10 rentabilité — <strong>{{ craftJobId }} niv. {{ craftLevelMin }}-{{ craftLevelMax }}</strong></div>
      <div class="segmented">
        <div :class="{ active: jetTab === 'min' }" @click="jetTab = 'min'">Jet min</div>
        <div :class="{ active: jetTab === 'moyen' }" @click="jetTab = 'moyen'">Jet moyen</div>
        <div :class="{ active: jetTab === 'max' }" @click="jetTab = 'max'">Jet max</div>
      </div>
    </div>

    <div class="panel">
      <div v-for="row in sorted" :key="row.name" class="row-block">
        <div class="row-main">
          <div class="rank">#{{ row.rank }}</div>
          <div class="name-block">
            <div class="name">{{ row.name }}</div>
            <div class="sub">niveau {{ row.level }} · sans focus</div>
          </div>
          <div class="value-col">{{ row.noFocusValue.toLocaleString('fr-FR') }} k runes</div>
          <div class="net-col" :style="{ color: netColor(row.noFocusNet) }">{{ row.noFocusNet.toLocaleString('fr-FR') }} k net</div>
        </div>
        <div v-for="fr in row.focusRows" :key="fr.stat" class="focus-row">
          <div class="focus-label">avec focus {{ fr.stat }}</div>
          <div class="value-col">{{ fr.value.toLocaleString('fr-FR') }} k runes</div>
          <div class="net-col small" :style="{ color: netColor(fr.net) }">{{ fr.net.toLocaleString('fr-FR') }} k net</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placeholder-note { font-size: 11px; color: #b98a2e; margin-bottom: 12px; }
.panel-pad { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 16px; }
.form-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.field-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
.input-small { font-size: 13px; padding: 8px; border-radius: 8px; border: 1px solid var(--border); outline: none; }
.accent-btn { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: #fff; background: var(--accent); }
.history-wrap { position: relative; margin-left: auto; }
.history-btn { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--text-secondary); border: 1px solid var(--border); }
.history-panel { position: absolute; right: 0; top: 40px; width: 280px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25); padding: 8px; z-index: 20; }
.history-item { padding: 8px 10px; border-radius: 8px; }
.history-item:hover { background: var(--hover); }
.history-label { font-size: 13px; font-weight: 600; }
.history-date { font-size: 11px; color: var(--text-secondary); }
.header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.subtitle { font-size: 13px; color: var(--text-secondary); }
.subtitle strong { color: var(--text); }
.segmented { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; }
.segmented div { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
.segmented div.active { background: var(--accent); color: #fff; }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.row-block { border-bottom: 1px solid var(--border); padding: 12px 16px; }
.row-main { display: flex; align-items: center; gap: 14px; }
.rank { width: 22px; font-size: 12px; font-weight: 700; color: var(--text-secondary); }
.name-block { flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 700; }
.sub { font-size: 11px; color: var(--text-secondary); }
.value-col { width: 120px; text-align: right; font-size: 12px; color: var(--text-secondary); }
.net-col { width: 120px; text-align: right; font-size: 14px; font-weight: 700; }
.net-col.small { font-size: 13px; font-weight: 600; }
.focus-row { display: flex; align-items: center; gap: 14px; padding: 6px 0 0 36px; }
.focus-label { flex: 1; font-size: 12px; color: var(--text-secondary); }
</style>
