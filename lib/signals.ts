// Story 3.2 — contrat TS partagé cockpit (Epic 3) + digest (Epic 4).
// SEULE référence au nom de la vue, et SEUL endroit d'agrégation/tri/rendu.
// Aucun calcul de seuil ici : la vue v_active_signals a déjà tout dérivé (AD-3/4).

export const SIGNALS_VIEW = 'v_active_signals' as const

export type SignalType =
  | 'danger'
  | 'silence'
  | 'echeance'
  | 'mep'
  | 'attente'
  | 'budget'
  | 'copil'
  | 'reunion'
  | 'phase'

export type SignalRow = {
  user_id: string
  project_id: string
  client_id: string
  signal: SignalType
  ref_id: string
  palier: 'depassee' | 'jour_j' | 'j_1' | 'j_3' | null
  age_days: number
  cadence_x: number
  libelle_metier: string
  urgency_rank: number
}

export type GroupedProject = {
  project_id: string
  client_id: string
  urgency: number
  signals: SignalRow[]
}

// Regroupe par projet, trie par urgency_rank décroissant (tie-break age_days desc).
export function groupSignals(rows: SignalRow[]): GroupedProject[] {
  const byProject = new Map<string, GroupedProject>()
  for (const r of rows) {
    let g = byProject.get(r.project_id)
    if (!g) {
      g = { project_id: r.project_id, client_id: r.client_id, urgency: r.urgency_rank, signals: [] }
      byProject.set(r.project_id, g)
    }
    g.signals.push(r)
    if (r.urgency_rank > g.urgency) g.urgency = r.urgency_rank
  }
  const groups = [...byProject.values()]
  for (const g of groups) {
    g.signals.sort((a, b) => b.urgency_rank - a.urgency_rank || (b.age_days ?? 0) - (a.age_days ?? 0))
  }
  groups.sort((a, b) => b.urgency - a.urgency || maxAge(b) - maxAge(a))
  return groups
}

function maxAge(g: GroupedProject): number {
  return g.signals.reduce((m, s) => Math.max(m, s.age_days ?? 0), 0)
}

const PALIER_TXT: Record<string, string> = {
  depassee: 'dépassée',
  jour_j: "aujourd'hui",
  j_1: 'demain (J-1)',
  j_3: 'sous 3 jours (J-3)',
}

// Libellé texte non culpabilisant (tutoyant) + tag court (couleur jamais seule).
export function formatSignal(row: SignalRow): { tag: string; text: string } {
  switch (row.signal) {
    case 'danger':
      return { tag: 'Danger', text: `${row.libelle_metier} — projet en danger` }
    case 'silence':
      return {
        tag: 'Silence',
        text: `Pas de contact depuis ${row.age_days} jours (cadence ${row.cadence_x})`,
      }
    case 'echeance': {
      const t =
        row.palier === 'depassee'
          ? `dépassée de ${row.age_days} j`
          : PALIER_TXT[row.palier ?? ''] ?? ''
      return { tag: 'Échéance', text: `${row.libelle_metier} — ${t}` }
    }
    case 'mep': {
      const t =
        row.palier === 'depassee'
          ? `dépassée de ${row.age_days} j`
          : row.palier === 'jour_j'
            ? "aujourd'hui"
            : `dans ${Math.abs(row.age_days)} j`
      return { tag: 'MeP', text: `Mise en prod ${t}` }
    }
    case 'attente':
      return { tag: 'Attente', text: `${row.libelle_metier} — en attente depuis ${row.age_days} j` }
    case 'budget':
      return { tag: 'Budget', text: `${row.libelle_metier} — dépassement budgété (projeté > budget)` }
    case 'copil':
      return {
        tag: 'COPIL',
        text: `${row.libelle_metier} — ${row.age_days <= 0 ? "aujourd'hui" : `dans ${row.age_days} j`}`,
      }
    case 'reunion':
      return {
        tag: 'Réunion',
        text: `${row.libelle_metier} — ${row.age_days <= 0 ? "aujourd'hui" : `dans ${row.age_days} j`}`,
      }
    case 'phase':
      return { tag: 'Phase', text: `${row.libelle_metier} à faire` }
    default:
      return { tag: 'Signal', text: row.libelle_metier }
  }
}
