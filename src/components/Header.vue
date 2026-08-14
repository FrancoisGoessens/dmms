<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session, setActiveCharacter, clearSession } from '../lib/session.js'
import { searchDungeons, getCharacters, getCharacter } from '../lib/db.js'
import { refreshDofusDbCache, refreshDoFocusData } from '../lib/refresh.js'

const route = useRoute()
const router = useRouter()

const titles = {
  dashboard: 'Dashboard', kanban: 'Kanban', routes: 'Routes', hdv: 'HDV',
  'a-verifier': 'À vérifier', insights: 'Insights', craft: 'Calcul up métiers',
  'craft-item': 'Calcul brisage item', runes: 'Prix des runes', character: 'Paramètres des personnages',
}

// --- Recherche de donjon ---
const searchQuery = ref('')
const searchResults = ref([])
const searchOpen = ref(false)
let searchTimer = null
watch(searchQuery, (q) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    searchResults.value = q.length >= 2 ? await searchDungeons(q) : []
    searchOpen.value = q.length >= 2
  }, 250)
})
function selectDungeon(d) {
  searchOpen.value = false
  searchQuery.value = ''
  router.push({ name: 'detail', params: { id: d.id } })
}

// --- Personnage actif / switcher ---
const activeChar = ref(null)
const allChars = ref([])
const switcherOpen = ref(false)

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase()
}
function avatarColor(seed) {
  let hash = 0
  for (const c of String(seed)) hash = (hash * 31 + c.charCodeAt(0)) % 360
  return `oklch(0.55 0.15 ${hash})`
}

async function loadCharacter() {
  if (session.characterId) activeChar.value = await getCharacter(session.characterId)
}
async function openSwitcher() {
  switcherOpen.value = !switcherOpen.value
  if (switcherOpen.value) allChars.value = await getCharacters(session.playerId)
}
function switchTo(c) {
  setActiveCharacter(c.player_id, c.id)
  switcherOpen.value = false
  loadCharacter()
  router.push({ name: 'dashboard' })
}
function goToCharacterSettings() {
  switcherOpen.value = false
  router.push({ name: 'character' })
}
function changePlayer() {
  switcherOpen.value = false
  clearSession()
  router.push({ name: 'login' })
}
onMounted(loadCharacter)

// --- Refresh DofusDB / DoFocus (icônes seules) ---
const loadingDofusDb = ref(false)
const loadingDoFocus = ref(false)
async function onRefreshDofusDb() {
  loadingDofusDb.value = true
  try { await refreshDofusDbCache() } catch (e) { alert(e.message) }
  loadingDofusDb.value = false
}
async function onRefreshDoFocus() {
  loadingDoFocus.value = true
  try { await refreshDoFocusData() } catch (e) { alert(e.message) }
  loadingDoFocus.value = false
}
</script>

