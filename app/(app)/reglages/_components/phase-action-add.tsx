'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ajouterActionPhase, type FormState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PHASES: [string, string][] = [
  ['cadrage', 'Cadrage'],
  ['conception', 'Conception'],
  ['developpement', 'Développement'],
  ['tests', 'Tests'],
  ['livraison', 'Livraison'],
  ['cloture', 'Clôture'],
]

// Story 2.7 — ajout d'une action attendue à une phase (shadcn).
export function PhaseActionAdd() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(ajouterActionPhase, {})
  const [phase, setPhase] = useState('tests')
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state.ok])

  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      <input type="hidden" name="phase" value={phase} />
      <div className="space-y-1.5">
        <Label>Phase</Label>
        <Select value={phase} onValueChange={(v) => setPhase(v ?? 'tests')}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHASES.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="libelle">Action attendue</Label>
        <Input id="libelle" name="libelle" required placeholder="ex. organiser les tests" className="w-64" />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? '…' : 'Ajouter'}
      </Button>
      {state.error && (
        <span role="alert" className="text-sm text-signal-silence">
          {state.error}
        </span>
      )}
    </form>
  )
}
