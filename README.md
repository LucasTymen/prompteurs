# Prompteur Pro

Prompteur web pour vidéos et présentations, avec défilement synchronisé sur la musique. Application Next.js (React + TypeScript) qui découpe le texte en syllabes, les fait défiler horizontalement ou verticalement, et les surligne au rythme du morceau.

## Fonctionnalités

- **Défilement vertical ou horizontal** du texte, avec bouclage automatique en mode horizontal.
- **Syllabation française** heuristique (`lib/syllables.ts`) : le texte est segmenté en syllabes surlignables, pas en simples mots.
- **Synchro musicale** (`lib/music.ts`) : la vitesse de défilement est calée sur le BPM et la signature rythmique. Une `MusicClock` partagée sert de source de temps unique pour le défilement et le métronome, ce qui évite toute dérive entre les deux.
- **Métronome visuel muet** indiquant le temps courant (1..N) et le downbeat.
- **Surlignage à trois états** par syllabe :
  - `syl-on` — syllabe sur le marqueur (« sur le temps »)
  - `syl-near` — syllabe en approche (anticipation)
  - `syl` — syllabe déjà passée ou hors fenêtre
- **Tap tempo** : moyenne des intervalles des derniers taps (40–240 BPM).
- **Décalage de départ** (offset en temps) pour caler le texte sur une intro musicale — pendant l'offset, le métronome tourne mais le texte attend.
- **Miroir** (affichage inversé pour un prompteur vitré), **plein écran**, **thème clair/sombre**.
- **Import / export** du texte en `.txt`.
- **Persistance** des réglages et du texte dans `localStorage`.
- **Raccourcis clavier** complets (voir ci-dessous).

## Démarrage

Prérequis : Node.js 18+.

```bash
npm install
npm run dev      # serveur de développement sur http://localhost:3000
```

Build de production :

```bash
npm run build
npm run start
```

Lint :

```bash
npm run lint
```

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| Espace | Play / Pause |
| ← / ↑ | Reculer dans le texte (nudge) |
| → / ↓ | Avancer dans le texte (nudge) |
| H | Bascule horizontal / vertical |
| M | Bascule miroir |
| F | Plein écran |
| T | Bascule thème clair / sombre |
| R | Reset de la position |
| S | Active / désactive la synchro musique |
| B | Tap tempo |

Clic dans la zone de texte (à l'arrêt) pour placer une syllabe sous le marqueur ; molette pour ajuster finement.

## Structure du projet

```
├── app/
│   ├── layout.tsx        # Métadonnées + <body> (thème sombre par défaut)
│   ├── page.tsx          # État global, persistance, raccourcis, orchestration
│   └── globals.css       # Thèmes, layout, surlignage des syllabes
├── components/
│   ├── Prompteur.tsx     # Défilement + surlignage (boucle requestAnimationFrame)
│   ├── MusicSync.tsx     # Panneau de réglages musicaux (BPM, signature, seuils…)
│   ├── Metronome.tsx     # Métronome visuel muet piloté par la clock
│   └── Controls.tsx      # Police, taille, zoom, vitesse manuelle, boutons
├── lib/
│   ├── music.ts          # Signature, BPM, pxPerSecond, classe MusicClock
│   └── syllables.ts      # Heuristique de syllabation française + tokenizer
├── prompteur.html        # Prototype HTML autonome d'origine (vertical)
├── prompteur_doublage.html  # Variante HTML pour doublage
└── package.json
```

## Architecture en bref

- `app/page.tsx` détient l'état global et instancie une `MusicClock` unique. Les paramètres de la clock (BPM, signature, offset) sont poussés via des effets ; play/pause démarre/arrête la clock.
- `Prompteur` lit le temps écoulé depuis la clock à chaque frame (`scrollElapsedMs()`), calcule la position en pixels et applique une transformation CSS. Aucune intégration frame à frame : la position est toujours recalculée depuis le temps écoulé, ce qui garantit l'absence de dérive.
- Le surlignage compare la position écran de chaque syllabe au marqueur central, avec deux seuils (`onThBeats`, `nearThBeats`) exprimés en temps puis convertis en pixels via `pxPerBeat`.
- Les deux fichiers `.html` à la racine sont des prototypes antérieurs à la migration Next.js, conservés pour référence.

## Réglages musicaux

- **BPM** (40–240) ou **Tap tempo** pour le trouver à l'oreille.
- **Signature** : 4/4, 2/4, 3/4, 5/4, 6/8, 7/8, 9/8.
- **Px par temps** : distance parcourue par temps (détermine la vitesse de défilement effective via `pxPerSecond = bpm/60 × pxPerBeat`).
- **Fenêtre « sur le temps »** : demi-largeur (en temps) du surlignage `syl-on`.
- **Anticipation** : limite (en temps) du surlignage `syl-near`.
- **Décalage départ** : nombre de temps d'attente avant que le texte ne défile (le métronome tourne déjà).
