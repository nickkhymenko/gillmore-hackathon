"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Camera, CheckCircle, Record, UploadSimple, VideoCamera, WarningCircle, X } from "@phosphor-icons/react";
import { MAX_CLIP_BYTES, type ClipMeta, type ScanResponse } from "@/lib/video/contract";
import type { VideoProvider } from "@/lib/video/provider";

const SECONDS = 15;

type Phase = "idle" | "camera" | "recording" | "review" | "analysing" | "result" | "pilot" | "denied";

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

const METRICS: [keyof ScanResponse["metrics"], string, (v: number) => string][] = [
  ["mobilityScore", "Mobility", (v) => `${Math.round(v)}/100`],
  ["gaitAsymmetry", "Step evenness", (v) => (v < 0.15 ? "Even" : v < 0.3 ? "Slightly uneven" : "Uneven")],
  ["breathingRatePerMin", "Sleeping breathing", (v) => `${Math.round(v)} a min`],
];

/**
 * The owner's own video, from an upload or the camera (the old video scan's internals).
 * Honest by design: a result is only shown when the real model answered (source "ml"). In mock mode, or when
 * the scan service falls back to the demo analysis, the owner sees that live analysis is coming in the pilot.
 */
export function OwnVideo({
  source,
  provider,
  meta,
  name,
  onResult,
  onTryDemo,
  onSendVet,
}: {
  source: "upload" | "camera";
  provider: VideoProvider;
  meta: ClipMeta;
  name: string;
  onResult: (r: ScanResponse) => void;
  onTryDemo?: () => void;
  onSendVet: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(SECONDS);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const live = provider.mode !== "mock";

  const stopCamera = () => {
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

  function got(blob: Blob) {
    setClip({ blob, url: URL.createObjectURL(blob) });
    // Without the live model there is nothing honest to analyse: say so straight away.
    setPhase(live ? "review" : "pilot");
  }

  function record() {
    if (!stream.current) return;
    const mimeType = pickMime();
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1_000_000 });
    recorder.current = mr;
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => {
      stopCamera();
      got(new Blob(chunks, { type: mr.mimeType || "video/webm" }));
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
    got(f);
  }

  async function analyse() {
    if (!clip) return;
    setPhase("analysing");
    const r = await provider.analyzeClip(clip.blob, meta);
    // Never show the demo analysis as if it were this video's result.
    if (r.source !== "ml") return setPhase("pilot");
    setResult(r);
    setPhase("result");
    if (r.quality.ok) onResult(r);
  }

  function reset() {
    stopCamera();
    setClip(null);
    setResult(null);
    setPhase("idle");
    if (fileInput.current) fileInput.current.value = "";
  }

  const ring = 2 * Math.PI * 26;
  const pickFile = () => fileInput.current?.click();

  return (
    <div className="space-y-5">
      <input ref={fileInput} type="file" accept="video/*" className="sr-only" aria-label={`Upload a video of ${name}`} onChange={(e) => onFile(e.target.files?.[0])} />

      {phase === "idle" &&
        (source === "upload" ? (
          <button type="button" onClick={pickFile} className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-line bg-white/60 p-8 text-center hover:bg-white">
            <UploadSimple size={32} weight="bold" aria-hidden />
            <span className="text-lg font-semibold">Choose a video of {name}</span>
            <span className="max-w-[44ch] text-sm text-muted">
              {meta.scanType === "walk" ? "Side on, phone at their height, a few steps on flat ground." : "Their chest while they sleep, phone still."} Up to about 15 seconds.
            </span>
          </button>
        ) : (
          <button type="button" onClick={openCamera} className="btn btn-primary min-h-14 px-6 text-lg">
            <Camera size={20} aria-hidden /> Open camera
          </button>
        ))}

      {phase === "denied" && (
        <div className="card space-y-3 p-6" role="status">
          <p className="font-semibold">Camera not available.</p>
          <p className="text-sm text-muted">Permission was denied or there is no camera. You can upload a short video instead.</p>
          <button type="button" onClick={pickFile} className="btn btn-primary">
            <UploadSimple size={18} aria-hidden /> Upload a video
          </button>
        </div>
      )}

      {(phase === "camera" || phase === "recording") && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-card border border-line bg-[#E9E6DF]">
            <video ref={videoEl} muted playsInline className="block aspect-video w-full object-cover" aria-label="Camera preview" />
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

      {clip && phase !== "camera" && phase !== "recording" && phase !== "result" && (
        <div className="space-y-3">
          <video src={clip.url} controls playsInline className="block aspect-video w-full rounded-card border border-line bg-[#E9E6DF] object-contain" aria-label="Your video" />
          {(phase === "review" || phase === "analysing") && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={analyse} disabled={phase === "analysing"} className="btn btn-primary min-h-14 px-6 text-lg">
                  {phase === "analysing" ? "Analysing" : "Analyse"}
                </button>
                <button type="button" onClick={reset} disabled={phase === "analysing"} className="link inline-flex min-h-11 items-center gap-1">
                  <ArrowCounterClockwise size={15} aria-hidden /> Another video
                </button>
              </div>
              <p className="text-xs text-muted">Pressing Analyse sends this clip to the Petra scan service for analysis. It is not stored.</p>
            </>
          )}
        </div>
      )}

      {phase === "pilot" && (
        <div className="card space-y-3 p-6" role="status">
          <p className="text-lg font-semibold">Live analysis of your own videos is coming in the pilot. Try a demo walk.</p>
          <div className="flex flex-wrap items-center gap-3">
            {onTryDemo && (
              <button type="button" onClick={onTryDemo} className="btn btn-primary">
                <VideoCamera size={18} aria-hidden /> Try a demo walk
              </button>
            )}
            <button type="button" onClick={reset} className="link inline-flex min-h-11 items-center gap-1 text-sm">
              <ArrowCounterClockwise size={14} aria-hidden /> Another video
            </button>
          </div>
          <p className="text-xs text-muted">Your video stays on this device. Nothing was analysed or sent.</p>
        </div>
      )}

      {phase === "result" && result && (
        <article className="card fade-up space-y-5 p-6" aria-live="polite">
          <p className="eyebrow">{meta.scanType === "walk" ? "Movement check" : "Sleeping breathing"} result</p>
          {!result.quality.ok ? (
            <p className="flex items-start gap-2 font-semibold">
              <WarningCircle size={20} weight="fill" aria-hidden /> We could not read this video: {result.quality.issue ?? "try again in better light"}.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {METRICS.filter(([k]) => result.metrics[k] !== null).map(([k, label, fmt]) => (
                <div key={k}>
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold tracking-[-0.02em]">{fmt(result.metrics[k]!)}</dd>
                </div>
              ))}
            </dl>
          )}
          {result.flags.length > 0 ? (
            <ul className="space-y-2">
              {result.flags.map((f) => (
                <li key={f.code} className="flex items-start gap-2 text-sm">
                  <WarningCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{f.label}</strong>
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
          <p className="text-sm font-semibold">Signs worth a vet&apos;s look, never a diagnosis.</p>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="button" onClick={onSendVet} className="btn btn-ghost">
              Send to my vet
            </button>
            <button type="button" onClick={reset} className="link min-h-11">
              Another video
            </button>
          </div>
          <p className="text-xs text-muted">Model {result.modelVersion}. Only you decide who sees this.</p>
        </article>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-medium text-red-800">
          <X size={14} aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}
