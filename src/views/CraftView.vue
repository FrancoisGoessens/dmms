<script setup>
// TODO : formulaire métier + tranche de niveau -> DofusDB (items
// craftables) croisé DoFocus (coefficient, prix runes, prix item, filtré
// serveur Dakal). Top 10 toujours affiché (même si rien n'est rentable),
// classé sur le jet moyen. Onglets jet min/moyen/max (recalcul des
// montants, même ordre). Par item : rentabilité sans focus + une ligne
// par caractéristique focalisable. Historique des recherches sauvegardé
// (table craft_searches) et rechargeable.
</script>

<template>
  <div>
    <h1>Calculateur top 10</h1>
    <p>Rentabilité de craft par tranche de métier — à brancher sur DofusDB/DoFocus.</p>
  </div>
</template>
