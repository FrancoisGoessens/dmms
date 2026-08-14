<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getCharacter, getCharacterDungeons, getMonsterItems, getLatestPrice, getSoulStoneForLevel,
} from '../lib/db.js'
import { applyRentCoefs } from '../lib/rentCoefs.js'
import { priorityColor } from '../lib/theme.js'

const router = useRouter()
const loading = ref(true)
const rows = ref([])

async function load() {
  loading.value = true
  const character = await getCharacter(session.characterId)
  const charDungeons = await getCharacterDungeons(session.characterId)

  const built = []
  for (const cd of charDungeons) {
    const dungeon = cd.cache_dungeons
    if (!dungeon) continue

    const monsterItems = await getMonsterItems(dungeon.id)
    const byCategorie = Object.fromEntries(monsterItems.map((mi) => [mi.categorie, mi]))

    const capturePrice = byCategorie.capture ? await getLatestPrice(byCategorie.capture.item_id) : 0
    const stoneId = dungeon.soul_stone_item_id
    const pierrePrice = stoneId
      ? await getLatestPrice(stoneId)
      : await (async () => {
          const s = await getSoulStoneForLevel(dungeon.niveau)
          return s ? getLatestPrice(s.item_id) : 0
        })()
    const simplePrice = byCategorie.simple ? await getLatestPrice(byCategorie.simple.item_id) : 0
    const rarePrice = byCategorie.rare ? await getLatestPrice(byCategorie.rare.item_id) : 0

    const pp = character.prospection || 0
    const applyPP = (taux, affectePP) => (affectePP === false ? taux : Math.min(100, (taux * pp) / 100))
    const simpleRate = byCategorie.simple ? applyPP(byCategorie.simple.taux_drop_base, byCategorie.simple.affecte_par_pp) : 0
    const rareRate = byCategorie.rare ? applyPP(byCategorie.rare.taux_drop_base, byCategorie.rare.affecte_par_pp) : 0

    const netCapture = capturePrice - pierrePrice
    const dropValue = (simplePrice * simpleRate) / 100 + (rarePrice * rareRate) / 100
    const rawScore = applyRentCoefs(netCapture, dropValue, dungeon.niveau)

    built.push({
      dungeonId: dungeon.id, name: dungeon.name, zone: dungeon.zone,
      done: cd.fait_cette_semaine, captured: cd.capture, rawScore,
    })
  }

  const maxScore = Math.max(...built.map((r) => r.rawScore), 1)
  rows.value = built.map((r) => ({ ...r, rentability: Math.max(1, Math.round((r.rawScore / maxScore) * 100)) }))
  loading.value = false
}
onMounted(load)

function column(row) {
  if (row.captured) return 'Capturé'
  if (row.done) return 'Fait'
  return 'À faire'
}
function openDetail(row) {
  router.push({ name: 'detail', params: { id: row.dungeonId } })
}
</script>

<template>
  <div>
    <p v-if="loading">Chargement…</p>
    <div v-else class="board">
      <div v-for="col in ['À faire', 'Fait', 'Capturé']" :key="col" class="column">
        <div class="col-head">{{ col }} <span class="count">{{ rows.filter(r => column(r) === col).length }}</span></div>
        <div
          v-for="row in rows.filter(r => column(r) === col)"
          :key="row.dungeonId"
          class="card"
          @click="openDetail(row)"
        >
          <div class="priority-bar" :style="{ background: priorityColor(row.rentability) }"></div>
          <div class="card-body">
            <div class="name">{{ row.name }}</div>
            <div class="zone">{{ row.zone }}</div>
            <div class="card-footer">
              <div class="badge" :class="{ on: row.captured }">{{ row.captured ? 'Capturé' : 'Pas capturé' }}</div>
              <div class="rent" :style="{ color: priorityColor(row.rentability) }">{{ row.rentability }}%</div>
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
.card-footer { display: flex; align-items: center; justify-content: space-between; }
.badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; color: var(--text-secondary); background: var(--panel-2); }
.badge.on { color: var(--accent-text); background: var(--soft-accent-bg); }
.rent { font-size: 11px; font-weight: 700; }
</style>
