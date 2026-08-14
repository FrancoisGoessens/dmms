<script setup>
import { theme, toggleTheme } from '../lib/themeStore.js'
</script>

<template>
  <button class="fab" @click="toggleTheme" :title="theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'">
    {{ theme === 'dark' ? '🌙' : '☀️' }}
  </button>
</template>

<style scoped>
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--panel);
  box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.25);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 50;
}
</style>
