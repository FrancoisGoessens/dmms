<script setup>
import { ref, computed, onMounted } from 'vue'
import { priorityColor } from '../lib/theme.js'
import {
  getProfessions, getCraftableItemsFor, getLatestCoefficientsForItems,
  getCraftHistory, saveCraftSearch,
} from '../lib/db.js'

const professions = ref([])
const professionId = ref('')
const levelMin = ref(60)
const levelMax = ref(80)
const jetTab = ref('moyen')
const showHistory = ref(false)
const history = ref([])
const loading = ref(false)
const rows = ref([])
const searched = ref(false)

onMounted(async () => {
  professions.value = await getProfessions()
  if (professions.value[0]) professionId.value = professions.value[0].id
  history.value = await getCraftHistory()
})

// Le calcul réel des runes dépend d'un "poids" par caractéristique qu'on
// n'a pas encore confirmé côté DoFocus (cf. panneau debug du calculateur
// item unique) — tant que ce n'est pas réglé, on affiche le coefficient et
// le prix, mais pas encore une rentabilité chiffrée fiable.
async function runSearch() {
  loading.value = true
  searched.value = true
  const items = await getCraftableItemsFor(professionId.value, levelMin.value, levelMax.value)
  const coeffs = await getLatestCoefficientsForItems(items.map((i) => i.item_id))

  rows.value = items.map((it) => {
    const c = coeffs[it.item_id]
    return {
      itemId: it.item_id, name: it.name, level: it.level,
      coefficient: c?.coefficient ?? null,
      prixEstime: c?.prix_estime ?? null,
      updatedAt: c?.created_at ?? null,
    }
  })
  await saveCraftSearch(professionId.value, levelMin.value, levelMax.value, rows.value)
  history.value = await getCraftHistory()
  loading.value = false
}

function openHistoryEntry(h) {
  professionId.value = h.job_id
  levelMin.value = h.level_min
  levelMax.value = h.level_max
  rows.value = h.resultats || []
  searched.value = true
  showHistory.value = false
}
function relativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}
</script>

<template>
  <div>
    <p class="warning">
      ⚠ Cette page ne lit que ce qui a déjà été importé (DofusDB) et rafraîchi (bouton DoFocus dans le header) —
      aucun appel en direct pendant la recherche. Si un item n'a jamais été rafraîchi, son coefficient/prix
      s'affiche "—".
    </p>

    <div class="panel-pad form-row">
      <div class="field">
        <div class="field-label">Métier</div>
        <select v-model="professionId" class="input-small" style="width:180px">
          <option v-for="p in professions" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field">
        <div class="field-label">Niveau min</div>
        <input type="number" v-model.number="levelMin" class="input-small" style="width:90px" />
      </div>
      <div class="field">
        <div class="field-label">Niveau max</div>
        <input type="number" v-model.number="levelMax" class="input-small" style="width:90px" />
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

    <p v-if="loading">Chargement…</p>

    <div v-else-if="searched && rows.length === 0" class="empty">
      Aucun item craftable importé pour ce métier/cette tranche — lance <code>scripts/import-craftable-items.js</code> pour ce métier.
    </div>

    <div v-else-if="rows.length" class="panel">
      <div v-for="row in rows" :key="row.itemId" class="row-block">
        <div class="name-block">
          <div class="name">{{ row.name }}</div>
          <div class="sub">niveau {{ row.level }}</div>
        </div>
        <div class="value-col">
          <div class="label">Coefficient</div>
          <div class="value">{{ row.coefficient ?? '—' }}</div>
        </div>
        <div class="value-col">
          <div class="label">Prix estimé</div>
          <div class="value">{{ row.prixEstime == null ? '—' : row.prixEstime.toLocaleString('fr-FR') + ' k' }}</div>
        </div>
        <div class="value-col">
          <div class="label">Rafraîchi</div>
          <div class="value small">{{ row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('fr-FR') : 'jamais' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.warning { font-size: 11px; color: var(--amber); margin-bottom: 12px; }
.panel-pad { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 16px; }
.form-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.field-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
.history-wrap { position: relative; margin-left: auto; }
.history-btn { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--text-secondary); border: 1px solid var(--border); }
.history-panel { position: absolute; right: 0; top: 40px; width: 280px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25); padding: 8px; z-index: 20; }
.history-item { padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.history-item:hover { background: var(--hover); }
.history-label { font-size: 13px; font-weight: 600; }
.history-date { font-size: 11px; color: var(--text-secondary); }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.row-block { display: flex; align-items: center; gap: 20px; padding: 12px 18px; border-bottom: 1px solid var(--border-light); }
.name-block { flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 700; }
.sub { font-size: 11px; color: var(--text-secondary); }
.value-col { width: 110px; text-align: right; }
.label { font-size: 10px; color: var(--text-secondary); }
.value { font-size: 13px; font-weight: 700; }
.value.small { font-size: 11px; font-weight: 500; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
</style>
