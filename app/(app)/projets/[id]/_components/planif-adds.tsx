'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  ajouterContactLog,
  ajouterCopil,
  ajouterMeeting,
  type FormState,
} from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CONTACT_TYPES: [string, string][] = [
  ['relance', '📞 Relance'],
  ['email', '✉️ Email'],
  ['appel', '📱 Appel'],
  ['reunion', '👥 Réunion'],
  ['copil', '🗓 COPIL'],
  ['livraison', '📦 Livraison'],
  ['decision', '⚡ Décision'],
  ['blocage', '🛑 Blocage'],
  ['note', '📝 Note'],
]

function useResetOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state.ok])
  return ref
}

export function ContactLogAdd({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(ajouterContactLog, {})
  const [type, setType] = useState('note')
  const ref = useResetOnOk(state)

  return (
    <form ref={ref} action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={(v) => setType(v ?? 'note')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_TYPES.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input name="date" type="date" className="w-40" />
      </div>
      <Textarea name="note" rows={2} placeholder="Commentaire, décision, note de suivi…" required />
      {state.error && (
        <p role="alert" className="text-sm text-signal-silence">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '…' : 'Ajouter à la timeline'}
      </Button>
    </form>
  )
}

export function CopilAdd({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(ajouterCopil, {})
  const ref = useResetOnOk(state)
  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      <Input name="date" type="date" required className="w-40" />
      <Input name="notes" placeholder="Ordre du jour (optionnel)" className="w-56" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? '…' : 'Planifier le COPIL'}
      </Button>
      {state.error && <span role="alert" className="text-sm text-signal-silence">{state.error}</span>}
    </form>
  )
}

export function MeetingAdd({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(ajouterMeeting, {})
  const ref = useResetOnOk(state)
  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      <Input name="date" type="date" required className="w-40" />
      <Input name="notes" placeholder="Sujet de la réunion" className="w-56" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? '…' : 'Planifier la réunion'}
      </Button>
      {state.error && <span role="alert" className="text-sm text-signal-silence">{state.error}</span>}
    </form>
  )
}
