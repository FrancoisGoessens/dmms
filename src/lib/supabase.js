import { createClient } from '@supabase/supabase-js'

// Ces valeurs viennent de ton projet Supabase (Project Settings > API).
// En local : mets-les dans un fichier .env (voir .env.example).
// Sur GitHub Pages : elles sont injectées au build par le workflow
// (.github/workflows/deploy.yml) depuis les secrets du repo.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants — ' +
      'copie .env.example vers .env et remplis les valeurs.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
