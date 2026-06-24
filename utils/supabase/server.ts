import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
// Sous Next 16, `cookies()` est asynchrone : la fonction est donc `async`.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // `setAll` peut être appelé depuis un Server Component où l'écriture
            // de cookies est interdite. C'est sans danger si un middleware
            // rafraîchit les sessions utilisateur — on ignore donc l'erreur.
          }
        },
      },
    }
  )
}
