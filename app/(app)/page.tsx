import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { SIGNALS_VIEW, groupSignals, type SignalRow } from '@/lib/signals'
import { CockpitClient } from './_components/cockpit-client'
import { DeliverableKpis, type Deliverable } from './_components/deliverable-kpis'

// Jours jusqu'à une date (négatif si passée). Helper module (hors render) pour
// que Date.now() reste pur vis-à-vis du composant.
function joursAvant(dateStr: string): number {
  return Math.floor((Date.parse(`${dateStr}T12:00:00`) - Date.now()) / 86_400_000)
}

// Story 3.3 — Cockpit. Server Component : lit v_active_signals (RLS), groupSignals,
// rend le client (KPIs + actions optimistes). Onboarding « 0 projet » (UX-DR8).
export default async function CockpitPage() {
  const supabase = await createClient()

  const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true })
  if ((count ?? 0) === 0) {
    return (
      <section aria-labelledby="cockpit-title">
        <h1 id="cockpit-title" className="mb-1 text-xl font-bold">
          Cockpit
        </h1>
        <p className="mb-8 text-sm text-muted">Ton triage du matin : ce qui demande une action.</p>
        <div className="rounded-panel border border-dashed border-line bg-surface p-10 text-center">
          <p className="font-semibold">Bienvenue dans Vigie 👋</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Commence par ajouter ton premier{' '}
            <Link href="/clients" className="text-signal-attente hover:underline">
              client
            </Link>
            , puis un{' '}
            <Link href="/projets" className="text-signal-attente hover:underline">
              projet
            </Link>
            . Tu peux aussi utiliser l&apos;ajout rapide (⌘/Ctrl-K) en haut.
          </p>
        </div>
      </section>
    )
  }

  const { data: signals } = await supabase.from(SIGNALS_VIEW).select('*')
  const rows = (signals ?? []) as SignalRow[]
  const groups = groupSignals(rows)

  const ids = [...new Set(rows.map((r) => r.project_id))]
  let projectNames: Record<string, string> = {}
  if (ids.length) {
    const { data: projs } = await supabase.from('projects').select('id, nom, clients(nom)').in('id', ids)
    projectNames = Object.fromEntries(
      ((projs ?? []) as unknown as { id: string; nom: string; clients: { nom: string } | null }[]).map(
        (p) => [p.id, `${p.nom} · ${p.clients?.nom ?? ''}`]
      )
    )
  }

  // Projets actifs (santé pour la barre + noms pour les livrables)
  const { data: santes } = await supabase.from('projects').select('id, sante, nom').eq('statut', 'actif')
  const hc: Record<string, number> = { on_track: 0, a_risque: 0, en_danger: 0 }
  const activeName = new Map<string, string>()
  for (const r of (santes ?? []) as unknown as { id: string; sante: string; nom: string }[]) {
    activeName.set(r.id, r.nom)
    if (r.sante in hc) hc[r.sante]++
  }
  const totalActifs = hc.on_track + hc.a_risque + hc.en_danger

  // Livrables : échéances à venir des projets actifs (≤ 30 j, dépassées incluses)
  const { data: dls } = await supabase
    .from('deadlines')
    .select('id, libelle, date, project_id')
    .eq('statut', 'a_venir')
  const deliverables: Deliverable[] = []
  for (const d of (dls ?? []) as unknown as {
    id: string
    libelle: string | null
    date: string
    project_id: string
  }[]) {
    if (!activeName.has(d.project_id)) continue
    const days = joursAvant(d.date)
    if (days > 30) continue
    deliverables.push({
      id: d.id,
      libelle: d.libelle,
      date: d.date,
      project_id: d.project_id,
      project_nom: activeName.get(d.project_id) ?? 'Projet',
      days,
    })
  }

  return (
    <section aria-labelledby="cockpit-title">
      <h1 id="cockpit-title" className="mb-1 text-xl font-bold">
        Cockpit
      </h1>
      <p className="mb-4 text-sm text-muted">Ton triage du matin : ce qui demande une action.</p>

      {totalActifs > 0 && (
        <div className="mb-6">
          <div className="flex h-2 overflow-hidden rounded-full">
            {hc.on_track > 0 && <div className="bg-ok" style={{ flex: hc.on_track }} title={`${hc.on_track} on track`} />}
            {hc.a_risque > 0 && (
              <div className="bg-signal-echeance" style={{ flex: hc.a_risque }} title={`${hc.a_risque} à risque`} />
            )}
            {hc.en_danger > 0 && (
              <div className="bg-signal-silence" style={{ flex: hc.en_danger }} title={`${hc.en_danger} en danger`} />
            )}
          </div>
          <div className="mt-1.5 flex gap-3 text-xs text-muted">
            <span>🟢 {hc.on_track} on track</span>
            <span>🟡 {hc.a_risque} à risque</span>
            <span>🔴 {hc.en_danger} en danger</span>
          </div>
        </div>
      )}

      <DeliverableKpis items={deliverables} />

      <CockpitClient groups={groups} projectNames={projectNames} />
    </section>
  )
}
