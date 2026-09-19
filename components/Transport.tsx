"use client";

import type { Mode } from "./Prompteur";

type Props = {
  playing: boolean;
  counting: boolean;
  onPlay: () => void;
  onReset: () => void;
  mode: Mode;
  onMode: () => void;
  onMirror: () => void;
};

// Barre de transport toujours visible sous le prompteur : actions essentielles
// pendant la lecture/enregistrement, sans fouiller dans les onglets.
export default function Transport({
  playing,
  counting,
  onPlay,
  onReset,
  mode,
  onMode,
  onMirror,
}: Props) {
  return (
    <div className="transport">
      <button type="button" className="transport-play" onClick={onPlay}>
        {counting ? "Annuler" : playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={onReset}>Reset</button>
      <button type="button" onClick={onMode}>
        {mode === "vertical" ? "Horizontal" : "Vertical"}
      </button>
      <button type="button" onClick={onMirror}>Miroir</button>
    </div>
  );
}
