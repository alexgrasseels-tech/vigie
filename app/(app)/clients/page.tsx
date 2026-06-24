import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ClientForm } from './_components/client-form'
import { creerClient } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Story 2.1 — liste des clients actifs + création (shadcn).
export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, nom, cadence_x, email')
    .is('archived_at', null)
    .order('nom', { ascending: true })

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold">Clients</h1>
        <p className="text-sm text-muted">Chaque client porte sa cadence de relance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nouveau client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm action={creerClient} submitLabel="Ajouter le client" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold">
          {clients?.length ?? 0} client{(clients?.length ?? 0) > 1 ? 's' : ''}
        </div>
        {clients && clients.length > 0 ? (
          <ul>
            {clients.map((c) => (
              <li key={c.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt"
                >
                  <span className="font-medium">{c.nom}</span>
                  <span className="text-xs text-muted">
                    cadence {c.cadence_x} j{c.email ? ` · ${c.email}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Aucun client. Ajoute ton premier client ci-dessus.
          </p>
        )}
      </Card>
    </section>
  )
}
