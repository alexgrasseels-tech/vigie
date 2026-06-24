---
title: Vigie
status: final
created: 2026-06-23
updated: 2026-06-23
revision: "budget KPI ajouté au Projet (FR-2) pendant l'UX — 2026-06-23"
source_brief: _bmad-output/planning-artifacts/briefs/brief-mon-app-2026-06-23/brief.md
---

# PRD : Vigie
*Titre de travail — confirmé.*

## 0. Document Purpose

Ce PRD traduit le [brief Vigie](../../briefs/brief-mon-app-2026-06-23/brief.md) en exigences implémentables. Il s'adresse au binôme **PM + développeur (toi)** et aux workflows BMAD en aval (architecture, epics & stories). Vocabulaire ancré dans le **Glossaire** (§3), features groupées avec FR numérotées globalement (FR-N, IDs stables), hypothèses taguées `[ASSUMPTION]` en ligne et indexées en §9. Les choix techniques (transport e-mail, planificateur, schéma SQL précis) ne vivent **pas** ici : ils iront dans l'`addendum.md` / l'architecture. Contrainte de plateforme héritée du brief (détaillée en architecture) : Next.js 16 / Supabase / Tailwind 4 / TypeScript.

## 1. Vision

**Vigie** est un second cerveau personnel de suivi client pour un chef de projet digital indépendant qui jongle avec ~25 projets en parallèle. Le produit n'organise pas le travail (pas de planification) : il **surveille** et déclenche l'attention au bon moment.

Chaque matin, Vigie répond à une seule question : *« qui dois-je relancer, quel projet est en danger, et qu'est-ce que sa phase attend de moi ? »* Deux moteurs tournent en arrière-plan — l'un sur les **échéances**, l'autre sur une **cadence de relance réglable par client** — complétés par une **conscience de phase** qui détecte l'action attendue oubliée. Le tout converge dans un **cockpit de triage matinal** et un **digest e-mail quotidien**.

L'enjeu n'est pas que technique : c'est de transformer un suivi réactif et mémoriel en discipline systématique, et de rendre la relation client plus présente et plus avenante.

## 2. Target User

### 2.1 Jobs To Be Done

- **Quand** j'arrive le matin, **je veux** voir en 2 minutes qui relancer et quel projet dérape, **afin de** ne plus rien oublier et d'agir avant que ce soit trop tard.
- **Quand** je communique avec un client, **je veux** remettre son compteur de relance à zéro d'un geste, **afin de** ne pas le harceler ni l'oublier.
- **Quand** un projet change de phase, **je veux** être rappelé de l'action que cette phase exige (organiser les tests, livrer, poser un délai), **afin de** ne pas laisser un projet bloqué par mon propre oubli.
- **Quand** j'attends une action d'un client (tester, valider, fournir un contenu), **je veux** que ça remonte si ça traîne, **afin de** mettre une pression bienveillante au bon moment.

### 2.2 Non-Users (v1)

Équipes / collaborateurs, clients eux-mêmes (aucun accès client), autres chefs de projet. Vigie est **mono-utilisateur** : un seul opérateur, le propriétaire du compte.

### 2.3 Key User Journeys

- **UJ-1. Le triage du matin.** Annec, chef de projet, ouvre Vigie avec son café. Déjà authentifié. Le cockpit affiche une liste courte triée : *3 clients à relancer* (cadence dépassée), *2 échéances à J-1*, *1 projet où le client doit tester depuis 9 jours*, *1 projet en phase « livraison » sans délai posé*. Il traite : envoie 3 mails manuellement, et pour chacun clique **« J'ai contacté »** (le compteur retombe à zéro). Il coche « délai posé » sur le projet en livraison. Cockpit vidé, il referme. **Valeur livrée :** rien d'oublié, en 5 minutes.

- **UJ-2. La relance qui n'arrive jamais (évitée).** Un client devait tester un livrable. Annec l'a noté comme **attente client** il y a 8 jours. La cadence de ce client est X=7. Ce matin, le projet remonte en danger (« action client en attente depuis 8j »). Annec relance ; il clique **« Relancé »** sur l'attente — le compteur repart, l'attente reste ouverte jusqu'à résolution.

- **UJ-3. Le digest sans ouvrir l'app.** À 8h, Annec reçoit un e-mail : *« 3 relances, 2 échéances, 1 action de phase en attente aujourd'hui. »* Il sait quoi faire avant même d'ouvrir Vigie.

## 3. Glossary

