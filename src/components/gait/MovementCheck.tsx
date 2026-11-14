"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Pulse, Warning } from "@phosphor-icons/react";
import { AnalysisProgress, LiveChart, WARN } from "./Analysis";
import { GaitResult } from "./GaitResult";
import { OwnVideo } from "./OwnVideo";
import { mobilityFromClip, scanFromClip, versusUsual } from "./scan";
import { SkeletonPlayer } from "./SkeletonPlayer";
import type { ClipIndexRow, GaitClip } from "./types";
import { PilotSheet } from "../Sheet";
import type { ScanResponse } from "@/lib/video/contract";
import { getVideoProvider } from "@/lib/video/provider";
import { addScan, useScans } from "@/lib/video/scans";
import type { PetRecord, StoredCheckin } from "@/lib/store";

type Mode = "walk" | "sleep_breathing";
type Source = "demo" | "upload" | "camera";
type Phase = "tracking" | "live" | "analysing" | "done";

const MODES: [Mode, string][] = [
  ["walk", "Walk"],
  ["sleep_breathing", "Sleeping breathing"],
];
const SOURCES: [Source, string][] = [
  ["demo", "Demo walk"],
  ["upload", "Upload"],
  ["camera", "Camera"],
];

function Tabs<T extends string>({ label, items, value, onChange, role }: { label: string; items: [T, string][]; value: T; onChange: (v: T) => void; role: "tab" | "radio" }) {
  return (
    <div role={role === "tab" ? "tablist" : "radiogroup"} aria-label={label} className="flex flex-wrap gap-2">
      {items.map(([v, text]) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role={role}
            {...(role === "tab" ? { "aria-selected": on } : { "aria-checked": on })}
            onClick={() => onChange(v)}
            className={`min-h-11 rounded-brand border px-4 text-sm font-semibold transition-colors ${on ? "border-ink bg-ink text-paper" : "border-line bg-white/50 hover:border-ink/40"}`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Movement check: the one video feature, on the walk and on the dashboard.
 * Modes: Walk (default) and Sleeping breathing. Source: a demo clip (default), an upload, or the camera.
 * Demo clips play with the model's real keypoints (DeepLabCut SuperAnimal-Quadruped, run offline; JSON in
 * /public/gait/clips), then Analyse shows the gait result and saves it to the pet's trends.
 * The owner's own videos only get a result from the live model; otherwise we say it is coming in the pilot.
 */
export function MovementCheck({ rec, log, intro = true }: { rec: PetRecord; log: StoredCheckin[]; intro?: boolean }) {
  const name = rec.pet.name;
  const [provider] = useState(getVideoProvider);
  const scans = useScans(rec.id);
  const [mode, setMode] = useState<Mode>("walk");
  const [source, setSource] = useState<Source>("demo");
  const [index, setIndex] = useState<ClipIndexRow[]>([]);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [clip, setClip] = useState<GaitClip | null>(null);
  const [phase, setPhase] = useState<Phase>("tracking");
  const [frame, setFrame] = useState<{ t: number; points: number }>({ t: 0, points: 0 });
  const [played, setPlayed] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [usual, setUsual] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [seen, setSeen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const tracking = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetch("/gait/clips/index.json")
      .then((r) => r.json())
      .then((rows: ClipIndexRow[]) => {
        const demos = rows.filter((r) => r.sample);
        setIndex(demos);
        setDemoId((id) => id ?? (demos.find((r) => r.species === rec.pet.species) ?? demos.find((r) => r.species === "dog") ?? demos[0])?.id ?? null);
      })
      .catch(() => setIndex([]));
  }, [rec.pet.species]);

  // The demo starts playing when it scrolls into view, so it is never over before anyone sees it.
  useEffect(() => {
    const el = box.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, source, mode]);

  const row = index.find((r) => r.id === demoId) ?? null;
  useEffect(() => {
    if (!row) return;
    let live = true;
    fetch(`/gait/clips/${row.id}.json`)
      .then((r) => r.json())
      .then((c: GaitClip) => {
        if (!live) return;
        setClip(c);
        tracking.current = window.setTimeout(() => setPhase("live"), 1200);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      window.clearTimeout(tracking.current);
    };
  }, [row]);

  const selectDemo = (id: string) => {
    if (id === demoId) return;
    setClip(null);
    setPhase("tracking");
    setPlayed(false);
    setUsual(null);
    setDemoId(id);
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
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }, [clip, mine, scans, log, name, rec.id]);

  const onFrame = useCallback((f: { t: number; points: number }) => setFrame(f), []);
  const onEnd = useCallback(() => setPlayed(true), []);

  const restart = () => {
    setPhase("live");
    setPlayed(false);
    setUsual(null);
    setReplayKey((k) => k + 1);
  };

  const ownResult = useCallback((r: ScanResponse) => addScan(r), []);
  const showDemo = mode === "walk" && source === "demo";
  const sources = mode === "walk" ? SOURCES : SOURCES.filter(([s]) => s !== "demo");
  const subject = mine ? name : clip?.species === "cat" ? "this cat" : "this dog";

  return (
    <div ref={box} className="space-y-6">
      {intro && (
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Movement check</h3>
          <p className="max-w-[58ch] text-muted">
            Ten seconds of {name} walking past you. Watch every leg being found, then tap Analyse. Signs worth a vet&apos;s look, never a diagnosis.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Tabs
          label="What to check"
          role="tab"
          items={MODES}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m !== "walk" && source === "demo") setSource("upload");
          }}
        />
        <Tabs label="Video source" role="radio" items={sources} value={source} onChange={setSource} />
      </div>

      {showDemo ? (
        <div className="space-y-5">
          {index.length > 1 && (
            <ul className="flex flex-wrap gap-3" aria-label="Demo walks">
              {index.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectDemo(r.id)}
                    aria-pressed={r.id === demoId}
                    className={`flex items-center gap-3 rounded-brand border p-1.5 pr-4 text-left text-sm transition-colors ${r.id === demoId ? "border-ink bg-white" : "border-line bg-white/50 hover:border-ink/40"}`}
                  >
                    {r.thumb && (
                      <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-[4px] bg-dark">
                        <Image src={r.thumb} alt="" fill sizes="64px" className="object-cover" />
                      </span>
                    )}
                    <span>
                      <span className="block font-semibold capitalize">{r.species}</span>
                      <span className="block text-xs text-muted">{r.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {row && (
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="relative min-w-0 space-y-3 lg:col-span-6">
                <SkeletonPlayer
                  src={row.sample!}
                  clip={clip}
                  showSkeleton={phase !== "tracking"}
                  playing={seen && phase !== "tracking"}
                  replayKey={replayKey}
                  onEnd={onEnd}
                  onFrame={onFrame}
                />
                {phase === "tracking" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex items-center gap-2 rounded-brand bg-dark/80 px-4 py-2 text-sm font-semibold text-paper">
                      <Pulse size={18} weight="bold" className="animate-pulse" aria-hidden /> Finding every leg
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted">Live keypoints: yellow lines are the left legs; the circled ear and tail base are the two points we measure.</p>
              </div>

              <div className="min-w-0 space-y-5 lg:col-span-6">
                {clip && phase !== "tracking" ? (
                  <>
                    <dl className="grid grid-cols-3 gap-4">
                      <Stat label="Body points" value={`${frame.points} / ${clip.bodyparts.length}`} />
                      <Stat label="Steps seen" value={String(stepsSeen(clip, played || phase === "done" ? clip.duration : frame.t))} />
                      <Stat label="Frames a second" value={String(Math.round(clip.fps))} />
                    </dl>
                    <LiveChart clip={clip} t={phase === "live" && !played ? frame.t : null} scores={phase === "done"} warn={played || phase !== "live"} />
                    {phase === "live" && played && !clip.result.healthy && (
                      <div role="alert" className="fade-up flex items-start gap-3 rounded-brand p-4 text-white" style={{ background: WARN }}>
                        <Warning size={22} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                        <p className="font-semibold">Uneven steps spotted{clip.result.area ? `: ${clip.result.area}` : ""}. Tap Analyse for the full check.</p>
                      </div>
                    )}
                    {phase === "live" && (
                      <button type="button" onClick={() => setPhase("analysing")} className="btn btn-primary min-h-14 px-6 text-lg">
                        <Pulse size={20} weight="bold" aria-hidden /> Analyse
                      </button>
                    )}
                    {phase === "analysing" && <AnalysisProgress onDone={finish} />}
                    {phase === "done" && (
                      <button type="button" onClick={restart} className="link inline-flex min-h-11 items-center gap-1 text-sm">
                        <ArrowCounterClockwise size={14} weight="bold" aria-hidden /> Watch again
                      </button>
                    )}
                  </>
                ) : (
                  <div className="space-y-3" aria-hidden>
                    <div className="h-16 animate-pulse rounded-brand bg-ink/5" />
                    <div className="h-24 animate-pulse rounded-brand bg-ink/5" />
                  </div>
                )}
              </div>
            </div>
          )}

          {phase === "done" && clip && (
            <div ref={resultRef} className="scroll-mt-24">
              <GaitResult clip={clip} petName={subject} mobility={mine ? mobilityFromClip(clip) : null} usual={usual} onSendVet={() => setSheet(true)} />
            </div>
          )}

          <p className="text-xs text-muted">
            Demo walks{mine ? ` stand in for ${name}'s own video and are saved to ${name}'s trends as demo checks` : ""}. Credits: {index.map((r) => r.source).join("; ")}.
          </p>
        </div>
      ) : (
        <OwnVideo
          key={`${mode}-${source}`}
          source={source === "camera" ? "camera" : "upload"}
          provider={provider}
          meta={{ petId: rec.id, species: rec.pet.species, scanType: mode }}
          name={name}
          onResult={ownResult}
          onTryDemo={() => {
            setMode("walk");
            setSource("demo");
          }}
          onSendVet={() => setSheet(true)}
        />
      )}

      <PilotSheet open={sheet} onClose={() => setSheet(false)} what={`Sending this check and summary to ${name}'s vet`} />
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
