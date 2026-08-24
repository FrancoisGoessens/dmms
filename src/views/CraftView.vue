<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import { priorityColor } from '../lib/theme.js'
import { computePdb, computeRuneQtyNoFocus, computeRuneQtyWithFocus, COEFFICIENT_ESTIMATE_LOW } from '../lib/dropFormula.js'
import { getPoidsLigne } from '../lib/runeWeights.js'
import {
  getProfessions, getCraftableItemsFor, getLatestCoefficientsForItems,
  getLatestCraftItemPricesForItems, insertCraftItemPrice,
  getCraftHistory, saveCraftSearch, getRunesLookup,
} from '../lib/db.js'

const router = useRouter()

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

// --- Complétion des prix manquants avant calcul ---
// items/coeffs de la dernière recherche lancée, gardés le temps du
// popup/de la boucle de saisie pour ne pas tout refaire depuis zéro une
// fois les prix validés.
const pendingItems = ref([])
const pendingCoeffs = ref({})
const missingPriceItems = ref([])
const showPricePrompt = ref(false)
const showFillFlow = ref(false)
const showAbandonConfirm = ref(false)
const fillIndex = ref(0)
const fillPriceInput = ref(0)
const currentFillItem = computed(() => missingPriceItems.value[fillIndex.value] || null)

onMounted(async () => {
  professions.value = await getProfessions()
  if (professions.value[0]) professionId.value = professions.value[0].id
  history.value = await getCraftHistory()
  runesLookup.value = await getRunesLookup()
})

// Le prix le plus RÉCENT gagne, qu'il vienne de DoFocus
// (cache_item_coefficients) ou d'une saisie manuelle validée sur la fiche
// item — même logique que sur la fiche elle-même. Le coefficient, lui, ne
// vient jamais que de DoFocus.
function resolvePriceAndCoeff(coeff, manualPrice) {
  const coeffAt = coeff?.created_at ? new Date(coeff.created_at) : null
  const manualAt = manualPrice?.created_at ? new Date(manualPrice.created_at) : null
  const manualIsNewer = manualAt && (!coeffAt || manualAt > coeffAt)
  return {
    coefficient: coeff?.coefficient ?? null,
    prix_estime: manualIsNewer ? manualPrice.valeur : (coeff?.prix_estime ?? null),
    priceIsManual: !!manualIsNewer,
  }
}

// Calcule la rentabilité réelle d'un item au jet moyen de chaque ligne :
// - sans focus : somme de toutes les runes obtenues
// - avec focus : la meilleure caractéristique à focus (celle qui rapporte
//   le plus en avec-focus), comme sur la fiche item unique
//
// Un item sans coefficient DoFocus n'est PLUS exclu du classement : on
// calcule avec le coefficient pessimiste (COEFFICIENT_ESTIMATE_LOW = 50),
// jamais avec 100, pour ne jamais faire remonter un item qui serait en fait
// une perte. `estimated: true` marque ces lignes pour l'affichage — le but
// n'est pas d'induire en erreur, juste de ne plus rendre invisibles ~2500
// items faute de donnée communautaire.
function computeItemRentability(item, coeff) {
  if (!item.characteristics?.length) return null
  const estimated = !coeff?.coefficient
  const coefficientPercent = coeff?.coefficient ?? COEFFICIENT_ESTIMATE_LOW
  // Le prix (coeff.prix_estime) vient de la MÊME entrée DoFocus que le
  // coefficient — en pratique, un item jamais soumis par la communauté n'a
  // ni l'un ni l'autre, donc cette garde exclut toujours les items
  // totalement inconnus de DoFocus (pas de prix = pas de net kamas
  // calculable, coefficient estimé ou pas). Si DoFocus renvoie un jour un
  // prix sans coefficient pour un item, ce cas-là profite bien de
  // l'estimation à 50% ci-dessus.
  if (coeff?.prix_estime == null) return null

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
    const qty = computeRuneQtyNoFocus(s.pdb, s.poidsRune, coefficientPercent)
    return sum + (qty == null ? 0 : Math.floor(qty) * s.price)
  }, 0)

  let avecFocusKamas = 0
  for (const target of stats) {
    const autresSum = stats.filter((s) => s !== target).reduce((sum, s) => sum + (s.pdb ?? 0), 0)
    const qty = computeRuneQtyWithFocus(target.pdb, autresSum, target.poidsRune, coefficientPercent)
    const kamas = qty == null ? 0 : Math.floor(qty) * target.price
    if (kamas > avecFocusKamas) avecFocusKamas = kamas
  }

  const best = Math.max(sansFocusKamas, avecFocusKamas)
  return {
    estimated, priceIsManual: !!coeff.priceIsManual,
    sansFocusKamas, avecFocusKamas,
    netSansFocus: sansFocusKamas - coeff.prix_estime,
    netAvecFocus: avecFocusKamas - coeff.prix_estime,
    netMeilleur: best - coeff.prix_estime,
  }
}

