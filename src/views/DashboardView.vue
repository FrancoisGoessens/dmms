<script setup>
import { ref, onMounted } from 'vue'
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
const filterMode = ref('rentability') // 'rentability' | 'todo'

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

function sortedFilteredRows() {
  let list = rows.value.slice()
  if (filterMode.value === 'todo') list = list.filter((r) => !r.done)
  return list.sort((a, b) => b.rentability - a.rentability)
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
      <div class="segmented">
        <div :class="{ active: filterMode === 'rentability' }" @click="filterMode = 'rentability'">
          Rentabilité
        </div>
        <div :class="{ active: filterMode === 'todo' }" @click="filterMode = 'todo'">
          À faire
        </div>
      </div>
    </div>

    <SkeletonRows v-if="loading" :count="6" />

    <div v-else-if="rows.length === 0" class="empty">
      Aucun donjon assigné — ajoute-en depuis la fiche de {{ character?.name }}.
    </div>

    <div v-else class="panel">
      <div
        v-for="row in sortedFilteredRows()"
        :key="row.dungeonId"
        class="row"
        :class="{ done: row.done }"
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
.segmented {
  display: flex;
  gap: 2px;
  background: var(--panel-2);
  border-radius: 8px;
  padding: 2px;
}
.segmented div {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
}
.segmented div.active {
  background: #4f9e2f;
  color: #fff;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
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
  background: var(--hover);
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
  width: 72px;
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
