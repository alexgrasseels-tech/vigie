import { createBrowserClient } from '@supabase/ssr'

// Client Supabase pour le navigateur (Client Components).
// Les variables NEXT_PUBLIC_* sont exposées au bundle client : n'y mettez
// JAMAIS la clé service_role, uniquement l'URL et la clé anon publique.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
