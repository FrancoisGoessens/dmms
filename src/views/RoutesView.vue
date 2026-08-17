<script setup>
import { ref, computed, onMounted } from 'vue'
import { priorityColor } from '../lib/theme.js'
import { netCaptureToPercent, isLowVolume } from '../lib/rentability.js'
import { session } from '../lib/session.js'
import {
  getRouteZones, createRouteZone, deleteRouteZone, getAllRouteZoneDungeons,
  addDungeonToZone, removeDungeonFromZone, reorderZoneDungeon, getAllDungeons,
  getLatestPricesForItems, getAllMonsterItemsFull, getCharacterDungeons,
  setDungeonFlag, propagateFait,
} from '../lib/db.js'

const loading = ref(true)
const zones = ref([])
const allDungeons = ref([])
const rentByDungeon = ref({})
const lowVolumeByDungeon = ref({})
const statusByDungeon = ref({})

const showAddZoneForm = ref(false)
const newZoneName = ref('')

async function load() {
  loading.value = true
  const [zoneRows, links, dungeons, monsterItems, charDungeons] = await Promise.all([
    getRouteZones(),
    getAllRouteZoneDungeons(),
    getAllDungeons(),
    getAllMonsterItemsFull(),
    getCharacterDungeons(session.characterId),
  ])
  allDungeons.value = dungeons
  statusByDungeon.value = Object.fromEntries(
    charDungeons.map((cd) => [cd.dungeon_id, { captured: cd.capture, done: cd.fait_cette_semaine }])
  )

  // Rentabilité approximative (capture only, sans le prix de pierre —
  // suffisant pour trier une route, pas besoin du détail complet ici).
  const captureItems = monsterItems.filter((mi) => mi.categorie === 'capture')
  const prices = await getLatestPricesForItems(captureItems.map((mi) => mi.item_id))
  const byDungeon = {}
  const lowVolByDungeon = {}
  for (const mi of captureItems) {
    byDungeon[mi.dungeon_id] = prices[mi.item_id]?.valeur ?? 0
    lowVolByDungeon[mi.dungeon_id] = isLowVolume(mi.cache_items?.ventes_30j)
  }
  rentByDungeon.value = byDungeon
  lowVolumeByDungeon.value = lowVolByDungeon

  zones.value = zoneRows.map((z) => ({
    ...z,
    dungeons: links
      .filter((l) => l.zone_id === z.id)
      .sort((a, b) => a.ordre - b.ordre)
      .map((l) => ({ dungeonId: l.dungeon_id, name: l.cache_dungeons?.name || '—', ordre: l.ordre })),
  }))
  loading.value = false
}
onMounted(load)

function rentOf(dungeonId) {
  return rentByDungeon.value[dungeonId] ?? 0
}
function lowVolumeOf(dungeonId) {
  return lowVolumeByDungeon.value[dungeonId] ?? false
}
function statusOf(dungeonId) {
  return statusByDungeon.value[dungeonId] || { captured: false, done: false }
}
async function toggleCaptured(dungeonId) {
  const s = statusOf(dungeonId)
  const newVal = !s.captured
  statusByDungeon.value[dungeonId] = { ...s, captured: newVal, done: newVal ? true : s.done }
  await setDungeonFlag(session.characterId, dungeonId, 'capture', newVal)
  if (newVal && !s.done) await setDungeonFlag(session.characterId, dungeonId, 'fait_cette_semaine', true)
  if (statusByDungeon.value[dungeonId].done) await propagateFait(session.characterId, dungeonId)
}
async function toggleDone(dungeonId) {
  const s = statusOf(dungeonId)
  const newVal = !s.done
  statusByDungeon.value[dungeonId] = { ...s, done: newVal }
  await setDungeonFlag(session.characterId, dungeonId, 'fait_cette_semaine', newVal)
  if (newVal) await propagateFait(session.characterId, dungeonId)
}

function usedDungeonOptionsFor() {
  const used = new Set(zones.value.flatMap((z) => z.dungeons.map((d) => d.dungeonId)))
  return allDungeons.value.filter((d) => !used.has(d.id))
}

async function confirmNewZone() {
  if (!newZoneName.value.trim()) return
  await createRouteZone(newZoneName.value.trim())
  newZoneName.value = ''
  showAddZoneForm.value = false
  await load()
}
async function onDeleteZone(zoneId) {
  await deleteRouteZone(zoneId)
  await load()
}
async function onRemoveDungeon(zone, dungeonId) {
  await removeDungeonFromZone(zone.id, dungeonId)
  await load()
}
async function onAddDungeon(zone, e) {
  const id = e.target.value
  if (!id) return
  await addDungeonToZone(zone.id, id, zone.dungeons.length + 1)
  e.target.value = ''
  await load()
}

