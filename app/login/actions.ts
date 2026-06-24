'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Déconnexion (Server Action). La connexion, elle, se fait côté client via
// supabase.auth.signInWithPassword (unique exception « auth » à AD-1).
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
