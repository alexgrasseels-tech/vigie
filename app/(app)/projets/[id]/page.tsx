import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ProjectForm } from '../_components/project-form'
import { editerProjet, changerPhase, changerStatut } from '../actions'
import { PHASES } from '../constants'
import { Button } from '@/components/ui/button'
import {
  jaiContacte,
  marquerEcheanceFaite,
  supprimerEcheance,
  relancerAttente,
  resoudreAttente,
  marquerActionPhaseFaite,
  demarquerActionPhase,
  supprimerContactLog,
  supprimerCopil,
  toggleMeeting,
  supprimerMeeting,
} from './actions'
import { BudgetForm } from './_components/budget-form'
import { DeadlineAdd } from './_components/deadline-add'
import { WaitAdd } from './_components/wait-add'
import { ContactLogAdd, CopilAdd, MeetingAdd } from './_components/planif-adds'
import { Badge } from '@/components/ui/badge'

const CONTACT_LABEL: Record<string, string> = {
  relance: '📞 Relance',
  email: '✉️ Email',
  appel: '📱 Appel',
  reunion: '👥 Réunion',
  copil: '🗓 COPIL',
  livraison: '📦 Livraison',
  decision: '⚡ Décision',
  blocage: '🛑 Blocage',
  note: '📝 Note',
}

const PHASE_LABEL: Record<string, string> = {
  cadrage: 'Cadrage',
  conception: 'Conception',
  developpement: 'Développement',
  tests: 'Tests',
  livraison: 'Livraison',
  cloture: 'Clôture',
}
const SANTE_LABEL: Record<string, string> = {
  on_track: '🟢 On track',
  a_risque: '🟡 À risque',
  en_danger: '🔴 En danger',
}
const STATUT_LABEL: Record<string, string> = {
  actif: 'Actif',
  en_pause: 'En pause',
  termine: 'Terminé',
}
function scoreRisque(p: {
  risk_planning?: number
  risk_budget?: number
  risk_ressources?: number
}): number {
  return (p.risk_planning ?? 1) + (p.risk_budget ?? 1) + (p.risk_ressources ?? 1)
}
const WAIT_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  relancee: 'Relancée',
  resolue: 'Résolue',
  abandonnee: 'Abandonnée',
}

function joursDepuis(dateStr: string): number {
  return Math.floor((Date.now() - Date.parse(`${dateStr}T12:00:00`)) / 86_400_000)
}

// Supabase type la relation imbriquée `clients(...)` comme un tableau ; on fixe
// la forme réelle (objet to-one) via un type explicite.
type Fiche = {
  id: string
  code: string | null
  nom: string
  type: string | null
  phase: string
  statut: string
  sante: string
  risk_planning: number
  risk_budget: number
  risk_ressources: number
  date_dernier_contact: string
  notes: string | null
  budget: number | null
  budget_consomme: number | null
  etc: number | null
  contact_nom: string | null
  contact_email: string | null
  release_date: string | null
  gantt_link: string | null
  client_id: string
  clients: { nom: string; cadence_x: number } | null
}

