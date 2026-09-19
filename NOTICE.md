# Notice technique — SquidSpeakerine

Mode d'emploi et documentation technique du prompteur web synchronisé à la musique.

---

## 1. Présentation

SquidSpeakerine est une application web (Next.js + React + TypeScript) qui fait défiler du texte découpé en syllabes, horizontalement ou verticalement, et les surligne au rythme d'un morceau. Elle est pensée pour les vidéos, présentations et le doublage : le texte démarre près de la ligne de repère, un compte à rebours 3-2-1 précède la mise en lecture, et l'utilisateur peut réajuster manuellement le texte à la souris ou au doigt, même pendant le défilement.

- Aucune dépendance externe : Next.js, React, TypeScript uniquement.
- 100 % côté client : pas de serveur ni de base de données.
- Persistance des réglages et du texte dans le `localStorage` du navigateur.

---

## 2. Installation et démarrage

Prérequis : Node.js 18+.

```bash
npm install
npm run dev
```

L'application est disponible sur `http://localhost:3000`.

Build de production :

```bash
npm run build
npm run start
```

Lint :

```bash
npm run lint
```

---

## 3. Interface

La page est organisée en six zones, de haut en bas :

1. **Métronome visuel** (haut) — n'apparaît que si la synchro musique est activée. Affiche le tempo (BPM) et le temps courant (1..N), avec le downbeat (premier temps) distingué.
2. **Zone de défilement** — le texte découpé en syllabes, avec la ligne de repère (marqueur) au centre. C'est ici que se font la lecture, le glisser-déposer et le clic.
3. **Éditeur de texte** — zone de saisie + boutons Importer / Exporter `.txt`.
4. **Contrôles** — police, taille, zoom, vitesse manuelle, Play/Pause, Reset, Miroir, Horizontal/Vertical, Plein écran, Thème.
5. **Synchro musique** — BPM, signature, tap tempo, px par temps, seuils de surlignage, décalage de départ.
6. **Raccourcis clavier** — résumé en bas de page.

---

## 4. Mode d'emploi

### 4.1 Saisir ou importer du texte

- Saisir directement dans la zone d'édition. Le texte s'applique au prompteur quand la zone perd le focus (clic ailleurs, Espace, etc.).
- Ou cliquer **Importer .txt** pour charger un fichier texte.
- **Exporter .txt** enregistre le contenu courant dans `prompteur.txt`.

### 4.2 Lancer la lecture

- Appuyer sur **Play** ou **Espace** : un compte à rebours 3-2-1 plein écran s'affiche avec effet de zoom, puis le défilement démarre.
- Pendant le compte à rebours, le bouton Play devient **Annuler**. Un nouvel appui sur Espace ou sur ce bouton annule le compte à rebours.
- Le texte démarre au niveau de la ligne de repère (marqueur central), pas au bord de l'écran.

### 4.3 Réajuster manuellement le texte (glisser-déposer)

- Glisser le texte à la souris ou au doigt dans la zone de défilement, **play ou pas**.
- Le déplacement prend le pas sur l'auto-scroll : tant qu'on tient le texte, il ne défile pas.
- Au relâcher, l'auto-scroll reprend **exactement depuis la position relâchée**, sans saut et sans désynchroniser le métronome.
- Un simple clic (sans glisser) sur une syllabe, à l'arrêt, place cette syllabe sous le marqueur.
- La molette, à l'arrêt, déplace le texte par petits pas (nudge).

### 4.4 Raccourcis clavier

| Touche | Action |
|--------|--------|
| Espace | Play / Pause / Annuler le compte à rebours |
| ← / ↑ | Reculer dans le texte (nudge) |
| → / ↓ | Avancer dans le texte (nudge) |
| H | Bascule horizontal / vertical |
| M | Bascule miroir (affichage vitré) |
| F | Plein écran |
| T | Bascule thème clair / sombre |
| R | Reset de la position |
| S | Active / désactive la synchro musique |
| B | Tap tempo |

### 4.5 Affichage et ergonomie

- **Mode vertical** : le texte défile de bas en haut, marqueur horizontal au centre.
- **Mode horizontal** : le texte défile de droite à gauche, marqueur vertical au centre, bouclage automatique quand le texte sort.
- **Miroir** : inverse l'affichage horizontalement (utile pour un prompteur vitré réfléchi).
- **Plein écran** : met l'application en plein écran navigateur.
- **Thème** : bascule entre sombre (par défaut) et clair.
- **Police** : Arial, Verdana, Georgia, Courier New.
- **Taille** : 20 à 80 px.
- **Zoom** : 0.5× à 2×.

