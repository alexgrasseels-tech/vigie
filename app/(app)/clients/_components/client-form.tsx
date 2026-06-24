'use client'

import { useActionState } from 'react'
import type { FormState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Action = (prev: FormState, formData: FormData) => Promise<FormState>

// Story 2.1 — formulaire client (shadcn). Erreur inline via useActionState (UX-DR8).
export function ClientForm({
  action,
  submitLabel,
  defaults,
}: {
  action: Action
  submitLabel: string
  defaults?: { id?: string; nom?: string; cadence_x?: number; email?: string | null; notes?: string | null }
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" defaultValue={defaults?.nom ?? ''} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cadence_x">Cadence (jours)</Label>
          <Input
            id="cadence_x"
            name="cadence_x"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults?.cadence_x ?? 7}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail (optionnel)</Label>
        <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ''} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-signal-silence">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  )
}
