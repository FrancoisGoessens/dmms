import { reactive, watch } from 'vue'

const STORAGE_KEY = 'dmms_session'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { playerId: null, characterId: null }
  } catch {
    return { playerId: null, characterId: null }
  }
}

export const session = reactive(load())

watch(
  session,
  (val) => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)),
  { deep: true }
)

export function setActiveCharacter(playerId, characterId) {
  session.playerId = playerId
  session.characterId = characterId
}

export function clearSession() {
  session.playerId = null
  session.characterId = null
}

export function isLoggedIn() {
  return !!session.characterId
}