- **Client** — Une entité avec qui Annec travaille. Porte une **cadence** (X jours) propre. Possède 1..N **Projets**.
- **Projet** — Un travail suivi pour un Client. Porte une **Phase courante**, une **date de dernier contact**, un statut (actif / en pause / terminé), des **KPI budget** (budget alloué, budget consommé → % consommé), des **notes**, 0..N **Échéances** et 0..N **Attentes client**.
- **Cadence (X)** — Délai en jours, réglable par Client, au-delà duquel l'absence de contact déclenche le signal **Silence trop long**.
- **Dernier contact** — Date du dernier échange avec le Client, mise à jour **manuellement** via l'action **« J'ai contacté »**. Remet le compteur de cadence à zéro.
- **Échéance** — Date rattachée à un Projet (livrable, jalon). Déclenche des alertes à J-3, J-1 et le jour J, puis au dépassement.
- **Phase** — Étape du cycle de vie d'un Projet, parmi un ordre fixe : *cadrage → conception → développement → tests → livraison → clôture*. Chaque Phase porte 0..N **Actions attendues**.
- **Action attendue** — Tâche-type associée à une Phase (ex. *tests → « organiser les tests »*). Tant qu'elle n'est pas marquée faite pour le Projet en cette Phase, elle peut déclencher le signal **Action de phase oubliée**.
- **Attente client** — Une action qu'Annec attend d'un Client (tester, valider, fournir un contenu…). A un statut : *en attente → relancée → résolue / abandonnée*. Sa **date de référence** = sa date d'ouverture, repositionnée à aujourd'hui à chaque action « Relancé ». Déclenche le signal **Action client en attente** quand `aujourd'hui − date de référence > cadence X` du Client (même seuil que le Silence trop long).
- **Signal de danger** — Une des 4 conditions qui font remonter un Projet/Client dans le cockpit : Silence trop long, Échéance proche/dépassée, Action client en attente, Action de phase oubliée.
- **Cockpit** — Vue unique de triage matinal qui agrège les Signaux de danger en éléments d'action.
- **Digest** — E-mail quotidien récapitulant les éléments d'action du jour.

## 4. Features

### 4.1 Saisie & modèle de suivi

**Description :** Annec saisit et tient à jour manuellement ses Clients, Projets, Échéances et Attentes client. La saisie doit être **minimale et rapide** (risque n°1 du produit : si tenir ~25 projets à jour est pénible, l'outil meurt). Réalise UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1 : Gérer les Clients
Annec peut créer / éditer / archiver un Client. Champs : **nom** (requis), **cadence X en jours** (requis ; pré-rempli à `[ASSUMPTION: 7]`, modifiable), **e-mail** (optionnel), **notes** (optionnel).
**Consequences (testable):**
- Un Client sans cadence ne peut être enregistré (X requis, entier ≥ 1).
- Archiver un Client masque ses Projets du cockpit sans les supprimer.

#### FR-2 : Gérer les Projets
Annec peut créer / éditer / clore un Projet rattaché à un Client. Champs : **nom** (requis), **Client** (requis), **Phase courante** (requis, défaut `cadrage`), **statut** (actif / en pause / terminé), **date de dernier contact** (défaut = date de création), **budget** (montant alloué, optionnel), **budget consommé** (optionnel), **notes**.
**Consequences (testable):**
- Un Projet `terminé` ou `en pause` ne génère aucun Signal de danger.
- Changer la Phase courante recalcule les Actions attendues applicables (FR-8, FR-9).
- Si `budget` et `budget consommé` sont renseignés, la fiche Projet affiche le **% consommé**. Ce KPI est **informatif** : il ne génère **aucun** Signal de danger (le cockpit garde ses 4 signaux). C'est de la **santé projet**, pas de la facturation.

#### FR-3 : Gérer les Échéances
Annec peut ajouter 0..N Échéances datées à un Projet. Champs : **libellé**, **date** (requise), **statut** (à venir / faite).
**Consequences (testable):**
- Marquer une Échéance « faite » la retire des Signaux de danger.

#### FR-4 : Gérer les Attentes client
Annec peut ouvrir une Attente client sur un Projet. Champs : **type/libellé** (liste libre avec suggestions : tester, valider, fournir un contenu…), **date d'ouverture** (défaut aujourd'hui), **statut** (en attente / relancée / résolue / abandonnée).
**Consequences (testable):**
- Une Attente `résolue` ou `abandonnée` ne déclenche plus de signal.
- Une Attente `en attente`/`relancée` déclenche le signal Action client en attente quand `aujourd'hui − date de référence > cadence X` du Client.
- L'action **« Relancé »** sur une Attente repositionne sa date de référence à aujourd'hui et passe le statut à `relancée`, sans la fermer.

