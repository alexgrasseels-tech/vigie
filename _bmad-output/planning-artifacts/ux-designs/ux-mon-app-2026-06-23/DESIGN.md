---
title: Vigie — Design
status: final
created: 2026-06-23
updated: 2026-06-23
sources:
  - ../../prds/prd-mon-app-2026-06-23/prd.md
colors:
  light:
    bg: "#f6f7f9"
    surface: "#ffffff"
    surfaceAlt: "#fafbfc"
    line: "#e6e8eb"
    text: "#1c2024"
    textMuted: "#6b7280"
    primary: "#4f46e5"        # indigo — marque & CTA principal
    primaryText: "#ffffff"
    signalSilence: "#dc2626"  # rouge — silence trop long / relance
    signalEcheance: "#ea8a00" # ambre — échéance proche/dépassée
    signalAttente: "#2563eb"  # bleu — action client en attente
    signalPhase: "#7c3aed"    # violet — action de phase oubliée
    ok: "#059669"             # vert — résolu / cockpit vidé
  dark:
    bg: "#101418"
    surface: "#181d23"
    surfaceAlt: "#1f2630"
    line: "#262d36"
    text: "#e7ecf2"
    textMuted: "#8b97a6"
    primary: "#818cf8"
    primaryText: "#0b1020"
    signalSilence: "#ff6369"
    signalEcheance: "#f1a83a"
    signalAttente: "#60a5fa"
    signalPhase: "#a78bfa"
    ok: "#2dd4bf"
typography:
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  fontFamilyMono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
  scale:
    display: "19px/700"
    h2: "13px/600"
    body: "14px/400"
    meta: "12.5px/400"
    micro: "11px/600"
rounded:
  badge: "999px"
  control: "8px"
  card: "10px"
  panel: "12px"
spacing:
  base: "4px"
  rowY: "13px"
  rowX: "16px"
  gap: "10px"
components:
  - button
  - badge
  - kpiCard
  - signalRow
  - panel
  - quickAddBar
---

# Vigie — Design

> Identité visuelle de Vigie (le *comment ça rend*). Dérivée de la direction **« Tableau clair »**.
> EXPERIENCE.md référence ces tokens par nom : `{colors.light.signalSilence}`, `{rounded.card}`, etc.
> **En conflit avec un mock : ce spine gagne.**

## Brand & Style

Vigie est un **outil d'opérateur sobre et net**, pas une app grand public. Le registre visuel est celui de Linear / Height : fond clair, lignes franches, typographie système, **zéro décoration**. La couleur est un **outil fonctionnel** — elle ne sert qu'à coder les signaux de danger, jamais à embellir. Tout le reste vit en niveaux de gris pour que l'œil aille droit à ce qui demande une action.

Principe directeur : **la couleur = un signal**. Si quelque chose est coloré, c'est que ça réclame ton attention. Le calme visuel est une fonctionnalité (le produit lutte contre la charge mentale, il ne doit pas en ajouter).

Mode clair par défaut, **mode sombre automatique** (`prefers-color-scheme`) avec la même grammaire.

## Colors

Deux thèmes (clair/sombre) aux mêmes rôles sémantiques (frontmatter `colors`). Les **4 couleurs de signal** sont le cœur du système et ne doivent jamais être réaffectées à autre chose :

- `signalSilence` (rouge) — **Silence trop long** / à relancer.
- `signalEcheance` (ambre) — **Échéance** proche ou dépassée.
- `signalAttente` (bleu) — **Action client en attente**.
- `signalPhase` (violet) — **Action de phase oubliée**.

`primary` (indigo) est réservé au **CTA principal** (« J'ai contacté ») et à la marque — volontairement distinct du bleu de signal pour éviter toute confusion action/alerte. `ok` (vert) ne sert qu'aux états résolus (« cockpit vidé »). Surfaces et textes : neutres uniquement.

Contraste : tout texte sur surface vise **WCAG AA** (≥ 4.5:1 corps, ≥ 3:1 large). Les badges colorés portent toujours un **libellé texte** — la couleur n'est jamais le seul porteur d'information (cf. accessibilité).

## Typography

Police **système** (pas de webfont — perf et sobriété). Mono réservé aux compteurs numériques optionnels (jours, %). Échelle resserrée (frontmatter `typography.scale`) : un seul niveau de titre de section (`h2`), le corps à 14px, la méta à 12.5px. Graisses : 700 (marque/KPI chiffres), 600 (titres de section, libellés projet), 400 (corps/méta).

## Layout & Spacing

Base **4px**. Conteneur centré **max ~1040px** (desktop d'abord). Le cockpit s'organise en : barre de KPIs (compteurs par type de signal) → un **panneau unique** « À traiter ce matin » → liste de lignes denses. Lignes en grille `[badge | contenu | action]`, hauteur compacte (`spacing.rowY` 13px). Responsive : sous ~720px, la grille de ligne passe en empilé, KPIs en 2×2, actions pleine largeur.

## Elevation & Depth

Quasi plat. **Pas d'ombres portées** en usage normal — la hiérarchie vient des bordures (`line`) et des fonds (`surface` vs `bg`). Seuls les éléments **flottants** (modale de quick-add, menu) portent une ombre douce. Profondeur = bordure + contraste de fond, pas le drop-shadow.

## Shapes

Coins : `rounded.control` 8px (boutons, champs), `rounded.card` 10px (cartes KPI), `rounded.panel` 12px (panneaux), `rounded.badge` plein (pastilles de signal). Cohérence stricte — pas de rayon ad hoc.

## Components

- **button** — `control` radius. *Primary* : fond `primary`, texte `primaryText` (réservé « J'ai contacté »). *Default* : fond `surface`, bordure `line`. Tailles : md (actions de ligne), sm (quick actions secondaires). Hauteur ≥ 36px (cible tactile).
- **badge** — pastille `badge` radius, fond teinté clair + texte de la couleur de signal correspondante. **Toujours un mot** (Silence / Dépassée / Attente / Phase / J-1), jamais la couleur seule.
- **kpiCard** — `card` radius, chiffre en 22px/700 coloré par type de signal + libellé `meta`. Sert de compteur et de filtre (cliquable).
- **signalRow** — grille `[badge | {projet · client + méta} | action]`. Hover : fond `surfaceAlt`. La méta met en gras (couleur `signalSilence`) le chiffre critique (« depuis **9 j** »).
- **panel** — conteneur `panel` radius, bordure `line`, en-tête avec titre `h2` + compteur d'éléments.
- **quickAddBar** — champ d'ajout rapide persistant (cf. EXPERIENCE.md, friction = risque n°1) : un input + raccourci clavier, ouvre la saisie minimale.

## Do's and Don'ts

- **Do** réserver la couleur aux signaux ; tout le reste en gris.
- **Do** garder une seule densité, une seule échelle de rayons, une typo système.
- **Do** afficher un libellé texte sur chaque badge coloré.
- **Don't** ajouter d'ombres, dégradés, illustrations ou couleurs décoratives.
- **Don't** introduire des vues de planification (Gantt, calendrier, timeline) — interdit par le produit.
- **Don't** réutiliser une couleur de signal pour un usage non-signal (ex. bleu signal pour un lien).

## Références visuelles

Rendus HTML 1:1 qui matérialisent ce spine (le spine gagne en cas de conflit) :
- [mockups/cockpit.html](mockups/cockpit.html) — écran héros (direction « Tableau clair »).
- [mockups/fiche-projet.html](mockups/fiche-projet.html) — Fiche Projet (budget, échéances, attentes, phase).
