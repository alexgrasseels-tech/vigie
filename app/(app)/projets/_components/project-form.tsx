'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Action = (prev: FormState, formData: FormData) => Promise<FormState>
type Item = { id: string; nom: string }

const TYPES = ['PowerApps', 'D365', 'Web/Custo', 'Intranet', 'COF', 'AI', 'Presales']
const SANTE: [string, string][] = [
  ['on_track', '🟢 On track'],
  ['a_risque', '🟡 À risque'],
  ['en_danger', '🔴 En danger'],
]
const RISKS: [string, string][] = [
  ['risk_planning', '📅 Planning'],
  ['risk_budget', '💰 Budget'],
  ['risk_ressources', '👥 Ressources'],
]

export type ProjectDefaults = {
  id?: string
  nom?: string
  client_id?: string
  type?: string | null
  contact_nom?: string | null
  contact_email?: string | null
  sante?: string | null
  risk_planning?: number
  risk_budget?: number
  risk_ressources?: number
  release_date?: string | null
  gantt_link?: string | null
  notes?: string | null
}

function RiskPicker({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  const cls = (v: number) =>
    v === 1 ? 'bg-ok text-white' : v === 2 ? 'bg-signal-echeance text-white' : 'bg-signal-silence text-white'
  return (
    <div className="flex gap-1">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`h-9 flex-1 rounded-md border text-sm font-semibold transition ${
            value === v ? cls(v) + ' border-transparent' : 'border-line text-muted hover:bg-surface-alt'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function ProjectForm({
  action,
  submitLabel,
  clients,
  defaults,
}: {
  action: Action
  submitLabel: string
  clients: Item[]
  defaults?: ProjectDefaults
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {})
  const [clientId, setClientId] = useState(defaults?.client_id ?? '')
  const [type, setType] = useState(defaults?.type ?? '')
  const [sante, setSante] = useState(defaults?.sante ?? 'on_track')
  const [rp, setRp] = useState(defaults?.risk_planning ?? 1)
  const [rb, setRb] = useState(defaults?.risk_budget ?? 1)
  const [rr, setRr] = useState(defaults?.risk_ressources ?? 1)

  if (clients.length === 0) {
    return <p className="text-sm text-muted">Crée d&apos;abord un client pour lui rattacher un projet.</p>
  }

  const score = rp + rb + rr
  const scoreColor = score <= 4 ? 'text-ok' : score <= 6 ? 'text-signal-echeance' : 'text-signal-silence'

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="sante" value={sante} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom du projet</Label>
          <Input id="nom" name="nom" defaultValue={defaults?.nom ?? ''} required />
        </div>
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={(v) => setClientId(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_nom">Contact</Label>
          <Input id="contact_nom" name="contact_nom" defaultValue={defaults?.contact_nom ?? ''} placeholder="Nom" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_email">E-mail contact</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={defaults?.contact_email ?? ''} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Santé</Label>
          <Select value={sante} onValueChange={(v) => setSante(v ?? '')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SANTE.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-end">
          <span className="text-sm text-muted">
            Score risque : <b className={scoreColor}>{score}/9</b>
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {RISKS.map(([key, label]) => {
          const val = key === 'risk_planning' ? rp : key === 'risk_budget' ? rb : rr
          const setter = key === 'risk_planning' ? setRp : key === 'risk_budget' ? setRb : setRr
          return (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <RiskPicker name={key} value={val} onChange={setter} />
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="release_date">Mise en prod (MeP)</Label>
          <Input id="release_date" name="release_date" type="date" defaultValue={defaults?.release_date ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gantt_link">Lien Gantt</Label>
          <Input id="gantt_link" name="gantt_link" defaultValue={defaults?.gantt_link ?? ''} placeholder="https://…" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
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
