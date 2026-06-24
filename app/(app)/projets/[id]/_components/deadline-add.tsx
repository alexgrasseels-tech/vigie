'use client'

import { useActionState, useEffect, useRef } from 'react'
import { ajouterEcheance, type FormState } from '../actions'

// Story 2.4 — ajout d'une échéance (date requise). Le formulaire se vide au succès.
export function DeadlineAdd({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(ajouterEcheance, {})
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state.ok])

  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Libellé (optionnel)</span>
        <input
          name="libelle"
          className="min-h-9 w-48 rounded-control border border-line bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Date</span>
        <input
          name="date"
          type="date"
          required
          className="min-h-9 rounded-control border border-line bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-control border border-line px-3 py-2 text-sm hover:bg-surface-alt disabled:opacity-60"
      >
        {pending ? '…' : 'Ajouter'}
      </button>
      {state.error && (
        <span role="alert" className="text-sm text-signal-silence">
          {state.error}
        </span>
      )}
    </form>
  )
}
