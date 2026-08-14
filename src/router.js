import { createRouter, createWebHashHistory } from 'vue-router'
import { isLoggedIn } from './lib/session.js'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },

  { path: '/dashboard', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
  { path: '/kanban', name: 'kanban', component: () => import('./views/KanbanView.vue') },
  { path: '/routes', name: 'routes', component: () => import('./views/RoutesView.vue') },
  { path: '/hdv', name: 'sales', component: () => import('./views/SalesView.vue') },
  { path: '/a-verifier', name: 'check', component: () => import('./views/CheckView.vue') },
  { path: '/insights', name: 'insights', component: () => import('./views/InsightsView.vue') },
  { path: '/donjon/:id', name: 'detail', component: () => import('./views/DetailView.vue'), props: true },

  { path: '/personnage/:id?', name: 'character', component: () => import('./views/CharacterView.vue'), props: true },

  { path: '/craft', name: 'craft', component: () => import('./views/CraftView.vue') },
  { path: '/craft/item', name: 'craft-item', component: () => import('./views/CraftItemView.vue') },
  { path: '/runes', name: 'runes', component: () => import('./views/RunesView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Toutes les routes exigent un personnage actif, sauf /login.
router.beforeEach((to) => {
  if (!to.meta.public && !isLoggedIn()) {
    return { name: 'login' }
  }
})

export default router
