"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, PaperPlaneTilt, Warning, WarningOctagon } from "@phosphor-icons/react";
import { WARN } from "./Analysis";
import { worstAsym } from "./scan";
import type { GaitClip } from "./types";

const SPRING = { type: "spring", stiffness: 220, damping: 24 } as const;

/**
 * The Pet Scanner result card: verdict, symmetry gauge, mobility against the pet's own usual, which leg (when the
 * model could tell), and "Send to my vet", which only sends on tap. One light card, revealed with a spring.
 */
export function GaitResult({ clip, petName, mobility = null, usual = null, onSendVet }: { clip: GaitClip; petName: string; mobility?: number | null; usual?: string | null; onSendVet: () => void }) {
  const reduce = useReducedMotion();
  const r = clip.result;
  const healthy = r.healthy;
  const pet = petName || (clip.species === "cat" ? "your cat" : "your dog");
  const worst = worstAsym(clip);
  // amber = worth watching (re-check in a few days); red = a limp worth a vet's look soon. Both from the model.
  const watch = r.model_light === "amber";
  const finding = r.finding.trim().replace(/\.?$/, ".");
  const item = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING, delay: 0.12 + i * 0.08 } });

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className="card space-y-8 p-6 sm:p-10"
      data-testid="scan-result"
      aria-live="polite"
    >
      {/* verdict */}
      <motion.div {...item(0)} className="space-y-3">
        <p className="eyebrow">Pet Scanner result</p>
        {healthy ? (
          <>
            <h3 className="display text-[clamp(2.25rem,6vw,4rem)]">
              Moving <span className="accent-word">evenly.</span>
            </h3>
            <p className="max-w-[52ch] text-lg text-muted">{pet} puts the same weight on every leg. Nothing to act on today.</p>
          </>
        ) : (
          <>
            <p className="inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold" style={{ color: WARN, background: "rgb(200 65 43 / 0.08)" }} role="alert">
              <Warning size={16} weight="bold" aria-hidden />
              <span>{watch ? "Worth watching" : "Limp warning"}</span>
              <span className="font-normal">{watch ? "Film again in a few days" : "Signs worth a vet's look in the next 48 hours"}</span>
            </p>
            <h3 className="display text-[clamp(2.25rem,6vw,4rem)]">
              A change worth <span className="accent-word">{watch ? "a second look." : "a vet's look."}</span>
            </h3>
            <p className="max-w-[52ch] text-lg text-muted">
              {finding} {watch ? "" : `${pet} is not putting equal weight on every leg. This pattern often shows up before a limp is obvious at home.`}
            </p>
          </>
        )}
      </motion.div>

      {/* symmetry gauge, mobility against the pet's own usual, and which leg */}
      <motion.section {...item(1)} className="grid items-center gap-8 border-t border-line pt-8 sm:grid-cols-2">
        <SymmetryGauge value={worst} />
        <div className="space-y-3">
          {mobility !== null && (
            <p className="text-3xl font-semibold tracking-[-0.04em]" data-testid="mobility-summary">
              {usual ?? `Mobility ${mobility}`}.
            </p>
          )}
          <p className="text-lg">{r.area ? `Leg to watch: ${r.area}.` : healthy ? "No leg stands out." : "The model could not tell which leg."}</p>
          {!healthy && r.area && <LegMap area={r.area} />}
        </div>
      </motion.section>

      {/* what we measured */}
      <motion.dl {...item(2)} className="grid gap-4 border-t border-line pt-8 sm:grid-cols-3">
        <Measure label="Front legs (head)" value={r.head_asym} strong={r.key === "head" && !healthy} />
        <Measure label="Back legs (hips)" value={r.pelvis_asym} strong={r.key === "pelvis" && !healthy} />
        <div className="space-y-1">
          <dt className="eyebrow">Steps analysed</dt>
          <dd className="tnum text-4xl font-semibold tracking-[-0.04em]">{(clip.signals.head?.troughs.length ?? 0) + (clip.signals.pelvis?.troughs.length ?? 0)}</dd>
        </div>
      </motion.dl>

      {/* what to do now (warning only) */}
      {!healthy && (
        <motion.section {...item(3)} className="grid gap-6 border-t border-line pt-8 lg:grid-cols-12">
          <ol className="space-y-4 lg:col-span-7">
            {(watch
              ? [
                  ["Film again in a few days", "Side on, walking past you. If the change is still there, the next check shows it."],
                  ["Mention it to your vet if it persists", "Tap Send to my vet below to share this check with them."],
                  [`Keep ${pet}'s days gentle`, "Normal routine, but no big jumps or long runs until the next check."],
                ]
              : [
                  ["Book a vet check in the next 48 hours", "Tap Send to my vet below to share this check with them."],
                  [`Keep ${pet} rested`, "Short lead walks for toilet breaks only. No running, jumping or stairs until a vet has looked."],
                  ["Film again in 3 days", "If the steps look worse, or the same, the vet sees the change straight away."],
                ]
            ).map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="tnum grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold">{i + 1}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="space-y-2 rounded-brand p-5 lg:col-span-5" style={{ background: "rgb(200 65 43 / 0.06)" }}>
            <p className="flex items-center gap-2 font-semibold" style={{ color: WARN }}>
              <WarningOctagon size={20} weight="bold" aria-hidden /> Go to a vet today if {pet}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>will not put the leg down at all</li>
              <li>cries out, or the leg is hot or swollen</li>
              <li>stops eating, or is very quiet and hiding</li>
              <li>has a wound, or the leg sits at an odd angle</li>
            </ul>
          </div>
        </motion.section>
      )}

      <motion.div {...item(4)} className="space-y-4 border-t border-line pt-8">
        <p className="text-xl font-semibold tracking-[-0.03em]">Signs worth a vet&apos;s look, never a diagnosis.</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="button" onClick={onSendVet} className={`btn ${healthy ? "btn-ghost" : "btn-primary"} min-h-12 text-lg`}>
            <PaperPlaneTilt size={18} weight="bold" aria-hidden /> Send to my vet
          </button>
          <Link href="/savings" className="link inline-flex min-h-11 items-center gap-1">
            See my savings <ArrowUpRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
        <p className="text-xs text-muted">
          Nothing is sent to your vet until you tap Send. Keypoints from DeepLabCut SuperAnimal-Quadruped; your insurer only sees whether this week&apos;s check was done.
        </p>
      </motion.div>
    </motion.article>
  );
}

