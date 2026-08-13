<script setup>
// TODO : en-tête (nom, niveau, badges fait/capturé, rentabilité), bloc
// prix éditable (capture/pierre, ressource simple, ressource rare) avec
// choix observation/vente à la validation -> insert dans price_log,
// graph d'historique, bloc stratégie (lien externe + textarea notes
// perso), liste des drops avec taux et prix.
defineProps(['id'])
</script>

<template>
  <div>
    <h1>Détail du donjon</h1>
    <p>Prix, stratégie, drops — à brancher sur Supabase.</p>
  </div>
</template>