#### FR-5 : Action « J'ai contacté »
Depuis un Projet ou un Client, Annec peut enregistrer un contact en un geste.
**Consequences (testable):**
- L'action met `date de dernier contact` = aujourd'hui **sur le Projet**, ce qui remet son compteur de cadence à zéro. Un Client à 3 Projets a donc 3 compteurs indépendants.
- L'action est journalisée (date) pour audit `[ASSUMPTION: historique simple des contacts]`.

### 4.2 Moteur d'échéances

**Description :** Surveille les Échéances et produit des alertes temporelles. Réalise UJ-1.

#### FR-6 : Alertes d'échéance
Le système signale chaque Échéance `à venir` à **J-3**, **J-1**, **le jour J**, puis tant qu'elle est **dépassée** et non faite.
**Consequences (testable):**
- Le palier affiché est le **dernier palier franchi** : à 3 jours → « J-3 » ; à 1 jour → « J-1 » ; à 0 jour → « jour J » ; à -1 jour → « dépassée ». (Une Échéance à 2 jours reste au palier « J-3 » jusqu'à franchir J-1.)
- Les fenêtres J-3/J-1/J0 sont des constantes v1 (non configurables).

### 4.3 Moteur de cadence de relance

**Description :** Pour chaque Client, un compteur « jours depuis le dernier contact » tourne ; le dépassement de la cadence X déclenche le signal Silence trop long. C'est la primitive cœur du produit. Réalise UJ-1, UJ-2.

#### FR-7 : Signal « Silence trop long »
Le système calcule `jours_depuis_contact = aujourd'hui − date de dernier contact` par Projet, et le compare à la cadence X du Client.
**Consequences (testable):**
- Si `jours_depuis_contact > X`, le Projet remonte « à relancer » dans le cockpit.
- L'action « J'ai contacté » (FR-5) fait immédiatement retomber le signal.
- Un Projet `en pause`/`terminé` est exclu du calcul.

### 4.4 Conscience de phase

**Description :** Chaque Phase porte des Actions attendues ; celles non faites pour la Phase courante d'un Projet remontent comme oubli. **Ce n'est pas de la planification** : aucun ordonnancement, aucune date imposée. Réalise UJ-1.

#### FR-8 : Modèle de phases & actions attendues
Le système fournit l'ordre de phases fixe et une liste d'Actions attendues par phase, éditable par Annec `[ASSUMPTION: valeurs initiales pré-remplies — ex. tests → « organiser les tests » ; livraison → « livrer », « poser un délai de retour »]`.
**Consequences (testable):**
- Annec peut ajouter/retirer une Action attendue d'une Phase ; le changement s'applique aux Projets dans cette Phase.

#### FR-9 : Signal « Action de phase oubliée »
Pour un Projet, le système compare les Actions attendues de sa Phase courante à celles marquées faites.
**Consequences (testable):**
- Toute Action attendue de la Phase courante non marquée faite remonte dans le cockpit **dès l'entrée en phase** (déclenchement immédiat, sans délai de grâce).
- Marquer l'Action faite la retire du cockpit.

### 4.5 Cockpit de triage matinal

**Description :** Vue unique, orientée action, qui agrège les 4 Signaux de danger en une liste courte et triée, avec actions rapides en place (« J'ai contacté », « Relancé », « Marquer fait »). Réalise UJ-1, UJ-2.

#### FR-10 : Agrégation des signaux
Le cockpit liste tout Projet/Client présentant ≥ 1 Signal de danger actif, chaque élément indiquant **quel** signal et **depuis quand**.
**Consequences (testable):**
- Les 4 types de signaux (Silence trop long, Échéance proche/dépassée, Action client en attente, Action de phase oubliée) sont représentés et distinguables.
- Un Projet cumulant plusieurs signaux apparaît une fois, signaux groupés `[ASSUMPTION]`.
- Tri par défaut : urgence `[ASSUMPTION: dépassé > jour J > J-1 > J-3 ; puis ancienneté]` — à confirmer.

#### FR-11 : Actions rapides depuis le cockpit
Annec peut traiter un élément sans quitter le cockpit : « J'ai contacté » (FR-5), « Relancé » (FR-4), « Marquer fait » (échéance/action de phase), ouvrir le Projet.
**Consequences (testable):**
- Après action, l'élément résolu disparaît du cockpit immédiatement.
- « Cockpit vidé » est un état atteignable et visible.

### 4.6 Digest e-mail quotidien

**Description :** Un e-mail récapitulatif poussé chaque matin pour agir sans ouvrir l'app. Réalise UJ-3.

#### FR-12 : Digest quotidien
Un traitement planifié recompute l'état du cockpit et envoie à Annec un e-mail listant les éléments d'action du jour, à une heure configurable `[ASSUMPTION: 8h00, fuseau du compte]`.
**Consequences (testable):**
- Le digest reflète l'état du cockpit au moment de l'envoi (mêmes signaux).
- S'il n'y a aucun élément, **pas d'envoi** (silence si rien à signaler).
- Échec d'envoi journalisé sans bloquer l'app.

**Feature-specific NFRs :**
- L'envoi e-mail dépend d'un service externe (transport à décider en architecture — Resend/SMTP/Supabase). Le « comment » va à l'`addendum`.

## 5. Non-Goals (Explicit)

- **Aucune planification / ordonnancement** : pas de Gantt, pas de dépendances entre tâches, pas d'agenda. Vigie surveille, n'organise pas.
- **Aucun envoi automatique de mail au client** : les rappels s'adressent à Annec ; l'envoi reste manuel en v1.
- **Aucune collaboration / multi-utilisateur / rôles / accès client.**
- **Ni time tracking, ni facturation, ni gestion de ressources.**
- **Pas d'intégration e-mail/agenda en v1** (détection auto du contact = vision future).

## 6. MVP Scope

### 6.1 In Scope
- Modèle de suivi : Clients, Projets, Phases, Échéances, Attentes client (FR-1→FR-5).
- KPI budget sur la fiche Projet (budget / consommé / % — informatif, hors cockpit).
- Moteur d'échéances J-3/J-1/J0 (FR-6).
- Moteur de cadence par client + « J'ai contacté » (FR-5, FR-7).
- Conscience de phase + actions attendues éditables (FR-8, FR-9).
- Cockpit de triage avec les 4 signaux + actions rapides (FR-10, FR-11).
- Digest e-mail quotidien (FR-12).
- Auth mono-utilisateur (Supabase).

### 6.2 Out of Scope for MVP
- Brouillon/envoi de mail assisté — *vision v2* `[NOTE FOR PM: émotionnellement central pour "être plus avenant" ; à reconsidérer tôt]`.
- Cadence intelligente (X auto-ajusté) — *v2*.
- Détection automatique du contact (intégration mail/agenda) — *v2*, lève la friction n°1.
- Configurabilité des fenêtres d'échéance et délais de grâce — *v1.x si besoin*.
- App mobile native — web responsive seulement en v1.

## 7. Success Metrics

- **SM-1 (primaire)** : *Zéro oubli de relance* — aucun Client ne dépasse sa cadence X sans apparaître au cockpit. Valide FR-7, FR-10.
- **SM-2 (adoption)** : Vigie est ouverte ~chaque matin ouvré et le cockpit est « vidé ». Valide FR-10, FR-11.
- **SM-3 (effet)** : Moins de projets bloqués faute de relance ; ressenti d'une relation client plus maîtrisée. Valide FR-7, FR-9.
- **SM-C1 (contre-métrique)** : *Ne pas* optimiser le volume de relances — relancer plus souvent n'est pas l'objectif ; harceler un client est un échec. Contrebalance SM-1.
- **SM-C2 (contre-métrique)** : *Ne pas* maximiser le nombre de champs saisis — chaque champ ajouté augmente la friction qui peut tuer l'outil. Contrebalance toute tentation de « cockpit riche ».

## 8. Décisions de modélisation (tranchées)

Les 5 points initialement ouverts ont été **tranchés** (cf. journal de décisions) :
1. Action de phase oubliée → **déclenchement immédiat**, sans délai de grâce. ✅ (FR-9)
2. Seuil « Attente client » → **réutilise la cadence X** du Client. ✅ (§3, FR-4)
3. « J'ai contacté » → reset **au niveau Projet**. ✅ (FR-5)
4. Digest vide → **pas d'envoi**. ✅ (FR-12)
5. Types d'« Attente client » → **liste libre + suggestions**. ✅ (FR-4)

Aucune question bloquante restante pour passer à l'architecture / aux epics.

## 9. Assumptions Index

*Hypothèses résiduelles à faible enjeu, à confirmer à l'usage (non bloquantes) :*
- FR-1 — Cadence X par défaut = 7 jours.
- FR-5 — Historique simple des contacts journalisé (date) pour audit.
- FR-6 — On affiche le palier d'échéance franchi le plus proche ; fenêtres J-3/J-1/J0 non configurables en v1.
- FR-8 — Actions attendues par phase pré-remplies avec des valeurs initiales par défaut, puis éditables.
- FR-10 — Projet multi-signaux affiché une fois (signaux groupés) ; tri par défaut par urgence (dépassé > jour J > J-1 > J-3) puis ancienneté.
- FR-12 — Digest envoyé à 8h00 (fuseau du compte).
