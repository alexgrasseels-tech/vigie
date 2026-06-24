'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { quickAdd, type QuickAddState } from '../actions'

type Item = { id: string; nom: string }
const inputCls =
  'min-h-9 w-full rounded-control border border-line bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30'

// Story 2.8 — quick-add global (⌘/Ctrl-K). Saisie réduite au strict requis pour
// 4 entités. Aucune écriture côté client : tout passe par la Server Action (AD-1).
export function QuickAddBar({ clients, projects }: { clients: Item[]; projects: Item[] }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('client')
  const [state, formAction, pending] = useActionState<QuickAddState, FormData>(quickAdd, {})
  const formRef = useRef<HTMLFormElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea')?.focus()
  }, [open, type])

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme le panneau après un ajout réussi (résultat async de useActionState)
      setOpen(false)
    }
  }, [state.ok])

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="min-h-9 rounded-control border border-line bg-surface-alt px-3 py-2 text-sm text-muted hover:bg-surface"
      >
        + Ajout rapide <span className="ml-1 text-xs opacity-70">⌘/Ctrl-K</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 z-20 mt-2 w-[min(92vw,420px)] rounded-panel border border-line bg-surface p-4 shadow-lg"
        >
          <form ref={formRef} action={formAction} className="space-y-3" noValidate>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Quoi ?</span>
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputCls}
              >
                <option value="client">Client</option>
                <option value="projet">Projet</option>
                <option value="echeance">Échéance</option>
                <option value="attente">Attente client</option>
              </select>
            </label>

            {type === 'client' && (
              <div className="grid grid-cols-[1fr_88px] gap-2">
                <input name="nom" placeholder="Nom du client" required className={inputCls} />
                <input name="cadence_x" type="number" min={1} step={1} defaultValue={7} required className={inputCls} />
              </div>
            )}

            {type === 'projet' &&
              (clients.length === 0 ? (
                <p className="text-sm text-muted">Crée d&apos;abord un client.</p>
              ) : (
                <>
                  <input name="nom" placeholder="Nom du projet" required className={inputCls} />
                  <select name="client_id" required defaultValue="" className={inputCls}>
                    <option value="" disabled>
                      Client…
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </>
              ))}

            {(type === 'echeance' || type === 'attente') &&
              (projects.length === 0 ? (
                <p className="text-sm text-muted">Crée d&apos;abord un projet.</p>
              ) : (
                <>
                  <select name="project_id" required defaultValue="" className={inputCls}>
                    <option value="" disabled>
                      Projet…
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                  {type === 'echeance' ? (
                    <input name="date" type="date" required className={inputCls} />
                  ) : (
                    <input name="libelle" placeholder="Le client doit…" required className={inputCls} />
                  )}
                </>
              ))}

            {state.error && (
              <p role="alert" className="text-sm text-signal-silence">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-9 rounded-control border border-line px-3 py-2 text-sm hover:bg-surface-alt"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="min-h-9 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast disabled:opacity-60"
              >
                {pending ? '…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
