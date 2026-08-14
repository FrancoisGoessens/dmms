<script setup>
import { ref, watch } from 'vue'
import { getSoulStones, getLatestStonePrice, setStonePrice } from '../lib/db.js'

const props = defineProps(['open'])
const emit = defineEmits(['close'])

const stones = ref([])

async function load() {
  const list = await getSoulStones()
  stones.value = await Promise.all(
    list.map(async (s) => ({ ...s, price: await getLatestStonePrice(s.item_id), dirty: false }))
  )
}
watch(() => props.open, (v) => { if (v) load() })

function onChange(stone, val) {
  stone.price = Number(val) || 0
  stone.dirty = true
}
async function saveAll() {
  for (const s of stones.value) {
    if (s.dirty) { await setStonePrice(s.item_id, s.price); s.dirty = false }
  }
  emit('close')
}
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <div class="modal">
      <div class="title">Prix des pierres d'âme</div>
      <div v-for="s in stones" :key="s.item_id" class="field">
        <div class="label">{{ s.name }} <span class="muted">(jusqu'au niveau {{ s.level_max }})</span></div>
        <input type="number" :value="s.price" @input="onChange(s, $event.target.value)" class="input-small full" />
      </div>
      <div class="actions">
        <div class="accent-btn" @click="saveAll">Enregistrer</div>
        <div class="close-btn" @click="emit('close')">Fermer</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; z-index: 40; }
.modal { width: 360px; background: var(--panel); border-radius: 14px; padding: 24px; }
.title { font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--text); }
.field { margin-bottom: 14px; }
.label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.muted { color: var(--text-secondary); }
.full { width: 100%; box-sizing: border-box; }
.actions { display: flex; gap: 8px; margin-top: 10px; }
.close-btn { flex: 1; text-align: center; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; background: var(--panel-2); color: var(--text); }
.actions .accent-btn { flex: 1; text-align: center; }
</style>
