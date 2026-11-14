"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, YAxis } from "recharts";
import { ArrowUpRight, CalendarPlus } from "@phosphor-icons/react";
import { PetAvatar } from "@/components/PetAvatar";
import { EmptyPetState } from "@/components/EmptyPetState";
import { PhotoControls } from "@/components/PhotoTwin";
import { StatusPill } from "@/components/ResultCard";
import { PilotSheet } from "@/components/Sheet";
import { SavingsHero } from "@/components/dashboard/SavingsHero";
import { AskPetra } from "@/components/dashboard/AskPetra";
import { BlackBoxHero } from "@/components/dashboard/BlackBoxHero";
import { blackBoxDiscount, dailyTarget, minutesByDay, todayMinutes, useCollarDays, useWalks, weeks as bbWeeks } from "@/lib/blackbox";
import type { Series } from "@/lib/metrics";
import { VideoScanPanel } from "@/components/video/VideoScanPanel";
import { MovementCheck } from "@/components/gait/MovementCheck";
import { useScans } from "@/lib/video/scans";
import { TrendChart } from "@/components/walk/TrendsStop";
import type { CareRec } from "@/data/careRules";
import { SUPPLEMENT_WARNING, buildCarePlan, careContext } from "@/lib/careplan";
import { streak } from "@/lib/discount";
import { preparePhoto } from "@/lib/image";
import { downloadIcs, nextWeekSameDay } from "@/lib/ics";
import { METRIC_LABEL, buildSeries, metricsFor, sentenceFor } from "@/lib/metrics";
import { deriveTheme } from "@/lib/palette";
import { seedDemo, updatePet, type PetRecord, type StoredCheckin } from "@/lib/store";
import { useActivePet, useCheckins, useNow } from "@/lib/usePets";
import { ACTION_LABEL } from "@/lib/types";

const DAY = 24 * 3600 * 1000;

