<script setup>
import { rentCoefs, rentCoefFields } from '../lib/rentCoefs.js'

defineProps(['open'])
const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <div class="modal">
      <div class="title">Paramètres rentabilité</div>
      <div class="fields">
        <div v-for="f in rentCoefFields" :key="f.key" class="field">
          <div class="label">{{ f.label }} — {{ rentCoefs[f.key] }}</div>
          <input
            type="range"
            :min="f.min"
            :max="f.max"
            :step="f.step"
            v-model.number="rentCoefs[f.key]"
          />
        </div>
      </div>
      <div class="close-btn" @click="emit('close')">Fermer</div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center; z-index: 40;
}
.modal { width: 360px; background: var(--panel); border-radius: 14px; padding: 24px; }
.title { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
input[type='range'] { width: 100%; }
.close-btn {
  margin-top: 20px; text-align: center; font-size: 13px; font-weight: 600;
  padding: 8px 14px; border-radius: 8px; cursor: pointer; color: #fff;
  background: var(--accent);
}
</style>
