import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ClientForm } from '../_components/client-form'
import { editerClient, archiverClient } from '../actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PHASE_LABEL: Record<string, string> = {
  cadrage: 'Cadrage',
  conception: 'Conception',
  developpement: 'Développement',
  tests: 'Tests',
  livraison: 'Livraison',
  cloture: 'Clôture',
}

// Story 2.1 — fiche client (shadcn) : édition, archivage, projets rattachés.
export default async function ClientFichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, nom, cadence_x, email, notes, archived_at')
    .eq('id', id)
    .maybeSingle()

  if (!client) notFound()

  const { data: projets } = await supabase
    .from('projects')
    .select('id, nom, phase, statut')
    .eq('client_id', id)
    .order('nom', { ascending: true })

  return (
    <section className="space-y-8">
      <div className="text-sm text-muted">
        <Link href="/clients" className="text-signal-attente hover:underline">
          Clients
        </Link>{' '}
        › {client.nom}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Éditer le client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientForm
            action={editerClient}
            submitLabel="Enregistrer"
            defaults={{
              id: client.id,
              nom: client.nom,
              cadence_x: client.cadence_x,
              email: client.email,
              notes: client.notes,
            }}
          />
          <form action={archiverClient} className="border-t border-line pt-4">
            <input type="hidden" name="id" value={client.id} />
            <Button type="submit" variant="ghost" size="sm">
              Archiver ce client
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold">
          Projets rattachés ({projets?.length ?? 0})
        </div>
        {projets && projets.length > 0 ? (
          <ul>
            {projets.map((p) => (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/projets/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt"
                >
                  <span className="font-medium">{p.nom}</span>
                  <span className="text-xs text-muted">
                    {PHASE_LABEL[p.phase] ?? p.phase} · {p.statut}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">Aucun projet pour ce client.</p>
        )}
      </Card>
    </section>
  )
}
