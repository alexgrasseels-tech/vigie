import Link from 'next/link'
import { requireUser } from '@/utils/auth/dal'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/login/actions'
import { QuickAddBar } from './_components/quick-add-bar'
import { Toaster } from './_components/toaster'
import { Button } from '@/components/ui/button'

// Story 1.5 + 1.7 — Le layout serveur du route-group (app) appelle
// requireUser() AVANT tout rendu (frontière d'auth, AD-10), puis rend la
// coquille : navigation des 5 surfaces, slot quick-add, toaster.
const NAV = [
  { href: '/', label: 'Cockpit' },
  { href: '/projets', label: 'Projets' },
  { href: '/clients', label: 'Clients' },
  { href: '/reglages', label: 'Réglages' },
]

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  const supabase = await createClient()
  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase.from('clients').select('id, nom').is('archived_at', null).order('nom'),
    supabase.from('projects').select('id, nom').order('nom'),
  ])

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-surface p-4 md:border-b-0 md:border-r">
        <div className="mb-6 text-lg font-extrabold tracking-tight">
          Vigie<span className="text-primary">.</span>
        </div>
        <nav aria-label="Navigation principale">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block min-h-9 rounded-control px-3 py-2 text-sm font-medium text-text hover:bg-surface-alt"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <QuickAddBar clients={clients ?? []} projects={projects ?? []} />
          <span className="hidden text-xs text-muted sm:inline">{user.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Déconnexion
            </Button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </div>

      <Toaster />
    </div>
  )
}
