<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getCharacters, updateCharacter, createCharacter,
  getCharacterDungeons, getAllDungeons, addDungeonToCharacter,
  removeDungeonFromCharacter, updateDifficulty, getMonsterItemsForDungeons,
} from '../lib/db.js'

const route = useRoute()
const router = useRouter()

const allChars = ref([])
const tabId = ref(route.params.id || null)
const editing = ref(false)
const editForm = ref({ name: '', classe: '', niveau: '', prospection: '' })

const showAddCharForm = ref(false)
const newCharName = ref('')

const dungeons = ref([])
const allDungeons = ref([])
const addDungeonSelect = ref('')

function initials(name) { return (name || '?').slice(0, 2).toUpperCase() }

async function loadAll() {
  allChars.value = await getCharacters(session.playerId)
  if (!tabId.value) tabId.value = session.characterId
  await loadCharacterData()
}

const current = computed(() => allChars.value.find((c) => c.id === tabId.value))

async function loadCharacterData() {
  if (!tabId.value) return
  editing.value = false
  const cds = await getCharacterDungeons(tabId.value)
  const kept = cds.filter((d) => d.cache_dungeons)

  const monsterItems = await getMonsterItemsForDungeons(kept.map((d) => d.dungeon_id))
  const bossByDungeon = {}
  for (const mi of monsterItems) {
    if (mi.categorie === 'capture') bossByDungeon[mi.dungeon_id] = mi.cache_items?.name
  }

  dungeons.value = kept.map((d) => ({
    dungeonId: d.dungeon_id, name: d.cache_dungeons.name,
    bossName: bossByDungeon[d.dungeon_id] || d.cache_dungeons.name,
    niveau: d.cache_dungeons.niveau, difficulte: d.difficulte,
  }))
  allDungeons.value = await getAllDungeons()
}
watch(tabId, loadCharacterData)
onMounted(loadAll)

function openEdit() {
  editForm.value = {
    name: current.value.name, classe: current.value.classe || '',
    niveau: current.value.niveau || '', prospection: current.value.prospection || '',
    image_url: current.value.image_url || '',
  }
  editing.value = true
}
async function saveEdit() {
  await updateCharacter(tabId.value, editForm.value)
  await loadAll()
}

async function confirmNewChar() {
  if (!newCharName.value.trim()) return
  const c = await createCharacter(session.playerId, newCharName.value.trim())
  newCharName.value = ''
  showAddCharForm.value = false
  await loadAll()
  tabId.value = c.id
}

const addDungeonOptions = computed(() =>
  allDungeons.value.filter((d) => !dungeons.value.some((sd) => sd.dungeonId === d.id))
)
async function onAddDungeon(e) {
  if (!e.target.value) return
  await addDungeonToCharacter(tabId.value, e.target.value)
  addDungeonSelect.value = ''
  await loadCharacterData()
}
async function onRemoveDungeon(dungeonId) {
  await removeDungeonFromCharacter(tabId.value, dungeonId)
  await loadCharacterData()
}
async function onDecDifficulty(row) {
  row.difficulte = Math.max(1, row.difficulte - 1)
  await updateDifficulty(tabId.value, row.dungeonId, row.difficulte)
}
async function onIncDifficulty(row) {
  row.difficulte = Math.min(5, row.difficulte + 1)
  await updateDifficulty(tabId.value, row.dungeonId, row.difficulte)
}

const dropMultiplier = computed(() => (current.value ? (1 + (current.value.prospection || 0) / 400).toFixed(2) : '1.00'))
</script>

