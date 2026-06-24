'use client'

import { useActionState } from 'react'
import { editerBudget, type FormState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' €'

// Story 2.3 + enrichissement — budget / consommé / ETC / projeté (= consommé + ETC)
// avec détection de dépassement. KPI informatif (jamais un signal de cockpit).
export function BudgetForm({
  id,
  budget,
  budgetConsomme,
  etc,
}: {
  id: string
  budget: number | null
  budgetConsomme: number | null
  etc: number | null
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(editerBudget, {})

  const consomme = budgetConsomme ?? 0
  const reste = etc ?? 0
  const projete = consomme + reste
  const pct = budget && budget > 0 ? Math.round((consomme / budget) * 100) : null
  const pctProjete = budget && budget > 0 ? Math.round((projete / budget) * 100) : null
  const overrun = budget != null && budget > 0 && projete > budget
  const tendu = pct != null && pct >= 90

  return (
    <div className="space-y-4">
      {pct != null && (
        <div>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span>
              <b>{fmt(consomme)}</b> <span className="text-muted">/ {fmt(budget!)}</span>
            </span>
            <span className={overrun || tendu ? 'font-semibold text-signal-echeance' : 'font-semibold text-ok'}>
              {pct}% consommé{overrun ? ` · projeté ${pctProjete}% (dépassement)` : reste > 0 ? ` · projeté ${pctProjete}%` : ''}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-surface-alt">
            <div
              className={tendu || overrun ? 'h-full bg-signal-echeance' : 'h-full bg-ok'}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted">
            <span>ETC (reste à faire) : {fmt(reste)}</span>
            <span className={overrun ? 'font-semibold text-signal-silence' : 'text-ok'}>
              Projeté : {fmt(projete)}
              {overrun ? ` (+${fmt(projete - budget!)})` : budget ? ` (reste ${fmt(budget - projete)})` : ''}
            </span>
          </div>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={id} />
        <div className="space-y-1">
          <Label htmlFor="budget" className="text-xs text-muted">Budget (€)</Label>
          <Input id="budget" name="budget" type="number" min={0} step="0.01" defaultValue={budget ?? ''} className="w-32" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget_consomme" className="text-xs text-muted">Consommé (€)</Label>
          <Input id="budget_consomme" name="budget_consomme" type="number" min={0} step="0.01" defaultValue={budgetConsomme ?? ''} className="w-32" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="etc" className="text-xs text-muted">ETC (€)</Label>
          <Input id="etc" name="etc" type="number" min={0} step="0.01" defaultValue={etc ?? ''} className="w-32" />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? '…' : 'Enregistrer'}
        </Button>
        {state.error && (
          <span role="alert" className="text-sm text-signal-silence">
            {state.error}
          </span>
        )}
      </form>
    </div>
  )
}