let dragged = null
function onDragStart(zone, dungeon) { dragged = { zone, dungeon } }
async function onDrop(zone, target) {
  if (!dragged || dragged.zone !== zone) return
  const list = zone.dungeons
  const from = list.indexOf(dragged.dungeon)
  const to = list.indexOf(target)
  list.splice(from, 1)
  list.splice(to, 0, dragged.dungeon)
  await Promise.all(list.map((d, i) => {
    d.ordre = i + 1
    return reorderZoneDungeon(zone.id, d.dungeonId, i + 1)
  }))
  dragged = null
}
</script>

<template>
  <div>
    <div class="top-row">
      <input v-if="showAddZoneForm" v-model="newZoneName" @keydown.enter="confirmNewZone" placeholder="Nom du groupe de route" class="input-small" autofocus />
      <div v-else class="dashed-btn" @click="showAddZoneForm = true">+ Nouveau groupe</div>
    </div>

    <p v-if="loading">Chargement…</p>

    <div v-else-if="zones.length === 0" class="empty">Aucun groupe de route pour l'instant.</div>

    <div v-else class="zones-grid">
      <div v-for="zone in zones" :key="zone.id" class="panel-pad">
        <div class="zone-head">
          <div class="zone-name">{{ zone.name }}</div>
          <div class="zone-del" @click="onDeleteZone(zone.id)" title="Supprimer ce groupe">×</div>
        </div>
        <div class="dungeon-list">
          <div
            v-for="d in zone.dungeons" :key="d.dungeonId"
            class="dungeon-row" draggable="true"
            @dragstart="onDragStart(zone, d)" @dragover.prevent @drop="onDrop(zone, d)"
          >
            <div class="drag-handle">⠿</div>
            <div class="order-chip">{{ d.ordre }}</div>
            <div class="dungeon-name">{{ d.name }}</div>
            <div class="badge-mini" :class="{ on: statusOf(d.dungeonId).captured }" @click="toggleCaptured(d.dungeonId)">Cap.</div>
            <div class="badge-mini" :class="{ on: statusOf(d.dungeonId).done }" @click="toggleDone(d.dungeonId)">Fait</div>
            <div class="rent" :style="{ color: priorityColor(rentOf(d.dungeonId)) }">
              <span v-if="lowVolumeOf(d.dungeonId)" class="low-volume-warning" title="Volume de ventes faible">⚠</span>
              {{ Math.round(netCaptureToPercent(rentOf(d.dungeonId))) }}%
            </div>
            <div class="remove" @click="onRemoveDungeon(zone, d.dungeonId)" title="Retirer">×</div>
          </div>
          <div v-if="zone.dungeons.length === 0" class="empty-zone">Vide</div>
        </div>
        <select @change="onAddDungeon(zone, $event)" class="dashed-select">
          <option value="">+ Ajouter un donjon</option>
          <option v-for="d in usedDungeonOptionsFor()" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-row { margin-bottom: 16px; }
.dashed-btn { display: inline-block; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--accent-text); border: 1px dashed var(--accent); }
.zones-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.zone-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.zone-name { font-size: 13px; font-weight: 700; }
.zone-del { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
.dungeon-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.dungeon-row { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; background: var(--panel-2); cursor: grab; }
.drag-handle { color: var(--text-secondary); font-size: 13px; }
.order-chip { width: 18px; height: 18px; border-radius: 5px; background: var(--panel); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
.dungeon-name { font-size: 13px; font-weight: 600; flex: 1; }
.rent { font-size: 11px; font-weight: 600; }
.low-volume-warning { color: var(--amber); margin-right: 3px; }
.badge-mini { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; color: var(--text-secondary); background: var(--panel); white-space: nowrap; cursor: pointer; }
.badge-mini.on { color: var(--accent-text); background: var(--soft-accent-bg); }
.remove { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
.dashed-select { font-size: 12px; padding: 8px 12px; border-radius: 8px; border: 1px dashed var(--accent); color: var(--accent-text); outline: none; background: var(--input); width: 100%; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.empty-zone { font-size: 11px; color: var(--text-secondary); font-style: italic; padding: 4px; }
</style>
