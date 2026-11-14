"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Play, Pulse, UploadSimple, VideoCamera, Warning } from "@phosphor-icons/react";
import { AnalysisProgress, LiveChart, WARN } from "./Analysis";
import { GaitResult } from "./GaitResult";
import { SkeletonPlayer } from "./SkeletonPlayer";
import { scanFromClip } from "../scan";
import type { ClipIndexRow, GaitClip } from "../types";
import { addScan } from "@/lib/video/scans";
import type { PetRecord } from "@/lib/store";

type Phase = "idle" | "tracking" | "live" | "analysing" | "done" | "unknown";

function Block({ n, title, aside, children }: { n: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <h3 className="eyebrow">
          <span className="tnum text-ink">{n}</span> / {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Movement check, the weekly 10-second walk video, at the top of the dashboard's Health tab.
 * 01 upload or pick a demo walk → 02 the skeleton appears and the head and hip curves draw live, once
 * → 03 Analyse gives the result and what it means for cover. A result for this pet's species is saved as a scan,
 * so it feeds the mobility trend below.
 *
 * Demo build: pose estimation (DeepLabCut SuperAnimal-Quadruped) ran offline and the keypoints ship as JSON in
 * /public/gait/clips. An uploaded file is recognised by its size (or length).
 */
export function MovementCheck({ rec }: { rec: PetRecord }) {
  const petName = rec.pet.name;
  const [index, setIndex] = useState<ClipIndexRow[]>([]);
  const [src, setSrc] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; bytes: number } | null>(null);
  const [clip, setClip] = useState<GaitClip | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [frame, setFrame] = useState<{ t: number; points: number }>({ t: 0, points: 0 });
  const [played, setPlayed] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/gait/clips/index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);

  useEffect(() => () => {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
  }, [src]);

  const loadClip = useCallback(async (row: ClipIndexRow) => {
    const data: GaitClip = await fetch(`/gait/clips/${row.id}.json`).then((r) => r.json());
    setClip(data);
    setPlayed(false);
    setPhase("tracking");
    setTimeout(() => setPhase("live"), 1400);
  }, []);

  const onFile = useCallback(
    (f: File) => {
      setClip(null);
      setFile({ name: f.name, bytes: f.size });
      setSrc(URL.createObjectURL(f));
      const match = index.find((r) => r.bytes === f.size);
      if (match) void loadClip(match);
      else setPhase("tracking");
    },
    [index, loadClip],
  );

  const onDuration = useCallback(
    (seconds: number) => {
      if (clip || !file) return;
      const match = index.find((r) => r.bytes !== null && Math.abs(r.duration - seconds) < 0.15);
      if (match) void loadClip(match);
      else setTimeout(() => setPhase((p) => (p === "tracking" ? "unknown" : p)), 1600);
    },
    [clip, file, index, loadClip],
  );

  const trySample = (row: ClipIndexRow) => {
    if (!row.sample) return;
    setFile(null);
    setSrc(row.sample);
    void loadClip(row);
  };

  const reset = () => {
    setSrc(null);
    setFile(null);
    setClip(null);
    setPlayed(false);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const finishAnalysis = useCallback(() => {
    if (clip && clip.species === rec.pet.species) addScan(scanFromClip(clip, rec.id));
    setPhase("done");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [clip, rec.id, rec.pet.species]);

  const onFrame = useCallback((f: { t: number; points: number }) => setFrame(f), []);
  const onEnd = useCallback(() => setPlayed(true), []);
  const replay = () => {
    setPlayed(false);
    setReplayKey((k) => k + 1);
  };

  const showLive = !!(src && clip && phase !== "tracking");
  const analysed = phase === "done";
  const samples = index.filter((r) => r.sample);
  const openSources = samples.filter((r) => !r.bytes).map((r) => r.source).filter(Boolean);

  return (
    <div className="space-y-12" data-testid="movement-check" data-phase={phase}>
      <div className="space-y-4">
        <p className="eyebrow">Movement check · once a week</p>
        <h2 className="display text-[clamp(2rem,5vw,3.5rem)]">
          Ten seconds of walking. <span className="accent-word">A clearer look at every leg.</span>
        </h2>
        <p className="max-w-[58ch] text-lg text-muted">
          Film {petName} walking past you on your phone. Watch us find every leg in real time, then tap Analyse to see if a leg needs a
          vet&apos;s look before it becomes a claim.
        </p>
      </div>

      {/* 01 upload */}
      {!src && (
        <Block n="01" title="Upload a walk" aside={<Link href="/walk" className="link text-sm">Part of your weekly Health Walk</Link>}>
          <div className="space-y-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-brand border-2 border-dashed p-8 text-center transition-colors ${
                dragging ? "border-ink bg-accent-soft" : "border-line hover:bg-ink/[0.03]"
              }`}
            >
              <UploadSimple size={36} weight="bold" aria-hidden />
              <span className="text-xl font-semibold">Drop a video of {petName} here, or choose one</span>
              <span className="max-w-[44ch] text-sm text-muted">Side on is best, phone at their height, a few steps on a flat floor. MP4 or MOV.</span>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
            <div className="space-y-3 pt-4">
              <p className="flex items-center gap-2 font-semibold">
                <VideoCamera size={18} weight="bold" aria-hidden /> Or try one of our demo walks
              </p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {samples.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => trySample(r)}
                      className="group flex h-full w-full flex-col overflow-hidden rounded-brand border border-line bg-white/60 text-left transition-colors hover:border-ink/40"
                    >
                      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-dark">
                        {r.thumb && (
                          <Image src={r.thumb} alt="" fill sizes="(min-width: 1024px) 16vw, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-semibold capitalize">{r.species}</span>
                      </span>
                      <span className="space-y-0.5 p-3">
                        <span className="block text-sm font-semibold leading-snug">{r.title}</span>
                        <span className="block text-xs text-muted">{r.bytes ? "Real owner video" : "Open-licence sample"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                Owner videos shared publicly on Reddit, shown for demonstration.
                {openSources.length > 0 && <> Open-licence samples: {openSources.join("; ")}.</>}
              </p>
            </div>
          </div>
        </Block>
      )}

      {/* 02 live tracking */}
      {src && (
        <Block
          n="02"
          title="Live tracking"
          aside={
            <button type="button" onClick={reset} className="link inline-flex min-h-11 items-center gap-1 text-sm">
              <ArrowCounterClockwise size={14} weight="bold" aria-hidden /> New video
            </button>
          }
        >
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="relative min-w-0 space-y-3 lg:col-span-6">
              <SkeletonPlayer
                src={src}
                clip={clip}
                showSkeleton={phase !== "tracking"}
                playing={phase !== "tracking"}
                replayKey={replayKey}
                onEnd={onEnd}
                onDuration={onDuration}
                onFrame={onFrame}
              />
              {phase === "tracking" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 rounded-brand bg-dark/80 px-4 py-2 text-sm font-semibold text-paper">
                    <Pulse size={18} weight="bold" className="animate-pulse" aria-hidden /> Finding every leg
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-[48ch] text-xs text-muted">
                  {clip ? `${clip.title}. ` : file ? `${file.name}. ` : ""}
                  Yellow lines are the left legs. The circled ear and tail base are the two points we measure.
                </p>
                {clip && played && (
                  <button type="button" onClick={replay} className="btn btn-ghost min-h-10 px-3 py-1.5 text-sm">
                    <Play size={14} weight="fill" aria-hidden /> Replay
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-6 lg:col-span-6">
              {showLive && clip ? (
                <>
                  <dl className="grid grid-cols-3 gap-4">
                    <Stat label="Body points" value={`${frame.points} / ${clip.bodyparts.length}`} />
                    <Stat label="Steps seen" value={String(stepsSeen(clip, frame.t))} />
                    <Stat label="Frames a second" value={String(Math.round(clip.fps))} />
                  </dl>
                  <LiveChart clip={clip} t={phase === "live" && !played ? frame.t : null} scores={analysed} warn={played || phase !== "live"} />
                  {phase === "live" && played && !clip.result.healthy && (
                    <div role="alert" className="fade-up flex items-start gap-3 rounded-brand p-4 text-white" style={{ background: WARN }}>
                      <Warning size={22} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <p className="font-semibold">Uneven steps spotted: {clip.result.area}</p>
                        <p className="text-sm text-white/85">The red dots sit higher: the body drops less when that leg takes weight. Tap Analyse for the full check.</p>
                      </div>
                    </div>
                  )}
                  {phase === "live" && played && clip.result.healthy && (
                    <p className="fade-up rounded-brand bg-accent-soft p-4 text-sm font-medium">Steps look even so far. Tap Analyse for the full check.</p>
                  )}
                  {phase === "live" && (
                    <button type="button" onClick={() => setPhase("analysing")} disabled={!played} className="btn btn-primary text-lg">
                      <Pulse size={20} weight="bold" aria-hidden /> Analyse {petName}&apos;s walk
                    </button>
                  )}
                  {phase === "analysing" && <AnalysisProgress onDone={finishAnalysis} />}
                </>
              ) : phase === "unknown" ? (
                <p className="rounded-brand border border-line p-4 text-sm">
                  This demo recognises our sample clips only. In the live service the video is analysed on our server in about a minute. Try a demo walk to see the
                  full flow.
                </p>
              ) : (
                <div className="space-y-3" aria-hidden>
                  <div className="h-16 animate-pulse rounded-brand bg-ink/5" />
                  <div className="h-24 animate-pulse rounded-brand bg-ink/5" />
                  <div className="h-24 animate-pulse rounded-brand bg-ink/5" />
                </div>
              )}
            </div>
          </div>
        </Block>
      )}

      {/* 03 result */}
      {analysed && clip && (
        <div ref={resultRef} className="scroll-mt-24">
          <Block n="03" title="Result">
            <GaitResult clip={clip} petName={clip.species === rec.pet.species ? petName : ""} />
          </Block>
        </div>
      )}
    </div>
  );
}

function stepsSeen(clip: GaitClip, t: number) {
  const count = (s: GaitClip["signals"]["head"]) => (s ? s.troughs.filter((i) => s.t[i] !== undefined && s.t[i] <= t).length : 0);
  return count(clip.signals.head) + count(clip.signals.pelvis);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-3xl font-semibold tracking-[-0.04em] tnum">{value}</dd>
    </div>
  );
}
