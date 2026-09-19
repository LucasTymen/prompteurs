"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Prompteur, { type Mode } from "@/components/Prompteur";
import Controls from "@/components/Controls";
import Metronome from "@/components/Metronome";
import MusicSync from "@/components/MusicSync";
import Countdown from "@/components/Countdown";
import { MusicClock, SIGNATURES, pxPerSecond, type Signature } from "@/lib/music";

// Clé de persistance des réglages.
const SETTINGS_KEY = "prompteur:settings";
const TEXT_KEY = "prompteur:text";

type Settings = {
  mode: Mode;
  fontSize: number;
  fontFamily: string;
  zoom: number;
  mirrored: boolean;
  manualSpeed: number;
  musicEnabled: boolean;
  bpm: number;
  signatureLabel: string;
  pxPerBeat: number;
  onThBeats: number;
  nearThBeats: number;
  startOffsetBeats: number;
};

const DEFAULTS: Settings = {
  mode: "vertical",
  fontSize: 32,
  fontFamily: "Arial",
  zoom: 1,
  mirrored: false,
  manualSpeed: 40,
  musicEnabled: false,
  bpm: 100,
  signatureLabel: "4/4",
  pxPerBeat: 120,
  onThBeats: 0.5,
  nearThBeats: 2.5,
  startOffsetBeats: 0,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

function loadText(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TEXT_KEY) || "Ajoute ton texte ici...";
}

