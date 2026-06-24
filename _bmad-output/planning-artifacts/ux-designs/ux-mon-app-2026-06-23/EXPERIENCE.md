---
title: Vigie — Experience
status: final
created: 2026-06-23
updated: 2026-06-23
sources:
  - ../../prds/prd-mon-app-2026-06-23/prd.md
  - ./DESIGN.md
---

# Vigie — Experience

> Comment Vigie *fonctionne* : IA, comportements, états, interactions, accessibilité, parcours.
> Référence les tokens visuels via `{colors.light.signalSilence}`, `{rounded.card}`, etc.
> **En conflit avec un mock : DESIGN.md (visuel) et ce spine (comportement) gagnent.**

## Foundation

- **Form-factor** : web responsive, **desktop d'abord** (rituel du matin au bureau, grand écran). Mobile supporté (lecture + actions rapides), pas d'app native v1.
- **Système UI** : pas de design system tiers imposé ; composants maison sur Tailwind 4, tokens définis dans DESIGN.md. (shadcn/ui acceptable si ça accélère — à trancher en architecture.)
- **Mono-utilisateur** : un seul opérateur authentifié (Supabase). Aucune notion de rôle, partage ou accès client.
- **Contrainte n°1 : la friction de saisie**. Tenir ~25 projets à jour doit être quasi sans effort, sinon l'outil meurt. Chaque écran est jugé à l'aune de « combien de clics/champs pour rester à jour ».

## Information Architecture

Cinq surfaces. Le **Cockpit** est la maison ; tout le reste est de la saisie/consultation au service du cockpit.

1. **Cockpit** *(home, écran héros)* — triage du matin. Barre de KPIs (4 compteurs de signal) + panneau « À traiter ce matin » : liste dense des éléments en danger, triés par urgence, avec actions rapides en place. Cible : compris et vidé en < 2 min.
2. **Projets** *(liste)* — tous les projets, recherche + filtres légers (client, phase, statut). Quick-add d'un projet. Colonnes : projet · client · phase · dernier contact · cadence. (Budget non affiché ici par défaut — il vit sur la fiche.)
3. **Fiche Projet** *(détail)* — tout l'objet : champs, **KPI budget**, échéances, attentes client, phase courante + actions attendues, notes, action « J'ai contacté ». C'est ici qu'on encode et qu'on suit un projet.
4. **Clients** *(liste + fiche)* — clients avec leur **cadence X**, e-mail (optionnel), notes, et leurs projets rattachés.
5. **Réglages** — modèle de phases & actions attendues (éditable), heure du digest, compte.

**Quick-add global** (transversal, pas une page) : un champ + raccourci clavier accessible partout pour créer Client / Projet / Échéance / Attente en saisie minimale. C'est l'arme anti-friction.

**Références visuelles** : [mockups/cockpit.html](mockups/cockpit.html) (écran héros) · [mockups/fiche-projet.html](mockups/fiche-projet.html) (Fiche Projet). Les spines gagnent en cas de conflit.

*Clôture IA :* chaque besoin du PRD atterrit sur une surface — triage→Cockpit, encodage projet+budget→Fiche Projet, cadence→Client, oublis de phase→Fiche Projet + Cockpit, digest→e-mail. Aucune surface orpheline.

## Voice and Tone

Tutoiement, **direct, concis, orienté action**. Vigie parle comme un bon assistant : il signale, il ne sermonne pas. Pas de jargon, pas d'emoji décoratif.

- Boutons = **verbes à la 1re personne / impératif court** : « J'ai contacté », « Relancé », « Marquer fait ».
- Méta de signal = **fait + chiffre** : « Pas de contact depuis 9 jours (cadence 7) », « Échéance dépassée de 2 jours ».
- État vide = **récompense, pas vide** : « Cockpit vidé ✓ — rien d'autre ne demande ton attention aujourd'hui. »
- Jamais culpabilisant. « En attente depuis 11 jours », pas « Tu as oublié depuis 11 jours ».

## Component Patterns *(comportement ; visuel → DESIGN.md.Components)*

- **signalRow** — un élément de danger. Clic sur le corps → ouvre la Fiche Projet ; clic sur l'action → traite en place sans quitter le cockpit. Un projet cumulant plusieurs signaux apparaît **une fois**, signaux groupés (badges multiples).
- **kpiCard** (compteur) — cliquable : filtre le panneau sur ce type de signal. Re-clic = enlève le filtre.
- **quickAddBar** — input + `⌘/Ctrl-K`. Détecte l'intention au texte ou propose Client/Projet/Échéance/Attente. Saisie réduite au strict requis ; le reste se complète plus tard sur la fiche.
- **Actions rapides** — « J'ai contacté » (primary), « Relancé », « Marquer fait » : un clic, retour optimiste immédiat (l'élément disparaît tout de suite), annulable.
- **Fiche budget** (sur Fiche Projet) — `budget`, `budget consommé`, **% consommé** calculé, barre de progression neutre (vire à `signalEcheance` au-delà d'un seuil d'affichage, ex. 90% — **indicatif, pas un signal de cockpit**).

