<script setup>
import { ref, computed } from 'vue'
import { priorityColor } from '../lib/theme.js'

// Données factices — remplacées ce soir par route_zones / route_zone_dungeons.
const zones = ref([
  { id: 'z1', name: 'Astrub', dungeons: [
    { id: 'd1', order: 1, name: 'Cour du Bouftou Royal', rentability: 76 },
    { id: 'd2', order: 2, name: 'Grotte du Bworker', rentability: 54 },
  ]},
  { id: 'z2', name: 'Frigost', dungeons: [
    { id: 'd3', order: 1, name: 'Donjon Kanigrula', rentability: 91 },
  ]},
])

const availableDungeons = [
  { id: 'd4', name: 'Donjon Minotot' }, { id: 'd5', name: 'Donjon Blop' }, { id: 'd6', name: 'Donjon Craqueleur' },
]

const showAddZoneForm = ref(false)
const newZoneName = ref('')
function confirmNewZone() {
  if (!newZoneName.value.trim()) return
  zones.value.push({ id: 'z' + Date.now(), name: newZoneName.value.trim(), dungeons: [] })
  newZoneName.value = ''
  showAddZoneForm.value = false
}
function deleteZone(zoneId) {
  zones.value = zones.value.filter((z) => z.id !== zoneId)
}
function removeDungeon(zone, dungeonId) {
  zone.dungeons = zone.dungeons.filter((d) => d.id !== dungeonId)
}
function usedDungeonOptionsFor(zone) {
  const usedElsewhere = new Set(
    zones.value.flatMap((z) => z.dungeons).map((d) => d.id)
  )
  return availableDungeons.filter((d) => !usedElsewhere.has(d.id))
}
function addDungeon(zone, e) {
  const id = e.target.value
  if (!id) return
  const opt = availableDungeons.find((d) => d.id === id)
  zone.dungeons.push({ id, order: zone.dungeons.length + 1, name: opt.name, rentability: 50 })
  e.target.value = ''
}

let dragged = null
function onDragStart(zone, dungeon) { dragged = { zone, dungeon } }
function onDrop(zone, target) {
  if (!dragged || dragged.zone !== zone) return
  const from = zone.dungeons.indexOf(dragged.dungeon)
  const to = zone.dungeons.indexOf(target)
  zone.dungeons.splice(from, 1)
  zone.dungeons.splice(to, 0, dragged.dungeon)
  zone.dungeons.forEach((d, i) => (d.order = i + 1))
  dragged = null
}
</script>

<template>
  <div>
    <div class="top-row">
      <input v-if="showAddZoneForm" v-model="newZoneName" @keydown.enter="confirmNewZone" placeholder="Nom du groupe de route" class="input-small" autofocus />
      <div v-else class="dashed-btn" @click="showAddZoneForm = true">+ Nouveau groupe</div>
    </div>

    <div class="zones-grid">
      <div v-for="zone in zones" :key="zone.id" class="panel-pad">
        <div class="zone-head">
          <div class="zone-name">{{ zone.name }}</div>
          <div class="zone-del" @click="deleteZone(zone.id)" title="Supprimer ce groupe">×</div>
        </div>
        <div class="dungeon-list">
          <div
            v-for="d in zone.dungeons" :key="d.id"
            class="dungeon-row" draggable="true"
            @dragstart="onDragStart(zone, d)" @dragover.prevent @drop="onDrop(zone, d)"
          >
            <div class="drag-handle">⠿</div>
            <div class="order-chip">{{ d.order }}</div>
            <div class="dungeon-name">{{ d.name }}</div>
            <div class="rent" :style="{ color: priorityColor(d.rentability) }">{{ d.rentability }}%</div>
            <div class="remove" @click="removeDungeon(zone, d.id)" title="Retirer">×</div>
          </div>
        </div>
        <select @change="addDungeon(zone, $event)" class="dashed-select">
          <option value="">+ Ajouter un donjon</option>
          <option v-for="d in usedDungeonOptionsFor(zone)" :key="d.id" :value="d.id">{{ d.name }}</option>
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
.remove { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
.dashed-select { font-size: 12px; padding: 8px 12px; border-radius: 8px; border: 1px dashed var(--accent); color: var(--accent-text); outline: none; background: var(--input); width: 100%; }
</style>
