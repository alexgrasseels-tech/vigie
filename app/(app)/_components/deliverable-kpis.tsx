'use client'

import Link from 'next/link'
import { startTransition, useOptimistic, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cockpitMarquerEcheance } from '../actions'

export type Deliverable = {
  id: string
  libelle: string | null
  date: string
  project_id: string
  project_nom: string
  days: number
}

type BucketKey = 'd7' | 'd14' | 'd30'
const BUCKETS: { key: BucketKey; label: string; cls: string }[] = [
  { key: 'd7', label: '< 7 j', cls: 'text-signal-silence' },
  { key: 'd14', label: '< 14 j', cls: 'text-signal-echeance' },
  { key: 'd30', label: '< 30 j', cls: 'text-signal-attente' },
]

function inBucket(days: number, b: BucketKey): boolean {
  if (b === 'd7') return days <= 7
  if (b === 'd14') return days > 7 && days <= 14
  return days > 14 && days <= 30
}

function libelleJours(days: number): string {
  if (days < 0) return `dépassée de ${Math.abs(days)} j`
  if (days === 0) return "aujourd'hui"
  return `dans ${days} j`
}

// Story B3+ — KPIs livrables (échéances à venir) par fenêtre 7/14/30 j, cliquables :
// un clic filtre et déplie la liste des livrables concernés (lien projet + Marquer fait).
export function DeliverableKpis({ items }: { items: Deliverable[] }) {
  const [hidden, addHidden] = useOptimistic<string[], string>([], (s, id) => [...s, id])
  const [filter, setFilter] = useState<BucketKey | null>(null)

  const visible = items.filter((d) => !hidden.includes(d.id))
  const count = (b: BucketKey) => visible.filter((d) => inBucket(d.days, b)).length
  const list = filter ? visible.filter((d) => inBucket(d.days, filter)).sort((a, b) => a.days - b.days) : []

  function marquerFait(id: string) {
    startTransition(async () => {
      addHidden(id)
      await cockpitMarquerEcheance(id)
    })
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-2">
        {BUCKETS.map((b) => {
          const n = count(b.key)
          const active = filter === b.key
          return (
            <button
              key={b.key}
              type="button"
              aria-pressed={active}
              disabled={n === 0}
              onClick={() => setFilter(active ? null : b.key)}
              className={`rounded-card border bg-surface px-4 py-3 text-left disabled:opacity-50 ${
                active ? 'border-primary ring-2 ring-primary/30' : 'border-line hover:bg-surface-alt'
              }`}
            >
              <div className={`text-2xl font-bold ${n > 0 ? b.cls : 'text-muted'}`}>{n}</div>
              <div className="text-xs text-muted">Livrables {b.label}</div>
            </button>
          )
        })}
      </div>

      {filter && (
        <div className="mt-2 rounded-panel border border-line bg-surface">
          {list.length > 0 ? (
            <ul className="divide-y divide-line">
              {list.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-sm">
                    <Link href={`/projets/${d.project_id}`} className="font-medium hover:underline">
                      {d.project_nom}
                    </Link>
                    <span className="text-muted">
                      {' '}
                      · {d.libelle ?? 'Échéance'} —{' '}
                      <span className={d.days < 0 ? 'text-signal-silence' : ''}>{libelleJours(d.days)}</span>
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => marquerFait(d.id)}>
                    Marquer fait
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted">Aucun livrable dans cette fenêtre.</p>
          )}
        </div>
      )}
    </div>
  )
}