export default async function ProjetFichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: projet } = await supabase
    .from('projects')
    .select(
      'id, code, nom, type, phase, statut, sante, risk_planning, risk_budget, risk_ressources, date_dernier_contact, notes, budget, budget_consomme, etc, contact_nom, contact_email, release_date, gantt_link, client_id, clients(nom, cadence_x)'
    )
    .eq('id', id)
    .maybeSingle()
  if (!projet) notFound()
  const p = projet as unknown as Fiche

  const [
    { data: clients },
    { data: deadlines },
    { data: waits },
    { data: phaseActions },
    { data: phaseStatus },
    { data: contactsLog },
    { data: copils },
    { data: meetings },
  ] = await Promise.all([
    supabase.from('clients').select('id, nom').is('archived_at', null).order('nom'),
    supabase.from('deadlines').select('id, libelle, date, statut').eq('project_id', id).order('date'),
    supabase
      .from('client_waits')
      .select('id, libelle, date_reference, statut')
      .eq('project_id', id)
      .order('date_reference'),
    supabase.from('phase_actions').select('id, libelle, position').eq('phase', p.phase).order('position'),
    supabase.from('project_phase_action_status').select('phase_action_id').eq('project_id', id),
    supabase
      .from('contacts')
      .select('id, type, note, contacted_on')
      .eq('project_id', id)
      .order('contacted_on', { ascending: false }),
    supabase.from('copils').select('id, date, notes').eq('project_id', id).order('date'),
    supabase.from('meetings').select('id, date, notes, done').eq('project_id', id).order('date'),
  ])

  const doneSet = new Set((phaseStatus ?? []).map((s) => s.phase_action_id))
  const stale = joursDepuis(p.date_dernier_contact)

  return (
    <section className="space-y-6">
      <div className="text-sm text-muted">
        <Link href="/projets" className="text-signal-attente hover:underline">
          Projets
        </Link>{' '}
        › {p.nom}
      </div>

      {/* En-tête : phase, statut, staleness, J'ai contacté */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {p.code && <span className="font-mono text-xs text-muted">{p.code}</span>}
              <h1 className="text-xl font-bold">{p.nom}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {p.type && <Badge variant="secondary">{p.type}</Badge>}
              <Badge variant="outline">{SANTE_LABEL[p.sante] ?? p.sante}</Badge>
              <Badge variant="outline" className="text-signal-phase">
                Phase · {PHASE_LABEL[p.phase] ?? p.phase}
              </Badge>
              {(() => {
                const s = scoreRisque(p)
                const c = s <= 4 ? 'text-ok' : s <= 6 ? 'text-signal-echeance' : 'text-signal-silence'
                return <Badge variant="outline" className={`font-mono ${c}`}>risque {s}/9</Badge>
              })()}
            </div>
            <p className="mt-2 text-sm text-muted">
              {p.clients?.nom}
              {p.contact_nom ? ` · ${p.contact_nom}` : ''}
              {p.contact_email ? ` · ${p.contact_email}` : ''} · cadence {p.clients?.cadence_x} j ·{' '}
              <span className={stale > (p.clients?.cadence_x ?? 7) ? 'text-signal-silence' : ''}>
                dernier contact il y a {stale} j
              </span>
            </p>
            {(p.release_date || p.gantt_link) && (
              <p className="mt-1 text-sm text-muted">
                {p.release_date ? `🚀 MeP : ${p.release_date}` : ''}
                {p.release_date && p.gantt_link ? ' · ' : ''}
                {p.gantt_link ? (
                  <a href={p.gantt_link} target="_blank" rel="noopener noreferrer" className="text-signal-attente hover:underline">
                    📊 Gantt ↗
                  </a>
                ) : ''}
              </p>
            )}
          </div>
          <form action={jaiContacte}>
            <input type="hidden" name="project_id" value={p.id} />
            <button
              type="submit"
              className="min-h-9 rounded-control bg-primary px-3 py-2 text-sm font-semibold text-primary-contrast"
            >
              J&apos;ai contacté
            </button>
          </form>
        </div>

        <form action={changerPhase} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <input type="hidden" name="id" value={p.id} />
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Changer de phase</span>
            <select
              name="phase"
              defaultValue={p.phase}
              className="min-h-9 rounded-control border border-line bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {PHASES.map((ph) => (
                <option key={ph} value={ph}>
                  {PHASE_LABEL[ph]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-9 rounded-control border border-line px-3 py-2 text-sm hover:bg-surface-alt">
            Appliquer
          </button>
        </form>
      </div>

      {/* Éditer le projet + statut */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Éditer le projet</h2>
        <ProjectForm
          action={editerProjet}
          submitLabel="Enregistrer"
          clients={clients ?? []}
          defaults={{
            id: p.id,
            nom: p.nom,
            client_id: p.client_id,
            type: p.type,
            contact_nom: p.contact_nom,
            contact_email: p.contact_email,
            sante: p.sante,
            risk_planning: p.risk_planning,
            risk_budget: p.risk_budget,
            risk_ressources: p.risk_ressources,
            release_date: p.release_date,
            gantt_link: p.gantt_link,
            notes: p.notes,
          }}
        />
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs text-muted">
            Statut : <b>{STATUT_LABEL[p.statut] ?? p.statut}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            {p.statut === 'actif' && (
              <>
                <form action={changerStatut}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="statut" value="en_pause" />
                  <Button type="submit" variant="outline" size="sm">
                    Mettre en pause
                  </Button>
                </form>
                <form action={changerStatut}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="statut" value="termine" />
                  <Button type="submit" variant="secondary" size="sm">
                    Clore le projet
                  </Button>
                </form>
              </>
            )}
            {p.statut === 'en_pause' && (
              <>
                <form action={changerStatut}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="statut" value="actif" />
                  <Button type="submit" variant="outline" size="sm">
                    Réactiver
                  </Button>
                </form>
                <form action={changerStatut}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="statut" value="termine" />
                  <Button type="submit" variant="secondary" size="sm">
                    Clore le projet
                  </Button>
                </form>
              </>
            )}
            {p.statut === 'termine' && (
              <form action={changerStatut}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="statut" value="actif" />
                <Button type="submit" variant="outline" size="sm">
                  Rouvrir le projet
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Budget</h2>
        <BudgetForm id={p.id} budget={p.budget} budgetConsomme={p.budget_consomme} etc={p.etc} />
      </div>

      {/* Échéances */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Échéances</h2>
        </div>
        {deadlines && deadlines.length > 0 ? (
          <ul className="mb-4 divide-y divide-line">
            {deadlines.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm">
                  <b>{d.date}</b> {d.libelle ? `· ${d.libelle}` : ''}{' '}
                  {d.statut === 'faite' && <span className="text-ok">· faite</span>}
                </span>
                <span className="flex gap-2">
                  {d.statut === 'a_venir' && (
                    <form action={marquerEcheanceFaite}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="project_id" value={p.id} />
                      <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs hover:bg-surface-alt">
                        Marquer fait
                      </button>
                    </form>
                  )}
                  <form action={supprimerEcheance}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="project_id" value={p.id} />
                    <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-alt">
                      Supprimer
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">Aucune échéance.</p>
        )}
        <DeadlineAdd projectId={p.id} />
      </div>

      {/* Attentes client */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Attentes client</h2>
        {waits && waits.length > 0 ? (
          <ul className="mb-4 divide-y divide-line">
            {waits.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm">
                  <b>{w.libelle}</b>{' '}
                  <span className="text-muted">
                    · {WAIT_LABEL[w.statut] ?? w.statut} depuis le {w.date_reference}
                  </span>
                </span>
                {(w.statut === 'en_attente' || w.statut === 'relancee') && (
                  <span className="flex gap-2">
                    <form action={relancerAttente}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="project_id" value={p.id} />
                      <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs hover:bg-surface-alt">
                        Relancé
                      </button>
                    </form>
                    <form action={resoudreAttente}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="project_id" value={p.id} />
                      <input type="hidden" name="statut" value="resolue" />
                      <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs text-ok hover:bg-surface-alt">
                        Résolu
                      </button>
                    </form>
                    <form action={resoudreAttente}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="project_id" value={p.id} />
                      <input type="hidden" name="statut" value="abandonnee" />
                      <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-alt">
                        Abandonner
                      </button>
                    </form>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">Aucune attente client.</p>
        )}
        <WaitAdd projectId={p.id} />
      </div>

      {/* Actions attendues de la phase courante */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Actions attendues · phase {PHASE_LABEL[p.phase] ?? p.phase}
        </h2>
        {phaseActions && phaseActions.length > 0 ? (
          <ul className="divide-y divide-line">
            {phaseActions.map((a) => {
              const done = doneSet.has(a.id)
              return (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <span className={done ? 'text-sm text-muted line-through' : 'text-sm'}>{a.libelle}</span>
                  {done ? (
                    <form action={demarquerActionPhase}>
                      <input type="hidden" name="project_id" value={p.id} />
                      <input type="hidden" name="phase_action_id" value={a.id} />
                      <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-alt">
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <form action={marquerActionPhaseFaite}>
                      <input type="hidden" name="project_id" value={p.id} />
                      <input type="hidden" name="phase_action_id" value={a.id} />
                      <button className="min-h-9 rounded-control border border-line px-3 py-1.5 text-xs hover:bg-surface-alt">
                        Marquer fait
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Aucune action attendue pour cette phase — édite-les dans Réglages.
          </p>
        )}
      </div>

      {/* COPIL */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">COPIL</h2>
        {copils && copils.length > 0 ? (
          <ul className="mb-4 divide-y divide-line">
            {copils.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <b>{c.date}</b>
                  {c.notes ? <span className="text-muted"> · {c.notes}</span> : ''}
                </span>
                <form action={supprimerCopil}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="project_id" value={p.id} />
                  <button className="rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-alt">
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">Aucun COPIL planifié.</p>
        )}
        <CopilAdd projectId={p.id} />
      </div>

      {/* Réunions internes */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Réunions internes</h2>
        {meetings && meetings.length > 0 ? (
          <ul className="mb-4 divide-y divide-line">
            {meetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className={m.done ? 'text-muted line-through' : ''}>
                  <b>{m.date}</b>
                  {m.notes ? ` · ${m.notes}` : ''}
                </span>
                <span className="flex gap-2">
                  <form action={toggleMeeting}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="project_id" value={p.id} />
                    <input type="hidden" name="done" value={(!m.done).toString()} />
                    <button className="rounded-control border border-line px-3 py-1.5 text-xs hover:bg-surface-alt">
                      {m.done ? 'Rouvrir' : 'Fait'}
                    </button>
                  </form>
                  <form action={supprimerMeeting}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="project_id" value={p.id} />
                    <button className="rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-alt">
                      Supprimer
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">Aucune réunion planifiée.</p>
        )}
        <MeetingAdd projectId={p.id} />
      </div>

      {/* Timeline de contacts */}
      <div className="rounded-panel border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
        <div className="mb-4">
          <ContactLogAdd projectId={p.id} />
        </div>
        {contactsLog && contactsLog.length > 0 ? (
          <ul className="space-y-2">
            {contactsLog.map((e) => (
              <li key={e.id} className="rounded-control border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {CONTACT_LABEL[e.type] ?? e.type} <span className="font-normal text-muted">· {e.contacted_on}</span>
                  </span>
                  <form action={supprimerContactLog}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="project_id" value={p.id} />
                    <button className="text-xs text-muted hover:text-signal-silence">✕</button>
                  </form>
                </div>
                {e.note && <p className="mt-1 whitespace-pre-wrap text-sm">{e.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun historique. Ajoute un premier élément ci-dessus.</p>
        )}
      </div>

    </section>
  )
}
