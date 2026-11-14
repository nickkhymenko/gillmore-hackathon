"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, PauseCircle, ShieldCheck, Stethoscope, TrendDown, Warning, WarningOctagon } from "@phosphor-icons/react";
import { WARN } from "./Analysis";
import type { GaitClip } from "./types";

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n);

/** Illustrative premium figures (same idea as the Black Box price card: discount only, never a surcharge). */
const MONTHLY = 38;

export function GaitResult({ clip, petName }: { clip: GaitClip; petName: string }) {
  const r = clip.result;
  const healthy = r.healthy;
  const pet = petName || (clip.species === "cat" ? "your cat" : "your dog");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* verdict */}
      {healthy ? (
        <div className="rounded-brand bg-accent-soft p-6 sm:p-8">
          <p className="eyebrow">Gait check result</p>
          <h3 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
            Moving <span className="accent-word">evenly.</span>
          </h3>
          <p className="mt-3 max-w-[52ch] text-lg text-muted">{pet} puts the same weight on every leg. Nothing to act on today.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-brand" style={{ boxShadow: `0 0 0 2px ${WARN}` }}>
          <div className="flex flex-wrap items-center gap-3 px-6 py-3 text-white sm:px-8" style={{ background: WARN }} role="alert">
            <span className="relative flex h-3 w-3" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <span className="font-semibold tracking-[-0.01em]">Limp warning</span>
            <span className="text-white/85">Signs worth a vet&apos;s look in the next 48 hours</span>
          </div>
          <div className="grid gap-8 bg-dark p-6 text-paper sm:p-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <p className="eyebrow text-paper/60">Gait check result</p>
              <h3 className="display text-[clamp(2rem,5vw,3.25rem)]">
                A change worth <span className="accent-word text-accent">a vet&apos;s look.</span>
              </h3>
              <p className="max-w-[52ch] text-lg text-paper/80">
                {r.finding}. {pet} is not putting equal weight on every leg. This pattern often shows up before a limp is obvious at home.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-brand px-3 py-1.5 text-sm font-semibold text-white" style={{ background: WARN }}>
                  <Warning size={16} weight="bold" aria-hidden /> Possible limp: {r.area}
                </span>
                <span className="inline-flex items-center rounded-brand bg-accent px-3 py-1.5 text-sm font-semibold text-ink">
                  {Math.round((r.key === "head" ? r.head_asym : r.pelvis_asym) ?? 0)}% uneven steps
                </span>
              </div>
            </div>
            <div className="lg:col-span-4">
              <LegMap area={r.area} />
            </div>
          </div>
        </div>
      )}

      {/* what we measured */}
      <section className="space-y-4">
        <h4 className="eyebrow border-t border-line pt-3">What we measured</h4>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Measure label="Front legs (head)" value={r.head_asym} strong={r.key === "head" && !healthy} />
          <Measure label="Back legs (hips)" value={r.pelvis_asym} strong={r.key === "pelvis" && !healthy} />
          <div className="space-y-1">
            <dt className="eyebrow">Steps analysed</dt>
            <dd className="text-4xl font-semibold tracking-[-0.04em] tnum">
              {(clip.signals.head?.troughs.length ?? 0) + (clip.signals.pelvis?.troughs.length ?? 0)}
            </dd>
          </div>
        </dl>
      </section>

      {/* what to do now (warning only) */}
      {!healthy && (
        <section className="space-y-4">
          <h4 className="eyebrow border-t border-line pt-3">What to do now</h4>
          <div className="grid gap-6 lg:grid-cols-12">
            <ol className="space-y-4 lg:col-span-7">
              {[
                ["Book a vet check in the next 48 hours", "The free online consult is ready below, with this video attached."],
                [`Keep ${pet} rested`, "Short lead walks for toilet breaks only. No running, jumping or stairs until a vet has looked."],
                ["Film again in 3 days", "If the steps look worse, or the same, the vet sees the change straight away."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-paper tnum">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="space-y-2 rounded-brand p-5 lg:col-span-5" style={{ boxShadow: `inset 0 0 0 1.5px ${WARN}`, background: "rgb(200 65 43 / 0.06)" }}>
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
          </div>
        </section>
      )}

      {/* what it means for cover */}
      <section className="space-y-4">
        <h4 className="eyebrow border-t border-line pt-3">What it means for your cover</h4>
        {healthy ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Tile icon={<TrendDown size={22} weight="bold" />} title="+1 healthy check">
              Counts towards this month&apos;s Black Box target.
            </Tile>
            <Tile icon={<ShieldCheck size={22} weight="bold" />} title={`${gbp(MONTHLY * 0.95)} a month`}>
              Was {gbp(MONTHLY)}. Regular checks keep {pet} on the 5% tier.
            </Tile>
            <Tile icon={<Stethoscope size={22} weight="bold" />} title="Next check in 7 days">
              One short walk video a week is enough.
            </Tile>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Tile icon={<Stethoscope size={22} weight="bold" />} title="Free online vet check">
              We attach this video and the gait summary, so the vet starts with the full picture.
            </Tile>
            <Tile icon={<PauseCircle size={22} weight="bold" />} title="Rest mode is on">
              Walk targets pause while {pet} recovers. Your discount is protected.
            </Tile>
            <Tile icon={<ShieldCheck size={22} weight="bold" />} title="Your price cannot go up">
              Catching it early is cheaper for everyone. It can only lower your premium.
            </Tile>
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          {!healthy && (
            <button type="button" className="btn btn-primary text-lg">
              Book the free vet check <ArrowUpRight size={18} weight="bold" aria-hidden />
            </button>
          )}
          <Link href="/blackbox" className={`btn ${healthy ? "btn-primary" : "btn-ghost"} text-lg`}>
            See my Black Box price <ArrowUpRight size={18} weight="bold" aria-hidden />
          </Link>
        </div>
      </section>

      <p className="text-xs text-muted">
        Screening support only, not a diagnosis. Figures are illustrative. Video analysed with DeepLabCut SuperAnimal; routes
        and videos stay with you, your insurer only sees whether this week&apos;s check was done.
      </p>
    </motion.div>
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

function Tile({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-brand border border-line p-4">
      <span aria-hidden>{icon}</span>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted">{children}</p>
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
      <svg viewBox="0 0 200 250" className="mx-auto h-56 w-auto" role="img" aria-label={`Legs: ${area ?? "none"} flagged`}>
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
      <figcaption className="text-center text-xs text-paper/60">Seen from above, head at the top</figcaption>
    </figure>
  );
}
