# DMMS — Dofus Money Making System

## Mise en route

1. Copie ces fichiers dans ton dossier local lié au repo `dmms`.
2. `npm install`
3. Crée un projet sur [supabase.com](https://supabase.com) (gratuit), puis
   dans le SQL editor exécute le contenu de `supabase/schema.sql`.
4. Copie `.env.example` vers `.env`, remplis avec l'URL et la clé anon de
   ton projet Supabase (Project Settings > API).
5. `npm run dev` pour lancer en local.

## Déploiement GitHub Pages

1. Dans les settings du repo GitHub, va dans **Settings > Pages** et choisis
   la source **GitHub Actions**.
2. Dans **Settings > Secrets and variables > Actions**, ajoute deux secrets :
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que ton `.env`).
3. Chaque push sur `main` déclenche le workflow (`.github/workflows/deploy.yml`)
   qui build et publie automatiquement sur
   `https://FrancoisGoessens.github.io/dmms/`.

## État actuel

Squelette de navigation fonctionnel (routing + sidebar + layout), toutes les
pages du design sont présentes en placeholder avec un commentaire `TODO`
décrivant ce qu'elles doivent faire. Le schéma Supabase (`supabase/schema.sql`)
couvre tout le modèle de données discuté : personnages, groupes, donjons,
items, prix (historique append-only), routes, notes de stratégie, runes,
historique des recherches craft.

Prochaine étape : brancher chaque vue sur Supabase, écran par écran.
