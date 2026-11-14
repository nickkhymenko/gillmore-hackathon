"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Camera, CheckCircle, Record, Sparkle, UploadSimple, WarningCircle, X } from "@phosphor-icons/react";
import { PilotSheet } from "../Sheet";
import { MAX_CLIP_BYTES, SCAN_TYPES, type ClipMeta, type LiveFrameResult, type ScanResponse, type ScanType } from "@/lib/video/contract";
import { getVideoProvider } from "@/lib/video/provider";
import { addScan } from "@/lib/video/scans";
import type { PetRecord } from "@/lib/store";

const SECONDS = 15;
const SCAN_LABEL: Record<ScanType, { label: string; tip: string }> = {
  walk: { label: "Walk", tip: "Film from the side as they walk towards and past you, on flat ground." },
  sleep_breathing: { label: "Sleeping breathing", tip: "Film their chest while they sleep. Stay still and quiet." },
  face: { label: "Face", tip: "Film their face in good light, eyes and nose in view." },
  general: { label: "General", tip: "A clear, well-lit view of your pet moving around." },
};
const METRIC_LABEL: Record<keyof ScanResponse["metrics"], [string, (v: number) => string]> = {
  mobilityScore: ["Mobility", (v) => `${Math.round(v)}/100`],
  gaitAsymmetry: ["Gait evenness", (v) => (v < 0.1 ? "Even" : v < 0.2 ? "Slightly uneven" : "Uneven")],
  breathingRatePerMin: ["Breathing", (v) => `${Math.round(v)} a min`],
  activityLevel: ["Activity", (v) => `${Math.round(v * 100)}%`],
  bodyConditionScore: ["Body condition", (v) => `${v}/9`],
};

type Phase = "idle" | "camera" | "recording" | "review" | "analysing" | "result" | "denied";

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

/**
 * Video scan: camera preview, optional live overlay, record 15 s, play back, analyse.
 * Nothing is uploaded until the owner presses Analyse, and then only to /api/scan (server mode).
 * Sharing with a vet or a claim is always the owner's explicit choice.
 */