// 1) On regarde s'il manque des prix sur la tranche demandée. Un item sans
// characteristics est de toute façon incalculable (pas la peine de demander
// un prix dessus) — seuls ceux qui BLOQUENT réellement le calcul comptent.
// S'il n'en manque aucun : calcul direct, pas de popup. S'il en manque :
// popup obligatoire (Oui/Non), impossible à fermer autrement.
async function onSearchClick() {
  loading.value = true
  searched.value = true
  const items = await getCraftableItemsFor(professionId.value, levelMin.value, levelMax.value)
  const itemIds = items.map((i) => i.item_id)
  const [coeffs, manualPrices] = await Promise.all([
    getLatestCoefficientsForItems(itemIds),
    getLatestCraftItemPricesForItems(itemIds),
  ])
  loading.value = false

  pendingItems.value = items
  pendingCoeffs.value = coeffs
  missingPriceItems.value = items.filter((it) => {
    if (!it.characteristics?.length) return false
    const resolved = resolvePriceAndCoeff(coeffs[it.item_id], manualPrices[it.item_id])
    return resolved.prix_estime == null
  })

  if (missingPriceItems.value.length === 0) {
    await finalizeSearch()
  } else {
    showPricePrompt.value = true
  }
}

// "Non" : calcule tout de suite avec ce qu'on a, comme avant (items sans
// prix exclus du classement).
function declineFillIn() {
  showPricePrompt.value = false
  finalizeSearch()
}
// "Oui" : on s'engage dans la boucle de saisie, un item à la fois.
function acceptFillIn() {
  showPricePrompt.value = false
  fillIndex.value = 0
  fillPriceInput.value = 0
  showFillFlow.value = true
}
async function submitFillPrice() {
  const item = currentFillItem.value
  if (!item) return
  await insertCraftItemPrice(item.item_id, fillPriceInput.value, session.characterId)
  fillIndex.value++
  fillPriceInput.value = 0
  if (fillIndex.value >= missingPriceItems.value.length) {
    showFillFlow.value = false
    await finalizeSearch()
  }
}
function requestAbandon() { showAbandonConfirm.value = true }
function cancelAbandon() { showAbandonConfirm.value = false }
// Abandon : les prix déjà validés pendant la boucle restent enregistrés
// (chaque validation est un insert individuel, pas une transaction), mais
// aucun calcul ne se lance — retour simple à la page de recherche.
function confirmAbandon() {
  showAbandonConfirm.value = false
  showFillFlow.value = false
}

