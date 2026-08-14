<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPlayers, getCharacters } from '../lib/db.js'
import { setActiveCharacter } from '../lib/session.js'

const router = useRouter()

const step = ref('player') // 'player' | 'character'
const players = ref([])
const characters = ref([])
const pendingPlayerId = ref(null)
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    players.value = await getPlayers()
  } catch (e) {
    errorMsg.value = "Impossible de charger les joueurs — vérifie ta connexion Supabase."
  } finally {
    loading.value = false
  }
})

async function selectPlayer(player) {
  pendingPlayerId.value = player.id
  loading.value = true
  try {
    characters.value = await getCharacters(player.id)
    step.value = 'character'
  } catch (e) {
    errorMsg.value = 'Impossible de charger les personnages.'
  } finally {
    loading.value = false
  }
}

function selectCharacter(character) {
  setActiveCharacter(pendingPlayerId.value, character.id)
  router.push({ name: 'dashboard' })
}

function backToPlayers() {
  step.value = 'player'
}
</script>

<template>
  <div class="login-page">
    <div class="card">
      <div class="logo">D<span class="accent">MMS</span></div>
      <div class="subtitle">Dofus - Money Making System</div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p v-else-if="loading">Chargement…</p>

      <template v-else-if="step === 'player'">
        <div class="label">Qui joue ?</div>
        <div v-if="players.length === 0" class="empty">
          Aucun joueur trouvé — ajoute une ligne dans la table
          <code>players</code> via le Table Editor Supabase pour commencer.
        </div>
        <div v-for="p in players" :key="p.id" class="choice" @click="selectPlayer(p)">
          {{ p.name }}
        </div>
      </template>

      <template v-else>
        <a href="#" class="back-link" @click.prevent="backToPlayers">← Retour</a>
        <div class="label">Choisis ton personnage</div>
        <div v-if="characters.length === 0" class="empty">
          Ce joueur n'a pas encore de personnage — on branchera la création
          de personnage sur l'écran Fiche personnage.
        </div>
        <div v-for="c in characters" :key="c.id" class="choice" @click="selectCharacter(c)">
          <strong>{{ c.name }}</strong>
          <span class="meta">{{ c.classe }} niv. {{ c.niveau }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--page-bg);
}
.card {
  width: 380px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
}
.logo {
  font-weight: 800;
  font-size: 20px;
  margin-bottom: 4px;
}
.accent {
  color: #bfd75b;
}
.subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.back-link {
  font-size: 12px;
  display: inline-block;
  margin-bottom: 12px;
}
.choice {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
}
.choice:hover {
  border-color: #7fae3a;
  background: #f5faf0;
}
.meta {
  font-size: 11px;
  color: var(--text-secondary);
}
.empty {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.error {
  color: #b23b3b;
  font-size: 13px;
}
</style>
