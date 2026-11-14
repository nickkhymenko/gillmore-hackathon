"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { PetAvatar } from "../PetAvatar";
import { basePremium } from "@/lib/discount";
import { BB_CAP, UK_AVG_PREMIUM } from "@/lib/blackbox";
import type { PetRecord } from "@/lib/store";

const INK = "#141414";
const BAG = "#1B1B1B";
const BROWN = "#8B5A2B";
const BROWN_DARK = "#6B4220";
const BROWN_HI = "#B07A4A";
/** The scoop: swoop in, scoop, tie with a twist, tick. Then on to Savings. */
const SCOOP_MS = 900;
const GO_MS = 1300;

/** Cute face: two dot eyes with a glint, rosy cheeks and a small smile. */
function Face({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="-8" cy="0" r="3.4" fill={INK} />
      <circle cx="8" cy="0" r="3.4" fill={INK} />
      <circle cx="-6.8" cy="-1.2" r="1.2" fill="#fff" />
      <circle cx="9.2" cy="-1.2" r="1.2" fill="#fff" />
      <path d="M-4.5 6 Q0 10 4.5 6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="-13" cy="5" rx="3" ry="1.8" fill="#F0A6A0" opacity="0.85" />
      <ellipse cx="13" cy="5" rx="3" ry="1.8" fill="#F0A6A0" opacity="0.85" />
    </g>
  );
}

