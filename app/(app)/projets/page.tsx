import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ProjectForm } from './_components/project-form'
import { creerProjet } from './actions'

const PHASE_LABEL: Record<string, string> = {
  cadrage: 'Cadrage',
  conception: 'Conception',
  developpement: 'Développement',
  tests: 'Tests',
  livraison: 'Livraison',
  cloture: 'Clôture',
}

// Story 2.2 — liste des projets (colonnes projet/client/phase/dernier contact/cadence)
// + création. Server Component (lecture RLS, AD-1, UX-DR12).
export default async function ProjetsPage() {
  const supabase = await createClient()

  const { data: projets } = await supabase
    .from('projects')
    .select('id, code, nom, type, phase, statut, sante, date_dernier_contact, clients(nom, cadence_x)')
    .order('nom', { ascending: true })

  const SANTE_EMOJI: Record<string, string> = { on_track: '🟢', a_risque: '🟡', en_danger: '🔴' }

  type Row = {
    id: string
    code: string | null
    nom: string
    type: string | null
    phase: string
    statut: string
    sante: string
    clients: { nom: string; cadence_x: number } | null
  }
  const rows = (projets ?? []) as unknown as Row[]

  const { data: clients } = await supabase
    .from('clients')
    .select('id, nom')
    .is('archived_at', null)
    .order('nom', { ascending: true })

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold">Projets</h1>
        <p className="text-sm text-muted">Tes projets clients en cours de suivi.</p>
      </div>

      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Nouveau projet</h2>
        <ProjectForm action={creerProjet} submitLabel="Ajouter le projet" clients={clients ?? []} />
      </div>

      <div className="rounded-panel border border-line bg-surface">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold">
          {rows.length} projet{rows.length > 1 ? 's' : ''}
        </div>
        {rows.length > 0 ? (
          <ul>
            {rows.map((p) => (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/projets/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-surface-alt"
                >
                  <span className="font-medium">
                    <span className="mr-1.5">{SANTE_EMOJI[p.sante] ?? ''}</span>
                    {p.code && <span className="mr-2 font-mono text-xs text-muted">{p.code}</span>}
                    {p.nom} <span className="font-normal text-muted">· {p.clients?.nom}</span>
                    {p.type ? <span className="ml-1 text-xs text-muted">· {p.type}</span> : ''}
                  </span>
                  <span className="text-xs text-muted">
                    {PHASE_LABEL[p.phase] ?? p.phase}
                    {p.statut !== 'actif' ? ` · ${p.statut}` : ''} · cadence {p.clients?.cadence_x} j
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Aucun projet. Ajoute ton premier projet ci-dessus.
          </p>
        )}
      </div>
    </section>
  )
}
