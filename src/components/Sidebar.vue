<script setup>
const navDonjons = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/routes', label: 'Routes' },
  { to: '/hdv', label: 'HDV' },
  { to: '/a-verifier', label: 'À vérifier' },
  { to: '/insights', label: 'Insights' },
]

const navMetiers = [
  { to: '/craft', label: 'Calculateur top 10' },
  { to: '/craft/item', label: 'Calculateur item unique' },
  { to: '/runes', label: 'Prix des runes' },
]
</script>

<template>
  <nav class="sidebar">
    <div class="logo">D<span class="accent">MMS</span></div>

    <div class="section-label">Donjons</div>
    <RouterLink v-for="item in navDonjons" :key="item.to" :to="item.to" class="nav-item">
      {{ item.label }}
    </RouterLink>

    <div class="section-label">Métiers</div>
    <RouterLink v-for="item in navMetiers" :key="item.to" :to="item.to" class="nav-item">
      {{ item.label }}
    </RouterLink>

    <div class="sidebar-footer">Reset hebdo : mardi</div>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #19301f;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  gap: 2px;
}
.logo {
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  padding: 8px 10px 20px;
}
.accent {
  color: #bfd75b;
}
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #7a8a7e;
  padding: 16px 10px 6px;
}
.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #b8c4ba;
  text-decoration: none;
}
.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.sidebar-footer {
  margin-top: auto;
  font-size: 11px;
  color: #7a8a7e;
  padding: 0 10px;
}
</style>
