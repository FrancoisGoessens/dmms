<script setup>
defineProps({ count: { type: Number, default: 5 }, height: { type: Number, default: 52 } })
</script>

<template>
  <div class="skeleton-panel">
    <div v-for="i in count" :key="i" class="skeleton-row" :style="{ height: height + 'px' }">
      <div class="bar" style="width: 4px; height: 100%;"></div>
      <div class="block" style="width: 40%; height: 12px;"></div>
      <div class="block ml-auto" style="width: 60px; height: 20px; border-radius: 20px;"></div>
      <div class="block" style="width: 36px; height: 14px;"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.skeleton-row { display: flex; align-items: center; gap: 14px; padding: 0 16px; border-bottom: 1px solid var(--border-light); }
.skeleton-row:last-child { border-bottom: none; }
.bar { background: var(--panel-2); }
.block { background: var(--panel-2); border-radius: 4px; animation: pulse 1.3s ease-in-out infinite; }
.ml-auto { margin-left: auto; }
@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
