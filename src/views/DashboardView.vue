<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getCharacter,
  getCharacterDungeons,
  getMonsterItems,
  getLatestPrice,
  getSoulStoneForLevel,
  setDungeonFlag,
} from '../lib/db.js'
import { applyRentCoefs } from '../lib/rentCoefs.js'

const router = useRouter()
const loading = ref(true)
const character = ref(null)
const rows = ref([])
const filterMode = ref('rentability') // 'rentability' | 'todo'

function priorityColor(score) {
  if (score >= 66) return 'var(--accent)'
  if (score >= 33) return 'var(--amber)'
  return 'var(--red)'
}

async function load() {
  loading.value = true
  character.value = await getCharacter(session.characterId)

  const charDungeons = await getCharacterDungeons(session.characterId)

  const built = []
  for (const cd of charDungeons) {
    const dungeon = cd.cache_dungeons
    if (!dungeon) continue

    const monsterItems = await getMonsterItems(dungeon.id)
    const byCategorie = Object.fromEntries(monsterItems.map((mi) => [mi.categorie, mi]))

    const capturePrice = byCategorie.capture
      ? await getLatestPrice(byCategorie.capture.item_id)
      : 0
    const stoneId = dungeon.soul_stone_item_id
    const stonePrice = stoneId
      ? await getLatestPrice(stoneId)
      : await (async () => {
          const s = await getSoulStoneForLevel(dungeon.niveau)
          return s ? getLatestPrice(s.item_id) : 0
        })()
    const pierrePrice = stonePrice
    const simplePrice = byCategorie.simple
      ? await getLatestPrice(byCategorie.simple.item_id)
      : 0
    const rarePrice = byCategorie.rare
      ? await getLatestPrice(byCategorie.rare.item_id)
      : 0

    const pp = character.value.prospection || 0
    const applyPP = (taux, affectePP) =>
      affectePP === false ? taux : Math.min(100, (taux * pp) / 100)

    const simpleRate = byCategorie.simple
      ? applyPP(byCategorie.simple.taux_drop_base, byCategorie.simple.affecte_par_pp)
      : 0
    const rareRate = byCategorie.rare
      ? applyPP(byCategorie.rare.taux_drop_base, byCategorie.rare.affecte_par_pp)
      : 0

    const netCapture = capturePrice - pierrePrice
    const dropValue = (simplePrice * simpleRate) / 100 + (rarePrice * rareRate) / 100
    const rawScore = applyRentCoefs(netCapture, dropValue, dungeon.niveau)

    built.push({
      dungeonId: dungeon.id,
      name: dungeon.name,
      zone: dungeon.zone,
      done: cd.fait_cette_semaine,
      captured: cd.capture,
      rawScore,
    })
  }

  const maxScore = Math.max(...built.map((r) => r.rawScore), 1)
  rows.value = built.map((r) => ({
    ...r,
    rentability: Math.max(1, Math.round((r.rawScore / maxScore) * 100)),
  }))

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
}

async function toggleDone(row) {
  row.done = !row.done
  await setDungeonFlag(session.characterId, row.dungeonId, 'fait_cette_semaine', row.done)
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

    <p v-if="loading">Chargement…</p>

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
        <div class="priority-bar" :style="{ background: priorityColor(row.rentability) }"></div>
        <div class="name-block">
          <div class="name" :class="{ done: row.done }">{{ row.name }}</div>
          <div class="zone">{{ row.zone }}</div>
        </div>
        <div class="badge" :class="{ on: row.captured }" @click.stop="toggleCaptured(row)">
          {{ row.captured ? 'Capturé' : 'Pas capturé' }}
        </div>
        <div class="badge" :class="{ on: row.done }" @click.stop="toggleDone(row)">
          {{ row.done ? 'Fait' : 'À faire' }}
        </div>
        <div class="rent" :style="{ color: priorityColor(row.rentability) }">
          {{ row.rentability }}%
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
  background: var(--accent);
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
  color: var(--accent);
  background: var(--soft-accent-bg);
}
.rent {
  width: 56px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
}
.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