export function VideoScanPanel({ rec }: { rec: PetRecord }) {
  const [provider] = useState(getVideoProvider);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanType, setScanType] = useState<ScanType>(rec.pet.species === "cat" ? "sleep_breathing" : "walk");
  const [live, setLive] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stopLive = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const meta: ClipMeta = { petId: rec.id, species: rec.pet.species, scanType };
  const name = rec.pet.name;

  const stopCamera = () => {
    stopLive.current?.();
    stopLive.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
  };
  useEffect(() => stopCamera, []);
  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url);
  }, [clip]);

  async function openCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 960 }, height: { ideal: 540 } }, audio: false });
      stream.current = s;
      setPhase("camera");
      requestAnimationFrame(() => {
        if (videoEl.current) {
          videoEl.current.srcObject = s;
          videoEl.current.play().catch(() => {});
        }
      });
    } catch {
      setPhase("denied");
    }
  }

  function drawFrame(f: LiveFrameResult) {
    const c = canvas.current, v = videoEl.current;
    if (!c || !v) return;
    const w = (c.width = v.clientWidth), h = (c.height = v.clientHeight);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#FFD43B";
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 2;
    for (const k of f.keypoints ?? []) {
      ctx.beginPath();
      ctx.arc(k.x * w, k.y * h, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (f.label) {
      ctx.font = "600 14px system-ui, sans-serif";
      const text = `${f.label}${f.confidence !== undefined ? ` ${Math.round(f.confidence * 100)}%` : ""}`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(20,20,20,0.8)";
      ctx.fillRect(10, 10, tw + 16, 26);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(text, 18, 28);
    }
  }

  function toggleLive() {
    if (live) {
      stopLive.current?.();
      stopLive.current = null;
      canvas.current?.getContext("2d")?.clearRect(0, 0, canvas.current.width, canvas.current.height);
      setLive(false);
    } else if (provider.startLive && videoEl.current) {
      stopLive.current = provider.startLive(videoEl.current, drawFrame, meta);
      setLive(true);
    }
  }

  function record() {
    if (!stream.current) return;
    const mimeType = pickMime();
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1_000_000 });
    recorder.current = mr;
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mr.mimeType || "video/webm" });
      stopCamera();
      setLive(false);
      setClip({ blob, url: URL.createObjectURL(blob) });
      setPhase("review");
    };
    mr.start(500);
    setLeft(SECONDS);
    setPhase("recording");
    const started = performance.now();
    timer.current = setInterval(() => {
      const remaining = Math.max(0, SECONDS - (performance.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        if (timer.current) clearInterval(timer.current);
        if (mr.state !== "inactive") mr.stop();
      }
    }, 100);
  }

  function onFile(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("video/")) return setError("That file is not a video.");
    if (f.size > MAX_CLIP_BYTES) return setError(`That video is too large. Keep it under ${MAX_CLIP_BYTES / 1_000_000} MB (about 15 seconds).`);
    setError(null);
    stopCamera();
    setClip({ blob: f, url: URL.createObjectURL(f) });
    setPhase("review");
  }

  async function analyse() {
    if (!clip) return;
    setPhase("analysing");
    const r = await provider.analyzeClip(clip.blob, meta);
    addScan(r);
    setResult(r);
    setPhase("result");
  }

  function reset() {
    stopCamera();
    setClip(null);
    setResult(null);
    setLive(false);
    setPhase("idle");
  }

  const ring = 2 * Math.PI * 26;

  return (
    <div className="space-y-5" id="video">
      {/* Scan type: one decision before filming */}
      {(phase === "idle" || phase === "camera" || phase === "denied") && (
        <div className="space-y-2">
          <div role="radiogroup" aria-label="What to film" className="flex flex-wrap gap-2">
            {SCAN_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={scanType === t}
                onClick={() => setScanType(t)}
                className={`min-h-11 rounded-brand border px-3 text-sm font-semibold transition-colors ${scanType === t ? "border-ink bg-ink text-paper" : "border-line bg-white/50 hover:border-ink/40"}`}
              >
                {SCAN_LABEL[t].label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">{SCAN_LABEL[scanType].tip}</p>
        </div>
      )}

      {phase === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={openCamera} className="btn btn-primary min-h-14 px-6 text-lg">
            <Camera size={20} aria-hidden /> Open camera
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-ghost min-h-14 px-5">
            <UploadSimple size={18} aria-hidden /> Upload a video
          </button>
        </div>
      )}

      {phase === "denied" && (
        <div className="space-y-3 rounded-brand border border-line bg-white/60 p-4" role="status">
          <p className="font-semibold">Camera not available.</p>
          <p className="text-sm text-muted">Permission was denied or there is no camera. You can upload a short video instead (up to about 15 seconds).</p>
          <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-primary">
            <UploadSimple size={18} aria-hidden /> Upload a video
          </button>
        </div>
      )}
      <input ref={fileInput} type="file" accept="video/*" capture="environment" className="sr-only" aria-label="Upload a video of your pet" onChange={(e) => onFile(e.target.files?.[0])} />

      {(phase === "camera" || phase === "recording") && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-brand border border-line bg-ink">
            <video ref={videoEl} muted playsInline className="block aspect-video w-full object-cover" aria-label="Camera preview" />
            <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
            {phase === "recording" && (
              <div className="absolute right-3 top-3 grid h-16 w-16 place-items-center" role="timer" aria-live="off" aria-label={`${Math.ceil(left)} seconds left`}>
                <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="32" cy="32" r="26" fill="rgba(20,20,20,0.6)" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#FFD43B" strokeWidth="5" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (left / SECONDS)} />
                </svg>
                <span className="relative text-lg font-semibold text-white">{Math.ceil(left)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {phase === "camera" ? (
              <>
                <button type="button" onClick={record} className="btn btn-primary min-h-14 px-6 text-lg">
                  <Record size={20} weight="fill" aria-hidden /> Record {SECONDS} seconds
                </button>
                {provider.startLive && (
                  <button type="button" onClick={toggleLive} aria-pressed={live} className="btn btn-ghost min-h-14">
                    <Sparkle size={18} aria-hidden /> {live ? "Stop live view" : "Live view"}
                  </button>
                )}
                <button type="button" onClick={reset} className="link min-h-11">
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => recorder.current?.state !== "inactive" && recorder.current?.stop()} className="btn btn-ghost min-h-14">
                Stop early
              </button>
            )}
          </div>
        </div>
      )}

      {(phase === "review" || phase === "analysing") && clip && (
        <div className="space-y-3">
          <video src={clip.url} controls playsInline className="block aspect-video w-full rounded-brand border border-line bg-ink object-contain" aria-label="Your recording" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={analyse} disabled={phase === "analysing"} className="btn btn-primary min-h-14 px-6 text-lg">
              {phase === "analysing" ? "Analysing" : "Analyse"}
            </button>
            <button type="button" onClick={reset} disabled={phase === "analysing"} className="link inline-flex min-h-11 items-center gap-1">
              <ArrowCounterClockwise size={15} aria-hidden /> Retake
            </button>
          </div>
          <p className="text-xs text-muted">
            {provider.mode === "server" ? "Pressing Analyse sends this clip to the Prevently scan service for analysis. It is not stored." : "Analysed on this device. Nothing is uploaded."}
          </p>
        </div>
      )}

      {phase === "result" && result && (
        <article className="fade-up space-y-5 rounded-brand border border-line bg-white/60 p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">{SCAN_LABEL[result.scanType].label} scan</p>
            {result.source === "mock" && <span className="rounded-[3px] bg-accent-soft px-2 py-0.5 text-xs font-semibold">Using demo analysis</span>}
          </div>
          {!result.quality.ok ? (
            <p className="flex items-start gap-2 font-semibold">
              <WarningCircle size={20} weight="fill" aria-hidden /> We could not read this video: {result.quality.issue ?? "try again in better light"}.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(Object.keys(METRIC_LABEL) as (keyof ScanResponse["metrics"])[]).map((k) => (
                <div key={k}>
                  <dt className="eyebrow">{METRIC_LABEL[k][0]}</dt>
                  <dd className={`mt-1 text-xl font-semibold tracking-[-0.02em] ${result.metrics[k] === null ? "text-muted" : ""}`}>{result.metrics[k] === null ? "Not measured" : METRIC_LABEL[k][1](result.metrics[k]!)}</dd>
                </div>
              ))}
            </dl>
          )}
          {result.flags.length ? (
            <ul className="space-y-2">
              {result.flags.map((f) => (
                <li key={f.code} className="flex items-start gap-2 text-sm">
                  <WarningCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{f.label}</strong>: a sign worth a vet&apos;s look, not a diagnosis ({Math.round(f.confidence * 100)}% confidence).
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            result.quality.ok && (
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <CheckCircle size={18} weight="fill" aria-hidden /> Nothing stands out in this clip.
              </p>
            )
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="button" onClick={() => setSheet("Sending this clip and summary to your vet")} className="btn btn-ghost">
              Send to my vet
            </button>
            <button type="button" onClick={() => setSheet("Attaching this clip to a claim")} className="btn btn-ghost">
              Attach to a claim
            </button>
            <button type="button" onClick={reset} className="link min-h-11">
              New scan
            </button>
          </div>
          <p className="text-xs text-muted">
            Only you decide who sees this. It is never sent to your insurer automatically; they only see that you did a scan. Model {result.modelVersion}.
          </p>
        </article>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-medium text-red-800">
          <X size={14} aria-hidden /> {error}
        </p>
      )}
      <p className="text-xs text-muted">
        {name}&apos;s video scans compare {name} with {name}. Signs worth a vet&apos;s look, never a diagnosis.
      </p>
      <PilotSheet open={sheet !== null} onClose={() => setSheet(null)} what={sheet ?? ""} />
    </div>
  );
}
