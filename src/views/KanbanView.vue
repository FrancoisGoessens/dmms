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
import { priorityColor } from '../lib/theme.js'
import SkeletonRows from '../components/SkeletonRows.vue'

const router = useRouter()
const loading = ref(true)
const rows = ref([])

async function load() {
  loading.value = true
  rows.value = await getCachedRentabilities(session.characterId, async () => {
    const [character, charDungeons, soulStones] = await Promise.all([
      getCharacter(session.characterId),
      getCharacterDungeons(session.characterId),
      getSoulStones(),
    ])
    return computeDungeonRentabilities({
      charDungeons, character, soulStones,
      getMonsterItemsForDungeons, getLatestPricesForItems,
    })
  })
  loading.value = false
}
onMounted(load)

function column(row) {
  if (row.captured) return 'Capturé'
  if (row.done) return 'Fait'
  return 'À faire'
}
function sortedByColumn(col) {
  return rows.value
    .filter((r) => column(r) === col)
    .sort((a, b) => a.niveau - b.niveau || a.name.localeCompare(b.name))
}
function openDetail(row) {
  router.push({ name: 'detail', params: { id: row.dungeonId } })
}

async function toggleCaptured(row) {
  row.captured = !row.captured
  await setDungeonFlag(session.characterId, row.dungeonId, 'capture', row.captured)
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
</script>

<template>
  <div>
    <div v-if="loading" class="board">
      <div v-for="i in 3" :key="i" class="column">
        <div class="col-head-skel"></div>
        <SkeletonRows :count="2" :height="70" />
      </div>
    </div>
    <div v-else class="board">
      <div v-for="col in ['À faire', 'Fait', 'Capturé']" :key="col" class="column">
        <div class="col-head">{{ col }} <span class="count">{{ sortedByColumn(col).length }}</span></div>
        <div
          v-for="row in sortedByColumn(col)"
          :key="row.dungeonId"
          class="card"
          @click="openDetail(row)"
        >
          <div class="priority-bar" :style="{ background: priorityColor(row.netCapture) }"></div>
          <div class="card-body">
            <div class="name">{{ row.name }}</div>
            <div class="zone">{{ row.bossName }} - Niveau {{ row.niveau }}</div>
            <div class="card-footer">
              <div class="badges-group">
                <div class="badge" :class="{ on: row.captured }" @click.stop="toggleCaptured(row)">{{ row.captured ? 'Capturé' : 'Pas capturé' }}</div>
                <div class="badge" :class="{ on: row.done }" @click.stop="toggleDone(row)">{{ row.done ? 'Fait' : 'À faire' }}</div>
              </div>
              <div class="rent" :style="{ color: priorityColor(row.netCapture) }">
              <span v-if="row.lowVolume" class="low-volume-warning" title="Volume de ventes faible">⚠</span>
              {{ Math.round(row.rentability) }}%
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.column { background: var(--page-bg); border-radius: 12px; }
.col-head-skel { width: 80px; height: 16px; border-radius: 4px; background: var(--panel-2); margin-bottom: 12px; animation: pulse 1.3s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.col-head { font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--text); display: flex; align-items: center; gap: 8px; }
.count { font-size: 11px; font-weight: 600; color: var(--text-secondary); background: var(--panel-2); padding: 2px 8px; border-radius: 20px; }
.card {
  position: relative;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 14px 14px 18px;
  margin-bottom: 10px;
  cursor: pointer;
  overflow: hidden;
}
.card:hover { border-color: var(--accent); }
.priority-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
.zone { font-size: 11px; color: var(--text-secondary); margin-bottom: 10px; }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.badges-group { display: flex; flex-direction: row; gap: 4px; }
.badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; color: var(--text-secondary); background: var(--panel-2); cursor: pointer; width: fit-content; }
.badge.on { color: var(--accent-text); background: var(--soft-accent-bg); }
.rent { font-size: 11px; font-weight: 700; }
.low-volume-warning { color: var(--amber); margin-right: 3px; }
</style>
