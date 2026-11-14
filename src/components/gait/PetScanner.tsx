"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowCounterClockwise, ArrowLeft, Camera, Play, Scan, UploadSimple, Warning } from "@phosphor-icons/react";
import { AnalysisProgress, LiveChart, TraceNote, WARN } from "./Analysis";
import { GaitResult } from "./GaitResult";
import { OwnVideo } from "./OwnVideo";
import { mobilityFromClip, scanFromClip, versusUsual } from "./scan";
import { SkeletonPlayer, type ScanStage } from "./SkeletonPlayer";
import type { ClipIndexRow, GaitClip } from "./types";
import { PilotSheet } from "../Sheet";
import type { ScanResponse } from "@/lib/video/contract";
import { getVideoProvider } from "@/lib/video/provider";
import { addScan, useScans } from "@/lib/video/scans";
import type { PetRecord, StoredCheckin } from "@/lib/store";

type Mode = "walk" | "sleep_breathing";
type View = { kind: "gallery" } | { kind: "clip"; id: string } | { kind: "own"; source: "upload" | "camera" };
/** loading: the clip and its keypoints are fetched. build: points appear. live: the clip plays. */
type Phase = "loading" | "build" | "live" | "analysing" | "done";

const MODES: [Mode, string][] = [
  ["walk", "Walk"],
  ["sleep_breathing", "Sleeping breathing"],
];
const SPRING = { type: "spring", stiffness: 260, damping: 26 } as const;

/**
 * Pet Scanner: the one video feature. Nothing plays until the owner picks something.
 * A gallery of example clips (plus Upload and Camera) leads into the scanner: on the first frame
 * the model's 21 body points appear one by one and join into a skeleton, the clip plays with live counters and the
 * head and hip rhythm traces, and Analyse reveals the result card.
 * Example clips carry the model's real keypoints (DeepLabCut SuperAnimal-Quadruped, run offline; JSON in
 * /public/gait/clips). The owner's own videos only get a result from the live model; otherwise we say it is
 * coming in the pilot.
 */
