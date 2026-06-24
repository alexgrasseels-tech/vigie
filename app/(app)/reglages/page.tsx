import { createClient } from '@/utils/supabase/server'
import { supprimerActionPhase } from './actions'
import { PhaseActionAdd } from './_components/phase-action-add'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PHASE_ORDER = ['cadrage', 'conception', 'developpement', 'tests', 'livraison', 'cloture'] as const
const PHASE_LABEL: Record<string, string> = {
  cadrage: 'Cadrage',
  conception: 'Conception',
  developpement: 'Développement',
  tests: 'Tests',
  livraison: 'Livraison',
  cloture: 'Clôture',
}

// Story 2.7 — Réglages : modèle d'actions attendues par phase (éditable, shadcn).
export default async function ReglagesPage() {
  const supabase = await createClient()
  const { data: actions } = await supabase
    .from('phase_actions')
    .select('id, phase, libelle, position')
    .order('phase')
    .order('position')

  const byPhase = new Map<string, { id: string; libelle: string }[]>()
  for (const ph of PHASE_ORDER) byPhase.set(ph, [])
  for (const a of actions ?? []) {
    byPhase.get(a.phase)?.push({ id: a.id, libelle: a.libelle })
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold">Réglages</h1>
        <p className="text-sm text-muted">
          Les actions attendues par phase. Une action non faite sur la phase courante d&apos;un projet
          remonte dans le cockpit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ajouter une action attendue</CardTitle>
        </CardHeader>
        <CardContent>
          <PhaseActionAdd />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {PHASE_ORDER.map((ph) => {
          const items = byPhase.get(ph) ?? []
          return (
            <Card key={ph} className="overflow-hidden p-0">
              <div className="border-b border-line px-5 py-3 text-sm font-semibold">{PHASE_LABEL[ph]}</div>
              {items.length > 0 ? (
                <ul className="divide-y divide-line">
                  {items.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-5 py-2.5">
                      <span className="text-sm">{a.libelle}</span>
                      <form action={supprimerActionPhase}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Retirer
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-3 text-sm text-muted">Aucune action attendue pour cette phase.</p>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