<template>
  <header class="header">
    <div class="title">{{ titles[route.name] || '' }}</div>
    <div class="actions">
      <div class="search-wrap">
        <input v-model="searchQuery" type="text" placeholder="Chercher un donjon..." class="search-input" @focus="searchOpen = searchResults.length > 0" />
        <div v-if="searchOpen" class="dropdown search-dropdown">
          <div v-for="r in searchResults" :key="r.id" class="dropdown-item" @click="selectDungeon(r)">
            {{ r.name }} <span class="muted">· {{ r.zone }}</span>
          </div>
          <div v-if="searchResults.length === 0" class="dropdown-empty">Aucun résultat</div>
        </div>
      </div>

      <button class="icon-only" :disabled="loadingDofusDb" title="Refresh DofusDB" @click="onRefreshDofusDb">
        <span class="spin" :class="{ on: loadingDofusDb }">↻</span>
        <span class="site-badge dofusdb">D</span>
      </button>
      <button class="icon-only" :disabled="loadingDoFocus" title="Refresh DoFocus" @click="onRefreshDoFocus">
        <span class="spin" :class="{ on: loadingDoFocus }">↻</span>
        <span class="site-badge dofocus">F</span>
      </button>

      <div class="switcher-wrap">
        <div class="avatar-btn" @click="openSwitcher">
          <div class="avatar" :style="!activeChar?.image_url ? { background: activeChar ? avatarColor(activeChar.id) : '#ccc' } : {}">
            <img v-if="activeChar?.image_url" :src="activeChar.image_url" class="avatar-img" />
            <template v-else>{{ activeChar ? initials(activeChar.name) : '?' }}</template>
          </div>
          <div class="char-info">
            <div class="char-name">{{ activeChar?.name || '—' }}</div>
            <div class="char-player">{{ activeChar?.players?.name || '' }}</div>
          </div>
        </div>
        <div v-if="switcherOpen" class="dropdown switcher-dropdown">
          <div v-for="c in allChars" :key="c.id" class="dropdown-item char-item" @click="switchTo(c)">
            <div class="avatar small" :style="!c.image_url ? { background: avatarColor(c.id) } : {}">
              <img v-if="c.image_url" :src="c.image_url" class="avatar-img" />
              <template v-else>{{ initials(c.name) }}</template>
            </div>
            <div>
              <div class="char-name">{{ c.name }}</div>
              <div class="muted">{{ c.players?.name }} · {{ c.classe }}</div>
            </div>
          </div>
          <div class="dropdown-sep"></div>
          <div class="dropdown-item link" @click="goToCharacterSettings">Paramètres des personnages</div>
          <div class="dropdown-item link danger" @click="changePlayer">Changer de joueur</div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-bottom: 1px solid var(--border); background: var(--panel);
}
.title { font-weight: 700; font-size: 16px; }
.actions { display: flex; align-items: center; gap: 14px; }

.icon-only {
  display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-radius: 8px;
  cursor: pointer; background: var(--panel-2); border: 1px solid var(--border);
}
.icon-only:disabled { opacity: 0.5; cursor: wait; }
.spin { font-size: 13px; color: var(--text-secondary); }
.spin.on { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.site-badge {
  width: 16px; height: 16px; border-radius: 4px; font-size: 9px; font-weight: 800;
  color: #fff; display: flex; align-items: center; justify-content: center;
}
.site-badge.dofusdb { background: var(--accent); }
.site-badge.dofocus { background: oklch(0.6 0.15 260); }

.search-wrap { position: relative; width: 220px; }
.search-input {
  width: 100%; font-size: 13px; padding: 8px 12px; border-radius: 8px;
  border: 1px solid var(--border); outline: none; background: var(--input); color: var(--text);
  box-sizing: border-box;
}
.dropdown {
  position: absolute; top: 38px; background: var(--panel); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25); padding: 6px; z-index: 30;
}
.search-dropdown { left: 0; width: 260px; }
.dropdown-item { padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
.dropdown-item:hover { background: var(--hover); }
.dropdown-empty { padding: 8px 10px; font-size: 12px; color: var(--text-secondary); }
.muted { font-weight: 400; color: var(--text-secondary); }

.switcher-wrap { position: relative; }
.avatar-btn { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 10px; border-radius: 8px; }
.avatar-btn:hover { background: var(--hover); }
.avatar {
  width: 32px; height: 32px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar.small { width: 28px; height: 28px; }
.char-info { text-align: left; }
.char-name { font-size: 13px; font-weight: 600; line-height: 1.2; }
.char-player { font-size: 11px; color: var(--text-secondary); line-height: 1.2; }
.switcher-dropdown { right: 0; width: 220px; }
.char-item { display: flex; align-items: center; gap: 10px; }
.dropdown-sep { height: 1px; background: var(--border); margin: 6px 4px; }
.dropdown-item.link { font-size: 13px; font-weight: 600; color: var(--text); }
.dropdown-item.link.danger { color: var(--red); }
</style>
