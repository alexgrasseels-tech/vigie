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
const STATUT_LABEL: Record<string, string> = { en_pause: 'En pause', termine: 'Clôturé' }
const SANTE_EMOJI: Record<string, string> = { on_track: '🟢', a_risque: '🟡', en_danger: '🔴' }

const FILTERS: { key: string; label: string }[] = [
  { key: 'open', label: 'Actifs & en pause' },
  { key: 'closed', label: 'Clôturés' },
  { key: 'all', label: 'Tous' },
]

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

// Story 2.2 — liste des projets + filtre par statut (masque les clôturés par défaut
// pour réduire le bruit). Server Component (lecture RLS, AD-1, UX-DR12).
export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>
}) {
  const { f } = await searchParams
  const filter = f === 'closed' || f === 'all' ? f : 'open'

  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('id, code, nom, type, phase, statut, sante, date_dernier_contact, clients(nom, cadence_x)')
    .order('nom', { ascending: true })
  if (filter === 'closed') query = query.eq('statut', 'termine')
  else if (filter === 'open') query = query.neq('statut', 'termine')
  const { data: projets } = await query
  const rows = (projets ?? []) as unknown as Row[]

  const { data: clients } = await supabase
    .from('clients')
    .select('id, nom')
    .is('archived_at', null)
    .order('nom', { ascending: true })

  function dot(p: Row): string {
    if (p.statut === 'termine') return '⚪'
    if (p.statut === 'en_pause') return '⏸️'
    return SANTE_EMOJI[p.sante] ?? ''
  }

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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <span className="text-sm font-semibold">
            {rows.length} projet{rows.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-1">
            {FILTERS.map((ff) => (
              <Link
                key={ff.key}
                href={`/projets?f=${ff.key}`}
                className={`rounded-control px-3 py-1 text-xs ${
                  filter === ff.key
                    ? 'bg-primary text-primary-contrast'
                    : 'border border-line text-muted hover:bg-surface-alt'
                }`}
              >
                {ff.label}
              </Link>
            ))}
          </div>
        </div>
        {rows.length > 0 ? (
          <ul>
            {rows.map((p) => (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/projets/${p.id}`}
                  className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-surface-alt ${
                    p.statut === 'termine' ? 'opacity-60' : ''
                  }`}
                >
                  <span className="font-medium">
                    <span className="mr-1.5">{dot(p)}</span>
                    {p.code && <span className="mr-2 font-mono text-xs text-muted">{p.code}</span>}
                    {p.nom} <span className="font-normal text-muted">· {p.clients?.nom}</span>
                    {p.type ? <span className="ml-1 text-xs text-muted">· {p.type}</span> : ''}
                  </span>
                  <span className="text-xs text-muted">
                    {PHASE_LABEL[p.phase] ?? p.phase}
                    {p.statut !== 'actif' ? ` · ${STATUT_LABEL[p.statut] ?? p.statut}` : ''} · cadence{' '}
                    {p.clients?.cadence_x} j
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">
            {filter === 'closed' ? 'Aucun projet clôturé.' : 'Aucun projet. Ajoute ton premier projet ci-dessus.'}
          </p>
        )}
      </div>
    </section>
  )
}