## State Patterns

- **Cockpit vide** — état cible, valorisé : « Cockpit vidé ✓ ». C'est une réussite, pas une absence.
- **Élément traité** — disparition optimiste immédiate + toast « Fait — annuler ». Si l'action échoue côté serveur, l'élément réapparaît avec une note d'erreur discrète.
- **Chargement** — squelettes de lignes (pas de spinner plein écran) ; le cockpit doit *sembler* instantané.
- **Première utilisation / 0 projet** — onboarding minimal : « Ajoute ton premier client, puis un projet » via le quick-add, pas un wizard.
- **Erreur de saisie** — inline sous le champ, jamais bloquante au-delà du strict requis (nom, cadence).
- **Donnée périmée** (ex. « dernier contact » jamais mis à jour) — la fiche projet signale doucement « dernier contact il y a 23 j » pour inciter à fiabiliser le compteur.

## Interaction Primitives

- **Un clic = un traitement.** Les actions du cockpit ne demandent pas de confirmation (réversibles via undo).
- **Clavier d'abord** : `⌘/Ctrl-K` quick-add ; navigation flèches dans la liste ; `Entrée` ouvre, raccourcis sur les actions de ligne. Le power-user doit pouvoir vider le cockpit sans souris.
- **Optimistic UI** partout sur les actions rapides ; la latence ne doit jamais casser le rythme du matin.
- **Pas de glisser-déposer, pas de réordonnancement manuel** — le tri est piloté par l'urgence, pas par l'utilisateur (et surtout : aucune planification).

## Accessibility Floor

- Contraste **WCAG AA** sur texte et éléments d'UI (cf. DESIGN.md).
- **La couleur n'est jamais seule** : chaque signal porte un libellé texte (Silence / Dépassée / Attente / Phase) en plus de sa couleur.
- Tout actionnable atteignable et activable **au clavier** ; focus visible ; ordre de tabulation logique (KPIs → liste → actions).
- Cibles tactiles ≥ 36px. Respect de `prefers-reduced-motion` (désactive les transitions de disparition).
- Libellés ARIA sur les actions de ligne (« Marquer "Maquettes V2" comme fait »), live region pour les toasts.

## Key Flows

- **KF-1 — Le triage du matin (réalise UJ-1).** Annec ouvre Vigie, déjà authentifié. Le cockpit montre 5 éléments triés. Il scanne les 4 KPIs (3 relances, 2 échéances, 1 attente, 1 phase). Il envoie 3 mails manuellement puis clique « J'ai contacté » sur chaque ligne — **climax : chaque ligne traitée s'efface, le compteur retombe, le panneau se vide**. Il coche « délai posé » sur le projet en livraison. Résolution : « Cockpit vidé ✓ », il referme. Durée cible < 2 min.

- **KF-2 — La relance évitée (réalise UJ-2).** Le projet « Boutique Origan » remonte : badge bleu « Attente — le client doit tester depuis 11 j » (cadence 7 dépassée). Annec relance par mail, clique **« Relancé »** : la date de référence repart à aujourd'hui, l'attente reste **ouverte** (pas résolue), elle quitte le cockpit jusqu'au prochain dépassement. Edge case : si le client a effectivement testé, il choisit plutôt « Résolu » sur la fiche → l'attente se ferme définitivement.

- **KF-3 — Le digest sans ouvrir l'app (réalise UJ-3).** À 8h00, Annec reçoit un e-mail reprenant l'état du cockpit : 3 relances, 2 échéances, 1 attente, 1 action de phase, chacune en une ligne avec lien profond vers la fiche. S'il n'y a rien, **pas d'e-mail** (silence = bonne nouvelle). L'e-mail reprend la même hiérarchie visuelle (badges de signal), version simplifiée compatible mail.

- **KF-4 — Encoder un projet (réalise FR-2 + budget).** Depuis le quick-add, Annec crée « Refonte site / Lumen Studio » (nom + client requis, phase = cadrage par défaut). Sur la fiche, il complète quand il veut : **budget 12 000 €, consommé 3 400 € → 28%**, une échéance, une note. Climax : le projet est suivi sans avoir rempli un formulaire long — la saisie s'est étalée, pas imposée.

## Open / À répercuter

- `[NOTE FOR PM]` Les champs **budget / budget consommé** sur le Projet sont une **évolution du PRD (FR-2)** décidée pendant l'UX — à intégrer côté PRD et modèle de données.
- `[ASSUMPTION]` Seuil d'affichage « budget tendu » = 90% (indicatif sur la fiche, pas un signal cockpit).
- `[ASSUMPTION]` Quick-add via `⌘/Ctrl-K` + détection d'intention ; à valider à l'usage.
