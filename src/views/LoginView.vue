<script setup>
// TODO : étape 1 = choisir le joueur (liste "players" en base),
// étape 2 = choisir le personnage de ce joueur. Pas de mot de passe
// (usage privé à 2, cf. décision projet). Stocker le choix (ex. dans
// une variable réactive globale / pinia) puis rediriger vers /dashboard.
</script>

<template>
  <div class="login">
    <h1>DMMS</h1>
    <p>Qui joue ? (à brancher sur Supabase — table players/characters)</p>
  </div>
</template>

<style scoped>
.login {
  max-width: 380px;
  margin: 10vh auto;
  text-align: center;
}
</style>
