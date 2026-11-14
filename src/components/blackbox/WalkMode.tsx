"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { ArrowUpRight, Pause, Play, Stop } from "@phosphor-icons/react";
import { RouteThumb } from "./WalkMap";
import { addWalk, estimateDiscount, haversine, simulatedLoop, type WalkRecord } from "@/lib/blackbox";
import { basePremium } from "@/lib/discount";
import { updatePet, type PetRecord } from "@/lib/store";

const WalkMap = dynamic(() => import("./WalkMap").then((m) => m.WalkMap), {
  ssr: false,
  loading: () => <div className="shimmer h-72 w-full rounded-brand bg-ink/10 sm:h-96" aria-busy="true" />,
});

type Phase = "idle" | "running" | "paused" | "done";
type Source = "phone" | "simulated";

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const gbp2 = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
/** The example walk replays 35 minutes in about 15 seconds. */
export const SIM_SPEED = 140;

/**
 * Walk mode: Strava for dog walks. "Start a walk" replays an example 35-minute loop in about 15 seconds (no GPS
 * prompt); "Use real GPS" tracks with the phone (watchPosition). The route stays in this browser. With a collar
 * paired, steps and heart rate ride along. At the end the price ticks down to what a week like today would earn.
 */
export function WalkMode({
  rec,
  target,
  todayBefore,
  collar,
  liveHr,
  discountPct = 0,
  finishCta = { href: "#your-price", label: "See my new price" },
  onFinished,
}: {
  rec: PetRecord;
  target: number;
  todayBefore: number;
  collar: boolean;
  liveHr: number | null;
  /** The discount the pet is on now, so the finish card can tick down from today's price. */
  discountPct?: number;
  /** Where the finish card's button goes. */
  finishCta?: { href: string; label: string };
  onFinished: (w: WalkRecord) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [source, setSource] = useState<Source>("simulated");
  const speed = SIM_SPEED;
  const [pctAtStart, setPctAtStart] = useState(discountPct);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [elapsed, setElapsed] = useState(0); // seconds of walk time
  const [km, setKm] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<WalkRecord | null>(null);
  const watchId = useRef<number | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const sim = useRef<{ t: number; lat: number; lon: number }[]>([]);
  const simT = useRef(0);
  const lastWall = useRef(0);
  const route = useRef<[number, number][]>([]);
  const speedRef = useRef(speed);
  const dist = useRef(0);
  const name = rec.pet.name;

  const stopTimers = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  };
  useEffect(() => stopTimers, []);

  function enrol() {
    if (!rec.blackBox) updatePet(rec.id, { blackBox: { device: collar ? "collar" : "phone", enrolledAt: new Date().toISOString(), restSince: null } });
  }

  function runPhone() {
    if (!("geolocation" in navigator)) {
      setError("This browser cannot share location. Start an example walk instead.");
      return;
    }
    lastWall.current = performance.now();
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        if (p.coords.accuracy > 60) return; // ignore poor fixes indoors
        const pt: [number, number] = [p.coords.latitude, p.coords.longitude];
        const prior = route.current.at(-1);
        if (prior) {
          const d = haversine(prior, pt);
          if (d < 0.003) return; // under 3 m: GPS jitter
          dist.current += d;
        }
        route.current = [...route.current, pt];
        setPoints(route.current);
        setKm(dist.current);
      },
      (e) => setError(e.code === 1 ? "Location permission was denied. You can still start an example walk." : "Location is unavailable here (indoors?). Start an example walk instead."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    tick.current = setInterval(() => {
      const now = performance.now();
      setElapsed((e) => e + (now - lastWall.current) / 1000);
      lastWall.current = now;
    }, 500);
  }

  function runSim() {
    lastWall.current = performance.now();
    tick.current = setInterval(() => {
      const now = performance.now();
      simT.current = Math.min(sim.current.at(-1)!.t, simT.current + ((now - lastWall.current) / 1000) * speedRef.current);
      lastWall.current = now;
      const upto = sim.current.filter((p) => p.t <= simT.current).map((p) => [p.lat, p.lon] as [number, number]);
      setPoints(upto);
      setElapsed(simT.current);
      let d = 0;
      for (let i = 1; i < upto.length; i++) d += haversine(upto[i - 1], upto[i]);
      setKm(d);
      if (simT.current >= sim.current.at(-1)!.t) finish(upto, simT.current, d, "simulated");
    }, 200);
  }
  function start(src: Source) {
    setError(null);
    setSource(src);
    setPoints([]);
    setElapsed(0);
    setKm(0);
    route.current = [];
    dist.current = 0;
    setLast(null);
    setPctAtStart(discountPct);
    enrol();
    if (src === "simulated") {
      sim.current = simulatedLoop();
      simT.current = 0;
      runSim();
    } else runPhone();
    setPhase("running");
  }
  function pause() {
    stopTimers();
    setPhase("paused");
  }
  function resume() {
    if (source === "simulated") runSim();
    else runPhone();
    setPhase("running");
  }
  function finish(route = points, secs = elapsed, dist = km, src: Source = source) {
    stopTimers();
    const minutes = Math.max(1, Math.round(secs / 60));
    const w: WalkRecord = {
      id: `w-${Date.now()}`,
      petId: rec.id,
      startedAt: new Date(Date.now() - secs * 1000).toISOString(),
      minutes,
      distanceKm: Math.round(dist * 100) / 100,
      steps: collar || src === "simulated" ? Math.round(minutes * (rec.pet.species === "cat" ? 40 : 105)) : 0,
      source: collar ? "collar" : src,
      route,
    };
    addWalk(w);
    setLast(w);
    setPhase("done");
    onFinished(w);
  }

  const pace = km > 0.05 ? elapsed / 60 / km : null;
  const simulatedHr = phase === "running" ? 96 + Math.round(10 * Math.sin(elapsed / 90)) : null;
  const hr = liveHr ?? (collar ? simulatedHr : null);

  if (phase === "done" && last)
    return <FinishCard rec={rec} walk={last} target={target} todayBefore={todayBefore} discountPct={pctAtStart} cta={finishCta} onAgain={() => setPhase("idle")} />;

  return (
    <div className="space-y-5">
      {phase === "idle" ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="button" onClick={() => start("simulated")} className="btn btn-primary min-h-14 px-7 text-lg">
            <Play size={20} weight="fill" aria-hidden /> Start a walk
          </button>
          <span className="text-sm text-muted">An example 35-minute walk, replayed in 15 seconds.</span>
          <button type="button" onClick={() => start("phone")} className="link min-h-11 text-sm">
            Use real GPS
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {phase === "running" ? (
            <button type="button" onClick={pause} className="btn btn-ghost min-h-14 px-6 text-lg">
              <Pause size={20} weight="fill" aria-hidden /> Pause
            </button>
          ) : (
            <button type="button" onClick={resume} className="btn btn-ghost min-h-14 px-6 text-lg">
              <Play size={20} weight="fill" aria-hidden /> Resume
            </button>
          )}
          <button type="button" onClick={() => finish()} className="btn btn-primary min-h-14 px-6 text-lg">
            <Stop size={20} weight="fill" aria-hidden /> Finish
          </button>
          <span className="text-sm text-muted">{source === "simulated" ? "Example walk, sped up" : "Tracking with your phone"}</span>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <dl className="grid grid-cols-3 gap-4 border-y border-line py-4" aria-live="polite">
        <div>
          <dt className="eyebrow">Time</dt>
          <dd className="tnum text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{fmtTime(elapsed)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Distance</dt>
          <dd className="tnum text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {km.toFixed(2)}
            <span className="text-base font-medium text-muted"> km</span>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Pace</dt>
          <dd className="tnum text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {pace ? fmtTime(pace * 60) : "--"}
            <span className="text-base font-medium text-muted"> /km</span>
          </dd>
        </div>
        {(collar || liveHr !== null) && (
          <>
            <div>
              <dt className="eyebrow">Steps</dt>
              <dd className="tnum text-2xl font-semibold tracking-[-0.02em]">{Math.round((elapsed / 60) * 105).toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt className="eyebrow">Heart rate{liveHr !== null ? " (sensor)" : ""}</dt>
              <dd className="tnum text-2xl font-semibold tracking-[-0.02em]">{hr ?? "--"} bpm</dd>
            </div>
            <div>
              <dt className="eyebrow">Temperature</dt>
              <dd className="text-2xl font-semibold tracking-[-0.02em]">Normal</dd>
            </div>
          </>
        )}
      </dl>

      {phase !== "idle" && target > 0 && <TargetBar today={todayBefore + elapsed / 60} target={target} />}

      <WalkMap points={points} live={phase === "running"} />
      <p className="text-xs text-muted">
        Only you see this map. The route stays on this device; map tiles load from OpenStreetMap. {name}&apos;s target today: {target} minutes.
      </p>
    </div>
  );
}

/** Minutes counting toward today's target while the walk runs. */
function TargetBar({ today, target }: { today: number; target: number }) {
  const done = Math.min(target, Math.floor(today));
  return (
    <div>
      <p className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-semibold">Today&apos;s target</span>
        <span className="tnum" data-testid="live-target">
          {done} of {target} min
        </span>
      </p>
      <div className="mt-1.5 h-2.5 rounded-full bg-ink/10" aria-hidden>
        <div className="h-2.5 rounded-full bg-accent ring-1 ring-ink/20 transition-[width] duration-200" style={{ width: `${(done / target) * 100}%` }} />
      </div>
    </div>
  );
}

/** Counts from one price to another once, then holds. Instant with reduced motion. */
function TickingPrice({ from, to }: { from: number; to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = gbp2(to);
      return;
    }
    const c = animate(from, to, { duration: 1.4, delay: 0.3, ease: "easeOut", onUpdate: (v) => (el.textContent = gbp2(v)) });
    return () => c.stop();
  }, [from, to]);
  return <span ref={ref}>{gbp2(from)}</span>;
}

