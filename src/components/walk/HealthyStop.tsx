"use client";

import { motion } from "motion/react";
import { leversFor } from "@/data/evidence";
import type { PetRecord } from "@/lib/store";
import type { Species } from "@/lib/types";

const INK = "#141414";
const DEFAULT_COAT: Record<Species, string> = { dog: "#E2BE7A", cat: "#8C8C8C", rabbit: "#C9A27E", horse: "#8B5A2B", other: "#B9A58A" };

/** Darkens (k < 1) or lightens (k > 1) a hex colour. */
function tint(hex: string, k: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)));
  return `#${c.map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0")).join("")}`;
}

/** The pet at its healthiest: side-on, mid-stride, in its own colours, inside a soft glow. Gently trots on the spot. */
export function HealthyPet({ rec, reduce }: { rec: PetRecord; reduce: boolean }) {
  const species = rec.pet.species;
  const coat = rec.profile.coatColours[0] ?? DEFAULT_COAT[species];
  const shade = tint(coat, 0.78);
  const light = tint(coat, 1.45);
  const horse = species === "horse";
  const cat = species === "cat";
  const rabbit = species === "rabbit";
  const legLen = horse ? 96 : rabbit ? 44 : cat ? 62 : 72;
  const bodyY = 200 - legLen - 22;
  const swing = (deg: number) => (reduce ? { rotate: deg } : { rotate: [deg, -deg, deg], transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" as const } });
  const leg = (x: number, fill: string, deg: number) => (
    <motion.g style={{ originX: 0.5, originY: 0 }} initial={{ rotate: deg }} animate={swing(deg)}>
      <rect x={x} y={bodyY} width={horse ? 16 : 20} height={legLen + 14} rx={horse ? 7 : 10} fill={fill} />
      {horse && <rect x={x - 1} y={bodyY + legLen + 6} width="18" height="10" rx="3" fill={INK} />}
    </motion.g>
  );
  return (
    <svg viewBox="0 0 360 240" className="h-auto w-full max-w-[480px] overflow-visible" role="img" aria-label={`${rec.pet.name}, healthy and happy, mid-stride`}>
      <defs>
        <radialGradient id="healthy-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.75" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle cx="180" cy="130" r="150" fill="url(#healthy-glow)" animate={reduce ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
      {/* sparkles */}
      {[
        [62, 54, 0],
        [298, 40, 0.6],
        [318, 150, 1.2],
        [40, 160, 1.8],
      ].map(([x, y, d]) => (
        <motion.path key={`${x}`} d={`M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3} Z`} fill="#fff" animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }} transition={{ duration: 1.8, repeat: Infinity, delay: d }} />
      ))}
      <ellipse cx="180" cy="222" rx="120" ry="8" fill={INK} opacity="0.1" />
      <motion.g animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}>
        {/* tail */}
        {cat ? (
          <path d={`M92 ${bodyY - 4} Q50 ${bodyY - 20} 64 ${bodyY - 76}`} fill="none" stroke={coat} strokeWidth="12" strokeLinecap="round" />
        ) : rabbit ? (
          <circle cx="94" cy={bodyY - 8} r="13" fill={light} />
        ) : horse ? (
          <path d={`M90 ${bodyY - 10} Q60 ${bodyY + 10} 66 ${bodyY + 60}`} fill="none" stroke={shade} strokeWidth="14" strokeLinecap="round" />
        ) : (
          <motion.path d={`M92 ${bodyY - 4} Q58 ${bodyY - 10} 52 ${bodyY - 52}`} fill="none" stroke={coat} strokeWidth="13" strokeLinecap="round" animate={reduce ? undefined : { rotate: [-8, 10, -8] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ originX: 1, originY: 1 }} />
        )}
        {/* far legs, then body, then near legs */}
        {leg(118, shade, -22)}
        {leg(214, shade, 22)}
        <ellipse cx="170" cy={bodyY - 6} rx={horse ? 92 : rabbit ? 70 : 84} ry={horse ? 40 : rabbit ? 44 : 38} fill={coat} />
        <ellipse cx="214" cy={bodyY + 8} rx="30" ry="18" fill={light} opacity="0.9" />
        {leg(98, coat, 22)}
        {leg(232, coat, -22)}
        {/* neck and head */}
        <path d={`M222 ${bodyY - 30} L${horse ? 268 : 252} ${bodyY - (horse ? 96 : 70)} L${horse ? 296 : 284} ${bodyY - (horse ? 70 : 48)} L256 ${bodyY + 6} Z`} fill={coat} />
        <g transform={`translate(${horse ? 282 : 268} ${bodyY - (horse ? 98 : 74)})`}>
          {rabbit && (
            <>
              <ellipse cx="-12" cy="-44" rx="9" ry="30" fill={coat} transform="rotate(-12 -12 -44)" />
              <ellipse cx="6" cy="-46" rx="9" ry="30" fill={coat} transform="rotate(10 6 -46)" />
              <ellipse cx="6" cy="-46" rx="4" ry="22" fill={light} transform="rotate(10 6 -46)" />
            </>
          )}
          {cat && (
            <>
              <path d="M-26 -14 L-20 -48 L-2 -26 Z" fill={coat} />
              <path d="M2 -26 L18 -48 L22 -12 Z" fill={coat} />
            </>
          )}
          {horse && <path d="M-30 -20 Q-46 20 -40 64" fill="none" stroke={shade} strokeWidth="14" strokeLinecap="round" />}
          <circle cx="0" cy="0" r={horse ? 26 : 32} fill={coat} />
          <rect x="6" y="-4" width={horse ? 50 : cat || rabbit ? 26 : 44} height={horse ? 30 : 26} rx="13" fill={light} />
          <ellipse cx={horse ? 52 : cat || rabbit ? 30 : 47} cy="2" rx="6" ry="5" fill={INK} />
          {species === "dog" && <path d="M-16 -26 Q-40 -10 -30 26 Q-16 32 -10 12 Q-6 -10 -16 -26 Z" fill={shade} />}
          {/* happy closed eye and smile */}
          <path d="M6 -12 Q12 -18 18 -12" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d={`M${horse ? 30 : 18} 14 Q${horse ? 40 : 28} 22 ${horse ? 50 : 38} 14`} fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          {species === "dog" && <path d="M28 18 Q32 32 38 18 Z" fill="#E98A8A" />}
          <ellipse cx="-2" cy="10" rx="6" ry="3.5" fill="#F0A6A0" opacity="0.8" />
        </g>
        {/* collar with the Walk Companion */}
        <path d={`M232 ${bodyY - 40} Q246 ${bodyY - 14} 270 ${bodyY - 34}`} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <rect x="244" y={bodyY - 26} width="14" height="16" rx="5" fill={INK} />
        <circle cx="251" cy={bodyY - 18} r="2.5" fill="var(--accent)" />
      </motion.g>
    </svg>
  );
}

/** The healthspan point on the walk, and nothing else: the pet at its best and the extra healthy years. */
export function HealthyStop({ rec, reduce }: { rec: PetRecord; reduce: boolean }) {
  const n = Math.round(leversFor(rec.pet.species).reduce((s, l) => s + l.effect, 0) * 2) / 2;
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <HealthyPet rec={rec} reduce={reduce} />
      <h3 className="display max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)]" data-testid="healthy-years">
        {rec.pet.name} could have about <span className="accent-word">{n} more healthy years.</span>
      </h3>
      <p className="text-sm text-muted">Illustrative, from published studies of weight, dental care, activity and vet checks.</p>
    </div>
  );
}
