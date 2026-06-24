'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/utils/auth/dal'
import { createClient } from '@/utils/supabase/server'

export type FormState = { error?: string; ok?: number }

function revalidate(id: string) {
  revalidatePath(`/projets/${id}`)
  revalidatePath('/')
}

function parseMontant(raw: string): number | null | undefined {
  const s = raw.trim()
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return undefined // invalide
  return n
}

// Story 2.3 — budget (KPI informatif, jamais un signal)
export async function editerBudget(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const budget = parseMontant(String(formData.get('budget') ?? ''))
  const budget_consomme = parseMontant(String(formData.get('budget_consomme') ?? ''))
  const etc = parseMontant(String(formData.get('etc') ?? ''))
  if (budget === undefined || budget_consomme === undefined || etc === undefined) {
    return { error: 'Montants invalides (nombres positifs ou vides).' }
  }
  const supabase = await createClient()
  const { error } = await supabase.from('projects').update({ budget, budget_consomme, etc }).eq('id', id)
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidate(id)
  return { ok: Date.now() }
}

// Story 2.4 — échéances
export async function ajouterEcheance(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const libelle = String(formData.get('libelle') ?? '').trim() || null
  const date = String(formData.get('date') ?? '').trim()
  if (!date) return { error: 'La date est requise.' }
  const supabase = await createClient()
  const { error } = await supabase.from('deadlines').insert({ project_id, libelle, date })
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidate(project_id)
  return { ok: Date.now() }
}

export async function marquerEcheanceFaite(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.from('deadlines').update({ statut: 'faite' }).eq('id', id)
  revalidate(project_id)
}

export async function supprimerEcheance(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.from('deadlines').delete().eq('id', id)
  revalidate(project_id)
}

// Story 2.5 — attentes client
export async function ouvrirAttente(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const libelle = String(formData.get('libelle') ?? '').trim()
  if (!libelle) return { error: 'Le libellé est requis.' }
  const supabase = await createClient()
  const { error } = await supabase.from('client_waits').insert({ project_id, libelle })
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidate(project_id)
  return { ok: Date.now() }
}

// « Relancé » — RPC transactionnel (AD-6)
export async function relancerAttente(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.rpc('relancer_attente', { p_wait_id: id })
  revalidate(project_id)
}

export async function resoudreAttente(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const statut = String(formData.get('statut') ?? '')
  if (statut !== 'resolue' && statut !== 'abandonnee') return
  const supabase = await createClient()
  await supabase.from('client_waits').update({ statut }).eq('id', id)
  revalidate(project_id)
}

// Story 2.6 — « J'ai contacté » — RPC transactionnel (AD-6), reset niveau PROJET
export async function jaiContacte(formData: FormData): Promise<void> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.rpc('mark_contacted', { p_project_id: project_id })
  revalidate(project_id)
}

// Story 2.7 — action de phase : présence d'une ligne = fait (absence = non fait, AD-7)
export async function marquerActionPhaseFaite(formData: FormData): Promise<void> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const phase_action_id = String(formData.get('phase_action_id') ?? '')
  const supabase = await createClient()
  await supabase
    .from('project_phase_action_status')
    .upsert({ project_id, phase_action_id }, { onConflict: 'project_id,phase_action_id', ignoreDuplicates: true })
  revalidate(project_id)
}

export async function demarquerActionPhase(formData: FormData): Promise<void> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const phase_action_id = String(formData.get('phase_action_id') ?? '')
  const supabase = await createClient()
  await supabase
    .from('project_phase_action_status')
    .delete()
    .eq('project_id', project_id)
    .eq('phase_action_id', phase_action_id)
  revalidate(project_id)
}

// B4 — Timeline de contacts (historique typé). N'altère PAS la cadence
// (seul « J'ai contacté » / mark_contacted remet le compteur à zéro).
const CONTACT_TYPES = ['relance', 'email', 'appel', 'reunion', 'copil', 'livraison', 'decision', 'blocage', 'note']

export async function ajouterContactLog(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const typeRaw = String(formData.get('type') ?? 'note')
  const type = CONTACT_TYPES.includes(typeRaw) ? typeRaw : 'note'
  const note = String(formData.get('note') ?? '').trim()
  const date = String(formData.get('date') ?? '').trim()
  if (!note) return { error: 'La note est requise.' }
  const supabase = await createClient()
  const payload: Record<string, unknown> = { project_id, type, note }
  if (date) payload.contacted_on = date
  const { error } = await supabase.from('contacts').insert(payload)
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidate(project_id)
  return { ok: Date.now() }
}

export async function supprimerContactLog(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.from('contacts').delete().eq('id', id)
  revalidate(project_id)
}

// B4 — COPIL datés
export async function ajouterCopil(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const date = String(formData.get('date') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim() || null
  if (!date) return { error: 'La date est requise.' }
  const supabase = await createClient()
  const { error } = await supabase.from('copils').insert({ project_id, date, notes })
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidate(project_id)
  return { ok: Date.now() }
}

export async function supprimerCopil(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.from('copils').delete().eq('id', id)
  revalidate(project_id)
}

// B4 — Réunions internes
export async function ajouterMeeting(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const project_id = String(formData.get('project_id') ?? '')
  const date = String(formData.get('date') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim() || null
  if (!date) return { error: 'La date est requise.' }
  const supabase = await createClient()
  const { error } = await supabase.from('meetings').insert({ project_id, date, notes })
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidate(project_id)
  return { ok: Date.now() }
}

export async function toggleMeeting(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const done = String(formData.get('done') ?? '') === 'true'
  const supabase = await createClient()
  await supabase.from('meetings').update({ done }).eq('id', id)
  revalidate(project_id)
}

export async function supprimerMeeting(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const supabase = await createClient()
  await supabase.from('meetings').delete().eq('id', id)
  revalidate(project_id)
}