/** Half-dial of step unevenness: even up to 15%, worth watching to 30%, uneven above (the model's own thresholds). */
function SymmetryGauge({ value }: { value: number | null }) {
  const MAX = 45;
  const R = 80;
  const at = (v: number) => {
    const a = Math.PI * (1 - Math.min(MAX, Math.max(0, v)) / MAX);
    return [100 + R * Math.cos(a), 100 - R * Math.sin(a)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = at(from);
    const [x2, y2] = at(to);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const [nx, ny] = at(value ?? 0);
  const label = value === null ? "Not readable" : value <= 15 ? "Even" : value <= 30 ? "Worth watching" : "Uneven";
  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 200 120" className="w-full" role="img" aria-label={`Symmetry: ${label}${value === null ? "" : `, ${Math.round(value)}% uneven`}`}>
        <path d={arc(0, 15)} fill="none" stroke="var(--accent)" strokeWidth="16" />
        <path d={arc(15, 30)} fill="none" stroke="#E8A33D" strokeWidth="16" />
        <path d={arc(30, MAX)} fill="none" stroke={WARN} strokeWidth="16" />
        {value !== null && (
          <>
            <line x1="100" y1="100" x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="6" fill="var(--ink)" />
          </>
        )}
      </svg>
      <figcaption className="-mt-2 text-center">
        <span className="eyebrow block">Symmetry</span>
        <span className="text-lg font-semibold">
          {label}
          {value !== null && <span className="tnum font-normal text-muted"> · {Math.round(value)}% uneven</span>}
        </span>
      </figcaption>
    </figure>
  );
}

function Measure({ label, value, strong }: { label: string; value: number | null; strong: boolean }) {
  return (
    <div className="space-y-1">
      <dt className="eyebrow">{label}</dt>
      <dd className={`text-4xl font-semibold tracking-[-0.04em] tnum ${strong ? "" : "text-muted"}`} style={strong ? { color: WARN } : undefined}>
        {value === null ? "n/a" : `${Math.round(value)}%`}
        <span className="ml-2 text-base font-medium tracking-normal">uneven</span>
      </dd>
    </div>
  );
}

/** Top view of the four legs with the affected one(s) marked. */
function LegMap({ area }: { area: string | null }) {
  const a = (area ?? "").toLowerCase();
  const hit = (leg: "fl" | "fr" | "bl" | "br") => {
    const front = leg[0] === "f";
    const left = leg[1] === "l";
    const isFront = a.includes("front");
    const isHind = a.includes("hind") || a.includes("back");
    if (!(isFront && front) && !(isHind && !front)) return false;
    if (a.includes("left")) return left;
    if (a.includes("right")) return !left;
    return true;
  };
  const legs: { id: "fl" | "fr" | "bl" | "br"; x: number; y: number; label: string }[] = [
    { id: "fl", x: 52, y: 70, label: "Front left" },
    { id: "fr", x: 148, y: 70, label: "Front right" },
    { id: "bl", x: 52, y: 190, label: "Back left" },
    { id: "br", x: 148, y: 190, label: "Back right" },
  ];
  return (
    <figure className="space-y-2">
      <svg viewBox="0 0 200 250" className="h-40 w-auto" role="img" aria-label={`Legs: ${area ?? "none"} flagged`}>
        <ellipse cx={100} cy={28} rx={22} ry={20} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={2} />
        <rect x={64} y={48} width={72} height={160} rx={36} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={2} />
        <path d="M100 208 Q 104 232 118 242" fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={2} />
        {legs.map((l) => {
          const on = hit(l.id);
          return (
            <g key={l.id}>
              {on && <circle cx={l.x} cy={l.y} r={22} fill={WARN} fillOpacity={0.25} className="animate-pulse" />}
              <circle cx={l.x} cy={l.y} r={13} fill={on ? WARN : "transparent"} stroke={on ? WARN : "currentColor"} strokeOpacity={on ? 1 : 0.5} strokeWidth={2} />
              <text x={l.x} y={l.y + (l.y < 120 ? -22 : 32)} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={on ? 1 : 0.6} fontWeight={on ? 700 : 400}>
                {l.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted">Seen from above, head at the top</figcaption>
    </figure>
  );
}