function FinishCard({ rec, walk, target, todayBefore, discountPct, cta, onAgain }: { rec: PetRecord; walk: WalkRecord; target: number; todayBefore: number; discountPct: number; cta: { href: string; label: string }; onAgain: () => void }) {
  const today = todayBefore + walk.minutes;
  const pct = target ? Math.min(100, (today / target) * 100) : 100;
  const monthly = basePremium(rec.pet) / 12;
  const week = estimateDiscount(7, today, target);
  const pctAfter = Math.max(discountPct, week.total);
  const before = monthly * (1 - discountPct / 100);
  const after = monthly * (1 - pctAfter / 100);
  return (
    <article className="fade-up space-y-6 rounded-brand border border-line bg-white/60 p-5 sm:p-7" aria-live="polite">
      <p className="eyebrow">Walk saved</p>
      <div className="flex flex-wrap items-start gap-6">
        <RouteThumb points={walk.route} size={128} />
        <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Time</dt>
            <dd className="whitespace-nowrap text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{walk.minutes} min</dd>
          </div>
          <div>
            <dt className="eyebrow">Distance</dt>
            <dd className="whitespace-nowrap text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{walk.distanceKm.toFixed(2)} km</dd>
          </div>
          {walk.steps > 0 && (
            <div>
              <dt className="eyebrow">Steps</dt>
              <dd className="whitespace-nowrap text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{walk.steps.toLocaleString("en-GB")}</dd>
            </div>
          )}
        </dl>
      </div>
      <div>
        <p className="text-xl font-semibold tracking-[-0.02em]">
          Target: {Math.min(today, target)} of {target} minutes today{today >= target ? `. Done for today, well walked ${rec.pet.name}.` : "."}
        </p>
        <div className="mt-2 h-3 rounded-full bg-ink/10" role="meter" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(today, target)} aria-label="Today's target">
          <div className="h-3 rounded-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="rounded-brand bg-dark p-5 text-white" data-testid="finish-saving">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">A week like today</p>
        <p className="tnum mt-1 text-4xl font-semibold tracking-[-0.03em] text-accent sm:text-5xl">
          <TickingPrice from={before} to={after} />
          <span className="text-base font-medium text-white/70"> a month</span>
        </p>
        <p className="mt-1 text-sm text-white/70">
          {pctAfter > discountPct ? `Down from ${gbp2(before)}: ${pctAfter}% off with weekly check-ins.` : `Keep walking to move up a tier.`} Illustrative.
        </p>
      </div>
      <p className="text-sm text-muted">Only &ldquo;target met this week: yes or no&rdquo; ever reaches your insurer.</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href={cta.href} className="btn btn-primary">
          {cta.label} <ArrowUpRight size={18} weight="bold" aria-hidden />
        </a>
        <button type="button" onClick={onAgain} className="link min-h-11">
          Start another walk
        </button>
      </div>
    </article>
  );
}
