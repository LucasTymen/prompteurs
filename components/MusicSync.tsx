"use client";

import { SIGNATURES, type Signature } from "@/lib/music";

type Props = {
  enabled: boolean;
  onToggleEnabled: () => void;
  bpm: number;
  onBpm: (v: number) => void;
  signature: Signature;
  onSignature: (s: Signature) => void;
  pxPerBeat: number;
  onPxPerBeat: (v: number) => void;
  onThBeats: number;
  onOnThBeats: (v: number) => void;
  nearThBeats: number;
  onNearThBeats: (v: number) => void;
  startOffsetBeats: number;
  onStartOffsetBeats: (v: number) => void;
  onTapTempo: () => void;
};

export default function MusicSync(p: Props) {
  return (
    <div className="music-sync">
      <label>
        Synchro musique
        <button onClick={p.onToggleEnabled} type="button">
          {p.enabled ? "Activée" : "Désactivée"}
        </button>
      </label>
      <label>
        Signature
        <select
          value={p.signature.label}
          onChange={(e) => {
            const s = SIGNATURES.find((x) => x.label === e.target.value);
            if (s) p.onSignature(s);
          }}
          disabled={!p.enabled}
        >
          {SIGNATURES.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        BPM: {p.bpm}
        <input
          type="range"
          min={40}
          max={240}
          step={1}
          value={p.bpm}
          onChange={(e) => p.onBpm(Number(e.target.value))}
          disabled={!p.enabled}
        />
      </label>
      <label>
        Tap tempo
        <button onClick={p.onTapTempo} type="button" disabled={!p.enabled}>
          TAP
        </button>
      </label>
      <label>
        Px par temps: {p.pxPerBeat}
        <input
          type="range"
          min={20}
          max={400}
          step={5}
          value={p.pxPerBeat}
          onChange={(e) => p.onPxPerBeat(Number(e.target.value))}
          disabled={!p.enabled}
        />
      </label>
      <label>
        Fenêtre « sur le temps »: ±{p.onThBeats.toFixed(2)} tps
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.05}
          value={p.onThBeats}
          onChange={(e) => p.onOnThBeats(Number(e.target.value))}
          disabled={!p.enabled}
        />
      </label>
      <label>
        Anticipation: {p.nearThBeats.toFixed(2)} tps
        <input
          type="range"
          min={0.5}
          max={6}
          step={0.25}
          value={p.nearThBeats}
          onChange={(e) => p.onNearThBeats(Number(e.target.value))}
          disabled={!p.enabled}
        />
      </label>
      <label>
        Décalage départ: {p.startOffsetBeats} tps
        <input
          type="range"
          min={0}
          max={16}
          step={1}
          value={p.startOffsetBeats}
          onChange={(e) => p.onStartOffsetBeats(Number(e.target.value))}
          disabled={!p.enabled}
        />
      </label>
    </div>
  );
}