---

## 5. Synchro musicale

La synchro musicale cale la vitesse de défilement sur le tempo et la signature rythmique. Activée par le bouton **Synchro musique** ou la touche **S**.

### 5.1 Réglages

| Réglage | Plage | Rôle |
|---------|-------|------|
| BPM | 40–240 | Tempo du morceau. Ou **Tap tempo** (touche B ou bouton TAP) : moyenne des derniers taps. |
| Signature | 4/4, 2/4, 3/4, 5/4, 6/8, 7/8, 9/8 | Nombre de temps par mesure (pilote le métronome). |
| Px par temps | 20–400 | Distance parcourue par temps. Vitesse effective = `bpm/60 × pxPerBeat`. |
| Fenêtre « sur le temps » | 0.1–2 tps | Demi-largeur du surlignage fort (`syl-on`) autour du marqueur. |
| Anticipation | 0.5–6 tps | Limite du surlignage d'approche (`syl-near`). |
| Décalage départ | 0–16 tps | Temps d'attente avant que le texte ne défile : le métronome tourne déjà, le texte attend. |

### 5.2 Surlignage des syllabes

Chaque syllabe reçoit une classe CSS selon sa distance au marqueur (mesurée en temps, convertie en pixels via `pxPerBeat`) :

- `syl-on` — syllabe sur le marqueur (« sur le temps ») : surlignage fort.
- `syl-near` — syllabe en approche (anticipation) : couleur douce.
- `syl` — syllabe déjà passée ou hors fenêtre : aspect normal.

### 5.3 Mode manuel

Si la synchro musique est désactivée, le défilement utilise la **vitesse manuelle** (5–300 px/s), indépendante du tempo. Le métronome est masqué.

---

## 6. Documentation technique

### 6.1 Arborescence

```
├── app/
│   ├── layout.tsx            # Métadonnées + <body> (thème sombre par défaut)
│   ├── page.tsx              # État global, persistance, raccourcis, compte à rebours
│   └── globals.css           # Thèmes, layout, surlignage, compte à rebours
├── components/
│   ├── Prompteur.tsx         # Défilement + surlignage + glisser-déposer (boucle rAF)
│   ├── Countdown.tsx         # Overlay 3-2-1 avec animation zoom
│   ├── MusicSync.tsx         # Panneau de réglages musicaux
│   ├── Metronome.tsx         # Métronome visuel muet piloté par la clock
│   └── Controls.tsx          # Police, taille, zoom, vitesse, boutons
├── lib/
│   ├── music.ts              # Signature, BPM, pxPerSecond, classe MusicClock
│   └── syllables.ts          # Syllabation française heuristique + tokenizer
├── prompteur.html            # Prototype HTML autonome d'origine
├── prompteur_doublage.html   # Variante HTML pour doublage
└── package.json
```

### 6.2 Source de temps unique : `MusicClock`

`lib/music.ts` définit une classe `MusicClock` instanciée une seule fois dans `app/page.tsx`. Elle est partagée par le défilement (`Prompteur`) et le métronome (`Metronome`), ce qui garantit l'absence de dérive entre les deux.

Principes :

