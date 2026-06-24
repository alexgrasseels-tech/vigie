'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/utils/auth/dal'
import { createClient } from '@/utils/supabase/server'

// Story 2.8 — quick-add global. Une seule Server Action route vers la création
// de l'entité (Client/Projet/Échéance/Attente) en saisie minimale (AD-1, RLS AD-2).
export type QuickAddState = { error?: string; ok?: number }

export async function quickAdd(_prev: QuickAddState, formData: FormData): Promise<QuickAddState> {
  await requireUser()
  const type = String(formData.get('type') ?? '')
  const supabase = await createClient()

  if (type === 'client') {
    const nom = String(formData.get('nom') ?? '').trim()
    const cadence = Number(String(formData.get('cadence_x') ?? '7'))
    if (!nom) return { error: 'Le nom est requis.' }
    if (!Number.isInteger(cadence) || cadence < 1) return { error: 'Cadence : entier ≥ 1.' }
    const { error } = await supabase.from('clients').insert({ nom, cadence_x: cadence })
    if (error) return { error: "Erreur à l'enregistrement." }
    revalidatePath('/clients')
    revalidatePath('/')
    return { ok: Date.now() }
  }

  if (type === 'projet') {
    const nom = String(formData.get('nom') ?? '').trim()
    const client_id = String(formData.get('client_id') ?? '').trim()
    if (!nom) return { error: 'Le nom est requis.' }
    if (!client_id) return { error: 'Le client est requis.' }
    const { error } = await supabase.from('projects').insert({ nom, client_id })
    if (error) return { error: "Erreur à l'enregistrement." }
    revalidatePath('/projets')
    revalidatePath('/')
    return { ok: Date.now() }
  }

  if (type === 'echeance') {
    const project_id = String(formData.get('project_id') ?? '').trim()
    const date = String(formData.get('date') ?? '').trim()
    const libelle = String(formData.get('libelle') ?? '').trim() || null
    if (!project_id) return { error: 'Le projet est requis.' }
    if (!date) return { error: 'La date est requise.' }
    const { error } = await supabase.from('deadlines').insert({ project_id, date, libelle })
    if (error) return { error: "Erreur à l'enregistrement." }
    revalidatePath(`/projets/${project_id}`)
    revalidatePath('/')
    return { ok: Date.now() }
  }

  if (type === 'attente') {
    const project_id = String(formData.get('project_id') ?? '').trim()
    const libelle = String(formData.get('libelle') ?? '').trim()
    if (!project_id) return { error: 'Le projet est requis.' }
    if (!libelle) return { error: 'Le libellé est requis.' }
    const { error } = await supabase.from('client_waits').insert({ project_id, libelle })
    if (error) return { error: "Erreur à l'enregistrement." }
    revalidatePath(`/projets/${project_id}`)
    revalidatePath('/')
    return { ok: Date.now() }
  }

  return { error: 'Type inconnu.' }
}

// Story 3.5 / 3.6 — actions rapides du cockpit. Appelées par le wrapper client
// (useOptimistic) avec le ref_id (uuid) de la ligne plate. RPC pour le multi-tables (AD-6).
export async function cockpitJaiContacte(projectId: string): Promise<void> {
  await requireUser()
  const supabase = await createClient()
  await supabase.rpc('mark_contacted', { p_project_id: projectId })
  revalidatePath('/')
}

export async function cockpitRelance(waitId: string): Promise<void> {
  await requireUser()
  const supabase = await createClient()
  await supabase.rpc('relancer_attente', { p_wait_id: waitId })
  revalidatePath('/')
}

export async function cockpitMarquerEcheance(deadlineId: string): Promise<void> {
  await requireUser()
  const supabase = await createClient()
  await supabase.from('deadlines').update({ statut: 'faite' }).eq('id', deadlineId)
  revalidatePath('/')
}

export async function cockpitMarquerPhase(projectId: string, phaseActionId: string): Promise<void> {
  await requireUser()
  const supabase = await createClient()
  await supabase
    .from('project_phase_action_status')
    .upsert({ project_id: projectId, phase_action_id: phaseActionId }, { onConflict: 'project_id,phase_action_id', ignoreDuplicates: true })
  revalidatePath('/')
}

// B3 — réunion interne marquée faite (signal 'reunion')
export async function cockpitMarquerReunion(meetingId: string): Promise<void> {
  await requireUser()
  const supabase = await createClient()
  await supabase.from('meetings').update({ done: true }).eq('id', meetingId)
  revalidatePath('/')
}

// B3 — snooze de relance : suppire le signal silence jusqu'à today+days
export async function cockpitSnooze(projectId: string, days: number): Promise<void> {
  await requireUser()
  const supabase = await createClient()
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
  await supabase.from('projects').update({ relance_snooze_until: until }).eq('id', projectId)
  revalidatePath('/')
}
