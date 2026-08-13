import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Le repo s'appelle "dmms", donc GitHub Pages sert le site sous
// https://FrancoisGoessens.github.io/dmms/ — le base path doit matcher.
export default defineConfig({
  plugins: [vue()],
  base: '/dmms/',
})
