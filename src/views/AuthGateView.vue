<script setup>
import { ref } from 'vue'
import { signIn } from '../lib/auth.js'

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  errorMsg.value = ''
  try {
    await signIn(email.value, password.value)
    // authSession se met à jour tout seul via onAuthStateChange,
    // App.vue bascule automatiquement sur le reste de l'app.
  } catch (e) {
    errorMsg.value = 'Identifiants incorrects.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="gate">
    <form class="card" @submit.prevent="submit">
      <div class="logo">D<span class="accent">MMS</span></div>
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Mot de passe" required />
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button type="submit" :disabled="loading">{{ loading ? '...' : 'Se connecter' }}</button>
    </form>
  </div>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--page-bg);
}
.card {
  width: 320px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.logo {
  font-weight: 800;
  font-size: 20px;
  margin-bottom: 10px;
}
.accent {
  color: #bfd75b;
}
input {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
}
button {
  margin-top: 8px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.error {
  color: #b23b3b;
  font-size: 12px;
  margin: 0;
}
</style>
