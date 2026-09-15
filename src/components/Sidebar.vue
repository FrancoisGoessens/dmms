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

// --- Rétractation du menu en mode "icônes seules" ---
// Choix retenu pour se souvenir de la préférence entre deux visites : un
// simple flag dans le localStorage du navigateur (rien de partagé/serveur,
// donc pas besoin de passer par Supabase pour ça).
function loadCollapsed() {
  try {
    return localStorage.getItem('dmms_sidebar_collapsed') === '1'
  } catch {
    return false
  }
}
const collapsed = ref(loadCollapsed())
function toggleCollapsed() {
  collapsed.value = !collapsed.value
  try {
    localStorage.setItem('dmms_sidebar_collapsed', collapsed.value ? '1' : '0')
  } catch {
    // Stockage indisponible (navigation privée, etc.) — tant pis, le choix
    // ne sera juste pas mémorisé d'une visite à l'autre.
  }
}

// --- Icônes ---
// De simples traits SVG (pas d'emoji, pas de dépendance externe à une
// police d'icônes) qui héritent la couleur du texte via currentColor —
// donc gris au repos, blanc au survol/actif, comme le reste du menu.
const ICON_PATHS = {
  dashboard: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.5"/><path d="M9.5 20v-5h5v5"/>',
  kanban: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="10" rx="1"/><rect x="16" y="4" width="5" height="13" rx="1"/>',
  routes: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z"/>',
  hdv: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  verifier: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="20.5" y2="20.5"/>',
  insights: '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
  craft: '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/>',
  runes: '<path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M2 9h20"/><path d="M9 3 8 9l4 12 4-12-1-6"/>',
  soulstone: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="9" r="1.6" fill="currentColor" stroke="none"/>',
  chevronLeft: '<polyline points="15 5 8 12 15 19"/>',
  chevronRight: '<polyline points="9 5 16 12 9 19"/>',
}
function iconSvg(key) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[key] || ''}</svg>`
}

const navDonjons = [
  { to: '/dashboard', label: 'Dashboard', section: 'Donjons', icon: 'dashboard' },
  { to: '/kanban', label: 'Kanban', icon: 'kanban' },
  { to: '/routes', label: 'Routes', icon: 'routes' },
  { to: '/hdv', label: 'HDV', icon: 'hdv' },
  { to: '/a-verifier', label: 'À vérifier', icon: 'verifier' },
  { to: '/insights', label: 'Insights', icon: 'insights' },
]
const navMetiers = [
  { to: '/craft', label: 'Calcul up métiers', section: 'Métiers', icon: 'craft' },
  { to: '/runes', label: 'Prix des runes', icon: 'runes' },
]

function isActive(to) {
  return route.path === to
}
</script>

<template>
  <nav class="sidebar" :class="{ collapsed }">
    <div class="top-row">
      <img
        src="/logo.png" alt="DMMS" class="logo-img"
        @click="goHome" title="Retour au dashboard"
      />
      <div
        class="collapse-btn" @click="toggleCollapsed"
        :title="collapsed ? 'Déplier le menu' : 'Réduire le menu'"
        v-html="iconSvg(collapsed ? 'chevronRight' : 'chevronLeft')"
      ></div>
    </div>

    <template v-for="item in [...navDonjons, ...navMetiers]" :key="item.to">
      <div v-if="item.section && !collapsed" class="section-label">{{ item.section }}</div>
      <RouterLink
        :to="item.to" class="nav-item" :class="{ active: isActive(item.to) }"
        :title="collapsed ? item.label : null"
      >
        <span class="icon" v-html="iconSvg(item.icon)"></span>
        <span v-if="!collapsed" class="label">{{ item.label }}</span>
      </RouterLink>
    </template>

    <div class="sidebar-footer">
      <div
        class="footer-btn" @click="showSoulStones = true"
        :title="collapsed ? `Prix des pierres d'âme` : null"
      >
        <span class="icon" v-html="iconSvg('soulstone')"></span>
        <span v-if="!collapsed" class="label">Prix des pierres d'âme</span>
      </div>
      <div v-if="!collapsed" class="reset-note">Reset hebdo : mardi 12h</div>
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
  transition: width 0.18s ease, padding 0.18s ease;
  overflow: hidden;
}
.sidebar.collapsed {
  width: 60px;
  padding: 20px 10px;
}
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 24px;
}
.sidebar.collapsed .top-row {
  flex-direction: column;
  gap: 12px;
}
.logo-img {
  width: 168px;
  height: auto;
  flex-shrink: 0;
  display: block;
  cursor: pointer;
  transition: width 0.18s ease;
}
.sidebar.collapsed .logo-img { width: 30px; }
.collapse-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: oklch(0.6 0.02 150);
  background: oklch(0.24 0.02 150);
}
.collapse-btn:hover { color: #fff; }
.collapse-btn :deep(svg) { width: 14px; height: 14px; }
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
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px;
  gap: 0;
}
.nav-item:hover { background: oklch(0.24 0.02 150); color: #fff; }
.nav-item.active { color: #fff; background: oklch(0.3 0.05 150); }
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
}
.icon :deep(svg) { width: 17px; height: 17px; }
.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
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
.sidebar.collapsed .footer-btn { justify-content: center; padding: 8px; }
.reset-note { padding: 0 10px; font-size: 11px; color: oklch(0.55 0.02 150); }
</style>
