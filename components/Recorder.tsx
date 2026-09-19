"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderMode = "audio" | "video";
type RecorderStatus = "idle" | "recording" | "paused";
type RecorderView = "mini" | "half" | "full";
type Device = MediaDeviceInfo;

type Props = {
  startSignal: number;
  onRequestStart: () => void;
  onRecordingChange?: (recording: boolean) => void;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export default function Recorder({ startSignal, onRequestStart, onRecordingChange }: Props) {
  const [mode, setMode] = useState<RecorderMode>("audio");
  const [microphones, setMicrophones] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [microphoneId, setMicrophoneId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [view, setView] = useState<RecorderView>("mini");
  const [duration, setDuration] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const releaseResult = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResultUrl(null);
  }, []);

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMicrophones(devices.filter((device) => device.kind === "audioinput"));
    setCameras(devices.filter((device) => device.kind === "videoinput"));
  }, []);

  useEffect(() => {
    void enumerateDevices();
    return () => {
      stopTimer();
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      stopStream();
      releaseResult();
    };
  }, [enumerateDevices, releaseResult, stopStream, stopTimer]);

  useEffect(() => {
    if (startSignal === 0) return;
    void startRecording();
    // The signal changes only after the shared 3-2-1 countdown completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    onRecordingChange?.(status !== "idle");
  }, [onRecordingChange, status]);

  const startRecording = async () => {
    if (status !== "idle") return;
    setError(null);
    releaseResult();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L'enregistrement n'est pas pris en charge par ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
        video: mode === "video"
          ? cameraId ? { deviceId: { exact: cameraId } } : true
          : false,
      });
      streamRef.current = stream;
      await enumerateDevices();

      if (mode === "video" && videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "audio/webm;codecs=opus", "audio/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        setResultUrl(url);
        stopStream();
      };
      recorder.onerror = () => setError("Une erreur est survenue pendant l'enregistrement.");
      recorderRef.current = recorder;
      recorder.start(1000);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration((value) => value + 1), 1000);
      setStatus("recording");
    } catch (cause) {
      stopStream();
      const message = cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "L'accès au micro ou à la caméra a été refusé."
        : "Impossible d'ouvrir le périphérique sélectionné.";
      setError(message);
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setStatus("idle");
  };

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      stopTimer();
      setStatus("paused");
    } else if (recorder.state === "paused") {
      recorder.resume();
      timerRef.current = window.setInterval(() => setDuration((value) => value + 1), 1000);
      setStatus("recording");
    }
  };

  const handleModeChange = (nextMode: RecorderMode) => {
    if (status !== "idle") return;
    setMode(nextMode);
    setError(null);
  };

  const download = () => {
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = mode === "video" ? "prompteur-video.webm" : "prompteur-audio.webm";
    link.click();
  };

  const cycleView = () => {
    setView((current) => current === "mini" ? "half" : current === "half" ? "full" : "mini");
  };

  const unsupported = typeof navigator !== "undefined" && !navigator.mediaDevices;

  return (
    <section className={`recorder recorder-${view}`} aria-labelledby="recorder-title">
      <div className="recorder-heading">
        <div>
          <p className="eyebrow">Studio local</p>
          <h2 id="recorder-title">Enregistrement</h2>
        </div>
        <span className={`recorder-status recorder-status-${status}`}>
          {status === "recording" ? "En cours" : status === "paused" ? "En pause" : "Prêt"}
        </span>
        <button type="button" className="recorder-expand" onClick={cycleView} aria-label="Modifier la taille de l'aperçu vidéo">
          {view === "mini" ? "↗" : view === "half" ? "⛶" : "↙"}
        </button>
      </div>

      <div className="recorder-grid">
        <div className="recorder-preview-wrap">
          {mode === "video" ? (
            <video ref={videoRef} className="recorder-preview" muted playsInline aria-label="Aperçu caméra" />
          ) : (
            <div className="recorder-audio-preview" aria-hidden>MIC</div>
          )}
          <span className="recorder-time">{formatDuration(duration)}</span>
        </div>

        <div className="recorder-settings">
          <div className="recorder-modes" role="group" aria-label="Mode d'enregistrement">
            <button type="button" className={mode === "audio" ? "is-selected" : ""} onClick={() => handleModeChange("audio")} disabled={status !== "idle"}>Audio</button>
            <button type="button" className={mode === "video" ? "is-selected" : ""} onClick={() => handleModeChange("video")} disabled={status !== "idle"}>Audio + vidéo</button>
          </div>

          <label>
            Micro
            <select value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)} disabled={status !== "idle"}>
              <option value="">Micro par défaut</option>
              {microphones.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone détecté"}</option>)}
            </select>
          </label>

          {mode === "video" && (
            <label>
              Caméra
              <select value={cameraId} onChange={(event) => setCameraId(event.target.value)} disabled={status !== "idle"}>
                <option value="">Caméra par défaut</option>
                {cameras.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Caméra détectée"}</option>)}
              </select>
            </label>
          )}

          <div className="recorder-actions">
            {status === "idle" && <button type="button" className="button-primary" onClick={onRequestStart} disabled={unsupported}>Enregistrer</button>}
            {status !== "idle" && <button type="button" onClick={togglePause}>{status === "paused" ? "Reprendre" : "Pause"}</button>}
            {status !== "idle" && <button type="button" className="button-danger" onClick={stopRecording}>Arrêter</button>}
            {resultUrl && <button type="button" onClick={download}>Télécharger .webm</button>}
          </div>
        </div>
      </div>

      {unsupported && <p className="recorder-message">Utilise localhost ou HTTPS pour activer le micro et la caméra.</p>}
      {error && <p className="recorder-error" role="alert">{error}</p>}
      {resultUrl && mode === "video" && <video className="recorder-result" controls src={resultUrl} />}
      {resultUrl && mode === "audio" && <audio className="recorder-result" controls src={resultUrl} />}
    </section>
  );
}
