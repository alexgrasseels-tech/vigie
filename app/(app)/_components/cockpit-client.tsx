'use client'

import Link from 'next/link'
import { startTransition, useOptimistic, useState } from 'react'
import { formatSignal, type GroupedProject, type SignalRow, type SignalType } from '@/lib/signals'
import { Button } from '@/components/ui/button'
import {
  cockpitJaiContacte,
  cockpitRelance,
  cockpitMarquerEcheance,
  cockpitMarquerPhase,
  cockpitMarquerReunion,
  cockpitSnooze,
} from '../actions'

const FAMILY: Record<SignalType, 'silence' | 'echeance' | 'attente' | 'phase'> = {
  danger: 'silence',
  silence: 'silence',
  echeance: 'echeance',
  mep: 'echeance',
  budget: 'echeance',
  attente: 'attente',
  copil: 'attente',
  reunion: 'phase',
  phase: 'phase',
}
const BADGE: Record<string, string> = {
  silence: 'bg-signal-silence/10 text-signal-silence',
  echeance: 'bg-signal-echeance/10 text-signal-echeance',
  attente: 'bg-signal-attente/10 text-signal-attente',
  phase: 'bg-signal-phase/10 text-signal-phase',
}
const TEXT: Record<string, string> = {
  silence: 'text-signal-silence',
  echeance: 'text-signal-echeance',
  attente: 'text-signal-attente',
  phase: 'text-signal-phase',
}
const LABEL: Record<SignalType, string> = {
  danger: 'Danger',
  silence: 'Silence',
  echeance: 'Échéance',
  mep: 'MeP',
  attente: 'Attente',
  budget: 'Budget',
  copil: 'COPIL',
  reunion: 'Réunion',
  phase: 'Phase',
}
const ALL_TYPES: SignalType[] = ['danger', 'silence', 'echeance', 'mep', 'attente', 'budget', 'copil', 'reunion', 'phase']

// Actions de mutation (null = signal "Ouvrir" seulement)
const MUTATION: Record<SignalType, ((row: SignalRow) => Promise<void>) | null> = {
  danger: null,
  silence: (r) => cockpitJaiContacte(r.project_id),
  echeance: (r) => cockpitMarquerEcheance(r.ref_id),
  mep: null,
  attente: (r) => cockpitRelance(r.ref_id),
  budget: null,
  copil: null,
  reunion: (r) => cockpitMarquerReunion(r.ref_id),
  phase: (r) => cockpitMarquerPhase(r.project_id, r.ref_id),
}
const ACTION_LABEL: Record<SignalType, string> = {
  danger: 'Ouvrir',
  silence: "J'ai contacté",
  echeance: 'Marquer fait',
  mep: 'Ouvrir',
  attente: 'Relancé',
  budget: 'Ouvrir',
  copil: 'Ouvrir',
  reunion: 'Fait',
  phase: 'Marquer fait',
}

// Identité unique d'une ligne : silence/danger/mep/budget partagent ref_id=project_id,
// donc on combine le type + ref_id (sinon clés React dupliquées + retrait optimiste croisé).
const rowKey = (s: SignalRow) => `${s.signal}:${s.ref_id}`

export function CockpitClient({
  groups,
  projectNames,
}: {
  groups: GroupedProject[]
  projectNames: Record<string, string>
}) {
  const [hidden, addHidden] = useOptimistic<string[], string>([], (s, id) => [...s, id])
  const [filter, setFilter] = useState<SignalType | null>(null)

  function act(key: string, fn: () => Promise<void>) {
    startTransition(async () => {
      addHidden(key)
      await fn()
    })
  }

  const counts = Object.fromEntries(ALL_TYPES.map((t) => [t, 0])) as Record<SignalType, number>
  for (const g of groups) for (const s of g.signals) if (!hidden.includes(rowKey(s))) counts[s.signal]++
  const totalVisible = ALL_TYPES.reduce((n, t) => n + counts[t], 0)
  const presentTypes = ALL_TYPES.filter((t) => counts[t] > 0)

  const visibleRows = (g: GroupedProject) =>
    g.signals.filter((s) => !hidden.includes(rowKey(s)) && (filter === null || s.signal === filter))
  const visibleGroups = groups.filter((g) => visibleRows(g).length > 0)

  return (
    <div className="space-y-5">
      {/* KPIs (types présents) */}
      {presentTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presentTypes.map((t) => {
            const fam = FAMILY[t]
            const active = filter === t
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(active ? null : t)}
                className={`min-w-24 rounded-card border bg-surface px-3 py-2 text-left ${
                  active ? 'border-primary ring-2 ring-primary/30' : 'border-line hover:bg-surface-alt'
                }`}
              >
                <span className={`text-xl font-bold ${TEXT[fam]}`}>{counts[t]}</span>{' '}
                <span className="text-xs text-muted">{LABEL[t]}</span>
              </button>
            )
          })}
        </div>
      )}

      {totalVisible === 0 ? (
        <div className="rounded-panel border border-dashed border-line bg-surface p-10 text-center">
          <p className="font-semibold text-ok">Cockpit vidé ✓</p>
          <p className="mt-1 text-sm text-muted">Rien d&apos;autre ne demande ton attention aujourd&apos;hui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((g) => (
            <div key={g.project_id} className="rounded-panel border border-line bg-surface">
              <div className="border-b border-line px-4 py-2.5">
                <Link href={`/projets/${g.project_id}`} className="font-semibold hover:underline">
                  {projectNames[g.project_id] ?? 'Projet'}
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {visibleRows(g).map((row) => {
                  const fam = FAMILY[row.signal]
                  const f = formatSignal(row)
                  const mutate = MUTATION[row.signal]
                  return (
                    <li key={rowKey(row)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[fam]}`}>
                          {f.tag}
                        </span>
                        <span>{f.text}</span>
                      </span>
                      <span className="flex gap-2">
                        {row.signal === 'silence' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => act(rowKey(row), () => cockpitSnooze(row.project_id, 3))}
                          >
                            +3j
                          </Button>
                        )}
                        {mutate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={row.signal === 'silence' ? 'default' : 'outline'}
                            onClick={() => act(rowKey(row), () => mutate(row))}
                            aria-label={`${ACTION_LABEL[row.signal]} — ${projectNames[g.project_id] ?? ''}`}
                          >
                            {ACTION_LABEL[row.signal]}
                          </Button>
                        ) : (
                          <Link
                            href={`/projets/${row.project_id}`}
                            className="inline-flex h-8 items-center rounded-md border border-line px-3 text-xs font-medium hover:bg-surface-alt"
                          >
                            Ouvrir
                          </Link>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
