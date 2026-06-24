'use client'

// Story 1.7 — région ARIA live prête pour les toasts optimistes des epics
// suivants (« Fait — annuler »). Respecte prefers-reduced-motion (les
// transitions seront posées en Epic 3).
export function Toaster() {
  return <div id="vigie-toaster" aria-live="polite" aria-atomic="true" className="sr-only" />
}
