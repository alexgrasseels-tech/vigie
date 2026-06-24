import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Story 1.5 — Data Access Layer : la VRAIE frontière d'auth (AD-10).
// Appelée par le layout du route-group (app) AVANT tout rendu, et à
// re-vérifier dans CHAQUE Server Action — jamais se fier au proxy seul.
// `cache()` déduplique l'appel sur un même rendu.
export const requireUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
})
