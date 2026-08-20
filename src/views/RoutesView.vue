<script setup>
import { ref, computed, onMounted } from 'vue'
import { priorityColor } from '../lib/theme.js'
import { netCaptureToPercent, isLowVolume } from '../lib/rentability.js'
import { session } from '../lib/session.js'
import {
  getRouteZones, createRouteZone, deleteRouteZone, reorderZone, getAllRouteZoneDungeons,
  addDungeonToZone, addNoteToZone, updateZoneRowNote, removeZoneRow, reorderZoneDungeon,
  getAllDungeonsWithBossName, getLatestPricesForItems, getAllMonsterItemsFull, getCharacterDungeons,
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

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function load() {
  loading.value = true
  const [zoneRows, links, dungeons, monsterItems, charDungeons] = await Promise.all([
    getRouteZones(),
    getAllRouteZoneDungeons(),
    getAllDungeonsWithBossName(),
    getAllMonsterItemsFull(),
    getCharacterDungeons(session.characterId),
  ])
  allDungeons.value = dungeons
  statusByDungeon.value = Object.fromEntries(
    charDungeons.map((cd) => [cd.dungeon_id, { captured: cd.capture, done: cd.fait_cette_semaine }])
  )

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
    rows: links
      .filter((l) => l.zone_id === z.id)
      .sort((a, b) => a.ordre - b.ordre)
      .map((l) => ({
        rowId: l.id, dungeonId: l.dungeon_id,
        name: l.cache_dungeons?.name || null,
        note: l.note, ordre: l.ordre,
        editingNote: false,
      })),
  }))
  loading.value = false
}
onMounted(load)

function rentOf(dungeonId) { return rentByDungeon.value[dungeonId] ?? 0 }
function lowVolumeOf(dungeonId) { return lowVolumeByDungeon.value[dungeonId] ?? false }
function statusOf(dungeonId) { return statusByDungeon.value[dungeonId] || { captured: false, done: false } }

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

// --- Groupes (zones) ---
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
let draggedZone = null
function onZoneDragStart(zone) { draggedZone = zone }
async function onZoneDrop(target) {
  if (!draggedZone || draggedZone === target) return
  const list = zones.value
  const from = list.indexOf(draggedZone)
  const to = list.indexOf(target)
  list.splice(from, 1)
  list.splice(to, 0, draggedZone)
  await Promise.all(list.map((z, i) => reorderZone(z.id, i)))
  draggedZone = null
}

// --- Lignes (donjons + annotations) dans une zone ---
function usedDungeonIds() {
  return new Set(zones.value.flatMap((z) => z.rows.map((r) => r.dungeonId).filter(Boolean)))
}
async function onAddDungeon(zone, d) {
  await addDungeonToZone(zone.id, d.id, zone.rows.length)
  await load()
}
async function onAddNote(zone) {
  await addNoteToZone(zone.id, '', zone.rows.length)
  await load()
}
async function onRemoveRow(rowId) {
  await removeZoneRow(rowId)
  await load()
}
async function onSaveNote(row) {
  await updateZoneRowNote(row.rowId, row.note)
  row.editingNote = false
}

let dragged = null
function onDragStart(zone, row) { dragged = { zone, row } }
async function onDrop(zone, target) {
  if (!dragged || dragged.zone !== zone) return
  const list = zone.rows
  const from = list.indexOf(dragged.row)
  const to = list.indexOf(target)
  list.splice(from, 1)
  list.splice(to, 0, dragged.row)
  await Promise.all(list.map((r, i) => {
    r.ordre = i
    return reorderZoneDungeon(r.rowId, i)
  }))
  dragged = null
}

