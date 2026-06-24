---
stepsCompleted: [step-01, step-02, step-03]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-mon-app-2026-06-23/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mon-app-2026-06-23/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mon-app-2026-06-23/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-mon-app-2026-06-23/ARCHITECTURE-SPINE.md
---

# Vigie - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Vigie, decomposing the requirements from the PRD, the UX design contract (DESIGN.md + EXPERIENCE.md), and the Architecture spine (11 ADs) into implementable stories. Stories are anchored to the architecture ADs and must respect the spine invariants.

## Requirements Inventory

### Functional Requirements

- **FR-1** : Gérer les Clients — créer / éditer / archiver. Champs : nom (requis), cadence X jours (requis, défaut 7, ≥1), e-mail (optionnel), notes. Archiver masque sans supprimer.
- **FR-2** : Gérer les Projets — créer / éditer / clore. Champs : nom (requis), Client (requis), Phase courante (défaut cadrage), statut (actif/en pause/terminé), date de dernier contact, budget (optionnel), budget consommé (optionnel), notes. Projet terminé/en pause ne génère aucun signal. % budget consommé affiché (informatif, hors cockpit).
- **FR-3** : Gérer les Échéances — 0..N par projet. Champs : libellé, date (requise), statut (à venir / faite). Marquer faite la retire des signaux.
- **FR-4** : Gérer les Attentes client — ouvrir sur un projet. Champs : type/libellé (liste libre + suggestions), date d'ouverture, statut (en attente / relancée / résolue / abandonnée). « Relancé » repositionne la date de référence à aujourd'hui sans fermer.
- **FR-5** : Action « J'ai contacté » — en un geste depuis projet/client ; met date de dernier contact = aujourd'hui au niveau Projet (reset compteur cadence) ; journalisée pour audit.
- **FR-6** : Alertes d'échéance — paliers J-3, J-1, jour J puis dépassée ; afficher le dernier palier franchi. Fenêtres non configurables en v1.
- **FR-7** : Signal « Silence trop long » — `today_local − date_dernier_contact > cadence X` ; retombe immédiatement après « J'ai contacté » ; exclut en pause/terminé.
- **FR-8** : Modèle de phases & actions attendues — ordre fixe (cadrage→conception→développement→tests→livraison→clôture) + liste d'actions attendues par phase, éditable.
- **FR-9** : Signal « Action de phase oubliée » — toute action attendue de la phase courante non faite remonte immédiatement (sans délai de grâce).
- **FR-10** : Cockpit — agrège tout projet/client présentant ≥1 des 4 signaux, distinguables ; projet multi-signaux affiché une fois (groupés) ; tri par urgence.
- **FR-11** : Actions rapides depuis le cockpit — « J'ai contacté », « Relancé », « Marquer fait », ouvrir le projet ; l'élément résolu disparaît immédiatement ; état « cockpit vidé » atteignable.
- **FR-12** : Digest e-mail quotidien — recompute l'état + envoie à 08:00 (fuseau du compte) ; reflète le cockpit ; pas d'envoi si vide ; échec journalisé sans bloquer.

### NonFunctional Requirements

- **NFR-1 (Friction)** : tenir ~25 projets à jour doit rester rapide (saisie minimale) — risque n°1 du produit. Le quick-add et des champs requis minimaux sont obligatoires.
- **NFR-2 (Sécurité/Isolation)** : RLS `auth.uid()=user_id` sur toute table ; secrets (`sb_secret_*`, RESEND_API_KEY) jamais côté client ; signup public désactivé (1 seul compte).
- **NFR-3 (Cohérence cockpit↔digest)** : écran et e-mail reflètent strictement le même état (même vue de signaux, même tri).
- **NFR-4 (Réactivité)** : cockpit perçu instantané (optimistic UI, squelettes, pas de spinner plein écran) ; actions rapides en un clic, réversibles.
- **NFR-5 (Accessibilité)** : WCAG AA ; la couleur n'est jamais seule porteuse de sens (libellé texte sur chaque badge) ; clavier d'abord, focus visible, cibles ≥36px, `prefers-reduced-motion`.
- **NFR-6 (Correction temporelle)** : « aujourd'hui » calculé dans le fuseau du compte (`today_local`), pas en UTC ; seuils stricts.
- **NFR-7 (Fiabilité du digest)** : envoi idempotent (pas de double-envoi) ; délivrabilité (SPF/DKIM/DMARC du domaine Resend) ; pas de mail vide.
- **NFR-8 (Maintenabilité)** : une seule définition par concept (vue de signaux unique, un schema canonique, types TS générés) ; aucune logique de signal dupliquée en TypeScript.

### Additional Requirements

