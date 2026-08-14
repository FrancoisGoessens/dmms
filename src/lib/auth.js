import { ref } from 'vue'
import { supabase } from './supabase.js'

export const authSession = ref(null)

supabase.auth.getSession().then(({ data }) => {
  authSession.value = data.session
})
supabase.auth.onAuthStateChange((_event, s) => {
  authSession.value = s
})

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}
