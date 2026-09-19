"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicClock } from "@/lib/music";

type Props = {
  clock: MusicClock;
  playing: boolean;
};

type BeatMark = { time: number; strength: number };

const FFT_SIZE = 1024;
const MAX_MARKS = 80;

export default function Spectrogram({ clock, playing }: Props) {
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<"audio" | "video" | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marks, setMarks] = useState<BeatMark[]>([]);

  const mediaRef = useRef<HTMLMediaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const previousEnergyRef = useRef(0);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    void contextRef.current?.close();
  }, []);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !sourceName) return;
    if (playing) {
      void media.play().catch(() => setError("La lecture de la source doit être autorisée par le navigateur."));
    } else {
      media.pause();
    }
  }, [playing, sourceName]);

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);
    const column = context.getImageData(2, 0, canvas.width - 2, canvas.height);
    context.putImageData(column, 0, 0);

    for (let y = 0; y < canvas.height; y++) {
      const index = Math.floor((1 - y / canvas.height) * values.length);
      const value = values[index] ?? 0;
      const hue = 205 + value * 0.35;
      context.fillStyle = `hsl(${hue}, 85%, ${18 + value * 0.35}%)`;
      context.fillRect(canvas.width - 2, y, 2, 1);
    }

    const energy = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (energy > 105 && energy > previousEnergyRef.current * 1.2) {
      const time = clock.rawElapsedMs() / 1000;
      setMarks((current) => [...current, { time, strength: energy }].slice(-MAX_MARKS));
    }
    previousEnergyRef.current = energy;
    rafRef.current = requestAnimationFrame(draw);
  };

  const setupAnalyser = async () => {
    const media = mediaRef.current;
    if (!media || analyserRef.current) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setError("L'analyse audio n'est pas prise en charge par ce navigateur.");
      return;
    }
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.72;
    const source = context.createMediaElementSource(media);
    source.connect(analyser);
    analyser.connect(context.destination);
    contextRef.current = context;
    analyserRef.current = analyser;
    sourceRef.current = source;
    await context.resume();
    rafRef.current = requestAnimationFrame(draw);
  };

  const importSource = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setError("Sélectionne un fichier audio ou vidéo.");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setSourceName(file.name);
    setSourceType(file.type.startsWith("video/") ? "video" : "audio");
    setMarks([]);
    setError(null);
    if (mediaRef.current) {
      mediaRef.current.src = urlRef.current;
      mediaRef.current.load();
    }
    event.target.value = "";
  };

  const resetSource = () => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.removeAttribute("src");
      mediaRef.current.load();
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSourceName("");
    setSourceType(null);
    setMarks([]);
    setError(null);
  };

  return (
    <section className={`spectrogram ${enabled ? "spectrogram-enabled" : ""}`} aria-labelledby="spectrogram-title">
      <div className="spectrogram-heading">
        <div>
          <p className="eyebrow">Analyse rythmique</p>
          <h2 id="spectrogram-title">Spectrogramme</h2>
        </div>
        <button type="button" onClick={() => setEnabled((value) => !value)}>{enabled ? "Visible" : "Masqué"}</button>
      </div>
      <div className="spectrogram-toolbar">
        <label className="file-button">
          Importer audio / vidéo
          <input type="file" accept="audio/*,video/*" onChange={importSource} />
        </label>
        {sourceName && <span className="spectrogram-file">{sourceName}</span>}
        {sourceName && <button type="button" onClick={resetSource}>Retirer</button>}
      </div>
      {sourceType === "video" && <video ref={mediaRef as React.RefObject<HTMLVideoElement>} className="spectrogram-video" controls playsInline onPlay={() => void setupAnalyser()} />}
      {sourceType === "audio" && <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} className="spectrogram-audio" controls onPlay={() => void setupAnalyser()} />}
      {!sourceName && <p className="spectrogram-empty">Importe une musique ou une vidéo pour analyser ses attaques sonores.</p>}
      {enabled && sourceName && <canvas ref={canvasRef} className="spectrogram-canvas" aria-label="Visualisation du spectre audio" />}
      {enabled && sourceName && <div className="rhythm-track" aria-label="Attaques détectées">
        {marks.map((mark, index) => <span key={`${mark.time}-${index}`} style={{ left: `${Math.min(100, (mark.time / Math.max(1, clock.rawElapsedMs() / 1000)) * 100)}%`, opacity: Math.min(1, mark.strength / 180) }} />)}
      </div>}
      {error && <p className="recorder-error" role="alert">{error}</p>}
    </section>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