/** The classic cartoon swirl: three soft brown tiers, a curled tip, a shine and a face. Cute, never gross. */
export function PooArt() {
  return (
    <g>
      <ellipse cx="60" cy="92" rx="38" ry="4" fill={INK} opacity="0.12" />
      <path d="M24 84 Q24 70 40 68 H80 Q96 70 96 84 Q96 92 84 92 H36 Q24 92 24 84 Z" fill={BROWN} stroke={BROWN_DARK} strokeWidth="2" />
      <path d="M32 68 Q32 54 46 52 H74 Q88 54 88 68 Z" fill={BROWN} stroke={BROWN_DARK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 52 Q42 40 54 38 H66 Q78 40 78 52 Z" fill={BROWN} stroke={BROWN_DARK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M52 39 Q52 26 62 22 Q70 20 70 27 Q63 27 63 33 Q63 38 66 39 Z" fill={BROWN} stroke={BROWN_DARK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 80 Q40 74 52 75" fill="none" stroke={BROWN_HI} strokeWidth="3" strokeLinecap="round" />
      <path d="M40 63 Q47 58 56 59" fill="none" stroke={BROWN_HI} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="45" rx="4" ry="2.2" fill="#fff" opacity="0.8" transform="rotate(-20 50 45)" />
      <Face x={60} y={78} />
    </g>
  );
}

/** Two little stink lines that wiggle gently. */
function Stink({ animate }: { animate: boolean }) {
  const line = (x: number, delay: number) => (
    <motion.path
      key={x}
      d={`M${x} 22 q-5 -6 0 -12 q5 -6 0 -12`}
      fill="none"
      stroke={INK}
      strokeOpacity="0.35"
      strokeWidth="2"
      strokeLinecap="round"
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={animate ? { opacity: [0, 1, 1], y: [6, 0, -2] } : undefined}
      transition={animate ? { delay, duration: 1.6, repeat: Infinity, repeatType: "reverse" } : undefined}
    />
  );
  return <g>{[line(38, 0.9), line(84, 1.2)]}</g>;
}

/**
 * A proper black poo bag. It swoops in from the top right, drops over the poo, lifts and ties itself with a
 * twist. All timings are fractions of SCOOP_MS, measured from the tap.
 */
function Bag() {
  const s = SCOOP_MS / 1000;
  return (
    <motion.g
      initial={{ x: 80, y: -110, rotate: 28, opacity: 0 }}
      animate={{ x: [80, 0, 0, 0], y: [-110, -8, 4, -22], rotate: [28, -6, 0, 0], opacity: [0, 1, 1, 1] }}
      transition={{ duration: s * 0.75, times: [0, 0.4, 0.6, 1], ease: "easeOut" }}
      style={{ transformOrigin: "60px 60px" }}
    >
      <path d="M30 44 Q26 92 60 96 Q94 92 90 44 Q60 50 30 44 Z" fill={BAG} />
      <path d="M40 56 Q38 80 50 88" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      {/* The tie: two ears gather in and twist. */}
      <motion.g
        initial={{ scaleX: 1, rotate: 0 }}
        animate={{ scaleX: [1, 1, 0.34, 0.34], rotate: [0, 0, 32, -14] }}
        transition={{ duration: s * 0.8, times: [0, 0.6, 0.82, 1], ease: "easeInOut" }}
        style={{ transformOrigin: "60px 44px" }}
      >
        <path d="M30 46 L22 20 Q34 22 44 40 Z" fill={BAG} />
        <path d="M90 46 L98 20 Q86 22 76 40 Z" fill={BAG} />
      </motion.g>
      <motion.circle cx="60" cy="42" r="6" fill={BAG} initial={{ scale: 0 }} animate={{ scale: [0, 0, 1] }} transition={{ duration: s * 0.82, times: [0, 0.75, 1] }} style={{ transformOrigin: "60px 42px" }} />
    </motion.g>
  );
}

/**
 * The walk's insurance stop as a problem statement, in four lines. As the paw arrives (WalkPath pauses at
 * data-walk-pause) the pet drops a cartoon poo on the path. "Pick it up" scoops it into a bag (about 900ms) and
 * walks on to /savings. Nothing persists: it resets on refresh, and ?replay=1 scrolls back to a fresh one.
 * Reduced motion: a static poo, and the button goes straight to Savings.
 */
export function PooMoment({ rec }: { rec: PetRecord }) {
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const [picked, setPicked] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const name = rec.pet.name;
  const premium = basePremium(rec.pet);
  const upTo = Math.round((Number.isFinite(premium) && premium > 0 ? premium : UK_AVG_PREMIUM) * (BB_CAP / 100));

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
    timer.current = window.setTimeout(() => router.push("/savings"), GO_MS);
  }

  return (
    <div id="uh-oh" data-walk-pause className="space-y-8">
      <div className="relative flex items-end gap-1" aria-hidden>
        <motion.span
          initial={reduce ? false : { x: -24, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1, y: [0, -8, 0] }}
          viewport={{ once: true, margin: "0px 0px -38% 0px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-2"
        >
          <PetAvatar traits={rec.profile} size={64} animated={false} title="" />
        </motion.span>
        <svg viewBox="0 0 120 100" className="h-auto w-36 overflow-visible sm:w-44" data-testid="poo">
          <path d="M-40 94 H150" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
          <motion.g
            initial={reduce ? false : { x: -40, y: -60, scale: 0.4, opacity: 0 }}
            whileInView={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -38% 0px" }}
            transition={{ type: "spring", stiffness: 420, damping: 12, delay: 0.35 }}
            style={{ transformOrigin: "60px 90px" }}
          >
            <motion.g
              style={{ transformOrigin: "60px 90px" }}
              animate={picked ? { scale: 0, opacity: 0, y: -10 } : { scale: 1, opacity: 1, y: 0 }}
              transition={picked ? { delay: (SCOOP_MS / 1000) * 0.36, duration: 0.16 } : { duration: 0 }}
            >
              <PooArt />
              {!picked && <Stink animate={!reduce} />}
            </motion.g>
          </motion.g>
          {picked && <Bag />}
        </svg>
        {picked && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (SCOOP_MS / 1000) * 0.8, duration: 0.18, type: "spring", stiffness: 500, damping: 18 }}
            className="mb-3 ml-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper"
          >
            <Check size={16} weight="bold" /> Picked up
          </motion.span>
        )}
      </div>

      <h3 className="display max-w-3xl text-[clamp(2rem,5vw,3.75rem)]">
        You&apos;re probably overpaying for <span className="accent-word">{name}&apos;s insurance.</span>
      </h3>
      <p className="tnum text-[clamp(3.25rem,10vw,6.5rem)] font-semibold leading-none tracking-[-0.05em]" data-testid="overpay">
        Up to £{upTo} a year.
      </p>
      <p className="max-w-[40ch] text-lg text-muted">Your premium ignores the walks and care you already do.</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" onClick={pickUp} className="btn btn-primary min-h-14 px-7 text-lg">
          Pick it up <ArrowUpRight size={20} weight="bold" aria-hidden />
        </button>
        {picked && (
          <span role="status" className="sr-only">
            Picked up
          </span>
        )}
      </div>
    </div>
  );
}