*(De l'Architecture — spine, 11 ADs. Pas de starter template : brownfield, scaffold Next.js 16 + Supabase existant à faire évoluer.)*

- **AR-1** : Brownfield — ratifier les conventions du scaffold (Server Actions, clients @supabase/ssr) ; **remplacer la démo `todos`** par le modèle Vigie ; un seul schema canonique `supabase/schema.vigie.sql` (AD-11).
- **AR-2** : Modèle de données — 8 tables (profiles, clients, projects, deadlines, client_waits, phase_actions, project_phase_action_status, contacts), uuid, RLS 4 policies par table (AD-2).
- **AR-3** : Vue de signaux unique `public.v_active_signals` (`security_invoker`), lignes plates, `ref_id` uuid, `urgency_rank`, CTE `live` (exclut en_pause/terminé) ; consommée via `lib/signals.ts` (AD-3, AD-4).
- **AR-4** : Sémantique du temps `today_local = (now() AT TIME ZONE profiles.timezone)::date` partout (AD-5).
- **AR-5** : RPC Postgres transactionnels `mark_contacted`, `relancer_attente` ; mutations via Server Actions uniquement (AD-1, AD-6).
- **AR-6** : Provisioning — trigger `on auth.users` → `handle_new_user()` crée `profiles` + seed `phase_actions` (AD-7).
- **AR-7** : Digest — migration pg_cron `0 * * * *` + pg_net → Edge Function `daily-digest` (Deno) → Resend en fetch brut ; idempotence par claim ; secrets en Edge/Vault ; `--no-verify-jwt` (AD-8, AD-9).
- **AR-8** : Auth — `proxy.ts` (pas `middleware.ts`) refresh-only + DAL `requireUser()` re-vérifié dans chaque action ; signup désactivé (AD-10).
- **AR-9** : Outillage — types `supabase gen types typescript` commités ; extensions DB `pg_cron`, `pg_net`, `supabase_vault` ; déploiement Vercel (app) + Supabase (DB/cron/Edge) ; `cacheComponents` OFF (AD-11, AD-1).

### UX Design Requirements

- **UX-DR1** : Système de tokens — couleurs sémantiques clair/sombre, **4 couleurs de signal verrouillées** (rouge silence / ambre échéance / bleu attente / violet phase), indigo réservé au CTA, vert = résolu ; typo système, rayons (8/10/12/plein), spacing base 4px. Implémenté en Tailwind 4.
- **UX-DR2** : Mode sombre **auto** (`prefers-color-scheme`), même grammaire.
- **UX-DR3** : Composant **signalRow** — grille `[badge | projet·client + méta | action]`, hover, méta met en gras le chiffre critique ; projet multi-signaux = badges groupés.
- **UX-DR4** : Composant **kpiCard** — compteur par type de signal, cliquable = filtre le panneau.
- **UX-DR5** : **quickAddBar** globale — input + `⌘/Ctrl-K`, détection d'intention (Client/Projet/Échéance/Attente), saisie réduite au requis (arme anti-friction).
- **UX-DR6** : Actions rapides **optimistic** — « J'ai contacté » (primary), « Relancé », « Marquer fait » ; retrait optimiste immédiat + toast « Fait — annuler » ; réapparition si échec serveur.
- **UX-DR7** : **Fiche budget** (fiche projet) — budget / consommé / % calculé, barre de progression neutre virant à l'ambre au seuil indicatif 90 % (informatif, pas un signal).
- **UX-DR8** : États — « cockpit vidé ✓ » valorisé ; chargement par squelettes ; premier usage (0 projet) onboarding minimal ; erreur inline non bloquante ; donnée périmée signalée doucement.
- **UX-DR9** : **Accessibility floor** — WCAG AA ; couleur jamais seule (libellé texte) ; tout actionnable au clavier, focus visible, ordre de tab logique, cibles ≥36px, ARIA sur actions de ligne, live region toasts, `prefers-reduced-motion`.
- **UX-DR10** : **Voice & microcopy** — tutoiement, direct, **non culpabilisant** ; boutons = verbes 1re personne/impératif court ; méta = fait + chiffre.
- **UX-DR11** : **Template digest** mail-safe — tables + inline-CSS, une section par type de signal triée par urgence, badge = pastille + libellé texte, liens profonds absolus, budget exclu.
- **UX-DR12** : **IA & responsive** — 5 surfaces (Cockpit · Projets · Fiche Projet · Clients · Réglages) ; desktop d'abord ; sous ~720px grille empilée, KPIs 2×2, actions pleine largeur.

### FR Coverage Map

- **FR-1** (Clients) → Epic 2
- **FR-2** (Projets + budget) → Epic 2
- **FR-3** (Échéances) → Epic 2
- **FR-4** (Attentes client + « Relancé ») → Epic 2
- **FR-5** (« J'ai contacté » + log) → Epic 2
- **FR-6** (Alertes d'échéance, paliers) → Epic 3
- **FR-7** (Silence trop long) → Epic 3
- **FR-8** (Modèle de phases & actions attendues) → Epic 2 (config) ; consommé en Epic 3 (signal)
- **FR-9** (Action de phase oubliée) → Epic 3
- **FR-10** (Cockpit, agrégation des 4 signaux) → Epic 3
- **FR-11** (Actions rapides du cockpit) → Epic 3
- **FR-12** (Digest e-mail quotidien) → Epic 4

*NFR/AR/UX-DR transverses :* socle sécurité/accès/design-system → **Epic 1** ; isolation RLS + secrets (NFR-2, AR-2/8) → Epic 1 puis respectés partout ; cohérence cockpit↔digest + today_local (NFR-3/6, AR-3/4) → Epic 3 ; fiabilité/délivrabilité digest (NFR-7, AR-7) → Epic 4 ; accessibilité/voice (NFR-5, UX-DR9/10) → transverse, plancher posé en Epic 1.

## Epic List

### Epic 1 : Accès sécurisé & socle du compte
Annec peut se connecter à **son** espace Vigie privé et arriver sur une coquille d'application vide mais fonctionnelle (navigation, quick-add, thème clair/sombre). Pose les fondations invisibles mais indispensables : auth mono-utilisateur (signup désactivé), refresh de session, isolation RLS, schema canonique remplaçant la démo `todos`, provisioning du compte (profiles), et le design-system (tokens + couleurs de signal + plancher d'accessibilité).
**FRs covered :** aucun FR direct (epic d'habilitation) — **couvre** NFR-2, NFR-5, NFR-8, AR-1, AR-2, AR-6 (profiles), AR-8, AR-9, UX-DR1, UX-DR2, UX-DR9. **Gouverné par** AD-1, AD-2, AD-10, AD-11.
**Valeur livrée :** « J'accède à mon Vigie privé, personne d'autre n'y entre. »

### Epic 2 : Saisie & suivi du portefeuille
Annec peut **encoder et tenir à jour** son portefeuille : créer/éditer/archiver des clients (avec cadence X), créer/éditer/clore des projets (phase, statut, budget, notes), leur attacher des échéances et des attentes client, marquer « J'ai contacté » et « Relancé », et configurer le modèle de phases & actions attendues. Saisie à friction minimale via le quick-add global.
**FRs covered :** FR-1, FR-2, FR-3, FR-4, FR-5, FR-8 (config). **Couvre** NFR-1, AR-5, AR-6 (seed phase_actions), UX-DR5, UX-DR7, UX-DR8, UX-DR10. **Gouverné par** AD-1, AD-2, AD-6, AD-7.
**Valeur livrée :** « Mes ~25 projets clients sont dans Vigie et restent à jour sans effort. »

### Epic 3 : Cockpit de triage & moteurs de signaux
Annec ouvre Vigie le matin et voit en une liste courte et triée **tout ce qui demande une action** — les 4 signaux (silence, échéance, attente, phase oubliée) — qu'il traite en place (J'ai contacté / Relancé / Marquer fait) jusqu'à « cockpit vidé ». Repose sur la vue unique `v_active_signals` (source partagée écran/digest) et `today_local`.
**FRs covered :** FR-6, FR-7, FR-9, FR-10, FR-11 (et consomme FR-8). **Couvre** NFR-3, NFR-4, NFR-6, AR-3, AR-4, UX-DR3, UX-DR4, UX-DR6. **Gouverné par** AD-3, AD-4, AD-5, AD-6, AD-1.
**Valeur livrée :** « Chaque matin, je sais quoi faire en 2 minutes et je vide le cockpit. »

### Epic 4 : Digest e-mail quotidien
À 08:00 (fuseau du compte), Annec reçoit un e-mail récapitulant l'état du cockpit — ses relances, échéances, attentes et actions de phase du jour — sans même ouvrir l'app ; rien à signaler = pas d'e-mail. Réutilise **la même** vue de signaux que le cockpit (zéro divergence).
**FRs covered :** FR-12. **Couvre** NFR-3, NFR-7, AR-7, UX-DR11. **Gouverné par** AD-8, AD-9, AD-5, AD-3.
**Valeur livrée :** « Je connais ma journée avant même d'ouvrir Vigie. »

**Dépendances :** flux linéaire Epic 1 → 2 → 3 → 4. Chaque epic est autonome (livre une valeur complète) et n'exige **aucun** epic futur : Epic 2 fonctionne sans le cockpit (listes + fiches), Epic 3 sans le digest. Epic 3 réutilise les données d'Epic 2 ; Epic 4 réutilise la vue de signaux d'Epic 3.

---

## Epic 1: Accès sécurisé & socle du compte

Annec peut se connecter à son espace Vigie privé et arriver sur une coquille d'application fonctionnelle. Pose les fondations : auth mono-utilisateur (signup désactivé), refresh de session, isolation RLS, schema canonique remplaçant la démo `todos`, provisioning du compte, design-system et plancher d'accessibilité.

### Story 1.1: Schema canonique Vigie + profiles + provisioning + pattern RLS (remplace la démo todos)

As a Annec (unique propriétaire du compte),
I want remplacer la démo todos par un seul fichier schema canonique `supabase/schema.vigie.sql` qui crée la table `profiles` isolée par RLS et provisionne automatiquement la ligne profiles à la création du compte auth,
So that mes données reposent sur une fondation isolée, sans reste de la démo publique, et mon compte est prêt dès l'inscription.

**Ancrage :** Couvre NFR-2, NFR-8, AR-1, AR-2, AR-6 · AD-2, AD-7, AD-11 · Dépend : —

**Acceptance Criteria:**

**Given** le scaffold brownfield contient `supabase/schema.sql` (table todos avec policies anon publiques)
**When** j'applique le nouveau schema canonique `supabase/schema.vigie.sql` et consolide
**Then** la table `public.todos` et ses policies anon sont supprimées, et il ne reste qu'UN seul fichier source de vérité `supabase/schema.vigie.sql` (AD-2, AD-11)

**Given** AD-2 (vérification explicite)
**When** j'inspecte la base après application
**Then** il n'existe AUCUNE table todos ni policy de rôle anon résiduelle, l'accès anon est strictement nul (test explicite)

**Given** le schema canonique
**When** il définit `public.profiles`
**Then** profiles porte `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `timezone text not null default 'Europe/Paris'`, `digest_hour smallint not null default 8 check (between 0 and 23)`, `digest_last_sent_on date null`, `digest_email text null`, RLS activée et EXACTEMENT 4 policies `(select auth.uid()) = user_id` (rôle authenticated, aucun anon) (AD-2, prépare AD-8)

**Given** un nouvel utilisateur inséré dans `auth.users`
**When** le trigger `on auth.users insert` exécute `handle_new_user()` (security definer)
**Then** exactement une ligne profiles est créée (timezone='Europe/Paris', digest_hour=8, digest_last_sent_on=null) (AD-7)
**And** `handle_new_user()` crée SEULEMENT profiles et ne tente AUCUN seed de phase_actions (table inexistante à ce stade ; seed ajouté en story 2.7)

**Given** deux identités auth A et B (test RLS négatif)
**When** chacune lit profiles sous sa propre session
**Then** chaque session ne voit que sa ligne ; B ne SELECT/UPDATE/DELETE aucune ligne de A (NFR-2, AD-2)

### Story 1.2: Ratification des conventions Supabase (server/client) + types TS générés

As a Annec (et tout builder Vigie ultérieur),
I want ratifier les clients @supabase/ssr du scaffold et committer les types TypeScript générés depuis le schema canonique,
So that tous les accès DB partent de conventions uniques et typées, sans id typé number.

**Ancrage :** Couvre AR-1, AR-9, NFR-8, NFR-2 · AD-1, AD-2, AD-11 · Dépend : 1.1

**Acceptance Criteria:**

**Given** `utils/supabase/server.ts` et `client.ts` du scaffold
**When** je ratifie leurs rôles
**Then** server.ts (async, getAll/setAll) est l'unique chemin de lecture/écriture RLS, client.ts (sb_publishable_*) est réservé à `supabase.auth`, et aucune clé `sb_secret_*` n'apparaît côté app (AD-1, AD-2)

**Given** le schema canonique (profiles)
**When** je lance `supabase gen types typescript`
**Then** un fichier de types est committé et `profiles.user_id` est typé `string` (uuid) ; aucun id Vigie n'est typé number côté app (AD-4, AD-11)

**Given** le périmètre create-only-when-used
**When** je ratifie l'outillage ici
**Then** les extensions pg_cron/pg_net/supabase_vault NE sont PAS déclarées ici (activées en 4.6) (AD-11)

### Story 1.3: Page /login email+password (signup désactivé) + callback

As a Annec (unique compte autorisé),
I want me connecter via une page publique /login (signInWithPassword côté client), sans possibilité de créer un compte, et finaliser la session via /auth/callback,
So that j'entre dans mon espace privé et personne ne peut s'inscrire.

**Ancrage :** Couvre NFR-2, NFR-5, AR-8, UX-DR9 · AD-10, AD-1 · Dépend : 1.2

**Acceptance Criteria:**

**Given** la page /login (Client Component public)
**When** je soumets email+password valides
**Then** `supabase.auth.signInWithPassword` est appelé via `utils/supabase/client.ts` et je suis redirigé vers / — unique exception « auth » à l'invariant zéro-écriture-client (AD-1, AD-10)

**Given** le produit mono-utilisateur
**When** je cherche à m'inscrire
**Then** aucune UI de signup n'existe et le signup public Supabase est désactivé (1 user : alex.grasseels@gmail.com) (NFR-2, AD-10)

**Given** des identifiants invalides ou un email non autorisé
**When** je soumets
**Then** une erreur inline non bloquante s'affiche, aucune session créée, je reste sur /login (UX-DR8)

**Given** le flux d'échange de code
**When** Supabase appelle /auth/callback
**Then** la route GET échange le code (exchangeCodeForSession) puis redirige vers / (AD-10)

**Given** la page /login au clavier
**When** je navigue sans souris
**Then** champs et bouton focusables, focus visible, ordre de tab logique, cibles ≥36px (NFR-5, UX-DR9)

### Story 1.4: proxy.ts (PAS middleware.ts) — refresh de session, runtime Node

As a Annec,
I want garder ma session Supabase rafraîchie à chaque requête via `proxy.ts` à la racine, sans lire la DB métier,
So that je reste connecté entre les visites sans expiration silencieuse, sur le bon pattern Next 16.

**Ancrage :** Couvre NFR-2, AR-8 · AD-10 · Dépend : 1.3

**Acceptance Criteria:**

**Given** Next 16 (middleware.ts déprécié)
**When** j'implémente le refresh de session
**Then** il vit dans `proxy.ts` à la RACINE (export `proxy` + `config.matcher`, runtime Node) ; aucun `middleware.ts` n'est créé (AD-10)

**Given** proxy.ts
**When** une requête arrive
**Then** il rafraîchit la session via le pattern cookie getAll/setAll de @supabase/ssr 0.12 et peut rediriger, mais ne lit JAMAIS la DB métier (AD-10)

**Given** le matcher du proxy
**When** je définis sa portée
**Then** il COUVRE / et toutes les routes y compris les POST des Server Actions, en excluant uniquement les assets statiques (AD-10)

**Given** une session expirée mais un refresh token valide
**When** la requête passe par le proxy
**Then** la session est rafraîchie de façon transparente sans déconnexion (AD-10)

### Story 1.5: DAL requireUser() + route-group (app) protégé par le layout serveur

As a Annec,
I want protéger toute l'app métier derrière un DAL `requireUser()` appelé par le layout serveur du route-group (app),
So that ma véritable frontière d'auth résiste même à un POST direct qui contournerait le proxy.

**Ancrage :** Couvre NFR-2, AR-8 · AD-10, AD-1 · Dépend : 1.4

**Acceptance Criteria:**

**Given** `utils/auth/dal.ts`
**When** j'implémente `requireUser()`
**Then** elle est wrappée dans React `cache()`, fait `supabase.auth.getUser()` via le client serveur, et `redirect('/login')` si pas d'utilisateur (AD-10)

**Given** le route-group `app/(app)/`
**When** son layout serveur s'exécute
**Then** il appelle `requireUser()` AVANT tout rendu (AD-1, AD-10)

**Given** un visiteur non authentifié
**When** il accède directement à une route sous (app)
**Then** il est redirigé vers /login sans qu'aucune donnée métier ne soit lue (NFR-2, AD-10)

**Given** le principe que le proxy seul ne suffit pas
**When** une Server Action sera ajoutée plus tard
**Then** le DAL `requireUser()` est documenté comme la frontière à re-vérifier dans CHAQUE Server Action (AD-10)

### Story 1.6: Design-system : tokens Tailwind, 4 couleurs de signal verrouillées, dark auto

As a Annec,
I want un système de tokens Tailwind 4 (couleurs sémantiques clair/sombre, 4 couleurs de signal verrouillées, indigo CTA, vert résolu, rayons, spacing) avec mode sombre automatique,
So that toute l'interface partage une grammaire visuelle cohérente, lisible en clair comme en sombre.

**Ancrage :** Couvre UX-DR1, UX-DR2, NFR-5, NFR-8 · AD-1 · Dépend : 1.5

**Acceptance Criteria:**

**Given** le scaffold Tailwind 4 (`app/globals.css` avec @theme)
**When** je définis les tokens
**Then** les 4 couleurs de signal sont verrouillées comme tokens nommés (rouge=silence, ambre=échéance, bleu=attente, violet=phase), indigo réservé au CTA et vert au résolu, plus typo système, rayons (8/10/12/plein), spacing base 4px (UX-DR1)

**Given** `prefers-color-scheme`
**When** le système est en mode sombre
**Then** le thème bascule automatiquement avec la MÊME grammaire de tokens (aucun toggle manuel) (UX-DR2)

**Given** le contraste WCAG AA
**When** chaque couleur de signal est posée sur fond clair et sombre
**Then** le contraste respecte AA (NFR-5, UX-DR1)

### Story 1.7: Coquille app : nav, slot quick-add, toaster + plancher d'accessibilité

As a Annec,
I want naviguer dans une coquille d'application fonctionnelle (navigation entre les 5 surfaces, slot global quick-add, région de toasts) respectant le plancher d'accessibilité,
So that j'arrive sur une app structurée, navigable au clavier, prête à recevoir le contenu métier.

**Ancrage :** Couvre NFR-5, UX-DR9, UX-DR12, AR-8 · AD-1, AD-10 · Dépend : 1.6

**Acceptance Criteria:**

**Given** le layout serveur du route-group (app) déjà créé en 1.5 (garde requireUser())
**When** j'y AJOUTE la coquille (layout altéré, non recréé)
**Then** requireUser() continue de s'exécuter AVANT tout rendu, puis le layout affiche la navigation vers les 5 surfaces, un slot global pour la quickAddBar et un Toaster monté, sans logique métier (AD-1, AD-10, UX-DR9)

**Given** le slot quick-add (placeholder en Epic 1)
**When** il est posé dans la coquille
**Then** il réserve l'emplacement global et le raccourci Ctrl/Cmd-K est câblé pour focaliser le futur input, sans détection d'intention ni écriture (UX-DR9)

**Given** le Toaster (live region)
**When** il est monté
**Then** il expose une ARIA live region prête pour les toasts et `prefers-reduced-motion` désactive la transition (NFR-5, UX-DR9)

**Given** un viewport sous ~720px
**When** j'affiche la coquille
**Then** la grille s'empile et les actions passent pleine largeur (desktop-first dégradé proprement) (UX-DR12)

---

## Epic 2: Saisie & suivi du portefeuille

Annec peut encoder et tenir à jour son portefeuille : clients (avec cadence X), projets (phase, statut, budget, notes), échéances, attentes client, « J'ai contacté » et « Relancé », et le modèle de phases & actions attendues. Saisie à friction minimale via le quick-add global.

### Story 2.1: CRUD Clients avec cadence X et archivage

As a Annec,
I want créer, éditer et archiver des Clients (nom, cadence X, email, notes) depuis /clients,
So that mon portefeuille de clients est encodé avec leur cadence de relance propre, base de tout le suivi.

**Ancrage :** Couvre FR-1, NFR-1, NFR-2, UX-DR8, UX-DR10 · AD-1, AD-2, AD-11 · Dépend : —

**Acceptance Criteria:**

**Given** le schema canonique sans table clients
**When** la story est déployée
**Then** `public.clients` existe (id uuid pk, user_id ... cascade, nom text not null, cadence_x int not null default 7, email text null, notes text null, archived_at timestamptz null), RLS + 4 policies `(select auth.uid())=user_id` (AD-2)
**And** le DDL vit uniquement dans `supabase/schema.vigie.sql`, tables en anglais pluriel (AD-11)

**Given** le formulaire de création client
**When** j'enregistre un client avec nom et cadence_x renseignés
**Then** `creerClient` (Server Action) appelle requireUser(), insère via le client serveur sans passer user_id (RLS filtre), puis revalidatePath au minimum / et /clients (AD-1)
**And** aucune écriture métier ne passe par `utils/supabase/client.ts` (AD-1)

**Given** le formulaire
**When** je soumets sans nom OU avec cadence_x absente/<1/non entière
**Then** l'écriture est rejetée, erreur inline non bloquante, aucune ligne créée (FR-1 : nom requis, X entier ≥1)
**And** la cadence_x est pré-remplie à 7 par défaut (FR-1)

**Given** un client existant non archivé
**When** je clique Archiver
**Then** `archiverClient` positionne `archived_at = now()` (soft-delete) ; le client disparaît des listes actives mais reste consultable (FR-1)

**Given** deux users A et B (test RLS négatif)
**When** B requête clients
**Then** B ne voit AUCUNE ligne de A et un INSERT force user_id=auth.uid() (NFR-2, AD-2)

### Story 2.2: CRUD Projets rattachés à un Client (phase, statut, dernier contact, notes) + clore + changer de phase

As a Annec,
I want créer, éditer, clore des Projets et changer leur phase courante (statut, date de dernier contact, notes) depuis /projets et la fiche projet,
So that mes ~25 projets sont dans Vigie avec leur état de suivi, prêts à porter échéances, attentes et signaux.

**Ancrage :** Couvre FR-2, FR-8, NFR-1, NFR-2, UX-DR8, UX-DR12 · AD-1, AD-2, AD-3, AD-11 · Dépend : 2.1

**Acceptance Criteria:**

**Given** le schema sans table projects ni enums phase/project_status
**When** la story est déployée
**Then** les enums `phase` (cadrage→clôture, dans cet ordre) et `project_status` (actif, en_pause, termine) existent, et `public.projects` existe (... client_id ... references clients on delete cascade, nom not null, phase default 'cadrage', statut default 'actif', date_dernier_contact date default current_date, notes), RLS + 4 policies (AD-2, AD-11)
**And** budget/budget_consomme NE sont PAS ajoutés ici (story 2.3)

**Given** le formulaire de création projet
**When** je crée un projet avec nom et client renseignés
**Then** `creerProjet` fait requireUser() → insert RLS → revalidatePath('/','/projets') (AD-1)
**And** phase par défaut cadrage, statut actif, date_dernier_contact = date de création (FR-2)

**Given** un projet actif
**When** je clique Clore (`clorProjet`)
**Then** statut='termine' via Server Action RLS ; conséquence : un projet termine OU en_pause ne génère AUCUN signal une fois la vue d'Epic 3 active (CTE live : statut='actif', AD-3) (FR-2, FR-7)

**Given** un projet en phase P
**When** je le passe en phase livraison via `changerPhase`
**Then** `projects.phase` est mis via Server Action RLS ; la phase ne prend qu'une valeur de l'ordre fixe (FR-2, FR-8) et les actions attendues de livraison non faites deviennent immédiatement éligibles au signal phase (vérifié en 3.1, FR-9)

**Given** la liste /projets (Server Component)
**When** je consulte
**Then** elle lit projects joints à clients sous RLS et affiche colonnes projet/client/phase/dernier contact/cadence (UX-DR12), squelettes au chargement (UX-DR8)
**And** deux users A et B : B ne voit aucune ligne projects de A (NFR-2, AD-2)

### Story 2.3: Fiche budget projet (budget, consommé, % calculé, seuil indicatif 90%) — informatif, jamais un signal

As a Annec,
I want renseigner le budget et le budget consommé d'un projet et voir le % consommé (barre virant à l'ambre au-delà de 90%), sur la fiche projet uniquement,
So that je suis la santé budgétaire de chaque projet sans polluer mes signaux de cockpit.

**Ancrage :** Couvre FR-2, NFR-5, UX-DR7, UX-DR8 · AD-1, AD-2, AD-3, AD-11 · Dépend : 2.2

**Acceptance Criteria:**

**Given** la table projects (2.2)
**When** cette story est déployée
**Then** les colonnes `budget numeric null` et `budget_consomme numeric null` sont ajoutées à projects, sans CHECK croisé (>100% est un cas réel informatif), RLS inchangée (AD-2, AD-11)
**And** aucune colonne budget n'est ajoutée à une vue de signaux : le budget ne génère AUCUN signal (FR-2, AD-3)

**Given** la fiche /projets/[id]
**When** j'enregistre budget et budget_consomme via `editerBudget`
**Then** l'update passe par requireUser() → RLS → revalidatePath('/projets/[id]') ; montants vides autorisés (budget optionnel) (AD-1, FR-2)

**Given** budget=12000 et budget_consomme=3400
**When** la fiche affiche le bloc budget
**Then** le % ≈28% s'affiche (barre neutre) et au-delà du seuil indicatif 90% la barre vire à `signalEcheance` (ambre) AVEC un libellé texte (couleur jamais seule), purement informatif (UX-DR7, NFR-5)

**Given** budget_consomme > budget (>100%)
**When** j'ouvre la fiche
**Then** un % >100% s'affiche sans erreur ni blocage (aucun CHECK) (FR-2)

**Given** un projet sans budget OU budget=0 (division par zéro)
**When** j'ouvre la fiche
**Then** le bloc % n'est pas affiché / neutralisé sans erreur (FR-2, UX-DR8)

### Story 2.4: Échéances datées par projet (ajout, édition, marquer faite)

As a Annec,
I want ajouter 0..N échéances datées à un projet et les marquer faites depuis la fiche projet,
So that les jalons et livrables de chaque projet sont tracés, prêts à alimenter le moteur d'échéances.

**Ancrage :** Couvre FR-3, NFR-2, UX-DR6, UX-DR8 · AD-1, AD-2, AD-6, AD-11 · Dépend : 2.2

**Acceptance Criteria:**

**Given** le schema sans table deadlines ni enum deadline_status
**When** la story est déployée
**Then** l'enum `deadline_status` (a_venir, faite) et `public.deadlines` existent (... project_id ... cascade, libelle text null, date date not null, statut default 'a_venir'), RLS + 4 policies (AD-2, AD-11)
**And** user_id est porté directement sur deadlines (RLS sans jointure) (AD-2)

**Given** la fiche /projets/[id]
**When** j'ajoute une échéance avec une date renseignée
**Then** `ajouterEcheance` fait requireUser() → insert RLS → revalidatePath('/','/projets/[id]') ; libellé optionnel, date requise (AD-1, FR-3)

**Given** une échéance créée avec date=demain
**When** je relis la fiche
**Then** statut=a_venir, date stockée telle quelle sans décalage de fuseau à la saisie (catégorisation par paliers différée à 3.1) (FR-3)

**Given** une échéance a_venir
**When** je clique Marquer fait
**Then** `marquerEcheanceFaite` (Server Action mono-table) passe statut='faite' via RLS + revalidatePath ; retrait optimiste immédiat + toast 'Fait — annuler' + réapparition si échec (AD-1, AD-6, UX-DR6)

### Story 2.5: Attentes client + RPC transactionnel relancer_attente (Relance vs Résolu)

As a Annec,
I want ouvrir une attente client sur un projet (libellé libre, date de référence, statut), la relancer sans la fermer, ou la résoudre/abandonner,
So that je trace ce que j'attends de mes clients et je relance d'un geste pour mettre une pression bienveillante.

**Ancrage :** Couvre FR-4, NFR-2, UX-DR6, UX-DR10 · AD-1, AD-2, AD-5, AD-6, AD-11 · Dépend : 2.2

**Acceptance Criteria:**

**Given** le schema sans table client_waits ni enum wait_status
**When** la story est déployée
**Then** l'enum `wait_status` (en_attente, relancee, resolue, abandonnee) et `public.client_waits` existent (... project_id cascade, libelle text not null, date_reference date default current_date, statut default 'en_attente'), RLS + 4 policies (AD-2, AD-11)

**Given** la fiche /projets/[id]
**When** j'ouvre une attente avec un libellé (saisie libre, suggestions tester/valider/fournir un contenu)
**Then** `ouvrirAttente` fait requireUser() → insert RLS (date_reference=aujourd'hui, statut 'en_attente') → revalidatePath ; libellé requis (AD-1, FR-4)

**Given** une attente en_attente ou relancee
**When** je clique Relance
**Then** l'action appelle l'UNIQUE RPC transactionnel `relancer_attente(p_wait_id)` via supabase.rpc() (jamais 2 .update() séparés), qui met `date_reference = today_local` ET `statut='relancee'` atomiquement (security invoker) ; l'attente reste OUVERTE (AD-6, FR-4) ; retrait optimiste + toast (UX-DR6)

**Given** le seuil strict (même colonne cadence_x que silence)
**When** cadence_x=7 et today_local − date_reference vaut exactement 7
**Then** AUCUN signal (borne stricte >) ; à 8 jours un signal attente apparaît ; `relancer_attente` utilise `today_local = (now() AT TIME ZONE profiles.timezone)::date`, jamais current_date (AD-5)

**Given** une attente résolue/abandonnée via `marquerAttente`
**When** je consulte les signaux
**Then** elle ne déclenche PLUS de signal ni n'est éligible à Relance (distinct de Relance qui repositionne sans fermer) (FR-4)

### Story 2.6: Action « J'ai contacté » + log contacts via RPC transactionnel mark_contacted + staleness douce

As a Annec,
I want enregistrer en un geste un contact sur un projet (reset compteur de cadence au niveau PROJET + log d'audit) et voir depuis combien de jours date le dernier contact,
So that je remets le compteur de relance à zéro sans harceler ni oublier mes clients, avec une trace d'audit.

**Ancrage :** Couvre FR-5, NFR-2, UX-DR6, UX-DR8, UX-DR10 · AD-1, AD-2, AD-5, AD-6, AD-11 · Dépend : 2.2

**Acceptance Criteria:**

**Given** le schema sans table contacts
**When** la story est déployée
**Then** `public.contacts` existe (... project_id cascade, contacted_on date not null), RLS + 4 policies (AD-2, AD-11)

**Given** un client avec projets P1 et P2 (reset au niveau PROJET)
**When** je clique J'ai contacté sur P1
**Then** l'action appelle l'UNIQUE RPC `mark_contacted(p_project_id)` qui, dans une SEULE transaction, insère une ligne contacts (contacted_on=today_local) ET met `projects.date_dernier_contact = today_local` pour P1 ; P2 inchangé (compteurs indépendants) (AD-6, FR-5)

**Given** l'atomicité du RPC
**When** mark_contacted réussit
**Then** EXACTEMENT 1 nouvelle ligne contacts ET date_dernier_contact mis à jour dans la même transaction ; si l'update échoue, aucune ligne contacts (ni date sans log, ni log sans date) (AD-6, FR-5)

**Given** le calcul du temps
**When** le RPC calcule la date
**Then** il utilise `today_local`, jamais current_date ni now() naïf (AD-5), est security invoker (RLS filtre), et la Server Action fait revalidatePath('/','/projets/[id]') (AD-1)

**Given** la Fiche Projet et la staleness douce (distincte du signal silence)
**When** j'ouvre /projets/[id]
**Then** la fiche affiche « dernier contact il y a N j » (calculé serveur via today_local, jamais en TS), ton non culpabilisant, SANS constituer un signal cockpit (AD-5, UX-DR8, UX-DR10)

### Story 2.7: Modèle de phases & actions attendues éditables dans /reglages + seed via handle_new_user

As a Annec,
I want consulter et éditer (ajouter/retirer/réordonner) la liste d'actions attendues par phase dans /reglages, marquer une action de phase faite sur un projet, le tout pré-seedé à la création du compte,
So that chaque phase de mes projets porte les actions que j'attends de moi, préalable au signal « Action de phase oubliée ».

**Ancrage :** Couvre FR-8, NFR-2, UX-DR6 · AD-1, AD-2, AD-7, AD-11 · Dépend : 2.2

**Acceptance Criteria:**

**Given** le schema sans tables phase_actions ni project_phase_action_status
**When** la story est déployée
**Then** `public.phase_actions` (... phase, libelle not null, position int) et `public.project_phase_action_status` (... project_id cascade, phase_action_id cascade, done_at timestamptz not null) existent, chacune RLS + 4 policies (AD-2, AD-11)
**And** project_phase_action_status matérialise UNIQUEMENT les actions FAITES (présence = fait, absence = non fait) ; aucun statut « pas fait » stocké (AD-7)

**Given** le trigger `handle_new_user()` d'Epic 1 (crée profiles)
**When** cette story ALTÈRE le trigger
**Then** `handle_new_user()` seede aussi les phase_actions par défaut (min. tests→« organiser les tests » ; livraison→« livrer », « poser un délai de retour »), template uniquement, jamais délégué à une Server Action (AD-7, FR-8)

**Given** un compte fraîchement provisionné (test d'acceptation AD-7)
**When** je liste phase_actions
**Then** `count(phase_actions) > 0` immédiatement après signup, et un projet neuf en phase livraison fera remonter ≥1 action de phase non faite (prévient le « 4e signal silencieusement mort ») (AD-7)

**Given** la surface /reglages (Server Component) créée ici
**When** j'ajoute/retire une action attendue d'une phase
**Then** l'écriture passe par requireUser() → RLS → revalidatePath ; le changement s'applique à tous les projets dans cette phase ; l'ordre des phases reste fixe et non éditable (AD-1, FR-8)

**Given** la fiche affichant les actions attendues de la phase courante
**When** je clique Marquer fait sur une action de phase, puis Annuler
**Then** `marquerActionPhaseFaite` INSÈRE une ligne project_phase_action_status (done_at=now()) via RLS + retrait optimiste + toast ; annuler SUPPRIME la ligne (absence = non fait) (AD-1, AD-7, UX-DR6)

### Story 2.8: Quick-add global multi-entités (Client/Projet/Échéance/Attente) avec Ctrl/Cmd-K + onboarding 0 projet

As a Annec,
I want créer un Client, un Projet, une Échéance ou une Attente depuis une barre quick-add accessible partout via Ctrl/Cmd-K, en saisie réduite au strict requis,
So that je tiens mes ~25 projets à jour quasi sans effort (la friction de saisie étant le risque n°1).

**Ancrage :** Couvre FR-1, FR-2, FR-3, FR-4, NFR-1, UX-DR5, UX-DR8, UX-DR9, UX-DR10 · AD-1, AD-2 · Dépend : 2.1, 2.2, 2.4, 2.5

**Acceptance Criteria:**

**Given** la coquille quickAddBar posée en Epic 1 (input + raccourci Ctrl/Cmd-K)
**When** cette story la câble
**Then** la barre détecte l'intention parmi EXACTEMENT 4 entités (Client/Projet/Échéance/Attente) et n'exige que les champs requis : Client=nom+cadence(défaut 7) ; Projet=nom+client ; Échéance=projet+date ; Attente=projet+libellé (UX-DR5, NFR-1)

**Given** une intention détectée
**When** je valide le quick-add
**Then** la Server Action `quickAdd` fait requireUser() puis route vers la création via RLS (réutilisant creerClient/creerProjet/ajouterEcheance/ouvrirAttente) → revalidatePath('/') + surface concernée ; aucune création métier côté client (AD-1)

**Given** le quick-add d'un Projet/Échéance/Attente
**When** je dois choisir le parent
**Then** seuls mes clients/projets (RLS) sont proposés ; une référence hors de mon user_id est rejetée (AD-2) ; entièrement utilisable au clavier, cibles ≥36px (UX-DR9)

**Given** une saisie incomplète
**When** il manque un champ requis
**Then** erreur inline non bloquante, rien n'est créé, voice tutoyante non culpabilisante (UX-DR8, UX-DR10)

**Given** l'état premier usage (0 projet)
**When** j'ouvre l'app sans aucun client/projet
**Then** un onboarding minimal invite à « Ajouter ton premier client, puis un projet » via le quick-add (pas un wizard) (UX-DR8)

---

## Epic 3: Cockpit de triage & moteurs de signaux

Annec ouvre Vigie le matin et voit en une liste courte et triée tout ce qui demande une action — les 4 signaux — qu'il traite en place jusqu'à « cockpit vidé ». Repose sur la vue unique `v_active_signals` (source partagée écran/digest) et `today_local`.

### Story 3.1: Vue unique v_active_signals : les 4 moteurs de signaux en SQL (today_local, lignes plates, urgency_rank)

As a Annec (opérateur unique),
I want une source de vérité SQL unique qui dérive à la lecture les 4 signaux de danger en lignes plates triables, calculés dans mon fuseau,
So that le cockpit et le digest liront exactement le même état, sans qu'aucun seuil ne soit réimplémenté ailleurs ni en TypeScript.

**Ancrage :** Couvre FR-6, FR-7, FR-9, FR-10, NFR-6, NFR-3, NFR-8, AR-3, AR-4 · AD-3, AD-4, AD-5, AD-2, AD-7 · Dépend : 2.3, 2.4, 2.5, 2.6, 2.7

**Acceptance Criteria:**

**Given** le schema avec toutes les tables d'Epic 2 (profiles.timezone, clients.cadence_x/archived_at, projects, deadlines, client_waits, contacts, phase_actions + project_phase_action_status seedées)
**When** j'applique la migration qui crée `public.v_active_signals`
**Then** la vue existe avec `security_invoker=true`, définie une seule fois (aucune autre vue/sous-vue) (AD-3), et retourne des lignes PLATES (user_id, project_id, client_id, signal text, ref_id uuid, palier text, age_days int, cadence_x int, libelle_metier text, urgency_rank int) — sans jsonb agrégé ni label pré-rédigé (AD-4)

**Given** le CTE live et le calcul du temps
**When** la vue matérialise son périmètre
**Then** le périmètre projet-vivant (`statut='actif' AND clients.archived_at IS NULL`) est défini EXACTEMENT une fois dans le CTE live, et `today_local = (now() AT TIME ZONE profiles.timezone)::date` matérialisé une seule fois ; `current_date` n'apparaît NULLE PART (AD-5, AD-3)

**Given** un projet ayant ≥1 signaux
**When** son statut passe à en_pause OU termine, OU son client est archivé
**Then** la vue ne retourne AUCUNE ligne pour ce projet, pour les 4 types (CTE live, AD-3)

**Given** une échéance a_venir non faite (dernier palier franchi)
**When** la vue calcule son palier sur today_local
**Then** signal='echeance', ref_id=deadlines.id (uuid), palier = `date < today_local → 'depassee'` ; `= today_local → 'jour_j'` ; `= today_local+1 → 'j_1'` ; `today_local+1 < date ≤ today_local+3 → 'j_3'` ; `> today_local+3 → aucune ligne` ; CAS LIMITE : une échéance à J-2 reste au palier 'j_3' et NON 'j_1' ; urgency_rank : dépassée = 1000+retard, jour_j=800, j_1=700, j_3=600 (FR-6, AD-4)

**Given** la frontière de minuit (risque n°1 du digest)
**When** profiles.timezone=Europe/Paris et il est 00:30 Paris (23:30 UTC) avec une échéance datée à aujourd'hui-Paris
**Then** le palier vaut 'jour_j' calculé sur today_local, JAMAIS sur current_date/UTC (AD-5)

**Given** les seuils silence et attente STRICTS
**When** today_local − date = cadence_x exactement (égalité)
**Then** AUCUNE ligne ; à > cadence_x : silence (ref_id=projects.id, urgency_rank=500) / attente (ref_id=client_waits.id, urgency_rank=400, même colonne cadence_x) ; une attente resolue/abandonnee n'émet rien (FR-7, FR-4, AD-5)

**Given** un projet actif en phase livraison avec une phase_action template SANS ligne done (immédiat, sans délai de grâce)
**When** la vue évalue l'action de phase
**Then** ≥1 ligne signal='phase', ref_id=phase_actions.id, age_days=0, urgency_rank=300 (prouve que le seed AD-7 est vivant) ; quand je marque l'action faite la ligne disparaît (NOT EXISTS satisfait) (FR-9, AD-7)

**Given** AD-2 et le budget exclu
**When** j'interroge la vue en session authentifiée (security_invoker porte la RLS)
**Then** je ne vois que mes lignes, aucune colonne budget n'apparaît, et un projet multi-signaux produit plusieurs lignes plates distinctes (groupement testé côté groupSignals) (AD-3, AD-2, AD-4)

### Story 3.2: lib/signals.ts : contrat TS partagé (SIGNALS_VIEW, groupSignals, formatSignal) + types générés

As a développeur construisant cockpit et digest,
I want un module unique côté app qui nomme la vue, regroupe les lignes plates par projet et trie par urgence, et rend le texte de présentation de chaque signal,
So that cockpit et digest consomment la MÊME logique d'agrégation/tri/rendu, empêchant structurellement toute divergence écran/e-mail.

**Ancrage :** Couvre FR-10, NFR-3, NFR-5, NFR-8, AR-3, UX-DR3, UX-DR10 · AD-4, AD-3, AD-1 · Dépend : 3.1

**Acceptance Criteria:**

**Given** les types Supabase générés committés après 3.1
**When** j'importe la ligne de signal
**Then** le type Row de v_active_signals est dérivé des types générés ; ref_id et tous les ids sont uuid (string), aucun id n'est number (AD-4) ; `lib/signals.ts` exporte `SIGNALS_VIEW = 'v_active_signals'` comme SEULE référence au nom de la vue (AD-3)

**Given** un jeu de lignes couvrant les 7 niveaux d'urgence dont un project_id multi-signaux
**When** j'appelle `groupSignals(rows)`
**Then** l'ordre suit urgency_rank décroissant, tie-break age_days DESC NULLS LAST, un projet multi-signaux apparaît UNE fois avec badges groupés, urgence projet = max(urgency_rank) (AD-4, FR-10)

**Given** groupSignals (pureté et unicité)
**When** je le revue
**Then** il est pur (aucun appel réseau/DB), déterministe, SEUL endroit où s'effectuent agrégation et tri (AD-4)

**Given** une ligne de signal
**When** j'appelle `formatSignal(row)`
**Then** il retourne le libellé texte non culpabilisant tutoyant (silence → « Pas de contact depuis {N} jours (cadence {X}) » ; échéance → « Échéance {dépassée de N jours|aujourd'hui|J-1|J-3} » ; attente → « En attente depuis {N} jours » ; phase → « {libelle} à faire ») et un libellé court du type (Silence/Écheance/Attente/Phase) pour que la couleur ne soit jamais seule (UX-DR10, NFR-5)

**Given** AD-1 et AD-4
**When** je revue le module
**Then** `lib/signals.ts` ne contient AUCUN calcul de seuil ni recalcul de signal (il ne fait que regrouper/trier/formatter) et ne lit jamais la DB (AD-3, AD-4)

### Story 3.3: Cockpit (page Server Component) : lit v_active_signals, rend signalRow groupés et triés, ouvre le projet, état cockpit vide

As a Annec,
I want ouvrir Vigie sur '/' et voir en une liste courte et triée tout projet présentant ≥1 signal (avec lien vers la fiche), ou un état « cockpit vide » valorisé s'il n'y a rien,
So that je sais en un coup d'œil ce qui demande mon attention ce matin.

**Ancrage :** Couvre FR-10, FR-11, NFR-4, NFR-3, NFR-5, AR-3, UX-DR3, UX-DR8, UX-DR9 · AD-1, AD-3, AD-4 · Dépend : 3.2

**Acceptance Criteria:**

**Given** le route-group protégé (layout requireUser())
**When** la page cockpit `app/(app)/page.tsx` rend
**Then** c'est un Server Component qui lit v_active_signals via le client serveur en utilisant SIGNALS_VIEW puis applique groupSignals() ; aucune lecture client, aucun recalcul (AD-1, AD-3) ; cacheComponents OFF, page dynamique via cookies() (AD-1)

**Given** des projets avec un ou plusieurs signaux actifs
**When** le cockpit s'affiche
**Then** chaque projet apparaît dans UNE seule signalRow (grille [badge | projet·client + méta | action]), multi-signaux = badges groupés, lignes dans l'ordre de groupSignals (urgence décroissante) (FR-10, UX-DR3)

**Given** l'accessibilité
**When** une signalRow est rendue
**Then** chaque badge porte un LIBELLE TEXTE en plus de sa couleur verrouillée (couleur jamais seule), méta met en gras le chiffre critique via formatSignal (NFR-5, UX-DR3)

**Given** FR-11 « ouvrir le Projet »
**When** je clique le CORPS de la signalRow
**Then** c'est un lien vers /projets/<project_id> (distinct de la zone d'action), atteignable au clavier, focus visible, cible ≥36px (FR-11, UX-DR9)

**Given** aucun signal actif (état cible valorisé)
**When** le cockpit charge
**Then** l'état « Cockpit vide — rien d'autre ne demande ton attention aujourd'hui » est rendu (message positif, pas une liste vide neutre) (UX-DR8, FR-11)

**Given** le rituel du matin doit sembler instantané
**When** la page charge
**Then** des squelettes de lignes sont affichés (pas de spinner plein écran) (NFR-4, UX-DR8)

### Story 3.4: Barre de KPIs du cockpit : 4 compteurs de signal cliquables (filtre toggle côté client)

As a Annec,
I want voir 4 kpiCard (Silence, Échéance, Attente, Phase) avec leur compteur, et cliquer un compteur pour filtrer la liste sur ce type (re-clic = retire le filtre),
So that je scanne d'abord les volumes par type puis je me concentre sur une catégorie à la fois pour vider plus vite.

**Ancrage :** Couvre FR-10, NFR-3, NFR-5, UX-DR4, UX-DR9 · AD-1, AD-4 · Dépend : 3.3

**Acceptance Criteria:**

**Given** le cockpit a chargé les lignes de v_active_signals (3.3)
**When** la barre de KPIs rend
**Then** chaque kpiCard affiche le nombre de signaux ACTIFS de son type (compte de lignes par 'signal') calculé côté serveur ; aucun recompute côté client (AD-1, NFR-3) ; les 4 types toujours présents, chaque carte avec un libellé texte (FR-10, NFR-5)

**Given** un type avec compteur >0
**When** je clique sa kpiCard puis re-clique
**Then** le 1er clic filtre le panneau sur ce type (filtre client sur les lignes déjà servies, aucun re-fetch ni recalcul, AD-1/AD-4) et la carte indique son état actif ; le re-clic RETIRE le filtre (toggle) (UX-DR4)

**Given** l'accessibilité
**When** j'active une kpiCard au clavier (Entrée/Espace)
**Then** le panneau filtre ; ré-activation retire le filtre ; état pressé exposé via aria-pressed, focus visible, cible ≥36px ; ordre de tab KPIs → liste → actions (NFR-5, UX-DR9)

**Given** un compteur à 0
**When** j'essaie de filtrer dessus
**Then** la carte à 0 n'active aucun filtre (évite un panneau vide trompeur) (UX-DR4)

### Story 3.5: Actions rapides multi-tables du cockpit : « J'ai contacté » et « Relance » via RPC, retrait optimiste + annuler + réconciliation sur échec

As a Annec,
I want traiter en place un signal de silence (J'ai contacté) ou d'attente (Relance) sans quitter le cockpit, la ligne disparaissant immédiatement,
So that je fais retomber un signal d'un clic pendant que je relance, sans casser le rythme du matin.

**Ancrage :** Couvre FR-11, FR-7, FR-4, NFR-4, NFR-5, AR-3, UX-DR6, UX-DR9 · AD-6, AD-1, AD-4, AD-5 · Dépend : 3.3

**Acceptance Criteria:**

**Given** une signalRow de type silence avec son action « J'ai contacté » (primary)
**When** je clique l'action
**Then** un wrapper client retire la ligne optimistement (useOptimistic) et appelle une Server Action qui fait requireUser() → `supabase.rpc('mark_contacted', {p_project_id})` → revalidatePath('/') (AD-1, AD-6) ; jamais 2 écritures séparées, jamais user_id à la main (AD-6, AD-2)

**Given** une signalRow de type attente avec l'action « Relance »
**When** je clique l'action
**Then** le wrapper retire la ligne optimistement et la Server Action fait requireUser() → `supabase.rpc('relancer_attente', {p_wait_id})` (date_reference=today_local, statut='relancee', sans fermer) → revalidatePath('/') ; l'attente ne réapparaîtra qu'au prochain dépassement de cadence (AD-6, FR-4, AD-5)

**Given** l'action routée par signal + ref_id (uuid)
**When** le wrapper transmet l'identifiant
**Then** le ref_id passé est l'uuid EXACT (projet pour silence, attente pour relance) ; aucun id traité comme number (AD-4)

**Given** le chemin d'échec (le plus oublié)
**When** je clique l'action ET la Server Action échoue
**Then** l'élément RÉAPPARAÎT à sa place (rollback optimiste) avec note d'erreur inline non bloquante, aucun état métier changé ; le revalidatePath('/') réconcilie l'optimistic (UX-DR6, AD-1)

**Given** la réversibilité (undo) et le plancher a11y
**When** l'action réussit et je clique « annuler » dans le toast « Fait — annuler »
**Then** l'action est révoquée et l'élément revient ; transitions respectant prefers-reduced-motion ; aria-label explicite ; le wrapper n'importe JAMAIS `utils/supabase/client.ts` pour écrire (AD-1, UX-DR6, NFR-5)

### Story 3.6: Actions rapides mono-table du cockpit : « Marquer fait » échéance et action de phase, atteindre « cockpit vide » end-to-end

As a Annec,
I want marquer faite en place une échéance proche/dépassée ou une action de phase oubliée, la ligne disparaissant immédiatement, jusqu'à vider le cockpit,
So that je clos les deux derniers types de signaux d'un clic et j'atteins l'état « cockpit vide » récompensé.

**Ancrage :** Couvre FR-11, FR-6, FR-9, FR-3, NFR-4, NFR-5, UX-DR6, UX-DR8, UX-DR9 · AD-1, AD-4, AD-3, AD-7 · Dépend : 3.5

**Acceptance Criteria:**

**Given** une signalRow de type échéance avec l'action « Marquer fait »
**When** je clique l'action
**Then** le wrapper retire la ligne optimistement et une Server Action mono-table (pas de RPC) fait requireUser() → `update deadlines set statut='faite' where id=ref_id` (RLS) → revalidatePath('/') ; l'échéance faite quitte v_active_signals et la barre KPI se met à jour (AD-1, AD-6, FR-3, AD-3)

**Given** une signalRow de type phase avec « Marquer fait »
**When** je clique l'action
**Then** le wrapper retire la ligne optimistement et la Server Action insère une ligne project_phase_action_status (phase_action_id=ref_id, done_at=now()) en RLS → revalidatePath('/') ; présence = fait, NOT EXISTS satisfait → quitte le cockpit (AD-1, AD-7, FR-9, AD-3)

**Given** le ref_id (uuid) et l'idempotence
**When** la mutation cible la deadline/phase_action, et une re-soumission de « phase fait » survient
**Then** elle utilise l'uuid EXACT ; la re-soumission est idempotente (conflit ignoré, pas de doublon) (AD-4, AD-7)

**Given** le chemin d'échec
**When** je clique l'action ET la Server Action échoue
**Then** l'élément RÉAPPARAÎT à sa place avec note d'erreur inline, aucun état métier changé ; aria-label explicite (« Marquer Maquettes V2 comme fait ») (UX-DR6, NFR-5)

**Given** atteindre « cockpit vide » de bout en bout
**When** le cockpit ne contient plus qu'EXACTEMENT 1 signal mono-table et je le marque fait
**Then** retrait optimiste immédiat PUIS, après revalidatePath('/'), l'état « Cockpit vide » valorisé s'affiche + toast « Fait — annuler » (FR-11, UX-DR6, UX-DR8)

---

## Epic 4: Digest e-mail quotidien

À 08:00 (fuseau du compte), Annec reçoit un e-mail récapitulant l'état du cockpit, sans même ouvrir l'app ; rien à signaler = pas d'e-mail. Réutilise la même vue de signaux que le cockpit (zéro divergence).

### Story 4.1: Colonnes digest sur profiles + sélection des comptes à digester (comptes_a_digester)

As a Annec,
I want doter profiles des colonnes de config/idempotence du digest et exposer un RPC `comptes_a_digester()` qui renvoie, à l'heure locale courante, les comptes dont c'est l'heure d'envoi et non encore servis,
So that le moteur du digest a une source unique et fiable de QUI servir, à QUELLE heure locale, avec QUEL e-mail, et une colonne d'idempotence.

**Ancrage :** Couvre FR-12, NFR-7, NFR-6, AR-7 · AD-8, AD-5, AD-11, AD-7 · Dépend : 1.1

**Acceptance Criteria:**

**Given** le schema canonique et la table profiles (créée en 1.1 avec timezone/digest_hour/digest_email/digest_last_sent_on)
**When** la migration est appliquée
**Then** si une colonne digest manque elle est ajoutée (timezone IANA, digest_hour 0..23, digest_email, digest_last_sent_on), aucune AUTRE table que profiles n'étant créée/altérée (create-only-when-used, AD-11)

**Given** un RPC `public.comptes_a_digester()`
**When** il est exécuté
**Then** il renvoie une ligne par user où `date_part('hour', now() at time zone profiles.timezone)::int = digest_hour` ET `digest_last_sent_on is distinct from (now() at time zone timezone)::date`, avec user_id, `local_today`, et `digest_email = coalesce(profiles.digest_email, auth.users.email)` (AD-8, AD-5) ; today_local repose sur profiles.timezone, jamais current_date ni un offset (AD-5)

**Given** deux profils, l'un déjà servi aujourd'hui (digest_last_sent_on = local_today)
**When** comptes_a_digester() s'exécute à l'heure locale = digest_hour
**Then** seul le profil non encore servi est renvoyé (idempotence amont, AD-8)

**Given** un profil dont l'heure locale ≠ digest_hour
**When** comptes_a_digester() s'exécute
**Then** ce profil n'est PAS renvoyé (le cron horaire ne sert que le palier d'heure local exact)

**Given** le RPC marqué security definer (lit auth.users.email en fallback)
**When** on vérifie ses droits
**Then** il est appelable côté service_role uniquement, n'expose aucune donnée cross-tenant à anon/authenticated (AD-8, AD-2)

### Story 4.2: Réglages du digest : heure d'envoi + fuseau IANA dans /reglages

As a Annec,
I want régler depuis /reglages l'heure d'envoi du digest (digest_hour) et son fuseau (timezone IANA) via une Server Action, avec validation,
So that je contrôle quand et dans quel fuseau je reçois mon récap, sans toucher à la base.

**Ancrage :** Couvre FR-12, UX-DR8, UX-DR9 · AD-1, AD-2, AD-5, AD-10 · Dépend : 4.1

**Acceptance Criteria:**

**Given** la page `app/(app)/reglages/page.tsx` (créée en 2.7 — ALTER ici, ne pas rescaffolder)
**When** Annec ouvre /reglages
**Then** le bloc digest est AJOUTÉ sans clobber l'éditeur phase_actions de 2.7 ; la page lit profiles via le client serveur (RLS) et affiche digest_hour et timezone courants ; sélecteur d'heure 0..23, sélecteur de fuseau IANA, chaque contrôle avec libellé texte (AD-1, AD-2, UX-DR9)

**Given** une Server Action `reglerDigest` co-localisée (ALTER — fichier créé en 2.7)
**When** Annec soumet une nouvelle heure et un nouveau fuseau
**Then** l'action fait requireUser() → écrit profiles via RLS (jamais user_id à la main) → revalidatePath('/reglages') (pas revalidateTag) (AD-1, AD-2, AD-10)

**Given** une heure hors plage (ex. 25) ou un fuseau non IANA
**When** l'action valide
**Then** l'écriture est refusée, erreur inline non bloquante ; digest_hour reste 0..23, timezone reste un nom IANA jamais un offset (UX-DR8, AD-5)

**Given** Annec a changé digest_hour de 8 à 9
**When** comptes_a_digester() s'exécute ensuite
**Then** le compte n'est sélectionné qu'à 9h locale (preuve que le réglage pilote la sélection, sans recalcul de seuil en TS) (AD-5)

### Story 4.3: Template e-mail digest mail-safe (HTML inline-CSS) à partir des signaux formatés partagés

As a Annec,
I want produire le corps HTML du digest à partir des lignes de v_active_signals déjà groupées et formatées (groupSignals/formatSignal partagés), en tables + inline-CSS mail-safe, une section par type de signal, badges = pastille + libellé texte, liens profonds absolus, budget exclu,
So that l'e-mail reprend exactement la hiérarchie et le tri du cockpit, lisible dans tous les clients mail, sans divergence.

**Ancrage :** Couvre FR-12, NFR-3, NFR-5, NFR-8, UX-DR10, UX-DR11 · AD-3, AD-4, AD-9 · Dépend : 4.1, 3.2

**Acceptance Criteria:**

**Given** une copie Deno-portable de groupSignals/formatSignal (`_shared/signals.ts`, équivalente à `lib/signals.ts` de 3.2)
**When** `_shared/signals.ts` est écrit
**Then** il reproduit EXACTEMENT le même ordre urgency_rank décroissant (tie-break age_days DESC NULLS LAST) et la même sortie formatSignal que `lib/signals.ts` pour un fixture identique (zéro second barème de tri), verrouillant l'équivalence (AD-4, NFR-3, NFR-8)

**Given** un jeu de signaux des 4 types
**When** on rend le template
**Then** le HTML contient une section par type ordonnée par urgency_rank décroissant, sans aucun recalcul de seuil ni de tri en TS (le tri vient de la vue) (AD-3, AD-4)

**Given** le contenu mail-safe
**When** on inspecte le HTML généré
**Then** il n'utilise que `<table>` + inline-CSS, aucun flexbox/grid, aucun `<style>` externe ni webfont (AD-9, UX-DR11) ; chaque badge porte une pastille teintée ET un libellé texte (couleur jamais seule), avec les 4 couleurs verrouillées (NFR-5)

**Given** APP_BASE_URL fourni au template
**When** une ligne est rendue
**Then** elle inclut un lien profond ABSOLU `${APP_BASE_URL}/projets/<project_id>` (jamais relatif) (AD-9, UX-DR11)

**Given** un projet multi-signaux et des données budget
**When** le digest est rendu
**Then** il apparaît une fois par section concernée, et AUCUNE information de budget n'apparaît dans l'e-mail (AD-3, AD-9, UX-DR11)

**Given** la microcopie (issue de formatSignal partagé)
**When** on lit les libellés
**Then** le ton est tutoyant, direct et non culpabilisant (« En attente depuis 11 jours », pas « Tu as oublié »), identique au cockpit (UX-DR10, NFR-3)

### Story 4.4: Edge Function daily-digest : lecture des signaux, claim idempotent, skip-si-vide, cohérence temporelle

As a Annec,
I want le cœur de l'Edge Function Deno `daily-digest` qui, pour chaque compte de comptes_a_digester(), lit v_active_signals en service_role avec filtre explicite .eq('user_id',uid), tente un claim optimiste d'idempotence, et n'envoie rien si aucun signal — sans encore brancher Resend ni le cron,
So that le moteur d'envoi est correct et idempotent par construction avant d'y connecter transport et scheduler.

**Ancrage :** Couvre FR-12, NFR-3, NFR-6, NFR-7, AR-7 · AD-8, AD-3, AD-5, AD-2 · Dépend : 4.1, 4.3

**Acceptance Criteria:**

**Given** l'Edge Function initialisant un client Supabase avec `sb_secret_*` (service role) lu via Deno.env.get
**When** elle reçoit une requête sans le header de secret partagé (DIGEST_INVOKE_SECRET) ou invalide
**Then** elle répond 401 ; sb_secret_* n'est jamais exposé ni nommé NEXT_PUBLIC_* (AD-8, AD-2, AD-11)

**Given** comptes_a_digester() renvoie un ou plusieurs comptes (service role bypass RLS)
**When** la fonction itère sur chaque compte
**Then** elle lit v_active_signals via SIGNALS_VIEW avec un filtre EXPLICITE `.eq('user_id', uid)` et agrège via groupSignals/formatSignal partagés, sans aucun calcul de seuil en TS (AD-8, AD-3, AD-4)

**Given** un compte dont v_active_signals renvoie 0 ligne
**When** la fonction le traite
**Then** AUCUN envoi tenté ET AUCUN claim consommé (pas de mail vide) (FR-12, AD-8)

**Given** un compte avec ≥1 signal et digest_last_sent_on déjà = local_today (re-tick)
**When** la fonction tente le claim `update profiles set digest_last_sent_on = local_today where user_id=uid and digest_last_sent_on is distinct from local_today returning *`
**Then** 0 ligne renvoyée → SKIP sans envoyer (pas de double-envoi) (AD-8, AD-5)

**Given** le claim a réussi mais l'étape d'envoi (simulée ici) échoue
**When** l'erreur survient
**Then** la fonction remet digest_last_sent_on à son ANCIENNE valeur (PAS null) et journalise l'échec sans bloquer les autres comptes (AD-8, NFR-7)

**Given** la cohérence temporelle à la frontière de minuit
**When** il est 08:00 Europe/Paris et comptes_a_digester sélectionne l'user ET l'Edge Function lit la vue
**Then** `local_today` du RPC == `today_local` de la vue == date affichée par le cockpit au même instant (zéro décalage) (AD-5, NFR-3)

### Story 4.5: Transport Resend : envoi du digest en fetch brut depuis l'Edge Function

As a Annec,
I want brancher l'envoi réel via un appel `fetch` brut à l'API Resend (zéro dépendance npm) avec le HTML du template (4.3) et l'adresse digest_email, secrets côté serveur uniquement, et gestion d'échec restaurant l'idempotence,
So that le digest part réellement par e-mail à 08:00 locale, fiable et sans fuite de secret.

**Ancrage :** Couvre FR-12, NFR-7, UX-DR11 · AD-9, AD-8, AD-11 · Dépend : 4.3, 4.4

**Acceptance Criteria:**

**Given** le claim d'idempotence a réussi pour un compte avec ≥1 signal (4.4)
**When** la fonction envoie le digest
**Then** elle appelle l'API Resend via `fetch` brut (Authorization: Bearer ${RESEND_API_KEY}), sans dépendance npm, avec le HTML mail-safe (4.3) vers digest_email (AD-9)

**Given** RESEND_API_KEY et APP_BASE_URL
**When** on inspecte leur provenance
**Then** ils sont lus via Deno.env.get depuis les Edge Function Secrets, JAMAIS nommés NEXT_PUBLIC_* ni placés côté Next (AD-9, AD-11)

**Given** Resend répond une erreur (non-2xx) après un claim réussi
**When** l'envoi rate
**Then** la fonction restaure digest_last_sent_on à son ANCIENNE valeur (pas null), journalise l'échec, et continue avec les autres comptes sans planter (AD-8, NFR-7)

**Given** Resend répond 2xx
**When** l'envoi réussit
**Then** digest_last_sent_on reste à local_today et aucun second envoi n'aura lieu au tick horaire suivant (idempotence effective) (AD-8)

**Given** le lien profond de chaque ligne
**When** Annec ouvre l'e-mail reçu
**Then** chaque ligne pointe en absolu vers `${APP_BASE_URL}/projets/<project_id>` et le budget n'apparaît nulle part (AD-9, UX-DR11)

### Story 4.6: Planification : extensions DB + pg_cron horaire + pg_net vers daily-digest, secrets Vault, déploiement (DoD délivrabilité)

As a Annec,
I want activer les extensions DB requises, créer la migration qui planifie un job pg_cron `0 * * * *` (UTC) appelant l'Edge Function via pg_net (net.http_post) avec le secret partagé en header, en stockant les secrets dans supabase_vault, et documenter le déploiement Edge `--no-verify-jwt`,
So that le digest tourne tout seul chaque heure et déclenche l'envoi à 08:00 dans le fuseau du compte, bouclant le parcours sans ouvrir l'app.

**Ancrage :** Couvre FR-12, NFR-7, AR-7, AR-9 · AD-8, AD-5, AD-9, AD-11 · Dépend : 4.1, 4.4, 4.5

**Acceptance Criteria:**

**Given** l'enveloppe opérationnelle et le principe create-only-when-used
**When** la migration de planification est appliquée
**Then** les extensions pg_cron, pg_net et supabase_vault sont activées ICI (premier usage réel), puis un UNIQUE job pg_cron `0 * * * *` (UTC) est créé appelant net.http_post vers l'URL de l'Edge Function daily-digest ; la migration ne crée que les objets de planification (sans recréer table ni vue) (AD-8, AD-11)

**Given** l'appel pg_net vers l'Edge Function
**When** la requête HTTP est construite
**Then** elle inclut le header de secret partagé DIGEST_INVOKE_SECRET lu depuis supabase_vault (jamais en clair dans la migration), de sorte que la fonction réponde 401 à tout appel sans ce secret (AD-8, AD-11)

**Given** le job horaire UTC et la sémantique d'heure locale
**When** le cron tourne chaque heure
**Then** c'est l'Edge Function + comptes_a_digester() qui décident, via `date_part('hour', now() at time zone timezone)=digest_hour`, d'envoyer ou non — le cron ne calcule aucun fuseau (AD-8, AD-5)

**Given** deux ticks horaires consécutifs après un envoi réussi le même jour local
**When** le second tick appelle la fonction
**Then** le claim optimiste renvoie 0 ligne pour ce compte et aucun second e-mail n'est envoyé (idempotence de bout en bout) (AD-8, NFR-7)

**Given** le déploiement et la délivrabilité (hors-code)
**When** on suit la procédure documentée
**Then** daily-digest est déployée avec `--no-verify-jwt` et RESEND_API_KEY/APP_BASE_URL/DIGEST_INVOKE_SECRET/sb_secret_* sont configurés en Edge Secrets / Vault côté Supabase, jamais côté Next (AD-8, AD-9, AD-11)
**And** DEFINITION OF DONE (prérequis prod hors-code) : le domaine d'envoi Resend est vérifié (SPF/DKIM/DMARC) AVANT activation du cron, sinon le digest part en spam (NFR-7, AD-9)
