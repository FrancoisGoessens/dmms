<script setup>
// TODO : 4 colonnes (Dommages/Résistances/Caractéristiques/Secondaires),
// une ligne par rune (image DofusDB, nom, prix actuel). Bouton "refresh
// DoFocus" qui appelle l'API et écrit dans rune_price_log (snapshot,
// pas d'appel en live sur chaque affichage). Clic sur une ligne -> popup
// min/max enregistrés + graph d'évolution.
</script>

<template>
  <div>
    <h1>Prix des runes</h1>
    <p>Snapshot DoFocus — à brancher sur Supabase.</p>
  </div>
</template>
