<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Données factices — remplacées ce soir par price_log (dernière entrée > 30j).
const rows = ref([
  { id: 'd1', name: 'Kanigrula', type: 'capture', price: 600, days: 60 },
  { id: 'd2', name: 'Perle Noire', type: 'item', price: 700, days: 70 },
  { id: 'd3', name: 'Comte Harebourg', type: 'capture', price: 2600, days: 50 },
  { id: 'd4', name: 'Larve Rousse', type: 'capture', price: 900, days: 45 },
  { id: 'd5', name: 'Éclat de Craqueleur', type: 'item', price: 60, days: 40 },
  { id: 'd6', name: 'Griffe Glacée', type: 'item', price: 15, days: 38 },
  { id: 'd7', name: 'Corne de Minotoror', type: 'item', price: 75, days: 33 },
])

function severity(days) {
  return days >= 60 ? 'red' : 'amber'
}
function open(id) {
  router.push({ name: 'detail', params: { id } })
}
</script>

<template>
  <div class="panel">
    <div v-for="row in rows" :key="row.id" class="row" :class="severity(row.days)" @click="open(row.id)">
      <div class="type-tag" :class="severity(row.days)">{{ row.type === 'capture' ? 'Capture' : 'Item' }}</div>
      <div class="name">{{ row.name }}</div>
      <div class="price">{{ row.price.toLocaleString('fr-FR') }} kamas</div>
      <div class="badge-days" :class="severity(row.days)">{{ row.days }} j</div>
    </div>
    <div v-if="rows.length === 0" class="empty">Tout est à jour, rien à vérifier 🎉</div>
  </div>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.row.amber { background: color-mix(in oklch, var(--amber) 10%, transparent); }
.row.red { background: color-mix(in oklch, var(--red) 10%, transparent); }
.row:hover { filter: brightness(0.97); }
.type-tag { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
.type-tag.amber { color: var(--amber); background: color-mix(in oklch, var(--amber) 20%, transparent); }
.type-tag.red { color: var(--red); background: color-mix(in oklch, var(--red) 20%, transparent); }
.name { flex: 1; font-size: 14px; font-weight: 600; }
.price { font-size: 12px; color: var(--text-secondary); }
.badge-days { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
.badge-days.amber { color: var(--amber); background: color-mix(in oklch, var(--amber) 22%, transparent); }
.badge-days.red { color: var(--red); background: color-mix(in oklch, var(--red) 22%, transparent); }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
</style>
