// Heuristique de syllabation française.
// Correct pour la grande majorité des cas; affinable plus tard (Python).

const VOWELS = new Set([
  "a", "à", "â", "ä", "A", "À", "Â", "Ä",
  "e", "é", "è", "ê", "ë", "E", "É", "È", "Ê", "Ë",
  "i", "î", "ï", "I", "Î", "Ï",
  "o", "ô", "ö", "O", "Ô", "Ö",
  "u", "ù", "û", "ü", "U", "Ù", "Û", "Ü",
  "y", "Y",
  "œ", "Œ", "æ", "Æ",
]);

// Digrammes consonantiques inséparables (traités comme une seule consonne).
const DIGRAPHS = ["ch", "ph", "gn", "th", "gu", "qu"];
// Clusters consonne + liquide gardés ensemble comme attaque.
const LIQUIDS = new Set(["l", "r", "L", "R"]);

function isVowel(ch: string): boolean {
  return VOWELS.has(ch);
}

// Renvoie le nombre de caractères du prochain "groupe consonantique"
// traité comme unité d'attaque (digramme ou consonne + liquide).
function consonantUnitLen(word: string, i: number): number {
  const two = word.slice(i, i + 2).toLowerCase();
  if (DIGRAPHS.includes(two)) return 2;
  if (i + 1 < word.length && !isVowel(word[i]) && !isVowel(word[i + 1]) && LIQUIDS.has(word[i + 1])) {
    return 2;
  }
  return 1;
}

// Syllabe un mot (sans espaces). Renvoie un tableau de syllabes.
export function syllabifyWord(word: string): string[] {
  const syllables: string[] = [];
  let i = 0;
  const n = word.length;
  let cur = "";

  while (i < n) {
    // 1. Attaque : collecter les consonnes initiales jusqu'à une voyelle.
    while (i < n && !isVowel(word[i])) {
      const u = consonantUnitLen(word, i);
      cur += word.slice(i, i + u);
      i += u;
    }
    // 2. Noyau : collecter le groupe vocalique.
    while (i < n && isVowel(word[i])) {
      cur += word[i];
      i += 1;
    }
    // 3. Décision de la coda selon ce qui suit.
    // Compter les consonnes jusqu'à la prochaine voyelle ou fin.
    let j = i;
    while (j < n && !isVowel(word[j])) j++;
    const cc = j - i;

    if (cc === 0) {
      // fin de mot ou voyelle suivante : la syllabe est complète.
      syllables.push(cur);
      cur = "";
    } else if (cc === 1) {
      // Une seule consonne avant une voyelle : elle démarre la syllabe suivante.
      // Sauf si c'est la fin du mot (coda de la syllabe courante).
      if (j >= n) {
        cur += word.slice(i, j);
        syllables.push(cur);
        cur = "";
        i = j;
      } else {
        syllables.push(cur);
        cur = "";
        // la consonne reste pour l'attaque de la prochaine.
      }
    } else {
      // 2+ consonnes : la première est coda, sauf si la première est une unité
      // inséparable (digramme/liquide) qui reste en attaque.
      const u = consonantUnitLen(word, i);
      if (u >= 2 && j < n) {
        // l'unité inséparable reste en attaque de la suivante.
        syllables.push(cur);
        cur = "";
      } else {
        cur += word[i]; // coda
        syllables.push(cur);
        cur = "";
        i += 1;
      }
    }
  }

  if (cur) syllables.push(cur);
  return syllables.filter((s) => s.length > 0);
}

// Type de token produit par la segmentation du texte.
export type Token =
  | { kind: "syl"; text: string }   // syllabe (surlignable)
  | { kind: "sep"; text: string }; // séparateur (espace, ponctuation, newline)

// Segmente un texte complet en tokens (syllabes + séparateurs).
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    // Séparateur : espaces, retours, ponctuation.
    if (/\s/.test(ch) || /[.,;:!?'"«»()\-—…]/.test(ch)) {
      let s = "";
      while (i < n && (/[\s]/.test(text[i]) || /[.,;:!?'"«»()\-—…]/.test(text[i]))) {
        s += text[i];
        i += 1;
      }
      tokens.push({ kind: "sep", text: s });
      continue;
    }
    // Mot : jusqu'au prochain séparateur.
    let w = "";
    while (i < n && !/[\s]/.test(text[i]) && !/[.,;:!?'"«»()\-—…]/.test(text[i])) {
      w += text[i];
      i += 1;
    }
    if (w.length === 0) continue;
    const syls = syllabifyWord(w);
    if (syls.length === 0) {
      tokens.push({ kind: "syl", text: w });
    } else {
      for (const s of syls) tokens.push({ kind: "syl", text: s });
    }
  }

  return tokens;
}
