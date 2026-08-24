<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session } from '../lib/session.js'
import {
  getCharacters, updateCharacter, createCharacter,
  getCharacterDungeons, addDungeonToCharacter,
  removeDungeonFromCharacter, updateDifficulty, getMonsterItemsForDungeons,
  getAllDungeonsWithBossName,
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

function initials(name) { return (name || '?').slice(0, 2).toUpperCase() }
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function loadAll() {
  allChars.value = await getCharacters(session.playerId)
  if (!tabId.value) tabId.value = session.characterId
  allDungeons.value = await getAllDungeonsWithBossName()
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
    niveau: d.cache_dungeons.niveau, difficulte: d.difficulte, ordre: d.ordre ?? 0,
  }))
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

const sortedDungeons = computed(() =>
  filteredDungeons.value.slice().sort((a, b) => a.niveau - b.niveau || a.name.localeCompare(b.name))
)

// --- Filtre par tranche de niveau (chips à cocher, multi-sélection) ---
const LEVEL_BUCKETS = [
  ...Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 20 + 1}-${i * 20 + 20}`, min: i * 20 + 1, max: i * 20 + 20,
  })),
  { label: '201-220', min: 201, max: 220 },
  { label: '221+', min: 221, max: Infinity },
]
const activeBuckets = ref(new Set(LEVEL_BUCKETS.map((b) => b.label))) // tout affiché par défaut
function toggleBucket(label) {
  const s = new Set(activeBuckets.value)
  if (s.has(label)) s.delete(label); else s.add(label)
  activeBuckets.value = s
}
function selectAllBuckets() { activeBuckets.value = new Set(LEVEL_BUCKETS.map((b) => b.label)) }
function selectNoBuckets() { activeBuckets.value = new Set() }
const filteredDungeons = computed(() =>
  dungeons.value.filter((d) =>
    LEVEL_BUCKETS.some((b) => activeBuckets.value.has(b.label) && d.niveau >= b.min && d.niveau <= b.max)
  )
)

// --- Ajout d'un donjon : recherche par nom de donjon OU de boss ---
const addQuery = ref('')
const addResults = computed(() => {
  if (addQuery.value.length < 2) return []
  const q = normalize(addQuery.value)
  const already = new Set(dungeons.value.map((d) => d.dungeonId))
  return allDungeons.value
    .filter((d) => !already.has(d.id))
    .filter((d) => normalize(d.name).includes(q) || normalize(d.bossName).includes(q))
    .slice(0, 20)
})
async function onAddDungeon(d) {
  await addDungeonToCharacter(tabId.value, d.id)
  addQuery.value = ''
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
function openDetail(dungeonId) {
  router.push({ name: 'detail', params: { id: dungeonId } })
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
        <div class="buckets-row">
          <div
            v-for="b in LEVEL_BUCKETS" :key="b.label"
            class="bucket-chip" :class="{ active: activeBuckets.has(b.label) }"
            @click="toggleBucket(b.label)"
          >{{ b.label }}</div>
          <div class="bucket-chip action" @click="selectAllBuckets">All</div>
          <div class="bucket-chip action" @click="selectNoBuckets">None</div>
        </div>

        <div class="panel">
          <div
            v-for="row in sortedDungeons" :key="row.dungeonId"
            class="dungeon-row"
            @click="openDetail(row.dungeonId)"
          >
            <div class="dungeon-info">
              <div class="dungeon-name">{{ row.name }}</div>
              <div class="dungeon-zone">{{ row.bossName }} - Niveau {{ row.niveau }}</div>
            </div>
            <div class="stepper">
              <div class="step-btn" @click.stop="onDecDifficulty(row)">–</div>
              <div class="step-value">{{ row.difficulte }}</div>
              <div class="step-btn" @click.stop="onIncDifficulty(row)">+</div>
            </div>
            <div class="remove-btn" @click.stop="onRemoveDungeon(row.dungeonId)" title="Retirer">×</div>
          </div>
          <div v-if="sortedDungeons.length === 0" class="empty">Aucun donjon dans cette sélection.</div>
        </div>

        <div class="add-wrap">
          <input v-model="addQuery" class="dashed-select" placeholder="+ Ajouter un donjon (nom du donjon ou du boss)" />
          <div v-if="addResults.length" class="add-results">
            <div v-for="d in addResults" :key="d.id" class="add-result-item" @click="onAddDungeon(d)">
              <span class="bold">{{ d.name }}</span>
              <span class="muted"> — {{ d.bossName }} · niv. {{ d.niveau }}</span>
            </div>
          </div>
        </div>
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

.buckets-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; margin-bottom: 10px; }
.bucket-chip { font-size: 10px; font-weight: 600; padding: 3px 7px; border-radius: 10px; cursor: pointer; color: var(--text-secondary); background: var(--panel-2); }
.bucket-chip.active { color: var(--accent-text); background: var(--soft-accent-bg); }
.bucket-chip.action { font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; background: transparent; border: 1px solid var(--border); }

.dungeon-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.dungeon-row:hover { background: var(--hover); }
.dungeon-info { flex: 1; min-width: 0; }
.dungeon-name { font-size: 13px; font-weight: 600; line-height: 1.35; }
.dungeon-zone { font-size: 11px; color: var(--text-secondary); line-height: 1.35; }
.stepper { display: flex; align-items: center; gap: 6px; }
.step-btn { width: 18px; height: 18px; border-radius: 5px; background: var(--panel-2); display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: 700; font-size: 11px; }
.step-value { width: 14px; text-align: center; font-weight: 700; font-size: 11px; }
.remove-btn { width: 18px; height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); font-size: 11px; }

.add-wrap { position: relative; margin-top: 10px; }
.dashed-select { font-size: 12px; padding: 8px 12px; border-radius: 8px; border: 1px dashed var(--accent); color: var(--accent-text); outline: none; background: var(--input); width: 100%; box-sizing: border-box; }
.add-results { position: absolute; top: 42px; left: 0; right: 0; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25); max-height: 260px; overflow: auto; z-index: 20; }
.add-result-item { padding: 8px 12px; font-size: 12px; cursor: pointer; }
.add-result-item:hover { background: var(--hover); }
.empty { padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px; }
</style>
