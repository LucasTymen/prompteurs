"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicClock } from "@/lib/music";
import type { BeatMark } from "@/components/RhythmOverlay";

type Props = {
  clock: MusicClock;
  playing: boolean;
  beatsRef: React.MutableRefObject<BeatMark[]>;
};

const FFT_SIZE = 1024;
const MAX_MARKS = 200;
const ENERGY_HISTORY = 30;
const SENSITIVITY = 2.2;

export default function Spectrogram({ clock, playing, beatsRef }: Props) {
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<"audio" | "video" | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const energyHistoryRef = useRef<number[]>([]);

  // Retourne l'élément média courant (vidéo ou audio) selon le type de source.
  const getMedia = () => videoRef.current || audioRef.current;

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    void contextRef.current?.close();
  }, []);

  useEffect(() => {
    const media = getMedia();
    if (!media || !sourceName) return;
    if (playing) {
      void media.play().catch(() => setError("La lecture de la source doit être autorisée par le navigateur."));
    } else {
      media.pause();
    }
  }, [playing, sourceName, sourceType]);

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);

    const column = ctx.getImageData(2, 0, canvas.width - 2, canvas.height);
    ctx.putImageData(column, 0, 0);
    for (let y = 0; y < canvas.height; y++) {
      const index = Math.floor((1 - y / canvas.height) * values.length);
      const value = values[index] ?? 0;
      const hue = 205 + value * 0.35;
      ctx.fillStyle = `hsl(${hue}, 85%, ${18 + value * 0.35}%)`;
      ctx.fillRect(canvas.width - 2, y, 2, 1);
    }

    const energy = values.reduce((sum, v) => sum + v, 0) / values.length;
    const history = energyHistoryRef.current;
    history.push(energy);
    if (history.length > ENERGY_HISTORY) history.shift();

    if (history.length >= 10) {
      const mean = history.reduce((s, v) => s + v, 0) / history.length;
      const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
      const std = Math.sqrt(variance);
      const threshold = mean + std * SENSITIVITY;

      if (energy > threshold && energy > mean * 1.15) {
        const time = clock.rawElapsedMs() / 1000;
        beatsRef.current.push({ time, strength: energy });
        if (beatsRef.current.length > MAX_MARKS) beatsRef.current.shift();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  };

  const setupAnalyser = async () => {
    const media = getMedia();
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
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    void contextRef.current?.close();
    contextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    energyHistoryRef.current = [];
    beatsRef.current = [];

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setSourceName(file.name);
    setSourceType(file.type.startsWith("video/") ? "video" : "audio");
    setError(null);
    requestAnimationFrame(() => {
      const media = getMedia();
      if (media && urlRef.current) {
        media.src = urlRef.current;
        media.load();
      }
    });
    event.target.value = "";
  };

  const resetSource = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    void contextRef.current?.close();
    contextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    energyHistoryRef.current = [];
    beatsRef.current = [];

    const media = getMedia();
    if (media) {
      media.pause();
      media.removeAttribute("src");
      media.load();
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSourceName("");
    setSourceType(null);
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
      {sourceType === "video" && <video key={sourceName} ref={videoRef} className="spectrogram-video" controls playsInline onPlay={() => void setupAnalyser()} />}
      {sourceType === "audio" && <audio key={sourceName} ref={audioRef} className="spectrogram-audio" controls onPlay={() => void setupAnalyser()} />}
      {!sourceName && <p className="spectrogram-empty">Importe une musique ou une vidéo pour analyser ses attaques sonores.</p>}
      {enabled && sourceName && <canvas ref={canvasRef} className="spectrogram-canvas" aria-label="Visualisation du spectre audio" />}
      {error && <p className="recorder-error" role="alert">{error}</p>}
    </section>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
