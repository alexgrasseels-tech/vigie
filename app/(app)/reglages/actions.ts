'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/utils/auth/dal'
import { createClient } from '@/utils/supabase/server'

// Story 2.7 — édition du modèle d'actions attendues par phase (template, AD-7).
export type FormState = { error?: string; ok?: number }

const PHASES = ['cadrage', 'conception', 'developpement', 'tests', 'livraison', 'cloture']

export async function ajouterActionPhase(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const phase = String(formData.get('phase') ?? '')
  const libelle = String(formData.get('libelle') ?? '').trim()
  if (!PHASES.includes(phase)) return { error: 'Phase invalide.' }
  if (!libelle) return { error: 'Le libellé est requis.' }
  const supabase = await createClient()
  const { error } = await supabase.from('phase_actions').insert({ phase, libelle })
  if (error) return { error: 'Action déjà présente pour cette phase.' }
  revalidatePath('/reglages')
  revalidatePath('/')
  return { ok: Date.now() }
}

export async function supprimerActionPhase(formData: FormData): Promise<void> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()
  await supabase.from('phase_actions').delete().eq('id', id)
  revalidatePath('/reglages')
  revalidatePath('/')
}
