---
title: "Product Brief — Vigie : second cerveau de suivi client"
product_name: Vigie
status: ready
created: 2026-06-23
updated: 2026-06-23
---

# Product Brief : Vigie

## Executive Summary

**Vigie** est un « second cerveau » personnel pour chef de projet digital. Sa promesse tient en une phrase : **chaque matin, savoir exactement quels clients relancer et quels projets sont en danger — sans jamais avoir à y penser la veille.**

Quand on jongle avec ~25 projets clients en parallèle, la charge mentale n'est pas dans *faire* le travail, mais dans **se souvenir de relancer au bon moment** : rappeler à un client qu'il doit tester, reprendre contact avant que le silence ne s'installe, réagir avant qu'une échéance ne dérape. Les oublis ne coûtent pas qu'un retard — ils minent la relation et peuvent se retourner contre soi.

Vigie ne planifie pas le travail (pas de Gantt, pas d'ordonnancement) : **elle surveille**. Deux moteurs de rappel tournent en arrière-plan — l'un sur les **échéances**, l'autre sur une **cadence de relance réglable par client (« tous les X jours »)** — et alimentent un **cockpit de triage matinal** qui ne montre qu'une chose : *ce qui demande mon action aujourd'hui*. L'objectif n'est pas seulement de ne rien oublier, mais de devenir **plus proactif et plus avenant** dans la relation client, par discipline plutôt que par mémoire.

## The Problem

Un chef de projet digital indépendant suit en parallèle ~25 projets, chacun avec son client, son rythme, ses échéances. Le travail de production n'est pas le goulot — **le suivi l'est**.

Concrètement, ce qui fait mal aujourd'hui :

- **L'oubli de relance.** Exemple vécu : oublier de dire à un client qu'il devait **tester** un livrable. Résultat : le projet s'arrête, sans que personne ne s'en aperçoive avant qu'il soit trop tard.
- **Le silence qui s'installe.** Sans rappel, certains clients ne sont pas recontactés assez souvent. Le manque de **« pression bienveillante »** laisse les projets stagner — et l'inaction finit par **se retourner contre le chef de projet**.
- **L'angle mort de la phase.** Au-delà de la relance, il y a le risque d'**oublier l'action que la phase du projet exige** : organiser une campagne de tests, livrer un élément, poser un délai. On sait *vaguement* où en est chaque projet, mais sans rappel explicite, l'action attendue passe à la trappe.
- **La charge mentale dispersée.** L'état de ~25 projets vit dans la tête, des mails, des notes éparses. Aucune vue unique ne répond à la seule question qui compte le matin : *« qui dois-je relancer, quel projet dérape, et qu'est-ce que sa phase attend de moi ? »* Un client mal suivi est un client perdu : le coût n'est pas qu'opérationnel, il est **relationnel et réputationnel**.

## The Solution

Une web app personnelle, mono-utilisateur, qui agit comme une **vigie** : elle ne fait pas le travail à ta place, elle **garde l'œil ouvert en permanence** et ne réclame l'attention que quand une action est nécessaire.

Le rituel cible : **ouvrir l'app le matin → une liste courte et triée de ce qui demande une action aujourd'hui → traiter, marquer fait, refermer.** Quand un client doit être relancé, tu rédiges et envoies le mail **manuellement** (dans un premier temps) ; Vigie déclenche le rappel et tient le compteur à jour.

## Mécanique cœur

Le produit repose sur quatre briques — **trois moteurs de vigilance** et un **cockpit** qui les agrège (c'est le cœur que le PRD devra détailler) :

**1. Moteur « échéances ».** Chaque projet/livrable peut porter une ou plusieurs **échéances datées**. Vigie alerte à **J-3**, **J-1** et **le jour J**, puis au dépassement.

**2. Moteur « cadence de relance ».** Chaque client porte une valeur **X (en jours)**, réglable individuellement. Un **compteur depuis le dernier contact** tourne ; dès qu'il dépasse X, le client remonte dans « à relancer ». Le **dernier contact est mis à jour manuellement** quand tu communiques — c'est cette action qui **remet le compteur à zéro**.

**3. Conscience de phase.** Chaque projet porte une **phase courante** (cadrage → conception → développement → tests → livraison → clôture). Chaque phase porte une courte liste d'**actions attendues** (ex : en phase *tests* → « organiser les tests » ; en phase *livraison* → « livrer », « poser un délai »). Si une action attendue de la phase n'est pas marquée faite, Vigie la fait remonter. Ce n'est **pas de la planification** (aucun ordonnancement, aucune date imposée) : c'est un **filet anti-oubli** calé sur l'étape où tu es.

**4. Cockpit de triage (sans planification).** Une vue unique, orientée action du matin, qui agrège les signaux. Un projet/client y remonte comme **« en danger »** quand au moins un de ces signaux est vrai :
- **Silence trop long** — compteur de cadence > X jours sans contact ;
- **Échéance proche ou dépassée** ;
- **Action client en attente** depuis trop longtemps (ex : « doit tester », « doit valider », « doit fournir un contenu ») ;
- **Action de phase oubliée** — la phase courante attend une action non faite (ex : tests non organisés, livraison non posée, aucun délai fixé).

Le cockpit **n'ordonnance rien** : il ne dit pas *quand faire le travail*, il dit *qui réclame mon attention maintenant et ce que ma phase attend de moi*.

## What Makes This Different

Honnêtement, il n'y a pas de moat technologique — et ce n'est pas le but. La différence est dans le **parti pris** :

- **Anti-planification assumée.** Là où Notion, ClickUp, Asana, Monday cherchent à tout organiser, Vigie **enlève délibérément** la planification pour ne garder que la **vigilance**. La *conscience de phase* n'est pas un retour de la planif déguisé : elle n'ordonnance rien, elle ne fait que **détecter l'action attendue oubliée**. Moins de saisie, moins de friction, une seule question répondue.
- **La cadence par client comme primitive.** Le « tous les X jours réglable par client » n'est pas une option enfouie : c'est le **cœur du produit**. C'est ce qui transforme « j'aurais dû le relancer » en système.
- **Construit pour un seul cerveau.** Pas de collaboration, pas de rôles, pas de configuration d'équipe. L'avantage est la **vitesse d'exécution** et l'**ajustement parfait** à un seul flux de travail — le sien.

## Who This Serves

**Utilisateur unique et principal : le chef de projet digital indépendant** (toi). ~25 projets clients simultanés, chacun à un rythme de suivi différent. Il cherche à passer d'un suivi **réactif et mémoriel** à un suivi **proactif et systématique**, et à projeter une image plus **présente et avenante** auprès de ses clients.

Succès pour lui = **arriver le matin et savoir en 2 minutes quoi faire**, et ne plus jamais se dire « zut, j'ai oublié de le relancer ».

Pas d'utilisateurs secondaires à ce stade. `[ASSUMPTION: si l'outil fait ses preuves, une version multi-utilisateurs pour d'autres CdP est un futur possible — voir Vision]`

## Success Criteria

- **Zéro oubli de relance** : aucun client ne dépasse sa cadence X sans apparaître dans le cockpit.
- **Adoption du rituel** : l'app est ouverte ~chaque matin de travail et le cockpit est « vidé » (actions traitées). `[ASSUMPTION: métrique perso, pas business]`
- **Réduction des dérapages** : moins de projets bloqués faute de relance ; ressenti d'une relation client plus maîtrisée.
- **Friction faible** : tenir les ~25 projets à jour reste rapide (saisie minimale), sinon l'outil sera abandonné.

## Scope

**Dans la v1 (in)**
- Saisie manuelle des projets et clients (client, projet, **phase courante**, échéance(s), cadence X, statut, « en attente de quoi »).
- Moteur d'échéances + moteur de cadence par client.
- **Modèle de phases léger** avec une liste d'actions attendues par phase (filet anti-oubli).
- Cockpit de triage matinal avec les **4 signaux de danger**.
- Action « j'ai contacté / fait » qui remet les compteurs à jour et coche les actions de phase.
- **Digest e-mail quotidien** : un résumé matinal poussé (« voici tes relances et tes points de danger du jour »).

**Explicitement hors scope (out)**
- **Toute planification / ordonnancement** : pas de Gantt, pas de dépendances, pas d'agenda de tâches.
- **Envoi automatique de mails au client** (les rappels s'adressent à soi ; l'envoi reste manuel en v1).
- **Collaboration / multi-utilisateurs / rôles.**
- **Time tracking, facturation, gestion de ressources.**

**Canal de notification (v1)** : le cockpit in-app est le canal principal, doublé du digest e-mail quotidien ci-dessus.

## Vision

Si le rituel s'installe et tient, Vigie devient le **réflexe quotidien de suivi client** — l'endroit unique où la vigilance vit, hors de la tête. Extensions naturelles, par ordre de valeur pressentie :

1. **Assistance à la communication** — passer du rappel (« relance X ») au **brouillon de mail proposé**, voire à l'**envoi semi-automatique**, pour rendre la relance plus rapide et plus avenante.
2. **Cadence intelligente** — X qui s'ajuste selon la phase du projet ou le comportement du client, plutôt qu'une valeur fixe.
3. **Détection automatique du contact** — intégration e-mail/agenda pour remettre le compteur à zéro sans saisie manuelle (lève le principal point de friction).
4. **Ouverture à d'autres chefs de projet** si l'outil prouve sa valeur en solo.

## Risques & inconnues (en toute honnêteté)

- **La saisie manuelle est le talon d'Achille.** Si tenir ~25 projets à jour est pénible, l'outil meurt. La friction de saisie est le risque n°1.
- **Le « dernier contact » dépend d'une discipline manuelle** — si on oublie de marquer un contact, la cadence ment. À surveiller (intégration mail = piste future, hors v1).
- **Définir « action client en attente »** proprement (états, relance, résolution) demande un peu de modélisation — à creuser au PRD.
