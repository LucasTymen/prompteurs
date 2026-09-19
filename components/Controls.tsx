"use client";

type Props = {
  fontFamily: string;
  onFontFamily: (v: string) => void;
  fontSize: number;
  onFontSize: (v: number) => void;
  zoom: number;
  onZoom: (v: number) => void;
  manualSpeed: number;
  onManualSpeed: (v: number) => void;
  musicEnabled: boolean;
};

// Réglages d'affichage du prompteur (police, taille, zoom, vitesse manuelle).
// Les actions de lecture (play, reset, mode, miroir) vivent dans Transport.
export default function Controls(p: Props) {
  return (
    <div className="controls">
      <label>
        Police
        <select value={p.fontFamily} onChange={(e) => p.onFontFamily(e.target.value)}>
          <option>Arial</option>
          <option>Verdana</option>
          <option>Georgia</option>
          <option>Courier New</option>
        </select>
      </label>

      <label>
        Taille : {p.fontSize}px
        <input type="range" min={20} max={80} value={p.fontSize}
          onChange={(e) => p.onFontSize(Number(e.target.value))} />
      </label>

      <label>
        Zoom : {p.zoom.toFixed(1)}
        <input type="range" min={0.5} max={2} step={0.1} value={p.zoom}
          onChange={(e) => p.onZoom(Number(e.target.value))} />
      </label>

      <label>
        Vitesse manuelle : {p.manualSpeed.toFixed(1)}
        <input type="range" min={5} max={300} step={5} value={p.manualSpeed}
          onChange={(e) => p.onManualSpeed(Number(e.target.value))}
          disabled={p.musicEnabled} />
      </label>
    </div>
  );
}
