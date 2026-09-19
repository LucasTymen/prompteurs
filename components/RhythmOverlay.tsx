"use client";

import { useEffect, useRef } from "react";
import type { MusicClock } from "@/lib/music";

export type BeatMark = { time: number; strength: number };

type Props = {
  beatsRef: React.MutableRefObject<BeatMark[]>;
  clock: MusicClock;
  speedPxPerSec: number;
};

// Filigrane de rythme au-dessus de la zone du prompteur : dessine les attaques
// détectées par le Spectrogram comme lignes verticales, positionnées par temps
// relatif à la clock (même logique que le surlignage des syllabes).
export default function RhythmOverlay({ beatsRef, clock, speedPxPerSec }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Miroir pour la boucle rAF.
  const speedRef = useRef(speedPxPerSec);
  speedRef.current = speedPxPerSec;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const w = canvas.clientWidth * window.devicePixelRatio;
      const h = canvas.clientHeight * window.devicePixelRatio;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);

      const speed = speedRef.current;
      const nowSec = clock.rawElapsedMs() / 1000;
      const centerPx = canvas.width / 2;

      const beats = beatsRef.current;
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        const dt = beat.time - nowSec; // secondes relatives au temps courant
        const x = centerPx + dt * speed * window.devicePixelRatio;
        if (x < 0 || x > canvas.width) continue;
        const alpha = Math.min(0.5, beat.strength * 0.004);
        context.strokeStyle = `rgba(255, 139, 107, ${alpha})`;
        context.lineWidth = 1.5 * window.devicePixelRatio;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [beatsRef, clock]);

  return <canvas ref={canvasRef} className="rhythm-overlay" aria-hidden />;
}
