"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { PetAvatar } from "../PetAvatar";
import { Cite } from "./Stop";
import { basePremium } from "@/lib/discount";
import { BB_CAP } from "@/lib/blackbox";
import type { PetRecord } from "@/lib/store";

const INK = "#141414";
const BROWN = "#7A4A2A";
const BROWN_HI = "#A06A44";
const SCOOP_MS = 600;
/** ABI 2024 average premium per pet: the fallback when a pet has no illustrative premium. */
const ABI_AVERAGE = 389;

/** Cute face: two dot eyes with a glint and a small smile. */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="-7" cy="0" r="3" fill={INK} />
      <circle cx="7" cy="0" r="3" fill={INK} />
      <circle cx="-6" cy="-1" r="1" fill="#fff" />
      <circle cx="8" cy="-1" r="1" fill="#fff" />
      <path d="M-4 6 Q0 9.5 4 6" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="-11" cy="5" rx="2.6" ry="1.6" fill="#E9A3A0" opacity="0.8" />
      <ellipse cx="11" cy="5" rx="2.6" ry="1.6" fill="#E9A3A0" opacity="0.8" />
    </g>
  );
}

/** The classic brown swirl, three soft tiers with a small shine. */
function Swirl() {
  return (
    <g>
      <ellipse cx="60" cy="78" rx="32" ry="12" fill={BROWN} />
      <ellipse cx="60" cy="63" rx="24" ry="11" fill={BROWN} />
      <ellipse cx="60" cy="49" rx="15" ry="9" fill={BROWN} />
      <path d="M55 42 Q60 28 69 37 Q63 38 60 42 Z" fill={BROWN} />
      <path d="M36 76 Q44 70 54 72" fill="none" stroke={BROWN_HI} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42 61 Q49 56 56 57" fill="none" stroke={BROWN_HI} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="53" cy="46" rx="3.6" ry="2" fill="#fff" opacity="0.85" transform="rotate(-20 53 46)" />
      <Face x={60} y={63} />
    </g>
  );
}

function Pellets({ big }: { big: boolean }) {
  const pts = big
    ? [
        [42, 76, 13],
        [78, 76, 13],
        [60, 78, 14],
        [51, 57, 12],
        [70, 57, 12],
      ]
    : [
        [40, 82, 7],
        [54, 84, 7],
        [68, 84, 7],
        [82, 82, 7],
        [47, 71, 7],
        [75, 71, 7],
        [61, 68, 11],
      ];
  return (
    <g>
      {pts.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={BROWN} />
          <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.25} fill="#fff" opacity="0.8" />
        </g>
      ))}
      {big ? <Face x={60} y={78} s={0.8} /> : <Face x={61} y={68} s={0.55} />}
    </g>
  );
}

