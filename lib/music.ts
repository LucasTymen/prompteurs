// Calculs musicaux : signatures, BPM, vitesse de défilement, et horloge partagée.

export type Signature = {
  label: string;   // ex. "4/4"
  beats: number;   // nombre de temps par mesure (ex. 4)
  unit: number;    // unité (ex. 4 = noire) — informatif
};

// Présélection des mesures courantes.
export const SIGNATURES: Signature[] = [
  { label: "4/4", beats: 4, unit: 4 },
  { label: "2/4", beats: 2, unit: 4 },
  { label: "3/4", beats: 3, unit: 4 },
  { label: "5/4", beats: 5, unit: 4 },
  { label: "6/8", beats: 6, unit: 8 },
  { label: "7/8", beats: 7, unit: 8 },
  { label: "9/8", beats: 9, unit: 8 },
];

// Intervalle entre deux temps, en millisecondes.
export function beatIntervalMs(bpm: number): number {
  if (bpm <= 0) return Infinity;
  return 60000 / bpm;
}

// Vitesse de défilement en pixels par seconde, calée sur le BPM.
export function pxPerSecond(bpm: number, pxPerBeat: number): number {
  return (bpm / 60) * pxPerBeat;
}

// Horloge musicale partagée.
// Source de temps unique pour le défilement ET le métronome, afin d'éviter
// toute dérive entre les deux (plus d'intégration frame à frame : la position
// est recalculée depuis le temps écoulé à chaque frame).
//
// Gère aussi un délai de démarrage (offset en temps) pour caler le texte sur
// une intro musicale : pendant l'offset, le métronome tourne mais le texte
// n'avance pas encore.
export class MusicClock {
  private startMs = 0;
  private offsetMs = 0;
  private running = false;

  bpm: number;
  beatsPerMeasure: number;
  startOffsetBeats = 0;

  constructor(bpm: number, beatsPerMeasure: number) {
    this.bpm = bpm;
    this.beatsPerMeasure = beatsPerMeasure;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startMs = performance.now();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.offsetMs += performance.now() - this.startMs;
  }

  reset() {
    this.running = false;
    this.offsetMs = 0;
    this.startMs = 0;
  }

  isRunning() {
    return this.running;
  }

  // Temps écoulé total depuis le play (brut, y compris le délai d'offset).
  rawElapsedMs(): number {
    let e = this.offsetMs;
    if (this.running) e += performance.now() - this.startMs;
    return Math.max(0, e);
  }

  // Temps de défilement : brut moins le délai d'offset (clampé à 0).
  // Pendant le délai, le texte attend ; le métronome, lui, tourne déjà.
  scrollElapsedMs(): number {
    const off = this.startOffsetBeats * beatIntervalMs(this.bpm);
    return Math.max(0, this.rawElapsedMs() - off);
  }

  // Index du temps courant (0..beatsPerMeasure-1) pour le métronome.
  currentBeatIndex(): number {
    if (this.bpm <= 0) return 0;
    const beatMs = beatIntervalMs(this.bpm);
    return Math.floor(this.rawElapsedMs() / beatMs) % this.beatsPerMeasure;
  }

  setBpm(bpm: number) {
    // Conserver la phase actuelle pour éviter un saut au changement de tempo.
    const prevInterval = beatIntervalMs(this.bpm);
    const elapsed = this.rawElapsedMs();
    const prevPhase = elapsed % prevInterval;
    this.bpm = bpm;
    const newInterval = beatIntervalMs(bpm);
    const aligned = elapsed - prevPhase + (prevPhase / prevInterval) * newInterval;
    if (this.running) {
      this.offsetMs = aligned - (performance.now() - this.startMs);
    } else {
      this.offsetMs = aligned;
    }
  }

  setBeatsPerMeasure(n: number) {
    this.beatsPerMeasure = n;
  }
}
