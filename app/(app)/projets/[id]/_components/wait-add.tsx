'use client'

import { useActionState, useEffect, useRef } from 'react'
import { ouvrirAttente, type FormState } from '../actions'

const SUGGESTIONS = ['Doit tester', 'Doit valider', 'Doit fournir un contenu', 'Doit répondre']

// Story 2.5 — ouverture d'une attente client (libellé requis, liste libre + suggestions).
export function WaitAdd({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(ouvrirAttente, {})
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state.ok])

  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Le client doit…</span>
        <input
          name="libelle"
          list="wait-suggestions"
          required
          placeholder="tester, valider, fournir un contenu…"
          className="min-h-9 w-64 rounded-control border border-line bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <datalist id="wait-suggestions">
          {SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-control border border-line px-3 py-2 text-sm hover:bg-surface-alt disabled:opacity-60"
      >
        {pending ? '…' : 'Ouvrir l’attente'}
      </button>
      {state.error && (
        <span role="alert" className="text-sm text-signal-silence">
          {state.error}
        </span>
      )}
    </form>
  )
}
