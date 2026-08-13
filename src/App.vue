<script setup>
import Sidebar from './components/Sidebar.vue'
// TODO : brancher la vraie logique de login (sélecteur profil/perso, cf.
// LoginView.vue) et n'afficher la sidebar + le contenu qu'une fois connecté.
</script>

<template>
  <div class="shell">
    <Sidebar />
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
.content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
</style>
