<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSalesLog, addSaleEntry, getAllItemsForSalesForm } from '../lib/db.js'
import { session } from '../lib/session.js'

const filter = ref('tout')
const view = ref('liste')
const showAddForm = ref(false)
const loading = ref(true)

const allSales = ref([])
const availableItems = ref([])
const newSale = ref({ date: new Date().toISOString().slice(0, 10), itemId: '', qty: 1, price: '' })

async function load() {
  loading.value = true
  allSales.value = await getSalesLog()
  availableItems.value = await getAllItemsForSalesForm()
  loading.value = false
}
onMounted(load)

const filteredRows = computed(() =>
  allSales.value.filter((r) => filter.value === 'tout' || r.type === filter.value)
)
const total = computed(() =>
  filteredRows.value.reduce((s, r) => s + r.unitPrice * r.qty, 0)
)
const itemsView = computed(() => {
  const map = {}
  for (const r of filteredRows.value) {
    if (!map[r.item]) map[r.item] = { name: r.item, qty: 0, totalValue: 0 }
    map[r.item].qty += r.qty
    map[r.item].totalValue += r.unitPrice * r.qty
  }
  return Object.values(map).map((r) => ({ ...r, avgPrice: Math.round(r.totalValue / r.qty) }))
})

async function confirmAdd() {
  if (!newSale.value.itemId || !newSale.value.price) return
  await addSaleEntry(newSale.value.itemId, newSale.value.date, newSale.value.qty, Number(newSale.value.price), session.characterId)
  newSale.value = { date: new Date().toISOString().slice(0, 10), itemId: '', qty: 1, price: '' }
  showAddForm.value = false
  await load()
}
</script>

<template>
  <div>
    <div class="top-row">
      <div class="left-controls">
        <div class="segmented">
          <div :class="{ active: filter === 'tout' }" @click="filter = 'tout'">Tout</div>
          <div :class="{ active: filter === 'observation' }" @click="filter = 'observation'">Observation HDV</div>
          <div :class="{ active: filter === 'vente' }" @click="filter = 'vente'">Vente réelle</div>
        </div>
        <div v-if="filter === 'vente'" class="segmented">
          <div :class="{ active: view === 'liste' }" @click="view = 'liste'">Ventes</div>
          <div :class="{ active: view === 'items' }" @click="view = 'items'">Items</div>
        </div>
      </div>
      <div class="right-controls">
        <div class="total">Total : {{ total.toLocaleString('fr-FR') }} kamas</div>
        <div class="accent-btn" @click="showAddForm = !showAddForm">+ Ajouter une entrée</div>
      </div>
    </div>

    <p v-if="loading">Chargement…</p>

    <div v-else-if="view === 'items' && filter === 'vente'" class="panel">
      <div class="items-grid items-head">
        <div>Item</div><div class="right">Qté</div><div class="right">Prix moyen /u</div><div class="right">Total</div>
      </div>
      <div v-for="r in itemsView" :key="r.name" class="items-grid items-row">
        <div class="bold">{{ r.name }}</div>
        <div class="right muted">×{{ r.qty }}</div>
        <div class="right bold">{{ r.avgPrice.toLocaleString('fr-FR') }} k</div>
        <div class="right bold">{{ r.totalValue.toLocaleString('fr-FR') }} k</div>
      </div>
      <div v-if="itemsView.length === 0" class="empty">Aucune vente enregistrée.</div>
    </div>

    <div v-else class="panel">
      <div class="sales-grid sales-head">
        <div>Date</div><div>Item</div><div class="right">Qté</div><div class="right">Prix /u</div><div class="right">Total</div><div>Type</div>
      </div>
      <div v-if="showAddForm" class="sales-grid sales-row">
        <input type="date" v-model="newSale.date" class="cell-input" />
        <select v-model="newSale.itemId" class="cell-input">
          <option value="">Item…</option>
          <option v-for="i in availableItems" :key="i.id" :value="i.id">{{ i.name }}</option>
        </select>
        <input type="number" v-model.number="newSale.qty" class="cell-input right" />
        <input type="number" v-model.number="newSale.price" placeholder="prix" class="cell-input right" />
        <div class="right muted">—</div>
        <div class="form-actions">
          <div class="cancel-btn" @click="showAddForm = false">Annuler</div>
          <div class="accent-btn small" @click="confirmAdd">Ajouter</div>
        </div>
      </div>
      <div v-for="r in filteredRows" :key="r.id" class="sales-grid sales-row">
        <div class="muted">{{ r.date }}</div>
        <div class="bold">{{ r.item }}</div>
        <div class="right muted">×{{ r.qty }}</div>
        <div class="right">{{ r.unitPrice.toLocaleString('fr-FR') }} k</div>
        <div class="right bold">{{ (r.unitPrice * r.qty).toLocaleString('fr-FR') }} k</div>
        <div><span class="badge" :class="{ on: r.type === 'vente' }">{{ r.type === 'vente' ? 'Vente' : 'Observation' }}</span></div>
      </div>
      <div v-if="filteredRows.length === 0" class="empty">Aucune entrée pour ce filtre.</div>
    </div>
  </div>
</template>

<style scoped>
.top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.left-controls { display: flex; gap: 10px; }
.right-controls { display: flex; align-items: center; gap: 16px; }
.total { font-size: 14px; font-weight: 700; }
.accent-btn.small { padding: 6px 12px; font-size: 12px; }

.items-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 12px 16px; align-items: center; }
.items-head { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border); }
.items-row { border-bottom: 1px solid var(--border-light); font-size: 13px; }

.sales-grid { display: grid; grid-template-columns: 1fr 1.6fr 0.6fr 0.8fr 0.8fr 1fr; padding: 12px 16px; align-items: center; gap: 8px; }
.sales-head { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border); }
.sales-row { border-bottom: 1px solid var(--border-light); font-size: 13px; }
.cell-input { font-size: 12px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text); }
.form-actions { display: flex; gap: 6px; }
.cancel-btn { font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 8px; cursor: pointer; background: var(--panel-2); color: var(--text); }

.right { text-align: right; }
.muted { color: var(--text-secondary); }
.bold { font-weight: 600; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
</style>
