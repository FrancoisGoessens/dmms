<script setup>
// TODO : onglets par personnage, édition (nom, classe, niveau, PP),
// multiplicateur de drop calculé automatiquement à partir du PP,
// gestion des groupes (créer / rejoindre / quitter), liste des donjons
// assignés avec difficulté ressentie par ce personnage (+/-), ajout/retrait
// de donjons.
defineProps(['id'])
</script>

<template>
  <div>
    <h1>Fiche personnage</h1>
    <p>PP, multiplicateur, groupes, difficulté par donjon — à brancher sur Supabase.</p>
  </div>
</template>