// 2) Le vrai calcul du top 10 — inchangé dans le fond, seulement séparé de
// la détection ci-dessus. Les prix sont retéléchargés ici (frais) pour
// intégrer ce qui vient d'être saisi dans la boucle.
async function finalizeSearch() {
  loading.value = true
  const items = pendingItems.value
  const coeffs = pendingCoeffs.value
  const manualPrices = await getLatestCraftItemPricesForItems(items.map((i) => i.item_id))

  const built = items.map((it) => {
    const resolved = resolvePriceAndCoeff(coeffs[it.item_id], manualPrices[it.item_id])
    const rent = computeItemRentability(it, resolved)
    return {
      itemId: it.item_id, name: it.name, level: it.level,
      coefficient: resolved.coefficient,
      prixEstime: resolved.prix_estime,
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
      Items sans caractéristiques ou sans aucun prix (ni DoFocus, ni saisi à la main sur leur fiche) :
      exclus du classement (impossible de calculer un net kamas sans prix). Items avec un prix mais
      sans coefficient DoFocus : inclus, marqués <span class="estimated-badge">≈ estimé</span>,
      calculés avec un coefficient pessimiste à 50%.
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
      <div class="accent-btn" @click="onSearchClick">Rechercher</div>
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
      <div v-for="(row, i) in rows" :key="row.itemId" class="row-block" @click="router.push({ name: 'item-detail', params: { id: row.itemId } })">
        <div class="rank">#{{ i + 1 }}</div>
        <div class="name-block">
          <div class="name">
            {{ row.name }}
            <span v-if="row.rentability.estimated" class="estimated-badge" title="Pas de coefficient DoFocus — calculé avec une estimation pessimiste à 50%">≈ estimé</span>
          </div>
          <div class="sub">
            niveau {{ row.level }} ·
            <template v-if="row.rentability.estimated">coeff. estimé 50%</template>
            <template v-else>coeff. {{ row.coefficient }}</template>
            · prix{{ row.rentability.priceIsManual ? ' saisi' : ' marché' }} {{ row.prixEstime.toLocaleString('fr-FR') }} k
          </div>
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

    <!-- Popup 1 : obligatoire dès qu'il manque au moins un prix, aucune
         issue autre que les deux boutons (pas de croix, pas de clic dehors). -->
    <div v-if="showPricePrompt" class="backdrop">
      <div class="modal">
        <div class="title">Prix manquants</div>
        <p class="modal-text">
          {{ missingPriceItems.length }} item{{ missingPriceItems.length > 1 ? 's' : '' }} de cette tranche
          n'{{ missingPriceItems.length > 1 ? 'ont' : 'a' }} aucun prix connu (ni DoFocus, ni saisi à la main) —
          impossible de les inclure dans le classement sans ça. Tu veux les renseigner maintenant ?
        </p>
        <div class="actions">
          <div class="accent-btn" @click="acceptFillIn">Oui, je les renseigne</div>
          <div class="secondary-btn" @click="declineFillIn">Non, calcule sans eux</div>
        </div>
      </div>
    </div>

    <!-- Popup 2 : boucle de saisie, un item à la fois. Une fois "Oui"
         choisi ci-dessus, seule la croix (avec confirmation) en sort. -->
    <div v-if="showFillFlow" class="backdrop">
      <div class="modal">
        <div class="fill-head">
          <div class="title">Prix manquant {{ fillIndex + 1 }} / {{ missingPriceItems.length }}</div>
          <div class="abandon-x" @click="requestAbandon" title="Tout abandonner">×</div>
        </div>
        <div class="fill-item-name">{{ currentFillItem?.name }}</div>
        <div class="fill-item-sub">Niveau {{ currentFillItem?.level }}</div>
        <div class="field">
          <div class="field-label">Prix de l'item (marché)</div>
          <div class="price-input-row">
            <input
              type="number" v-model.number="fillPriceInput" class="input-small price-input"
              @keydown.enter="submitFillPrice" autofocus
            />
            <button class="validate-btn" @click="submitFillPrice" title="Valider et passer au suivant">✓</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation d'abandon, par-dessus la popup 2. -->
    <div v-if="showAbandonConfirm" class="backdrop nested">
      <div class="modal small">
        <div class="title">Tout abandonner ?</div>
        <p class="modal-text">
          Les prix déjà validés dans cette boucle restent enregistrés, mais le calcul du top 10 ne se
          lancera pas — retour simple à la page de recherche.
        </p>
        <div class="actions">
          <div class="danger-btn" @click="confirmAbandon">Oui, j'abandonne</div>
          <div class="secondary-btn" @click="cancelAbandon">Non, je continue</div>
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
.row-block { display: flex; align-items: center; gap: 16px; padding: 12px 18px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.row-block:hover { background: var(--hover); }
.estimated-badge { font-size: 10px; font-weight: 700; color: var(--amber); background: color-mix(in oklch, var(--amber) 18%, transparent); border-radius: 20px; padding: 2px 7px; margin-left: 4px; }
.rank { width: 24px; font-size: 12px; font-weight: 800; color: var(--text-secondary); }
.name-block { flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 700; }
.sub { font-size: 11px; color: var(--text-secondary); }
.value-col { width: 120px; text-align: right; }
.label { font-size: 10px; color: var(--text-secondary); }
.value { font-size: 14px; font-weight: 800; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }

.backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; z-index: 40; }
.backdrop.nested { z-index: 50; background: rgba(0, 0, 0, 0.45); }
.modal { width: 380px; background: var(--panel); border-radius: 14px; padding: 24px; }
.modal.small { width: 320px; }
.modal .title { font-size: 15px; font-weight: 700; color: var(--text); }
.modal-text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 12px 0 18px; }
.modal .actions { display: flex; gap: 8px; }
.modal .actions > div { flex: 1; text-align: center; }
.secondary-btn { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; background: var(--panel-2); color: var(--text); }
.danger-btn { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; background: var(--red); color: #fff; }
.fill-head { display: flex; align-items: center; justify-content: space-between; }
.abandon-x { cursor: pointer; font-size: 20px; color: var(--text-secondary); line-height: 1; padding: 2px 6px; }
.abandon-x:hover { color: var(--red); }
.fill-item-name { font-size: 17px; font-weight: 800; margin-top: 14px; }
.fill-item-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
.price-input-row { display: flex; gap: 4px; align-items: center; }
.price-input { width: 140px; font-size: 14px; font-weight: 700; }
.validate-btn { width: 30px; height: 30px; flex-shrink: 0; border-radius: 6px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
</style>
