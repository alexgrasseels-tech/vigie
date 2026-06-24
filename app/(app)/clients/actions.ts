'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/utils/auth/dal'
import { createClient } from '@/utils/supabase/server'

// Story 2.1 — toutes les écritures passent par ici (Server Actions, AD-1),
// requireUser() en tête (AD-10), RLS filtre via user_id default auth.uid() (AD-2).
export type FormState = { error?: string }

function parseClient(formData: FormData): { nom: string; cadence_x: number; email: string | null; notes: string | null } | string {
  const nom = String(formData.get('nom') ?? '').trim()
  const cadence = Number(String(formData.get('cadence_x') ?? '').trim())
  const email = String(formData.get('email') ?? '').trim() || null
  const notes = String(formData.get('notes') ?? '').trim() || null
  if (!nom) return 'Le nom est requis.'
  if (!Number.isInteger(cadence) || cadence < 1) return 'La cadence doit être un entier ≥ 1.'
  return { nom, cadence_x: cadence, email, notes }
}

export async function creerClient(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const parsed = parseClient(formData)
  if (typeof parsed === 'string') return { error: parsed }
  const supabase = await createClient()
  const { error } = await supabase.from('clients').insert(parsed)
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidatePath('/clients')
  revalidatePath('/')
  redirect('/clients')
}

export async function editerClient(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const parsed = parseClient(formData)
  if (typeof parsed === 'string') return { error: parsed }
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update(parsed).eq('id', id)
  if (error) return { error: "Erreur à l'enregistrement." }
  revalidatePath(`/clients/${id}`)
  revalidatePath('/clients')
  redirect(`/clients/${id}`)
}

export async function archiverClient(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()
  await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/clients')
  revalidatePath('/')
  redirect('/clients')
}