export function PetScanner({ rec, log }: { rec: PetRecord; log: StoredCheckin[] }) {
  const name = rec.pet.name;
  const reduce = Boolean(useReducedMotion());
  const [provider] = useState(getVideoProvider);
  const scans = useScans(rec.id);
  const [index, setIndex] = useState<ClipIndexRow[]>([]);
  const [view, setView] = useState<View>({ kind: "gallery" });
  const [mode, setMode] = useState<Mode>("walk");
  const [clip, setClip] = useState<GaitClip | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [built, setBuilt] = useState(0);
  const [frame, setFrame] = useState<{ t: number; points: number }>({ t: 0, points: 0 });
  const [played, setPlayed] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [usual, setUsual] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/gait/clips/index.json")
      .then((r) => r.json())
      .then((rows: ClipIndexRow[]) => setIndex(rows.filter((r) => r.sample).sort((a, b) => Number(b.healthy) - Number(a.healthy))))
      .catch(() => setIndex([]));
  }, []);

  const clipId = view.kind === "clip" ? view.id : null;
  const row = index.find((r) => r.id === clipId) ?? null;

  // The keypoints for the chosen clip.
  useEffect(() => {
    if (!clipId) return;
    let live = true;
    fetch(`/gait/clips/${clipId}.json`)
      .then((r) => r.json())
      .then((c: GaitClip) => live && setClip(c))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [clipId]);

  // Once the first frame and the keypoints are both here, the body points build. Reduced motion goes straight to the clip.
  useEffect(() => {
    if (phase === "loading" && clip && ready) setPhase(reduce ? "live" : "build"); // eslint-disable-line react-hooks/set-state-in-effect -- starts when its two inputs have loaded
  }, [phase, clip, ready, reduce]);

  const open = (v: View) => {
    setClip(null);
    setReady(false);
    setPhase("loading");
    setBuilt(0);
    setFrame({ t: 0, points: 0 });
    setPlayed(false);
    setUsual(null);
    setView(v);
    if (v.kind !== "gallery") window.setTimeout(() => top.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 30);
  };

  const mine = clip ? clip.species === rec.pet.species : false;

  const finish = useCallback(() => {
    if (clip && mine) {
      const score = mobilityFromClip(clip);
      const prior = scans.filter((s) => s.scanType === "walk" && s.source === "ml");
      setUsual(score === null ? null : `Mobility ${score}, ${versusUsual(score, prior, log, name, clip.result.healthy)}`);
      addScan(scanFromClip(clip, rec.id));
    }
    setPhase("done");
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  }, [clip, mine, scans, log, name, rec.id]);

  const onFrame = useCallback((f: { t: number; points: number }) => setFrame(f), []);
  const onEnd = useCallback(() => setPlayed(true), []);
  const onBuild = useCallback((n: number) => setBuilt(n), []);
  const onBuilt = useCallback(() => setPhase((p) => (p === "build" ? "live" : p)), []);
  const onReady = useCallback(() => setReady(true), []);
  const ownResult = useCallback((r: ScanResponse) => addScan(r), []);

  const restart = () => {
    setPhase("live");
    setPlayed(false);
    setUsual(null);
    setReplayKey((k) => k + 1);
  };

  const total = clip?.bodyparts.length ?? 21;
  const scanning = phase === "loading" || phase === "build";
  const stage: ScanStage = phase === "loading" ? "wait" : phase === "build" ? "build" : "live";
  const points = scanning ? built : played || phase !== "live" ? (clip?.frames.at(-1)?.filter(Boolean).length ?? frame.points) : frame.points;
  const steps = clip && !scanning ? stepsSeen(clip, played || phase !== "live" ? clip.duration : frame.t) : 0;
  const fps = clip ? (scanning ? Math.round((clip.fps * built) / Math.max(1, clip.frames[0]?.filter(Boolean).length ?? total)) : Math.round(clip.fps)) : 0;
  const subject = mine ? name : clip?.species === "cat" ? "this cat" : "this dog";

  return (
    <div ref={top} className="scroll-mt-28 space-y-8" data-testid="pet-scanner" data-view={view.kind} data-phase={view.kind === "clip" ? phase : undefined}>
      <div className="space-y-2">
        <h3 className="display text-[clamp(2rem,5vw,3.25rem)]">
          Pet <span className="accent-word">Scanner.</span>
        </h3>
        <p className="max-w-[52ch] text-lg text-muted">Ten seconds of walking. 21 body points. Every step checked.</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view.kind === "gallery" && (
          <motion.div key="gallery" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={SPRING} className="space-y-5">
            <p className="eyebrow">Pick a clip to scan</p>
            <ul className="grid gap-5 sm:grid-cols-2" aria-label="Example clips">
              {index.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => open({ kind: "clip", id: r.id })}
                    aria-label={`Scan: ${r.title}${r.healthy ? "" : " (worth watching)"}`}
                    className="card group block w-full overflow-hidden text-left transition-shadow duration-300 hover:shadow-lift"
                  >
                    <span className="relative block aspect-video overflow-hidden bg-[#E9E6DF]">
                      {r.thumb && <Image src={r.thumb} alt="" fill sizes="(min-width: 640px) 560px, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />}
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur-sm" style={r.healthy ? undefined : { color: WARN }}>
                        {r.healthy ? "Example clip" : "Worth watching"}
                      </span>
                      <span className="absolute bottom-3 right-3 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur-sm transition-transform duration-300 group-hover:scale-105" aria-hidden>
                        <Play size={20} weight="fill" />
                      </span>
                    </span>
                    <span className="block p-5">
                      <span className="block text-xl font-semibold tracking-[-0.03em]">{r.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">A {Math.floor(r.duration)}-second clip. Tap to scan.</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-5">
              {(
                [
                  ["upload", "Upload", "A video of " + name, UploadSimple],
                  ["camera", "Camera", "Film " + name + " now", Camera],
                ] as const
              ).map(([source, label, line, I]) => (
                <button key={source} type="button" onClick={() => open({ kind: "own", source })} className="card-quiet flex min-h-28 flex-col items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-white">
                  <I size={26} aria-hidden />
                  <span>
                    <span className="block text-lg font-semibold tracking-[-0.02em]">{label}</span>
                    <span className="block text-sm text-muted">{line}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {view.kind === "clip" && row && (
          <motion.div key={`clip-${row.id}`} initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={SPRING} className="space-y-6">
            <button type="button" onClick={() => open({ kind: "gallery" })} className="link inline-flex min-h-11 items-center gap-1.5 text-sm">
              <ArrowLeft size={15} aria-hidden /> All clips
            </button>

            <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 space-y-3 lg:col-span-7">
                <SkeletonPlayer src={row.sample!} poster={row.thumb ?? undefined} clip={clip} stage={stage} instant={reduce} onReady={onReady} onBuild={onBuild} onBuilt={onBuilt} onFrame={onFrame} onEnd={onEnd} replayKey={replayKey}>
                  {scanning && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-ink shadow-soft backdrop-blur-sm" role="status">
                      <Scan size={16} weight="bold" className="animate-pulse" aria-hidden /> {phase === "build" ? "Finding body points" : "Scanning"}
                    </span>
                  )}
                </SkeletonPlayer>
                <p className="text-xs text-muted">Yellow lines are the left legs. The circled ear and tail base are the two points we measure.</p>
              </div>

              <div className="card min-w-0 space-y-5 p-5 sm:p-6 lg:col-span-5">
                <dl className="grid grid-cols-3 gap-3" aria-live="off">
                  <Stat label="Body points" value={`${points} / ${total}`} testid="scan-points" />
                  <Stat label="Steps seen" value={String(steps)} testid="scan-steps" />
                  <Stat label="Frames a second" value={String(fps)} testid="scan-fps" />
                </dl>

                {clip && !scanning ? (
                  <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-5">
                    <LiveChart clip={clip} t={phase === "live" && !played ? frame.t : null} scores={phase === "done"} warn={played || phase !== "live"} />
                    {phase === "live" && played && !clip.result.healthy && (
                      <p role="alert" className="fade-up flex items-start gap-2 rounded-brand p-3 text-sm font-semibold" style={{ color: WARN, background: "rgb(200 65 43 / 0.08)" }}>
                        <Warning size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                        Uneven steps spotted{clip.result.area ? `: ${clip.result.area}` : ""}. Tap Analyse for the full check.
                      </p>
                    )}
                    {phase === "live" && (
                      <button type="button" onClick={() => setPhase("analysing")} className="btn btn-primary min-h-14 w-full text-lg">
                        <Scan size={20} weight="bold" aria-hidden /> Analyse
                      </button>
                    )}
                    {phase === "analysing" && <AnalysisProgress onDone={finish} />}
                    {phase === "done" && (
                      <button type="button" onClick={restart} className="link inline-flex min-h-11 items-center gap-1 text-sm">
                        <ArrowCounterClockwise size={14} weight="bold" aria-hidden /> Watch again
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <p className="text-sm text-muted">The head and hip rhythm appear as the clip plays.</p>
                )}
              </div>
            </div>

            {phase === "done" && clip && (
              <div ref={resultRef} className="scroll-mt-24">
                <GaitResult clip={clip} petName={subject} mobility={mine ? mobilityFromClip(clip) : null} usual={usual} onSendVet={() => setSheet(true)} />
              </div>
            )}
            {!scanning && <TraceNote />}
          </motion.div>
        )}

        {view.kind === "own" && (
          <motion.div key="own" initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={SPRING} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <button type="button" onClick={() => open({ kind: "gallery" })} className="link inline-flex min-h-11 items-center gap-1.5 text-sm">
                <ArrowLeft size={15} aria-hidden /> All clips
              </button>
              <div role="tablist" aria-label="What to check" className="inline-flex rounded-full bg-ink/[0.06] p-1">
                {MODES.map(([m, text]) => (
                  <button key={m} type="button" role="tab" aria-selected={m === mode} onClick={() => setMode(m)} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${m === mode ? "bg-white shadow-soft" : "text-muted hover:text-ink"}`}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <OwnVideo
              key={`${mode}-${view.source}`}
              source={view.source}
              provider={provider}
              meta={{ petId: rec.id, species: rec.pet.species, scanType: mode }}
              name={name}
              onResult={ownResult}
              onTryDemo={() => open({ kind: "gallery" })}
              onSendVet={() => setSheet(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {index.length > 0 && (
        <p className="text-xs text-muted">
          Example clips{view.kind === "clip" && mine ? ` stand in for ${name}'s own video and are saved to ${name}'s trends as demo checks` : ""}. Credits: {index.map((r) => r.source).join("; ")}.
        </p>
      )}

      <PilotSheet open={sheet} onClose={() => setSheet(false)} what={`Sending this check and summary to ${name}'s vet`} />
    </div>
  );
}

function stepsSeen(clip: GaitClip, t: number) {
  const count = (s: GaitClip["signals"]["head"]) => (s ? s.troughs.filter((i) => s.t[i] !== undefined && s.t[i] <= t).length : 0);
  return count(clip.signals.head) + count(clip.signals.pelvis);
}

function Stat({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="tnum whitespace-nowrap text-2xl font-semibold tracking-[-0.04em] sm:text-3xl" data-testid={testid}>
        {value}
      </dd>
    </div>
  );
}
