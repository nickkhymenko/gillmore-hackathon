"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { isHex, lighten, mix } from "@/lib/palette";
import { SPECIES_THEME } from "@/lib/theme";
import type { PetRecord } from "@/lib/store";

const INK = "#141414";
const SCOOP_MS = 600;

/** Cute face: two dot eyes with a glint and a small smile. */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="-7" cy="0" r="3" fill={INK} />
      <circle cx="7" cy="0" r="3" fill={INK} />
      <circle cx="-6" cy="-1" r="1" fill="#fff" />
      <circle cx="8" cy="-1" r="1" fill="#fff" />
      <path d="M-4 6 Q0 9.5 4 6" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="-11" cy="5" rx="2.6" ry="1.6" fill="#E9A3A0" opacity="0.7" />
      <ellipse cx="11" cy="5" rx="2.6" ry="1.6" fill="#E9A3A0" opacity="0.7" />
    </g>
  );
}

/** The classic swirl, three soft tiers. */
function Swirl({ c, hi }: { c: string; hi: string }) {
  return (
    <g>
      <ellipse cx="60" cy="78" rx="32" ry="12" fill={c} />
      <ellipse cx="60" cy="63" rx="24" ry="11" fill={c} />
      <ellipse cx="60" cy="49" rx="15" ry="9" fill={c} />
      <path d="M55 42 Q60 28 69 37 Q63 38 60 42 Z" fill={c} />
      <ellipse cx="44" cy="74" rx="7" ry="3" fill={hi} />
      <ellipse cx="49" cy="59" rx="5" ry="2.4" fill={hi} />
      <ellipse cx="54" cy="46" rx="3.5" ry="1.8" fill={hi} />
      <Face x={60} y={63} />
    </g>
  );
}

function Pellets({ c, hi, big }: { c: string; hi: string; big: boolean }) {
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
          <circle cx={x} cy={y} r={r} fill={c} />
          <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.28} fill={hi} />
        </g>
      ))}
      {big ? <Face x={60} y={78} s={0.8} /> : <Face x={61} y={68} s={0.55} />}
    </g>
  );
}

function LitterTray({ c, hi }: { c: string; hi: string }) {
  return (
    <g>
      <path d="M18 62 Q60 52 102 62 Z" fill="#F3E7CF" />
      <g transform="translate(60 56) scale(0.5) translate(-60 -70)">
        <Swirl c={c} hi={hi} />
      </g>
      <path d="M12 62 H108 L100 90 Q99 93 96 93 H24 Q21 93 20 90 Z" fill="var(--accent)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 70 H96" stroke={INK} strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
      {[30, 44, 76, 90].map((x) => (
        <circle key={x} cx={x} cy={60} r="1.6" fill="#D9C7A6" />
      ))}
    </g>
  );
}

/** The poo for this pet: a swirl for dogs, a litter tray for cats, droppings for rabbits and horses. Never gross. */
export function PooArt({ rec }: { rec: PetRecord }) {
  const species = rec.pet.species;
  const coat = rec.profile.coatColours.find(isHex) ?? SPECIES_THEME[species].coat[0];
  // The pet's own coat, warmed towards a soft cocoa so it reads as a (cute) poo on any coat colour.
  const c = mix(coat, "#7A5236", 0.62);
  const hi = lighten(c, 0.35);
  return (
    <>
      <ellipse cx="60" cy="92" rx="38" ry="4" fill={INK} opacity="0.1" />
      {species === "cat" ? <LitterTray c={c} hi={hi} /> : species === "rabbit" ? <Pellets c={c} hi={hi} big={false} /> : species === "horse" ? <Pellets c={c} hi={hi} big /> : <Swirl c={c} hi={hi} />}
    </>
  );
}

/**
 * The poo moment, just before the last stop. The paw pauses here (WalkPath reads data-walk-pause), a tiny
 * cartoon poo drops in with a bounce, and "Pick it up" scoops it into a bag and walks on to /savings.
 * Reduced motion: a static poo and immediate navigation.
 */
export function PooMoment({ rec }: { rec: PetRecord }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState(false);

  function pickUp() {
    if (reduce) return router.push("/savings");
    if (picked) return;
    setPicked(true);
    window.setTimeout(() => router.push("/savings"), SCOOP_MS);
  }

  return (
    <section id="uh-oh" data-walk-pause aria-labelledby="uh-oh-title" className="scroll-mt-32 py-12 sm:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <svg viewBox="0 0 120 100" className="h-auto w-36 shrink-0 overflow-visible sm:w-44" aria-hidden>
          <motion.g
            initial={reduce ? false : { y: -70, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -38% 0px" }}
            transition={{ type: "spring", stiffness: 420, damping: 11, delay: 0.25 }}
          >
            <motion.g
              style={{ transformOrigin: "60px 80px" }}
              animate={picked ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.18 }}
            >
              <PooArt rec={rec} />
            </motion.g>
          </motion.g>
          {picked && (
            <motion.g initial={{ y: -90, opacity: 0 }} animate={{ y: [-90, 8, -14], opacity: [0, 1, 1] }} transition={{ duration: SCOOP_MS / 1000, times: [0, 0.4, 1], ease: "easeOut" }}>
              <path d="M40 36 L45 12 L53 22 L60 10 L67 22 L75 12 L80 36 Q86 84 60 86 Q34 84 40 36 Z" fill="var(--accent)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <path d="M44 34 H76" stroke={INK} strokeWidth="2" strokeLinecap="round" />
            </motion.g>
          )}
        </svg>
        <div className="space-y-4">
          <h2 id="uh-oh-title" className="display max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)]">
            Uh oh. Your insurance <span className="accent-word">isn&apos;t working for you yet.</span>
          </h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="button" onClick={pickUp} aria-label="Pick it up: lower your insurance costs" className="btn btn-primary min-h-14 px-6 text-lg">
              Pick it up <ArrowUpRight size={20} weight="bold" aria-hidden />
            </button>
            {picked && (
              <motion.span role="status" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.2 }} className="inline-flex items-center gap-1.5 font-semibold">
                <Check size={18} weight="bold" aria-hidden /> Picked up
              </motion.span>
            )}
          </div>
          <p className="text-sm text-muted">Make managing your pet insurance a walk in the park.</p>
        </div>
      </div>
    </section>
  );
}