- La position n'est **pas** intégrée frame à frame. À chaque `requestAnimationFrame`, elle est **recalculée** depuis le temps écoulé : `pos = basePos - (scrollElapsedMs / 1000) × speed - nudge`. Aucune accumulation d'erreur.
- `rawElapsedMs()` : temps écoulé total depuis le play (y compris le délai d'offset).
- `scrollElapsedMs()` : temps de défilement = `rawElapsedMs` moins le délai d'offset (clampé à 0). Pendant le délai, le texte attend mais le métronome tourne.
- `start()` / `stop()` / `reset()` gèrent un offset cumulé pour que pause puis reprise ne créent pas de saut.
- `setBpm()` conserve la phase courante au changement de tempo pour éviter un saut.

### 6.3 Défilement et surlignage (`Prompteur.tsx`)

- `basePosRef` : position de base (avant défilement). `nudgeAccumRef` : déplacement manuel cumulé. Position effective : `basePos - scrollPx - nudge`.
- `initialPos()` retourne le centre du conteneur (position du marqueur) pour les deux modes, afin que le texte démarre près de la ligne.
- `measure()` relève les positions (`offsetLeft`/`offsetTop`) de chaque syllabe après rendu, redimensionnement ou changement de contenu.
- `highlight(pos)` compare la position écran de chaque syllabe au marqueur central et applique la classe CSS correspondante (`syl`, `syl-near`, `syl-on`).
- En mode horizontal, bouclage automatique : quand `pos < -largeurTexte`, `basePos` est remis au bord droit et la clock est réinitialisée.

### 6.4 Glisser-déposer manuel

Les handlers `onPointerDown` / `onPointerMove` / `endDrag` (pointerup, pointercancel) implémentent le réajustement manuel :

- `onPointerDown` capture le pointeur et enregistre la position visuelle courante et la coordonnée de départ (axe X en horizontal, Y en vertical).
- `onPointerMove` calcule `dragPos = posInitiale + delta` et applique la transformation en direct. Un déplacement > 4 px marque `movedRef` pour distinguer clic et glisse.
- La boucle rAF utilise `dragPosRef` pendant le glisser (prioritaire sur l'auto) et ignore le bouclage horizontal.
- `endDrag` replie la position de glisse dans `basePosRef` : `basePos = dragPos + scrollPx + nudge`. Comme la position effective vaut `basePos - scrollPx - nudge`, on obtient `currentPos() == dragPos` au relâcher, puis l'auto-scroll reprend normalement à mesure que `scrollPx` augmente.
- La clock n'est pas touchée : le métronome et la synchro musicale restent calés, seul le décalage texte est absorbé dans `basePos`.
- `touch-action: none` sur le conteneur empêche le navigateur d'interpréter le doigt comme un scroll de page.

### 6.5 Compte à rebours (`Countdown.tsx`)

- État `countdown` dans `page.tsx` : `null` (inactif) ou 3/2/1.
- `handlePlay` déclenche le compte à rebours si le lecteur est à l'arrêt, ou l'annule s'il est en cours.
- Un effet décrémente `countdown` chaque seconde ; à 1, il passe à `null` et déclenche `playing = true`.
- Le composant `Countdown` affiche un overlay plein écran (`.countdown-overlay`) avec un span dont la `key={value}` force le remontage à chaque chiffre pour rejouer l'animation CSS `countdown-zoom` (scale 0.2 → 1.15 → 1 → 1.9 avec fondu, sur 1 s).
- Le compte à rebours est annulé sur Reset, changement de mode, et Pause.

### 6.6 Persistance

- `prompteur:settings` : tous les réglages (mode, police, taille, zoom, miroir, vitesse, synchro musique, BPM, signature, seuils, offset).
- `prompteur:text` : le texte courant.
- Chargés au montage via `useMemo` (côté client uniquement), sauvegardés à chaque changement via `useEffect`.

### 6.7 Syllabation (`lib/syllables.ts`)

Heuristique française pour découper les mots en syllabes surlignables :

- Voyelles : `a e i o u y` et leurs variantes accentuées, plus `œ æ`.
- Digrammes consonantiques inséparables : `ch ph gn th gu qu`.
- Clusters consonne + liquide (`l`, `r`) gardés en attaque.
- `tokenize(text)` produit des tokens `syl` (syllabes surlignables) et `sep` (espaces, ponctuation, retours).

L'heuristique est correcte pour la grande majorité des cas français ; affinable si besoin.

### 6.8 Métronome (`Metronome.tsx`)

Muet et visuel. Lit `clock.currentBeatIndex()` à chaque frame via rAF, affiche le temps courant (1..N) et met en évidence le downbeat. Désactivé, il n'est pas rendu.

---

## 7. Points d'attention

- Le glisser-déposer est actif même pendant la lecture : c'est volontaire, pour pouvoir réajuster en direct.
- Le clic « placer une syllabe au marqueur » n'est disponible qu'à l'arrêt et seulement si le pointer n'a pas bougé (sinon c'est une fin de glisse).
- Le seuil de 4 px distingue le clic de la glisse ; l'ajuster si la sensibilité ne convient pas (`onPointerMove` dans `Prompteur.tsx`).
- Les deux fichiers `.html` à la racine sont des prototypes antérieurs à la migration Next.js, conservés pour référence ; ils ne sont pas utilisés par l'application.