<template>
  <div v-if="allChars.length">
    <div class="tabs-row">
      <div
        v-for="c in allChars" :key="c.id"
        class="tab" :class="{ active: tabId === c.id }"
        @click="tabId = c.id"
      >{{ c.name }}</div>
      <input v-if="showAddCharForm" v-model="newCharName" @keydown.enter="confirmNewChar" placeholder="Nom du personnage" class="input-small" autofocus />
      <div v-else class="dashed-btn" @click="showAddCharForm = true">+ Nouveau personnage</div>
    </div>

    <div v-if="current" class="grid">
      <div class="panel-pad">
        <div class="avatar-row">
          <div class="avatar" :style="!current.image_url ? { background: 'var(--accent)' } : {}">
            <img v-if="current.image_url" :src="current.image_url" class="avatar-img" />
            <template v-else>{{ initials(current.name) }}</template>
          </div>
          <div class="gear" @click="openEdit">⚙</div>
        </div>

        <div v-if="editing" class="edit-form">
          <input v-model="editForm.name" class="input-small" placeholder="Nom" />
          <input v-model="editForm.classe" class="input-small" placeholder="Classe" />
          <div class="two-col">
            <input v-model.number="editForm.niveau" type="number" class="input-small" placeholder="Niveau" />
            <input v-model.number="editForm.prospection" type="number" class="input-small" placeholder="Prospection" />
          </div>
          <input v-model="editForm.image_url" class="input-small" placeholder="Lien de la photo (ex. imgbb)" />
          <div class="accent-btn" @click="saveEdit">Terminé</div>
        </div>
        <template v-else>
          <div class="sheet-name">{{ current.name }}</div>
          <div class="sheet-classe">{{ current.classe }}</div>
          <div class="sheet-stats">
            <div class="stat-row"><span class="muted">Niveau</span><span class="bold">{{ current.niveau }}</span></div>
            <div class="stat-row"><span class="muted">Prospection</span><span class="bold">{{ current.prospection }}</span></div>
            <div class="stat-row"><span class="muted">Multiplicateur drop (auto)</span><span class="bold accent">×{{ dropMultiplier }}</span></div>
          </div>
        </template>
      </div>

      <div>
        <div class="panel">
          <div v-for="row in dungeons" :key="row.dungeonId" class="dungeon-row">
            <div class="dungeon-info">
              <div class="dungeon-name">{{ row.name }}</div>
              <div class="dungeon-zone">{{ row.bossName }} - Niveau {{ row.niveau }}</div>
            </div>
            <div class="diff-label">Difficulté</div>
            <div class="stepper">
              <div class="step-btn" @click="onDecDifficulty(row)">–</div>
              <div class="step-value">{{ row.difficulte }}</div>
              <div class="step-btn" @click="onIncDifficulty(row)">+</div>
            </div>
            <div class="remove-btn" @click="onRemoveDungeon(row.dungeonId)" title="Retirer">×</div>
          </div>
          <div v-if="dungeons.length === 0" class="empty">Aucun donjon assigné.</div>
        </div>
        <select @change="onAddDungeon" class="dashed-select">
          <option value="">+ Ajouter un donjon</option>
          <option v-for="d in addDungeonOptions" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
    </div>
  </div>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.tabs-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--text); background: var(--panel); border: 1px solid var(--border); }
.tab.active { color: #fff; background: var(--accent); border-color: var(--accent); }
.dashed-btn { font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--accent-text); border: 1px dashed var(--accent); }
.grid { display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: start; }
.avatar-row { display: flex; align-items: flex-start; justify-content: space-between; }
.avatar { width: 56px; height: 56px; border-radius: 50%; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.gear { cursor: pointer; font-size: 16px; color: var(--text-secondary); }
.edit-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.edit-form .input-small { width: 100%; box-sizing: border-box; }
.two-col { display: flex; gap: 8px; }
.two-col .input-small { flex: 1; min-width: 0; }
.sheet-name { font-size: 15px; font-weight: 700; margin-top: 12px; }
.sheet-classe { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
.sheet-stats { display: flex; flex-direction: column; gap: 10px; }
.stat-row { display: flex; justify-content: space-between; font-size: 12px; }
.muted { color: var(--text-secondary); }
.bold { font-weight: 700; }
.accent { color: var(--accent-text); }
.groups-block { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.section-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.4px; }
.group-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.chip { font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; background: var(--soft-accent-bg); color: var(--accent-text); }
.chip-x { margin-left: 6px; cursor: pointer; }
.input-full { font-size: 12px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); outline: none; width: 100%; box-sizing: border-box; background: var(--input); color: var(--text); margin-bottom: 6px; }
.new-group-link { font-size: 11px; font-weight: 600; color: var(--accent-text); cursor: pointer; }

.dungeon-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--border-light); }
.dungeon-info { flex: 1; min-width: 0; }
.dungeon-name { font-size: 14px; font-weight: 600; }
.dungeon-zone { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.diff-label { font-size: 11px; color: var(--text-secondary); margin-right: 4px; }
.stepper { display: flex; align-items: center; gap: 8px; }
.step-btn { width: 24px; height: 24px; border-radius: 6px; background: var(--panel-2); display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: 700; }
.step-value { width: 20px; text-align: center; font-weight: 700; font-size: 13px; }
.remove-btn { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); font-size: 13px; }
.dashed-select { margin-top: 10px; font-size: 12px; padding: 8px 12px; border-radius: 8px; border: 1px dashed var(--accent); color: var(--accent-text); outline: none; background: var(--input); width: 100%; }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
</style>
