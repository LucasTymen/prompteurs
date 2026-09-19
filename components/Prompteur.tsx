"use client";

import { useEffect, useMemo, useRef } from "react";
import { tokenize } from "@/lib/syllables";
import type { MusicClock } from "@/lib/music";

export type Mode = "vertical" | "horizontal";

type Props = {
  text: string;
  mode: Mode;
  playing: boolean;
  fontSize: number;
  fontFamily: string;
  zoom: number;
  mirrored: boolean;
  clock: MusicClock;
  speedPxPerSec: number;   // vitesse de défilement (px/s)
  pxPerBeat: number;       // distance d'un temps, pour les seuils de surlignage
  onThBeats: number;       // demi-largeur "sur le temps" (en temps)
  nearThBeats: number;     // limite "anticipation" (en temps)
  resetSignal: number;     // incrémenté → retour à la position initiale
  nudgeSignal: number;     // incrémenté → déplacement manuel
  nudgeDir: number;        // -1 ou +1
};

type Offset = { top: number; left: number; w: number; h: number };

export default function Prompteur({
  text,
  mode,
  playing,
  fontSize,
  fontFamily,
  zoom,
  mirrored,
  clock,
  speedPxPerSec,
  pxPerBeat,
  onThBeats,
  nearThBeats,
  resetSignal,
  nudgeSignal,
  nudgeDir,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const sylRefs = useRef<HTMLSpanElement[]>([]);
  const offsetsRef = useRef<Offset[]>([]);
  const lastClassRef = useRef<string[]>([]);

  // Position de base (avant défilement). La position effective = base - scroll - nudge.
  const basePosRef = useRef(0);
  const nudgeAccumRef = useRef(0); // déplacement manuel cumulé (px)
  const rafRef = useRef<number | null>(null);

  // Miroirs des props pour la boucle rAF.
  const modeRef = useRef(mode);
  const playingRef = useRef(playing);
  const speedRef = useRef(speedPxPerSec);
  const zoomRef = useRef(zoom);
  const mirroredRef = useRef(mirrored);
  const pxPerBeatRef = useRef(pxPerBeat);
  const onThRef = useRef(onThBeats);
  const nearThRef = useRef(nearThBeats);
  const clockRef = useRef(clock);
  modeRef.current = mode;
  playingRef.current = playing;
  speedRef.current = speedPxPerSec;
  zoomRef.current = zoom;
  mirroredRef.current = mirrored;
  pxPerBeatRef.current = pxPerBeat;
  onThRef.current = onThBeats;
  nearThRef.current = nearThBeats;
  clockRef.current = clock;

  const tokens = useMemo(() => tokenize(text), [text]);

  // Position initiale selon le mode.
  const initialPos = () => {
    const c = containerRef.current;
    if (!c) return 0;
    return modeRef.current === "horizontal" ? c.offsetWidth : c.offsetHeight / 2;
  };

  // Position effective courante (px), calculée depuis la clock + nudge.
  const currentPos = () => {
    const scrollPx = (clockRef.current.scrollElapsedMs() / 1000) * speedRef.current;
    return basePosRef.current - scrollPx - nudgeAccumRef.current;
  };

  // Applique la transformation CSS.
  const applyTransform = (pos: number) => {
    const el = textRef.current;
    if (!el) return;
    const axis =
      modeRef.current === "horizontal"
        ? `translateX(${pos}px) translateY(-50%)`
        : `translateY(${pos}px)`;
    el.style.transform = `${axis} scale(${zoomRef.current}) ${
      mirroredRef.current ? "scaleX(-1)" : ""
    }`;
  };

  // Re-mesure les positions des syllabes.
  const measure = () => {
    if (!containerRef.current) return;
    offsetsRef.current = sylRefs.current.map((s) => {
      if (!s) return { top: 0, left: 0, w: 0, h: 0 };
      return {
        top: s.offsetTop,
        left: s.offsetLeft,
        w: s.offsetWidth,
        h: s.offsetHeight,
      };
    });
  };

  // Surlignage des syllabes selon leur distance au marqueur (= temps).
  const highlight = (pos: number) => {
    const container = containerRef.current;
    if (!container) return;
    const m = pxPerBeatRef.current;
    const onTh = m * onThRef.current;
    const nearTh = m * nearThRef.current;

    const isH = modeRef.current === "horizontal";
    const markerPos = isH ? container.offsetWidth / 2 : container.offsetHeight / 2;

    const offs = offsetsRef.current;
    const last = lastClassRef.current;
    for (let i = 0; i < offs.length; i++) {
      const o = offs[i];
      const center = isH ? o.left + o.w / 2 : o.top + o.h / 2;
      const screen = center + pos;
      const d = screen - markerPos;

      let cls = "syl";
      if (d < -onTh) cls = "syl";
      else if (d <= onTh) cls = "syl syl-on";
      else if (d <= nearTh) cls = "syl syl-near";

      if (last[i] !== cls) {
        last[i] = cls;
        const node = sylRefs.current[i];
        if (node) node.className = cls;
      }
    }
  };

  // Boucle d'animation : position calculée depuis la clock (anti-dérive).
  useEffect(() => {
    const frame = () => {
      const pos = currentPos();

      // En mode horizontal, boucler quand le texte est sorti.
      if (modeRef.current === "horizontal" && playingRef.current) {
        const tw = textRef.current ? textRef.current.scrollWidth : 0;
        const cw = containerRef.current ? containerRef.current.offsetWidth : 0;
        if (pos < -tw) {
          basePosRef.current = cw;
          clock.reset();
          clock.start();
          nudgeAccumRef.current = 0;
        }
      }

      applyTransform(pos);
      highlight(pos);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Re-mesurer quand le contenu ou la mise en page change.
  useEffect(() => {
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [tokens, mode, fontSize, fontFamily]);

  // Redimensionnement.
  useEffect(() => {
    const onResize = () => {
      measure();
      if (!playingRef.current) {
        basePosRef.current = initialPos();
        applyTransform(currentPos());
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Position initiale au changement de mode.
  useEffect(() => {
    basePosRef.current = initialPos();
    nudgeAccumRef.current = 0;
    applyTransform(currentPos());
    measure();
  }, [mode]);

  // Reset externe (bouton Reset).
  useEffect(() => {
    if (resetSignal === 0) return;
    basePosRef.current = initialPos();
    nudgeAccumRef.current = 0;
    clockRef.current.reset();
    applyTransform(currentPos());
  }, [resetSignal]);

  // Nudge clavier (flèches).
  useEffect(() => {
    if (nudgeSignal === 0) return;
    const step = Math.max(20, pxPerBeatRef.current * 0.5);
    nudgeAccumRef.current += nudgeDir * step;
    applyTransform(currentPos());
  }, [nudgeSignal, nudgeDir]);

  // Clic dans la zone → placer la syllabe cliquée au marqueur.
  const onContainerClick = (e: React.MouseEvent) => {
    if (playingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const isH = modeRef.current === "horizontal";
    const clickPos = isH ? e.clientX - rect.left : e.clientY - rect.top;
    const markerPos = isH ? container.offsetWidth / 2 : container.offsetHeight / 2;
    // Trouver la syllabe la plus proche du clic.
    let best = -1;
    let bestD = Infinity;
    const offs = offsetsRef.current;
    for (let i = 0; i < offs.length; i++) {
      const o = offs[i];
      const center = isH ? o.left + o.w / 2 : o.top + o.h / 2;
      const screen = center + currentPos();
      const d = Math.abs(screen - clickPos);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      const o = offs[best];
      const center = isH ? o.left + o.w / 2 : o.top + o.h / 2;
      // On veut que screen == markerPos → center + pos == markerPos
      // pos = markerPos - center ; or pos = base - scroll - nudge
      // On ajuste nudge pour atteindre la cible (scroll ≈ 0 si pas en play).
      const targetPos = markerPos - center;
      nudgeAccumRef.current = basePosRef.current - targetPos;
      applyTransform(currentPos());
    }
  };

  // Molette → nudge (quand pas en play).
  const onWheel = (e: React.WheelEvent) => {
    if (playingRef.current) return;
    const step = Math.max(15, pxPerBeatRef.current * 0.25);
    nudgeAccumRef.current += (e.deltaY > 0 ? 1 : -1) * step;
    applyTransform(currentPos());
  };

  let sylIdx = 0;

  return (
    <div
      className="text-container"
      ref={containerRef}
      onClick={onContainerClick}
      onWheel={onWheel}
      style={{ cursor: playing ? "default" : "pointer" }}
    >
      <div className="marker" />
      <div
        id="text"
        className="text-content"
        ref={textRef}
        style={{ fontSize: `${fontSize}px`, fontFamily }}
      >
        {tokens.map((t, i) => {
          if (t.kind === "sep") {
            return (
              <span key={i} className="sep">
                {t.text}
              </span>
            );
          }
          const idx = sylIdx++;
          return (
            <span
              key={i}
              className="syl"
              ref={(el) => {
                if (el) sylRefs.current[idx] = el;
              }}
            >
              {t.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