function Section({ n, title, children, aside, id }: { n: string; title: string; children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <h2 className="eyebrow">
          <span className="tnum text-ink">{n}</span> / {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Health score over the last 12 weeks against the pet's own usual band. A sparkline: no axes, one series. */
function ScoreSparkline({ log }: { log: StoredCheckin[] }) {
  const pts = log.slice(-12).map((c, i) => ({ i, v: c.healthScore }));
  if (pts.length < 2) return null;
  const earlier = pts.slice(0, -1).map((p) => p.v).sort((a, b) => a - b);
  const base = earlier[Math.floor(earlier.length / 2)];
  return (
    <div className="h-14 w-40" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pts} margin={{ top: 4, right: 6, bottom: 4, left: 6 }} accessibilityLayer={false}>
          <YAxis hide domain={[0, 100]} />
          <ReferenceArea y1={Math.max(0, base - 8)} y2={Math.min(100, base + 8)} fill="var(--accent-soft)" fillOpacity={1} stroke="none" />
          <Line dataKey="v" stroke="#141414" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PhotoTile({ rec }: { rec: PetRecord }) {
  const input = useRef<HTMLInputElement>(null);
  async function onFile(f?: File) {
    if (!f) return;
    try {
      const p = await preparePhoto(f);
      const theme = deriveTheme(p.swatches, rec.profile.coatColours);
      updatePet(rec.id, { photo: p.thumb, swatches: p.swatches.map((s) => s.hex), photoTheme: theme, theme });
    } catch {
      /* unreadable file: keep the current photo */
    }
  }
  return (
    <div>
      <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={`Replace ${rec.pet.name}'s photo`} onChange={(e) => onFile(e.target.files?.[0])} />
      {rec.photo ? (
        <>
          <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-brand border border-line">
            <Image src={rec.photo} alt={`Photo of ${rec.pet.name}`} fill unoptimized sizes="220px" className="object-cover" />
          </div>
          <PhotoControls rec={rec} onReplace={() => input.current?.click()} />
        </>
      ) : (
        <Link href="/twin" className="link min-h-11 text-sm">
          Add a photo to theme the app
        </Link>
      )}
    </div>
  );
}

function CareItem({ r, i, onVet }: { r: CareRec; i: number; onVet: () => void }) {
  return (
    <li className="flex flex-col bg-paper p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">
          <span className="tnum text-ink">{String(i + 1).padStart(2, "0")}</span> / {r.type}
        </span>
        {r.evidence && <span className="rounded-[3px] border border-line px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Evidence: {r.evidence}</span>}
      </div>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">{r.title}</h3>
      <details className="text-sm">
        <summary className="link inline-flex min-h-11 cursor-pointer items-center">Why this</summary>
        <p className="pb-1">{r.why}</p>
        {r.type === "supplement" && <p className="pb-1 font-semibold">{SUPPLEMENT_WARNING}</p>}
      </details>
      {(r.type === "vet" || r.type === "supplement") && (
        <button type="button" onClick={onVet} className="link mt-auto min-h-11 self-start text-sm">
          {r.type === "vet" ? "Book with a vet" : "Discuss with a vet"}
        </button>
      )}
    </li>
  );
}

/** The pet's home: savings hero, this week, care plan, trends, ask, next check-in and who sees what. */
export default function DashboardPage() {
  const { pet: rec, ready } = useActivePet();
  const log = useCheckins(rec?.id, rec?.pet.name);
  const walks = useWalks(rec?.id);
  const collarDays = useCollarDays(rec?.id);
  const scans = useScans(rec?.id);
  const now = useNow();
  const reduce = Boolean(useReducedMotion());
  const [sheet, setSheet] = useState<string | null>(null);

  // The page renders after the pet loads, so the browser cannot jump to #movement or #video on its own.
  const shown = Boolean(ready && rec && rec.setupStep === null);
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (shown && hash) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, [shown]);

  if (!ready) return <div className="min-h-[70svh]" aria-busy="true" />;
  if (!rec) return <EmptyPetState />;
  if (rec.setupStep !== null)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Dashboard</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">Let&apos;s finish {rec.pet.name}&apos;s twin first.</h1>
        <Link href="/" className="btn btn-primary text-lg">
          Carry on <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );

  const { pet } = rec;
  const latest = log.at(-1) ?? null;
  const weeks = streak(log, now);
  const target = dailyTarget(rec, log, now);
  const byDay = minutesByDay(walks, collarDays);
  const recentDays = Array.from({ length: 14 }, (_, i) => new Date(now - (13 - i) * 864e5).toISOString().slice(0, 10));
  const activity = rec.blackBox && byDay.size ? { recentAvg: recentDays.slice(-10).reduce((s, d) => s + (byDay.get(d) ?? 0), 0) / 10, target } : undefined;
  const plan = buildCarePlan(careContext(pet, rec.profile, log, activity), 4);
  const bb = rec.blackBox ? blackBoxDiscount(bbWeeks(rec, target, walks, collarDays, now), log, now) : null;
  const activitySeries: Series | null = rec.blackBox && byDay.size
    ? (() => {
        const points = recentDays.map((d) => ({ week: new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: byDay.get(d) ?? 0, date: d }));
        const vals = points.map((p) => p.value);
        const hi = Math.max(target * 1.4, ...vals, 10);
        return { key: "energy", points, baseline: target, band: [target, hi] as [number, number], latest: vals.at(-1) ?? 0, delta: null, unit: "min", domain: [0, Math.ceil(hi / 10) * 10] as [number, number] };
      })()
    : null;
  const hasWeights = log.filter((c) => typeof c.weightKg === "number").length >= 2;
  const series = metricsFor(pet, rec.profile, hasWeights).map((k) => buildSeries(k, log));
  const next = nextWeekSameDay(new Date(latest?.createdAt ?? now));
  const daysToNext = Math.max(0, Math.ceil((next.getTime() - now) / DAY));
  const due = !latest || now - new Date(latest.createdAt).getTime() >= 6 * DAY;

  return (
    <div className="space-y-14 py-4 sm:py-8">
      {/* Top band */}
      <header className="grid items-end gap-6 lg:grid-cols-12">
        <div className="flex items-center gap-5 lg:col-span-7">
          <PetAvatar traits={rec.profile} size={112} title={`${pet.name}'s avatar`} />
          <div className="min-w-0">
            <p className="eyebrow">Petra / Dashboard</p>
            <h1 className="display mt-2 text-[clamp(2.75rem,7vw,5.5rem)]">{pet.name}</h1>
            <p className="mt-2 text-muted">
              {[pet.breed || "Mixed or not sure", `${pet.ageYears} ${pet.ageYears === 1 ? "year" : "years"}`, pet.weightKg !== undefined ? `${pet.weightKg} kg` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <dl className="flex flex-wrap items-end gap-x-10 gap-y-4 lg:col-span-5 lg:justify-end">
          <div>
            <dt className="eyebrow">Health score</dt>
            <dd className="flex items-end gap-3">
              <span className="text-5xl font-semibold tracking-[-0.04em]">{latest ? latest.healthScore : "None yet"}</span>
              <ScoreSparkline log={log} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Streak</dt>
            <dd className="text-5xl font-semibold tracking-[-0.04em]">
              {weeks}
              <span className="text-lg font-medium tracking-normal text-muted"> {weeks === 1 ? "week" : "weeks"} in a row</span>
            </dd>
          </div>
        </dl>
      </header>

      {bb ? <BlackBoxHero rec={rec} d={bb} /> : <SavingsHero rec={rec} log={log} now={now} />}

      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Section n="01" title="This week">
            {latest && !due ? (
              <div className="space-y-4">
                <StatusPill status={latest.status} />
                <p className="text-2xl font-semibold tracking-[-0.03em]">{latest.headline}</p>
                <p className="text-muted">{latest.trend.note ?? latest.ownerMessage}</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {latest.nextStep.action === "keep_monitoring" ? (
                    <Link href="/walk#check-in" className="btn btn-ghost">
                      Keep going <ArrowUpRight size={16} aria-hidden />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => setSheet(latest.nextStep.action === "emergency_now" ? "Finding the nearest emergency vet" : "Booking an online vet consult with the brief attached")} className="btn btn-primary">
                      {ACTION_LABEL[latest.nextStep.action]} <ArrowUpRight size={16} weight="bold" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {latest && latest.status !== "green" && (
                  <p className="flex flex-wrap items-center gap-3 text-sm">
                    <StatusPill status={latest.status} /> Last check-in: {latest.headline}
                  </p>
                )}
                <p className="text-2xl font-semibold tracking-[-0.03em]">{latest ? `${pet.name}'s check-in is due.` : `No check-ins yet for ${pet.name}.`}</p>
                <p className="text-muted">One minute. It builds {pet.name}&apos;s own baseline and counts towards your discount.</p>
                <Link href="/walk#check-in" className="btn btn-primary text-lg">
                  Start this week&apos;s check-in <ArrowUpRight size={18} weight="bold" aria-hidden />
                </Link>
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-14 lg:col-span-5">
          <Section n="02" title="Next check-in">
            <p className="text-2xl font-semibold tracking-[-0.03em]">
              {due ? "Due now" : `In ${daysToNext} ${daysToNext === 1 ? "day" : "days"}`}
              <span className="block text-base font-medium text-muted">{next.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
            </p>
            <button type="button" onClick={() => downloadIcs(pet.name, next)} className="link inline-flex min-h-11 items-center gap-2 text-sm">
              <CalendarPlus size={16} aria-hidden /> Add a weekly reminder
            </button>
          </Section>
          <Section n="03" title="Ask Petra">
            <AskPetra
              key={rec.id}
              rec={rec}
              latest={latest}
              walk={rec.blackBox ? { todayMinutes: todayMinutes(walks, collarDays, now), targetMinutes: target, weeksMet: bb?.weeksMet, weeksCounted: bb?.weeksCounted } : undefined}
              onAction={setSheet}
            />
          </Section>
        </div>
      </div>

      <Section n="04" title="Care plan" aside={<Link href="/walk#care-plan" className="link text-sm">Full plan</Link>}>
        {plan.paused && <p className="text-sm font-semibold">{plan.pausedReason}</p>}
        <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {plan.recs.map((r, i) => (
            <CareItem key={r.id} r={r} i={i} onVet={() => setSheet("Booking with your vet from here")} />
          ))}
        </ol>
      </Section>

      <Section n="05" title="Trends" aside={<Link href="/walk#trends" className="link text-sm">On the walk</Link>}>
        {log.filter((c) => c.answers).length < 2 ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-muted">Trends appear after two check-ins.</p>
            <button type="button" onClick={() => seedDemo(pet)} className="btn btn-ghost text-sm">
              Show with 6 weeks of sample history
            </button>
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {series.map((s) => (
              <figure key={s.key} className="min-w-0">
                <figcaption>
                  <p className="eyebrow">{METRIC_LABEL[s.key].title}</p>
                  <p className="mt-1 min-h-16 text-sm font-medium leading-snug">{sentenceFor(s, pet.name)}</p>
                </figcaption>
                <TrendChart s={s} reduce={reduce} />
              </figure>
            ))}
          </div>
        )}
      </Section>

      <Section n="06" title="Walks and movement" id="movement" aside={rec.blackBox ? <Link href="/savings" className="link text-sm">Savings</Link> : undefined}>
        <div className="space-y-14">
          {rec.blackBox && (
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-5">
                <p className="eyebrow">Today</p>
                <p className="text-3xl font-semibold tracking-[-0.03em]">
                  {rec.blackBox.restSince ? "Rest mode: no target" : `${Math.min(todayMinutes(walks, collarDays, now), target)} of ${target} minutes`}
                </p>
                <Link href="/savings#walk-mode" className="btn btn-primary">
                  Start a walk <ArrowUpRight size={16} weight="bold" aria-hidden />
                </Link>
              </div>
              {activitySeries && (
                <figure className="min-w-0 lg:col-span-7">
                  <figcaption>
                    <p className="eyebrow">Activity, last 14 days</p>
                    <p className="mt-1 text-sm font-medium">Shaded band: at or above {pet.name}&apos;s daily target of {target} minutes.</p>
                  </figcaption>
                  <TrendChart s={activitySeries} reduce={reduce} />
                </figure>
              )}
            </div>
          )}
          <MovementCheck />
          <div className="space-y-5">
            <h3 className="text-2xl font-semibold tracking-[-0.03em]">Walk or breathing scan <span className="text-sm font-normal tracking-normal text-muted">Optional</span></h3>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-7">
                <VideoScanPanel rec={rec} />
              </div>
              <div className="min-w-0 space-y-4 lg:col-span-5">
                <p className="eyebrow">From video scans</p>
                {scans.length === 0 ? (
                  <p className="text-sm text-muted">No scans yet. A 15-second walk or sleeping-breathing clip adds mobility and breathing to {pet.name}&apos;s trends.</p>
                ) : (
                  <>
                    {(() => {
                      const mob = scans.filter((s) => s.metrics.mobilityScore !== null);
                      const pts = mob.slice(-12).map((s) => ({ week: new Date(s.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: Math.round(s.metrics.mobilityScore!), date: s.timestamp }));
                      if (pts.length < 2) return null;
                      const series: Series = { key: "mobility", points: pts, baseline: null, band: null, latest: pts.at(-1)!.value, delta: null, unit: "", domain: [0, 100] };
                      return (
                        <figure>
                          <figcaption className="text-sm font-medium">Mobility from walk scans</figcaption>
                          <TrendChart s={series} reduce={reduce} />
                        </figure>
                      );
                    })()}
                    <ul className="divide-y divide-line border-y border-line text-sm">
                      {scans
                        .slice(-4)
                        .reverse()
                        .map((s) => (
                          <li key={s.scanId} className="flex flex-wrap justify-between gap-2 py-2">
                            <span>
                              {new Date(s.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, {s.scanType.replace("_", " ")}
                            </span>
                            <span className="text-muted">
                              {[s.metrics.mobilityScore !== null && `mobility ${Math.round(s.metrics.mobilityScore)}`, s.metrics.breathingRatePerMin !== null && `breathing ${Math.round(s.metrics.breathingRatePerMin)}/min`].filter(Boolean).join(", ") || "no metrics"}
                              {s.source === "mock" ? " (demo)" : ""}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Section n="07" title="Who sees what">
            <ul className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2">
              {(
                [
                  ["vet", "Your vet", "Check-in briefs, trends and any video you choose to send.", "Never your premium or payments."],
                  ["insurer", "Your insurer", "How often you check in, for your discount. Engagement only.", "Never health answers, photos, video or notes."],
                ] as const
              ).map(([k, who, sees, never]) => (
                <li key={k} className="bg-paper p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">{who}</p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rec.consent[k]}
                      aria-label={`Share with ${who.toLowerCase()}`}
                      onClick={() => updatePet(rec.id, (p) => ({ consent: { ...p.consent, [k]: !p.consent[k], updatedAt: new Date().toISOString() } }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-300 ${rec.consent[k] ? "border-ink bg-accent" : "border-ink/30 bg-white/60"}`}
                    >
                      <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-300 ${rec.consent[k] ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm">{rec.consent[k] ? `Sees: ${sees}` : "Sees nothing. Sharing is off."}</p>
                  <p className="mt-1 text-sm text-muted">{never}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div className="lg:col-span-4">
          <Section n="08" title="Photo">
            <PhotoTile rec={rec} />
          </Section>
        </div>
      </div>

      <PilotSheet open={sheet !== null} onClose={() => setSheet(null)} what={sheet ?? ""} />
    </div>
  );
}
