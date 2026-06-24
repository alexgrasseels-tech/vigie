'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/utils/auth/dal'
import { createClient } from '@/utils/supabase/server'
import { PHASES, HEALTHS } from './constants'

// Story 2.2 — Server Actions des projets (AD-1, RLS via AD-2).
export type FormState = { error?: string }

function clampRisk(v: FormDataEntryValue | null): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 3 ? Math.floor(n) : 1
}

// Champs descriptifs riches (réf. Project Cockpit) communs à create/edit.
function parseProjectFields(fd: FormData) {
  const sante = String(fd.get('sante') ?? '')
  return {
    type: String(fd.get('type') ?? '').trim() || null,
    contact_nom: String(fd.get('contact_nom') ?? '').trim() || null,
    contact_email: String(fd.get('contact_email') ?? '').trim() || null,
    sante: (HEALTHS as readonly string[]).includes(sante) ? sante : 'on_track',
    risk_planning: clampRisk(fd.get('risk_planning')),
    risk_budget: clampRisk(fd.get('risk_budget')),
    risk_ressources: clampRisk(fd.get('risk_ressources')),
    release_date: String(fd.get('release_date') ?? '').trim() || null,
    gantt_link: String(fd.get('gantt_link') ?? '').trim() || null,
    notes: String(fd.get('notes') ?? '').trim() || null,
  }
}

export async function creerProjet(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const nom = String(formData.get('nom') ?? '').trim()
  const client_id = String(formData.get('client_id') ?? '').trim()
  if (!nom) return { error: 'Le nom est requis.' }
  if (!client_id) return { error: 'Le client est requis.' }
  const supabase = await createClient()
  const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true })
  const code = `PR-${String((count ?? 0) + 1).padStart(3, '0')}`
  const { error } = await supabase.from('projects').insert({ nom, client_id, code, ...parseProjectFields(formData) })
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidatePath('/projets')
  revalidatePath('/')
  redirect('/projets')
}

export async function editerProjet(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const nom = String(formData.get('nom') ?? '').trim()
  const client_id = String(formData.get('client_id') ?? '').trim()
  if (!nom) return { error: 'Le nom est requis.' }
  if (!client_id) return { error: 'Le client est requis.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ nom, client_id, ...parseProjectFields(formData) })
    .eq('id', id)
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidatePath(`/projets/${id}`)
  revalidatePath('/projets')
  revalidatePath('/')
  redirect(`/projets/${id}`)
}

export async function changerPhase(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const phase = String(formData.get('phase') ?? '')
  if (!(PHASES as readonly string[]).includes(phase)) return
  const supabase = await createClient()
  await supabase.from('projects').update({ phase }).eq('id', id)
  revalidatePath(`/projets/${id}`)
  revalidatePath('/')
}

const STATUTS = ['actif', 'en_pause', 'termine']

// Transition de statut générique (Clore / Mettre en pause / Réactiver / Rouvrir).
// Reste sur la fiche (revalidate, pas de redirect) pour voir le nouvel état.
export async function changerStatut(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const statut = String(formData.get('statut') ?? '')
  if (!STATUTS.includes(statut)) return
  const supabase = await createClient()
  await supabase.from('projects').update({ statut }).eq('id', id)
  revalidatePath(`/projets/${id}`)
  revalidatePath('/projets')
  revalidatePath('/')
}
