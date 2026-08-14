<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SoulStonesModal from './SoulStonesModal.vue'
import { session } from '../lib/session.js'
import { invalidateDungeonCache } from '../lib/dungeonCache.js'

const route = useRoute()
const router = useRouter()
const showSoulStones = ref(false)

function goHome() {
  // Force un rechargement propre des données au lieu de réutiliser le cache,
  // vu que c'est un "reset" volontaire demandé par le clic sur le logo.
  invalidateDungeonCache(session.characterId)
  router.push('/dashboard')
}

const navDonjons = [
  { to: '/dashboard', label: 'Dashboard', section: 'Donjons' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/routes', label: 'Routes' },
  { to: '/hdv', label: 'HDV' },
  { to: '/a-verifier', label: 'À vérifier' },
  { to: '/insights', label: 'Insights' },
]
const navMetiers = [
  { to: '/craft', label: 'Calcul up métiers', section: 'Métiers' },
  { to: '/craft/item', label: 'Calcul brisage item' },
  { to: '/runes', label: 'Prix des runes' },
]

function isActive(to) {
  return route.path === to
}
</script>

<template>
  <nav class="sidebar">
    <img src="/logo.png" alt="DMMS" class="logo-img" @click="goHome" title="Retour au dashboard" />

    <template v-for="item in [...navDonjons, ...navMetiers]" :key="item.to">
      <div v-if="item.section" class="section-label">{{ item.section }}</div>
      <RouterLink :to="item.to" class="nav-item" :class="{ active: isActive(item.to) }">
        <span class="dot" :class="{ active: isActive(item.to) }"></span>
        {{ item.label }}
      </RouterLink>
    </template>

    <div class="sidebar-footer">
      <div class="footer-btn" @click="showSoulStones = true">💠 Prix des pierres d'âme</div>
      <div class="reset-note">Reset hebdo : mardi 12h</div>
    </div>
  </nav>
  <SoulStonesModal :open="showSoulStones" @close="showSoulStones = false" />
</template>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: oklch(0.19 0.015 150);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  gap: 2px;
}
.logo-img {
  width: 168px;
  height: auto;
  align-self: flex-start;
  flex-shrink: 0;
  display: block;
  cursor: pointer;
  margin: 8px 0 24px;
}
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: oklch(0.5 0.02 150);
  padding: 16px 12px 6px;
}
.section-label:first-of-type { padding-top: 4px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: oklch(0.72 0.02 150);
  text-decoration: none;
}
.nav-item:hover { background: oklch(0.24 0.02 150); color: #fff; }
.nav-item.active { color: #fff; background: oklch(0.3 0.05 150); }
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: oklch(0.45 0.02 150);
  flex-shrink: 0;
}
.dot.active { background: oklch(0.55 0.15 125); }
.sidebar-footer { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
.footer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  background: oklch(0.24 0.02 150);
  font-size: 12px;
  color: oklch(0.8 0.01 150);
  font-weight: 600;
}
.reset-note { padding: 0 10px; font-size: 11px; color: oklch(0.55 0.02 150); }
</style>
