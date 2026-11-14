"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { maxSaving } from "@/data/premiums";
import type { PetRecord } from "@/lib/store";

const INK = "#141414";
const BAG = "#1B1B1B";
const BROWN = "#8B5A2B";
const BROWN_DARK = "#6B4220";
const BROWN_HI = "#B07A4A";
/** The scoop: drop in, scoop, tie with a twist, lift away. Then the next page slides up over this one. */
const SCOOP_MS = 1100;
const SLIDE_MS = 450;

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
 * A proper black poo bag. It drops in from the top, scoops the poo, ties itself with a twist and lifts away.
 * All timings are fractions of SCOOP_MS, measured from the tap.
 */
function Bag() {
  const s = SCOOP_MS / 1000;
  return (
    <motion.g
      initial={{ y: -160, opacity: 0 }}
      animate={{ y: [-160, 4, 4, -6, -260], opacity: [0, 1, 1, 1, 0] }}
      transition={{ duration: s, times: [0, 0.27, 0.45, 0.7, 1], ease: "easeInOut" }}
    >
      <path d="M30 44 Q26 92 60 96 Q94 92 90 44 Q60 50 30 44 Z" fill={BAG} />
      <path d="M40 56 Q38 80 50 88" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      {/* The tie: two ears gather in and twist. */}
      <motion.g
        initial={{ scaleX: 1, rotate: 0 }}
        animate={{ scaleX: [1, 1, 0.34, 0.34], rotate: [0, 0, 32, -14] }}
        transition={{ duration: s * 0.7, times: [0, 0.6, 0.85, 1], ease: "easeInOut" }}
        style={{ transformOrigin: "60px 44px" }}
      >
        <path d="M30 46 L22 20 Q34 22 44 40 Z" fill={BAG} />
        <path d="M90 46 L98 20 Q86 22 76 40 Z" fill={BAG} />
      </motion.g>
      <motion.circle cx="60" cy="42" r="6" fill={BAG} initial={{ scale: 0 }} animate={{ scale: [0, 0, 1] }} transition={{ duration: s * 0.7, times: [0, 0.8, 1] }} style={{ transformOrigin: "60px 42px" }} />
    </motion.g>
  );
}

/**
 * The walk's insurance moment: a teaser, and right under it the (small) poo, the saving and one big "Pick it up",
 * all in one viewport. The bag drops in, scoops, ties and lifts away; then the insurance page slides up over the walk.
 * Nothing persists: it resets on refresh, and ?replay=1 scrolls back to a fresh one.
 * Reduced motion: a static poo, and the button goes straight to /savings.
 */
export function PooMoment({ rec }: { rec: PetRecord }) {
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const [picked, setPicked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);
  const name = rec.pet.name;
  const upTo = Math.round(maxSaving(rec.pet));

  useEffect(() => {
    router.prefetch("/savings");
    const params = new URLSearchParams(window.location.search);
    if (params.get("replay") === "1") {
      params.delete("replay");
      const q = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}#uh-oh`);
      document.getElementById("uh-oh")?.scrollIntoView({ block: "center" });
    }
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, [router]);

  function pickUp() {
    if (reduce) return router.push("/savings");
    if (picked) return;
    setPicked(true);
    timers.current.push(window.setTimeout(() => setLeaving(true), SCOOP_MS - 150));
    timers.current.push(window.setTimeout(() => router.push("/savings"), SCOOP_MS - 150 + SLIDE_MS));
  }

  const reveal = (delay = 0) =>
    reduce ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "0px 0px -6% 0px" }, transition: { type: "spring" as const, stiffness: 200, damping: 26, delay } };

  return (
    <div className="text-center">
      {/* The teaser sits right on top of the moment: no empty scroll between them. */}
      <motion.p {...reveal()} className="display pb-8 pt-2 text-[clamp(1.5rem,3.6vw,2.5rem)] text-muted sm:pb-10" data-testid="insurance-teaser">
        Now, about {name}&apos;s insurance&hellip;
      </motion.p>

      {/* Poo, headline, number and button fit in one viewport on a phone and on a laptop. */}
      <div id="uh-oh" data-walk-pause className="flex scroll-mt-36 flex-col items-center gap-5 sm:gap-6">
        <svg viewBox="0 0 120 100" className="h-auto w-[106px] overflow-visible sm:w-[134px]" data-testid="poo" aria-hidden>
          <motion.g
            initial={reduce ? false : { y: -60, scale: 0.4, opacity: 0 }}
            whileInView={{ y: 0, scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ type: "spring", stiffness: 420, damping: 12 }}
            style={{ transformOrigin: "60px 90px" }}
          >
            <motion.g
              style={{ transformOrigin: "60px 90px" }}
              animate={picked ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={picked ? { delay: (SCOOP_MS / 1000) * 0.3, duration: 0.15 } : { duration: 0 }}
            >
              <PooArt />
              {!picked && <Stink animate={!reduce} />}
            </motion.g>
          </motion.g>
          {picked && <Bag />}
        </svg>

        <motion.h3 {...reveal(0.05)} className="display max-w-4xl text-[clamp(2rem,5.2vw,4.25rem)]" data-testid="overpay">
          Owners like you could save up to <span className="accent-word">£{upTo} a year.</span>
        </motion.h3>
        <motion.p {...reveal(0.1)} className="max-w-[40ch] text-lg text-muted">
          Your premium ignores the walks and care you already do.
        </motion.p>
        <motion.div {...reveal(0.15)}>
          <button type="button" onClick={pickUp} className="btn btn-primary min-h-14 px-9 text-xl sm:min-h-16 sm:px-10">
            Pick it up <ArrowUpRight size={22} weight="bold" aria-hidden />
          </button>
        </motion.div>
        {picked && (
          <span role="status" className="sr-only">
            Picked up
          </span>
        )}
        <p className="text-xs text-muted">Illustrative: {name}&apos;s example premium at the top 15% tier.</p>
      </div>

      {/* The insurance page slides up over the walk, in the page's own light colour. */}
      {leaving && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[80] bg-paper"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ duration: SLIDE_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
        />
      )}
    </div>
  );
}
