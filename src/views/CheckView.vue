<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAllMonsterItemsFull, getLatestPricesForItems } from '../lib/db.js'

const router = useRouter()
const loading = ref(true)
const rows = ref([])

function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

async function load() {
  loading.value = true
  const monsterItems = await getAllMonsterItemsFull()
  const itemIds = monsterItems.map((mi) => mi.item_id)
  const prices = await getLatestPricesForItems(itemIds)

  const built = monsterItems
    .filter((mi) => mi.cache_items)
    .map((mi) => {
      const p = prices[mi.item_id]
      return {
        itemId: mi.item_id,
        dungeonId: mi.dungeon_id,
        name: mi.cache_items.name,
        type: mi.categorie === 'capture' ? 'Capture' : 'Item',
        price: p?.valeur ?? null,
        days: p ? daysAgo(p.created_at) : null, // null = jamais mis à jour, le pire cas
      }
    })
    .filter((r) => r.days === null || r.days >= 30)
    .sort((a, b) => (b.days ?? 99999) - (a.days ?? 99999))

  rows.value = built
  loading.value = false
}
onMounted(load)

function severity(days) {
  if (days === null) return 'red'
  return days >= 60 ? 'red' : 'amber'
}
function open(dungeonId) {
  router.push({ name: 'detail', params: { id: dungeonId } })
}
</script>

<template>
  <div class="panel">
    <p v-if="loading">Chargement…</p>
    <template v-else>
      <div v-for="row in rows" :key="row.itemId" class="row" :class="severity(row.days)" @click="open(row.dungeonId)">
        <div class="type-tag" :class="severity(row.days)">{{ row.type }}</div>
        <div class="name">{{ row.name }}</div>
        <div class="price">{{ row.price == null ? 'aucun prix' : `${row.price.toLocaleString('fr-FR')} kamas` }}</div>
        <div class="badge-days" :class="severity(row.days)">{{ row.days === null ? 'jamais' : `${row.days} j` }}</div>
      </div>
      <div v-if="rows.length === 0" class="empty">Tout est à jour, rien à vérifier 🎉</div>
    </template>
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