function LitterTray() {
  return (
    <g>
      <path d="M18 62 Q60 52 102 62 Z" fill="#F3E7CF" />
      <g transform="translate(60 56) scale(0.5) translate(-60 -70)">
        <Swirl />
      </g>
      <path d="M12 62 H108 L100 90 Q99 93 96 93 H24 Q21 93 20 90 Z" fill="var(--accent)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 70 H96" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

/** A cute cartoon poo for this pet: a brown swirl (litter tray for cats, droppings for rabbits and horses). Never gross. */
export function PooArt({ rec }: { rec: PetRecord }) {
  const species = rec.pet.species;
  return (
    <>
      <ellipse cx="60" cy="92" rx="36" ry="4" fill={INK} opacity="0.12" />
      {species === "cat" ? <LitterTray /> : species === "rabbit" ? <Pellets big={false} /> : species === "horse" ? <Pellets big /> : <Swirl />}
    </>
  );
}

/** Two little stink lines that wiggle gently. */
function Stink({ animate }: { animate: boolean }) {
  const line = (x: number, delay: number) => (
    <motion.path
      key={x}
      d={`M${x} 30 q-5 -6 0 -12 q5 -6 0 -12`}
      fill="none"
      stroke={INK}
      strokeOpacity="0.4"
      strokeWidth="2"
      strokeLinecap="round"
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={animate ? { opacity: [0, 1, 1], y: [6, 0, -2] } : undefined}
      transition={animate ? { delay, duration: 1.6, repeat: Infinity, repeatType: "reverse" } : undefined}
    />
  );
  return <g>{[line(48, 0.9), line(72, 1.2)]}</g>;
}

/**
 * The walk's insurance stop as a problem statement. As the paw arrives (WalkPath pauses at data-walk-pause),
 * the pet's avatar drops a tiny cartoon poo on the path. "Pick it up" scoops it into a bag and walks on to
 * /savings. The picked-up state never persists: it resets on refresh, and ?replay=1 or Replay resets it too.
 * Reduced motion: a static poo and the call to action only.
 */
export function PooMoment({ rec }: { rec: PetRecord }) {
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const [picked, setPicked] = useState(false);
  const [take, setTake] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const name = rec.pet.name;
  const premium = basePremium(rec.pet);
  const overpay = Math.round((Number.isFinite(premium) && premium > 0 ? premium : ABI_AVERAGE) * (BB_CAP / 100));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("replay") === "1") {
      params.delete("replay");
      const q = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}#cover`);
      document.getElementById("cover")?.scrollIntoView({ block: "start" });
    }
    return () => window.clearTimeout(timer.current);
  }, []);

  function pickUp() {
    if (reduce) return router.push("/savings");
    if (picked) return;
    setPicked(true);
    timer.current = window.setTimeout(() => router.push("/savings"), SCOOP_MS);
  }

  function replay(e: React.MouseEvent) {
    e.preventDefault();
    window.clearTimeout(timer.current);
    setPicked(false);
    setTake((t) => t + 1);
  }

  return (
    <div id="uh-oh" data-walk-pause className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10">
        <div key={take} className="relative flex shrink-0 items-end gap-1" aria-hidden>
          <motion.span
            initial={reduce ? false : { x: -24, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1, y: [0, -8, 0] }}
            viewport={{ once: true, margin: "0px 0px -38% 0px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-2"
          >
            <PetAvatar traits={rec.profile} size={64} animated={false} title="" />
          </motion.span>
          <svg viewBox="0 0 120 100" className="h-auto w-32 overflow-visible sm:w-40">
            <path d="M-40 94 H150" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
            <motion.g
              initial={reduce ? false : { x: -40, y: -60, scale: 0.4, opacity: 0 }}
              whileInView={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "0px 0px -38% 0px" }}
              transition={{ type: "spring", stiffness: 420, damping: 12, delay: 0.35 }}
              style={{ transformOrigin: "60px 90px" }}
            >
              <motion.g style={{ transformOrigin: "60px 80px" }} animate={picked ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ delay: 0.22, duration: 0.18 }}>
                <PooArt rec={rec} />
                {!picked && <Stink animate={!reduce} />}
              </motion.g>
            </motion.g>
            {picked && (
              <motion.g initial={{ y: -90, opacity: 0 }} animate={{ y: [-90, 8, -14], opacity: [0, 1, 1] }} transition={{ duration: SCOOP_MS / 1000, times: [0, 0.4, 1], ease: "easeOut" }}>
                <path d="M40 36 L45 12 L53 22 L60 10 L67 22 L75 12 L80 36 Q86 84 60 86 Q34 84 40 36 Z" fill="var(--accent)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                <path d="M44 34 H76" stroke={INK} strokeWidth="2" strokeLinecap="round" />
              </motion.g>
            )}
          </svg>
        </div>
        <h3 className="display max-w-3xl text-[clamp(2rem,5vw,3.75rem)]">
          Uh oh. Your insurance <span className="accent-word">isn&apos;t working for you.</span>
        </h3>
      </div>

      <ol className="max-w-3xl space-y-5 text-[clamp(1.25rem,2.6vw,1.75rem)] font-semibold leading-snug tracking-[-0.02em]">
        <li>
          UK owners paid an average of £389 per pet for insurance in 2024.
          <Cite ids={["abi2024"]} />
        </li>
        <li>
          62% of insured owners saw their premium rise last year, and over half said the rise was unreasonable.
          <Cite ids={["which2025"]} />
        </li>
        <li>Your price ignores the walks and care you already do.</li>
      </ol>

      <p className="max-w-3xl text-lg">
        You could be paying around <strong className="rounded-[4px] bg-accent px-1">£{overpay} a year</strong> more than you need to for {name}.{" "}
        <span className="text-sm text-muted">Illustrative: {name}&apos;s example premium × the {BB_CAP}% maximum Petra discount.</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" onClick={pickUp} aria-label="Pick it up: lower your insurance costs" className="btn btn-primary min-h-14 px-6 text-lg">
          Pick it up <ArrowUpRight size={20} weight="bold" aria-hidden />
        </button>
        {picked && !reduce && (
          <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.2 }} className="inline-flex items-center gap-3">
            <span role="status" className="inline-flex items-center gap-1.5 font-semibold">
              <Check size={18} weight="bold" aria-hidden /> Picked up
            </span>
            <a href="?replay=1#cover" onClick={replay} className="link text-sm">
              Replay
            </a>
          </motion.span>
        )}
      </div>
    </div>
  );
}
