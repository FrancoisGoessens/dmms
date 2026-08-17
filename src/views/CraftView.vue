<script setup>
import { ref, computed, onMounted } from 'vue'
import { priorityColor } from '../lib/theme.js'
import { computePdb, computeRuneQtyNoFocus, computeRuneQtyWithFocus } from '../lib/dropFormula.js'
import { getPoidsLigne } from '../lib/runeWeights.js'
import {
  getProfessions, getCraftableItemsFor, getLatestCoefficientsForItems,
  getCraftHistory, saveCraftSearch, getRunesLookup,
} from '../lib/db.js'

const professions = ref([])
const professionId = ref('')
const levelMin = ref(60)
const levelMax = ref(80)
const showHistory = ref(false)
const history = ref([])
const loading = ref(false)
const rows = ref([])
const searched = ref(false)
const runesLookup = ref({ byCharId: {}, byName: {} })

onMounted(async () => {
  professions.value = await getProfessions()
  if (professions.value[0]) professionId.value = professions.value[0].id
  history.value = await getCraftHistory()
  runesLookup.value = await getRunesLookup()
})

// Calcule la rentabilité réelle d'un item au jet moyen de chaque ligne :
// - sans focus : somme de toutes les runes obtenues
// - avec focus : la meilleure caractéristique à focus (celle qui rapporte
//   le plus en avec-focus), comme sur la fiche item unique
function computeItemRentability(item, coeff) {
  if (!coeff?.coefficient || !item.characteristics?.length) return null

  const stats = item.characteristics.map((c) => {
    const min = c.min ?? c.jetMin ?? 0
    const max = c.max ?? c.jetMax ?? 0
    const jet = Math.round((min + max) / 2) // jet moyen, comme demandé
    const charId = c.characteristicId != null ? String(c.characteristicId) : null
    const rune = (charId && runesLookup.value.byCharId[charId])
      || runesLookup.value.byName[c.rune?.name?.fr || c.runeName || c.rune]
      || null
    const poidsLigne = getPoidsLigne(c.characteristic || c.name || c.label)
    const pdb = computePdb(jet, poidsLigne, item.level)
    return { pdb, poidsRune: rune?.weight ?? null, price: rune?.price ?? 0 }
  })

  const sansFocusKamas = stats.reduce((sum, s) => {
    const qty = computeRuneQtyNoFocus(s.pdb, s.poidsRune, coeff.coefficient)
    return sum + (qty == null ? 0 : Math.floor(qty) * s.price)
  }, 0)

  let avecFocusKamas = 0
  for (const target of stats) {
    const autresSum = stats.filter((s) => s !== target).reduce((sum, s) => sum + (s.pdb ?? 0), 0)
    const qty = computeRuneQtyWithFocus(target.pdb, autresSum, target.poidsRune, coeff.coefficient)
    const kamas = qty == null ? 0 : Math.floor(qty) * target.price
    if (kamas > avecFocusKamas) avecFocusKamas = kamas
  }

  const best = Math.max(sansFocusKamas, avecFocusKamas)
  return {
    sansFocusKamas, avecFocusKamas,
    netSansFocus: sansFocusKamas - coeff.prix_estime,
    netAvecFocus: avecFocusKamas - coeff.prix_estime,
    netMeilleur: best - coeff.prix_estime,
  }
}

async function runSearch() {
  loading.value = true
  searched.value = true
  const items = await getCraftableItemsFor(professionId.value, levelMin.value, levelMax.value)
  const coeffs = await getLatestCoefficientsForItems(items.map((i) => i.item_id))

  const built = items.map((it) => {
    const c = coeffs[it.item_id]
    const rent = computeItemRentability(it, c)
    return {
      itemId: it.item_id, name: it.name, level: it.level,
      coefficient: c?.coefficient ?? null,
      prixEstime: c?.prix_estime ?? null,
      updatedAt: c?.created_at ?? null,
      rentability: rent,
    }
  })

  // Toujours un top 10, même si rien n'est rentable — trié sur le meilleur
  // résultat net (sans ou avec focus, selon ce qui rapporte le plus).
  rows.value = built
    .filter((r) => r.rentability != null)
    .sort((a, b) => b.rentability.netMeilleur - a.rentability.netMeilleur)
    .slice(0, 10)

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
      ⚠ Cette page ne lit que ce qui a déjà été importé (DofusDB) et rafraîchi
      (<code>node scripts/refresh-dofocus.js</code>) — aucun appel en direct pendant la recherche.
      Items sans coefficient/caractéristiques en cache : exclus du classement.
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
      Aucun item calculable pour ce métier/cette tranche — soit ils ne sont pas importés
      (<code>scripts/import-craftable-items.js</code>), soit ils n'ont pas encore été rafraîchis
      (<code>scripts/refresh-dofocus.js</code>).
    </div>

    <div v-else-if="rows.length" class="panel">
      <div v-for="(row, i) in rows" :key="row.itemId" class="row-block">
        <div class="rank">#{{ i + 1 }}</div>
        <div class="name-block">
          <div class="name">{{ row.name }}</div>
          <div class="sub">niveau {{ row.level }} · coeff. {{ row.coefficient }} · prix marché {{ row.prixEstime.toLocaleString('fr-FR') }} k</div>
        </div>
        <div class="value-col">
          <div class="label">Sans focus</div>
          <div class="value" :style="{ color: priorityColor(row.rentability.netSansFocus) }">
            {{ row.rentability.netSansFocus.toLocaleString('fr-FR') }} k
          </div>
        </div>
        <div class="value-col">
          <div class="label">Meilleur focus</div>
          <div class="value" :style="{ color: priorityColor(row.rentability.netAvecFocus) }">
            {{ row.rentability.netAvecFocus.toLocaleString('fr-FR') }} k
          </div>
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
.row-block { display: flex; align-items: center; gap: 16px; padding: 12px 18px; border-bottom: 1px solid var(--border-light); }
.rank { width: 24px; font-size: 12px; font-weight: 800; color: var(--text-secondary); }
.name-block { flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 700; }
.sub { font-size: 11px; color: var(--text-secondary); }
.value-col { width: 120px; text-align: right; }
.label { font-size: 10px; color: var(--text-secondary); }
.value { font-size: 14px; font-weight: 800; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
</style>