export default function Page() {
  const s = useMemo(loadSettings, []);
  const initialText = useMemo(loadText, []);

  // Texte
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState(initialText);

  // Affichage
  const [mode, setMode] = useState<Mode>(s.mode);
  const [playing, setPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(s.fontSize);
  const [fontFamily, setFontFamily] = useState(s.fontFamily);
  const [zoom, setZoom] = useState(s.zoom);
  const [mirrored, setMirrored] = useState(s.mirrored);
  const [manualSpeed, setManualSpeed] = useState(s.manualSpeed);

  // Musique
  const [musicEnabled, setMusicEnabled] = useState(s.musicEnabled);
  const [bpm, setBpm] = useState(s.bpm);
  const [signature, setSignature] = useState<Signature>(
    SIGNATURES.find((x) => x.label === s.signatureLabel) || SIGNATURES[0]
  );
  const [pxPerBeat, setPxPerBeat] = useState(s.pxPerBeat);
  const [onThBeats, setOnThBeats] = useState(s.onThBeats);
  const [nearThBeats, setNearThBeats] = useState(s.nearThBeats);
  const [startOffsetBeats, setStartOffsetBeats] = useState(s.startOffsetBeats);

  // Reset / nudge
  const [resetSignal, setResetSignal] = useState(0);
  const [nudgeSignal, setNudgeSignal] = useState(0);
  const nudgeDirRef = useRef(1);

  // Compte à rebours avant play (3 → 2 → 1). null = inactif.
  const [countdown, setCountdown] = useState<number | null>(null);

  // Horloge partagée (créée une fois, paramètres mis à jour via effets).
  const clockRef = useRef<MusicClock | null>(null);
  if (clockRef.current === null) {
    clockRef.current = new MusicClock(bpm, signature.beats);
  }
  const clock = clockRef.current;

  // Garder la clock synchronisée avec l'état.
  useEffect(() => { clock.setBpm(bpm); }, [clock, bpm]);
  useEffect(() => { clock.setBeatsPerMeasure(signature.beats); }, [clock, signature]);
  useEffect(() => { clock.startOffsetBeats = startOffsetBeats; }, [clock, startOffsetBeats]);

  // Play / Pause → démarrer / arrêter la clock.
  useEffect(() => {
    if (playing) {
      clock.start();
    } else {
      clock.stop();
    }
  }, [playing, clock]);

  // Compte à rebours : décrémente chaque seconde ; à 1, lance le play.
  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        setPlaying(true);
      } else {
        setCountdown((c) => (c ?? 0) - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Lance le play via le compte à rebours, ou annule si déjà en cours/compte.
  const handlePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      setCountdown(null);
      return;
    }
    if (countdown !== null) {
      setCountdown(null);
      return;
    }
    setCountdown(3);
  }, [playing, countdown]);

  // Persistance : sauvegarder les réglages à chaque changement.
  useEffect(() => {
    const settings: Settings = {
      mode, fontSize, fontFamily, zoom, mirrored, manualSpeed,
      musicEnabled, bpm, signatureLabel: signature.label, pxPerBeat,
      onThBeats, nearThBeats, startOffsetBeats,
    };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  }, [mode, fontSize, fontFamily, zoom, mirrored, manualSpeed, musicEnabled, bpm, signature, pxPerBeat, onThBeats, nearThBeats, startOffsetBeats]);

  // Persistance du texte.
  const applyDraft = useCallback(() => {
    setText(draft);
    try { localStorage.setItem(TEXT_KEY, draft); } catch {}
  }, [draft]);

  // Vitesse effective : synchro musique ou manuelle.
  const speedPxPerSec = useMemo(
    () => (musicEnabled ? pxPerSecond(bpm, pxPerBeat) : manualSpeed),
    [musicEnabled, bpm, pxPerBeat, manualSpeed]
  );

  // Plein écran
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Thème
  const toggleTheme = useCallback(() => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
  }, []);

  // Mode
  const toggleMode = useCallback(() => {
    setPlaying(false);
    setCountdown(null);
    setMode((m) => (m === "vertical" ? "horizontal" : "vertical"));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("horizontal", mode === "horizontal");
  }, [mode]);

  const doReset = useCallback(() => {
    setPlaying(false);
    setCountdown(null);
    setResetSignal((n) => n + 1);
  }, []);

  // Nudge via flèches (avancer dans le texte).
  const nudge = useCallback((dir: number) => {
    nudgeDirRef.current = dir;
    setNudgeSignal((n) => n + 1);
  }, []);

  // Tap tempo : moyenne des intervalles des 4 derniers taps.
  const tapTimesRef = useRef<number[]>([]);
  const tapTempo = useCallback(() => {
    const now = performance.now();
    const arr = tapTimesRef.current;
    // Réinitialiser si le dernier tap date de plus de 2 s.
    if (arr.length > 0 && now - arr[arr.length - 1] > 2000) arr.length = 0;
    arr.push(now);
    if (arr.length > 5) arr.shift();
    if (arr.length >= 2) {
      let sum = 0;
      for (let i = 1; i < arr.length; i++) sum += arr[i] - arr[i - 1];
      const avg = sum / (arr.length - 1);
      const computed = Math.round(60000 / avg);
      if (computed >= 40 && computed <= 240) setBpm(computed);
    }
  }, []);

  // Import / export .txt
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importText = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result || "");
      setText(t);
      setDraft(t);
      try { localStorage.setItem(TEXT_KEY, t); } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const exportText = useCallback(() => {
    const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompteur.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [draft]);

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          handlePlay();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "KeyM":
          setMirrored((m) => !m);
          break;
        case "KeyH":
          toggleMode();
          break;
        case "KeyT":
          toggleTheme();
          break;
        case "KeyR":
          doReset();
          break;
        case "KeyS":
          setMusicEnabled((m) => !m);
          break;
        case "KeyB":
          tapTempo();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nudge(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nudge(-1);
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleFullscreen, toggleMode, toggleTheme, doReset, tapTempo, nudge, handlePlay]);

  return (
    <div className="app">
      <Metronome clock={clock} beatsPerMeasure={signature.beats} enabled={musicEnabled} />

      <Prompteur
        text={text}
        mode={mode}
        playing={playing}
        fontSize={fontSize}
        fontFamily={fontFamily}
        zoom={zoom}
        mirrored={mirrored}
        clock={clock}
        speedPxPerSec={speedPxPerSec}
        pxPerBeat={pxPerBeat}
        onThBeats={onThBeats}
        nearThBeats={nearThBeats}
        resetSignal={resetSignal}
        nudgeSignal={nudgeSignal}
        nudgeDir={nudgeDirRef.current}
      />

      <div className="editor-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={applyDraft}
          placeholder="Saisis ton texte..."
        />
        <div className="editor-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Importer .txt
          </button>
          <button type="button" onClick={exportText}>
            Exporter .txt
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={importText}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <Controls
        fontFamily={fontFamily}
        onFontFamily={setFontFamily}
        fontSize={fontSize}
        onFontSize={setFontSize}
        zoom={zoom}
        onZoom={setZoom}
        manualSpeed={manualSpeed}
        onManualSpeed={setManualSpeed}
        musicEnabled={musicEnabled}
        playing={playing}
        counting={countdown !== null}
        onPlay={handlePlay}
        onReset={doReset}
        onMirror={() => setMirrored((m) => !m)}
        mode={mode}
        onMode={toggleMode}
        onFullscreen={toggleFullscreen}
        onTheme={toggleTheme}
      />

      <MusicSync
        enabled={musicEnabled}
        onToggleEnabled={() => setMusicEnabled((m) => !m)}
        bpm={bpm}
        onBpm={setBpm}
        signature={signature}
        onSignature={setSignature}
        pxPerBeat={pxPerBeat}
        onPxPerBeat={setPxPerBeat}
        onThBeats={onThBeats}
        onOnThBeats={setOnThBeats}
        nearThBeats={nearThBeats}
        onNearThBeats={setNearThBeats}
        startOffsetBeats={startOffsetBeats}
        onStartOffsetBeats={setStartOffsetBeats}
        onTapTempo={tapTempo}
      />

      <p className="shortcuts">
        Espace = Play/Pause · Flèches = Naviguer · H = Horizontal/Vertical · M = Miroir ·
        F = Plein écran · T = Thème · R = Reset · S = Synchro musique · B = Tap tempo
      </p>

      {countdown !== null && <Countdown value={countdown} />}
    </div>
  );
}
