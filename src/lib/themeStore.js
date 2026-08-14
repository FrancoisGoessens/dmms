import { ref, watch } from 'vue'

const STORAGE_KEY = 'dmms_theme'

export const theme = ref(localStorage.getItem(STORAGE_KEY) || 'light')

function apply(val) {
  document.documentElement.setAttribute('data-theme', val)
}
apply(theme.value)

watch(theme, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  apply(val)
})

export function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
