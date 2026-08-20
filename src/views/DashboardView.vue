<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getCharacter, getCharacterDungeons, getMonsterItemsForDungeons,
  getLatestPricesForItems, getSoulStones, setDungeonFlag, propagateFait,
} from '../lib/db.js'
import { computeDungeonRentabilities } from '../lib/rentability.js'
import { getCachedRentabilities } from '../lib/dungeonCache.js'
import SkeletonRows from '../components/SkeletonRows.vue'
import { priorityColor } from '../lib/theme.js'

const router = useRouter()
const loading = ref(true)
const character = ref(null)
const rows = ref([])
const hideDone = ref(false)

async function load() {
  loading.value = true
  character.value = await getCharacter(session.characterId)

  rows.value = await getCachedRentabilities(session.characterId, async () => {
    const [charDungeons, soulStones] = await Promise.all([
      getCharacterDungeons(session.characterId),
      getSoulStones(),
    ])
    return computeDungeonRentabilities({
      charDungeons, character: character.value, soulStones,
      getMonsterItemsForDungeons, getLatestPricesForItems,
    })
  })
  loading.value = false
}
onMounted(load)
watch(() => session.characterId, load)

function sortedFilteredRows() {
  let list = rows.value.slice()
  if (hideDone.value) list = list.filter((r) => !r.done)
  return list.sort((a, b) => a.niveau - b.niveau || a.name.localeCompare(b.name))
}

async function toggleCaptured(row) {
  row.captured = !row.captured
  await setDungeonFlag(session.characterId, row.dungeonId, 'capture', row.captured)
  // Capturer un donjon le marque aussi comme fait.
  if (row.captured && !row.done) {
    row.done = true
    await setDungeonFlag(session.characterId, row.dungeonId, 'fait_cette_semaine', true)
  }
  if (row.done) await propagateFait(session.characterId, row.dungeonId)
}

async function toggleDone(row) {
  row.done = !row.done
  await setDungeonFlag(session.characterId, row.dungeonId, 'fait_cette_semaine', row.done)
  if (row.done) await propagateFait(session.characterId, row.dungeonId)
}

function openDetail(row) {
  router.push({ name: 'detail', params: { id: row.dungeonId } })
}
</script>

<template>
  <div>
    <div class="header-row">
      <div class="subtitle">
        Donjons de <strong>{{ character?.name }}</strong>
      </div>
      <div class="toggle-wrap" @click="hideDone = !hideDone">
        <div class="toggle" :class="{ on: hideDone }"><div class="knob"></div></div>
        <span class="toggle-label">Masquer les faits</span>
      </div>
    </div>

    <SkeletonRows v-if="loading" :count="6" />

    <div v-else-if="rows.length === 0" class="empty">
      Aucun donjon assigné — ajoute-en depuis la fiche de {{ character?.name }}.
    </div>

    <div v-else class="panel two-col">
      <div
        v-for="row in sortedFilteredRows()"
        :key="row.dungeonId"
        class="row card-style"
        :class="{ done: row.done }"
        :style="{ background: `color-mix(in oklch, ${priorityColor(row.netCapture)} 12%, transparent)` }"
        @click="openDetail(row)"
      >
        <div class="priority-bar" :style="{ background: priorityColor(row.netCapture) }"></div>
        <div class="name-block">
          <div class="name" :class="{ done: row.done }">{{ row.name }}</div>
          <div class="zone">{{ row.bossName }} - Niveau {{ row.niveau }}</div>
        </div>
        <div class="badge" :class="{ on: row.captured }" @click.stop="toggleCaptured(row)">
          {{ row.captured ? 'Capturé' : 'Pas capturé' }}
        </div>
        <div class="badge" :class="{ on: row.done }" @click.stop="toggleDone(row)">
          {{ row.done ? 'Fait' : 'À faire' }}
        </div>
        <div class="rent" :style="{ color: priorityColor(row.netCapture) }">
          <span v-if="row.lowVolume" class="low-volume-warning" title="Volume de ventes faible sur les 30 derniers jours">⚠</span>
          {{ Math.round(row.rentability) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}
.toggle-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.toggle-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
.toggle {
  width: 34px;
  height: 20px;
  border-radius: 20px;
  background: var(--panel-2);
  padding: 2px;
  transition: background 0.15s;
}
.toggle.on {
  background: var(--accent);
}
.knob {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}
.toggle.on .knob {
  transform: translateX(14px);
}
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.panel.two-col {
  background: none;
  border: none;
  border-radius: 0;
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 10px;
}
.row.card-style {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--panel-2);
  position: relative;
  cursor: pointer;
}
.row:hover {
  background: var(--hover) !important;
}
.row.done {
  opacity: 0.55;
}
.priority-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}
.name-block {
  flex: 1;
  min-width: 0;
  margin-left: 6px;
}
.name {
  font-size: 14px;
  font-weight: 600;
}
.name.done {
  text-decoration: line-through;
}
.zone {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 20px;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--text-secondary);
  background: var(--panel-2);
}
.badge.on {
  color: var(--accent-text);
  background: var(--soft-accent-bg);
}
.rent {
  width: 30px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
}
.low-volume-warning {
  color: var(--amber);
  margin-right: 4px;
}
.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
