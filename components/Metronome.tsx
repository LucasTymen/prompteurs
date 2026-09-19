"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicClock } from "@/lib/music";

type Props = {
  clock: MusicClock;
  beatsPerMeasure: number;
  enabled: boolean;
};

// Métronome visuel muet : lit le temps courant depuis la clock partagée
// (même source de temps que le défilement → aucune dérive possible).
export default function Metronome({ clock, beatsPerMeasure, enabled }: Props) {
  const [active, setActive] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastBeatRef = useRef(-1);

  useEffect(() => {
    if (!enabled) {
      setActive(0);
      lastBeatRef.current = -1;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = () => {
      const beat = clock.currentBeatIndex() + 1; // 1..N
      if (beat !== lastBeatRef.current) {
        lastBeatRef.current = beat;
        setActive(beat);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastBeatRef.current = -1;
    };
  }, [enabled, clock, beatsPerMeasure]);

  if (!enabled) return null;

  return (
    <div className="metronome" aria-label="Métronome visuel">
      <span style={{ fontSize: 12 }}>MÉTRONOME</span>
      <span style={{ fontSize: 13, opacity: 0.8 }}>{clock.bpm} BPM</span>
      <div className="beats">
        {Array.from({ length: beatsPerMeasure }, (_, i) => (
          <div
            key={i}
            className={`beat-dot ${active === i + 1 ? "active" : ""} ${
              i === 0 ? "downbeat" : ""
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