// --- Recherche donjon (nom OU boss), par zone ---
const addQueries = ref({}) // zoneId -> texte tapé
function addQueryFor(zoneId) { return addQueries.value[zoneId] || '' }
function setAddQuery(zoneId, val) { addQueries.value = { ...addQueries.value, [zoneId]: val } }
function addResultsFor(zoneId) {
  const q = normalize(addQueryFor(zoneId))
  if (q.length < 2) return []
  const used = usedDungeonIds()
  return allDungeons.value
    .filter((d) => !used.has(d.id))
    .filter((d) => normalize(d.name).includes(q) || normalize(d.bossName).includes(q))
    .slice(0, 15)
}
async function pickDungeon(zone, d) {
  await onAddDungeon(zone, d)
  setAddQuery(zone.id, '')
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
      <div
        v-for="zone in zones" :key="zone.id"
        class="panel-pad"
        draggable="true"
        @dragstart="onZoneDragStart(zone)" @dragover.prevent @drop="onZoneDrop(zone)"
      >
        <div class="zone-head">
          <div class="zone-drag">⠿</div>
          <div class="zone-name">{{ zone.name }}</div>
          <div class="zone-del" @click="onDeleteZone(zone.id)" title="Supprimer ce groupe">×</div>
        </div>

        <div class="dungeon-list">
          <div
            v-for="row in zone.rows" :key="row.rowId"
            class="dungeon-row" :class="{ 'is-note': !row.dungeonId }"
            draggable="true"
            @dragstart="onDragStart(zone, row)" @dragover.prevent @drop="onDrop(zone, row)"
          >
            <div class="drag-handle">⠿</div>

            <template v-if="row.dungeonId">
              <div class="dungeon-name">{{ row.name }}</div>
              <div class="badge-mini" :class="{ on: statusOf(row.dungeonId).captured }" @click="toggleCaptured(row.dungeonId)">Cap.</div>
              <div class="badge-mini" :class="{ on: statusOf(row.dungeonId).done }" @click="toggleDone(row.dungeonId)">Fait</div>
              <div class="rent" :style="{ color: priorityColor(rentOf(row.dungeonId)) }">
                <span v-if="lowVolumeOf(row.dungeonId)" class="low-volume-warning" title="Volume de ventes faible">⚠</span>
                {{ Math.round(netCaptureToPercent(rentOf(row.dungeonId))) }}%
              </div>
            </template>

            <template v-else>
              <input
                v-if="row.editingNote"
                v-model="row.note"
                class="note-input"
                placeholder="Ta note (ex. coordonnées de TP)..."
                @keydown.enter="onSaveNote(row)"
                @blur="onSaveNote(row)"
                autofocus
              />
              <div v-else class="note-text">{{ row.note || '(note vide)' }}</div>
              <div class="gear-btn" @click="row.editingNote = !row.editingNote" title="Modifier">⚙</div>
            </template>

            <div class="remove" @click="onRemoveRow(row.rowId)" title="Retirer">×</div>
          </div>
          <div v-if="zone.rows.length === 0" class="empty-zone">Vide</div>
        </div>

        <div class="add-wrap">
          <input
            :value="addQueryFor(zone.id)"
            @input="setAddQuery(zone.id, $event.target.value)"
            class="dashed-select"
            placeholder="+ Ajouter un donjon (nom ou boss)"
          />
          <div v-if="addResultsFor(zone.id).length" class="add-results">
            <div v-for="d in addResultsFor(zone.id)" :key="d.id" class="add-result-item" @click="pickDungeon(zone, d)">
              <span class="bold">{{ d.name }}</span>
              <span class="muted"> — {{ d.bossName }} · niv. {{ d.niveau }}</span>
            </div>
          </div>
        </div>
        <div class="note-link" @click="onAddNote(zone)">+ Ajouter une note</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-row { margin-bottom: 16px; }
.dashed-btn { display: inline-block; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--accent-text); border: 1px dashed var(--accent); }
.zones-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; align-items: start; }
.zone-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.zone-drag { color: var(--text-secondary); font-size: 12px; cursor: grab; }
.zone-name { font-size: 13px; font-weight: 700; flex: 1; }
.zone-del { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
.dungeon-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.dungeon-row { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; background: var(--panel-2); cursor: grab; }
.dungeon-row.is-note { background: var(--soft-accent-bg); }
.drag-handle { color: var(--text-secondary); font-size: 13px; flex-shrink: 0; }
.dungeon-name { font-size: 13px; font-weight: 600; flex: 1; min-width: 0; }
.note-text { font-size: 12px; font-style: italic; flex: 1; min-width: 0; color: var(--text); }
.note-input { flex: 1; min-width: 0; font-size: 12px; padding: 4px 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text); }
.gear-btn { cursor: pointer; color: var(--text-secondary); font-size: 13px; flex-shrink: 0; }
.badge-mini { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; color: var(--text-secondary); background: var(--panel); white-space: nowrap; cursor: pointer; }
.badge-mini.on { color: var(--accent-text); background: var(--soft-accent-bg); }
.rent { font-size: 11px; font-weight: 600; flex-shrink: 0; }
.low-volume-warning { color: var(--amber); margin-right: 3px; }
.remove { cursor: pointer; color: var(--text-secondary); font-size: 13px; flex-shrink: 0; }
.add-wrap { position: relative; margin-bottom: 8px; }
.dashed-select { font-size: 12px; padding: 8px 12px; border-radius: 8px; border: 1px dashed var(--accent); color: var(--accent-text); outline: none; background: var(--input); width: 100%; box-sizing: border-box; }
.add-results { position: absolute; top: 42px; left: 0; right: 0; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25); max-height: 240px; overflow: auto; z-index: 20; }
.add-result-item { padding: 8px 12px; font-size: 12px; cursor: pointer; }
.add-result-item:hover { background: var(--hover); }
.bold { font-weight: 600; }
.muted { color: var(--text-secondary); }
.note-link { font-size: 11px; font-weight: 600; color: var(--accent-text); cursor: pointer; text-align: center; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.empty-zone { font-size: 11px; color: var(--text-secondary); font-style: italic; padding: 4px; }
</style>
