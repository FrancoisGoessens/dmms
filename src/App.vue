<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { authSession } from './lib/auth.js'
import AuthGateView from './views/AuthGateView.vue'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import ThemeFab from './components/ThemeFab.vue'
import { checkAndRunWeeklyReset } from './lib/weeklyReset.js'

const route = useRoute()

watch(authSession, (s) => {
  if (s) checkAndRunWeeklyReset()
}, { immediate: true })
</script>

<template>
  <AuthGateView v-if="!authSession" />
  <div v-else class="shell">
    <Sidebar v-if="!route.meta.public" />
    <div class="main-col">
      <Header v-if="!route.meta.public" />
      <main class="content" :class="{ full: route.meta.public }">
        <RouterView />
      </main>
    </div>
  </div>
  <ThemeFab v-if="authSession" />
</template>

<style scoped>
.shell { display: flex; height: 100vh; width: 100%; overflow: hidden; }
.main-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.content { flex: 1; overflow: auto; padding: 24px; }
.content.full { padding: 0; }
</style>
