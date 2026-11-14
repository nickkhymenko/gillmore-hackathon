"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, YAxis } from "recharts";
import { ArrowUpRight, CalendarPlus } from "@phosphor-icons/react";
import { PetAvatar } from "@/components/PetAvatar";
import { EmptyPetState } from "@/components/EmptyPetState";
import { PhotoControls } from "@/components/PhotoTwin";
import { StatusPill } from "@/components/ResultCard";
import { PilotSheet } from "@/components/Sheet";
import { SavingsCard } from "@/components/dashboard/SavingsCard";
import { AskPetra } from "@/components/dashboard/AskPetra";
import { MemberArea, PremiumStatus } from "@/components/dashboard/MemberArea";
import { RouteThumb } from "@/components/blackbox/WalkMap";
import { WalkMode } from "@/components/blackbox/WalkMode";
import { Connect, Diagnostics, PriceCard, Today } from "@/components/blackbox/sections";
import { HealthspanStop } from "@/components/walk/HealthspanStop";
import { blackBoxDiscount, dailyTarget, diagnostics, minutesByDay, todayMinutes, useCollarDays, useWalks, weeks as bbWeeks } from "@/lib/blackbox";
import type { Series } from "@/lib/metrics";
import { PetScanner } from "@/components/gait/PetScanner";
import { isDemoScan, mobilitySummary } from "@/components/gait/scan";
import { useScans } from "@/lib/video/scans";
import { TrendChart } from "@/components/walk/TrendsStop";
import type { CareRec } from "@/data/careRules";
import { SUPPLEMENT_WARNING, buildCarePlan, careContext } from "@/lib/careplan";
import { streak } from "@/lib/discount";
import { preparePhoto } from "@/lib/image";
import { downloadIcs, nextWeekSameDay } from "@/lib/ics";
import { METRIC_LABEL, buildSeries, metricsFor, sentenceFor } from "@/lib/metrics";
import { deriveTheme } from "@/lib/palette";
import { savingsView } from "@/lib/savings";
import { seedDemo, updatePet, type PetRecord, type StoredCheckin } from "@/lib/store";
import { useActivePet, useCheckins, useNow } from "@/lib/usePets";
import { ACTION_LABEL } from "@/lib/types";

const DAY = 24 * 3600 * 1000;

const TABS = [
  ["overview", "Overview"],
  ["walks", "Walks"],
  ["health", "Health"],
  ["savings", "Savings"],
] as const;
type TabId = (typeof TABS)[number][0];
/** Old links to the movement check and the video scan open the Walks tab at the Pet Scanner. */
const SCANNER_HASHES = ["pet-scanner", "movement", "video"];
function tabFromHash(hash: string): TabId {
  const h = hash.replace(/^#/, "");
  if (SCANNER_HASHES.includes(h)) return "walks";
  return (TABS.find(([id]) => id === h)?.[0] ?? "overview") as TabId;
}

function Section({ title, children, aside, id }: { title: string; children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-[-0.035em]">{title}</h2>
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
    <li className="flex flex-col bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">
          <span className="tnum text-ink">{i + 1}</span> · {r.type}
        </span>
        {r.evidence && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold">Evidence: {r.evidence}</span>}
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
  const [hr, setHr] = useState<{ name: string; bpm: number | null } | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const [focusScanner, setFocusScanner] = useState(false);

  // The tab follows the URL hash, so /dashboard#walks or #savings opens that tab; #pet-scanner (and the old
  // #movement and #video links) open Walks and scroll to the Pet Scanner.
  useEffect(() => {
    const sync = () => {
      setTab(tabFromHash(window.location.hash));
      setFocusScanner(SCANNER_HASHES.includes(window.location.hash.replace(/^#/, "")));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const hasPet = Boolean(rec && rec.setupStep === null);
  useEffect(() => {
    if (!focusScanner || tab !== "walks" || !ready || !hasPet) return;
    const t = window.setTimeout(() => {
      document.getElementById("pet-scanner")?.scrollIntoView({ block: "start" });
      setFocusScanner(false);
    }, 80);
    return () => window.clearTimeout(t);
  }, [focusScanner, tab, ready, hasPet]);
  const pick = (id: TabId, scanner = false) => {
    setTab(id);
    setFocusScanner(scanner);
    window.history.replaceState(null, "", scanner ? "#pet-scanner" : id === "overview" ? window.location.pathname : `#${id}`);
  };

  if (!ready) return <div className="min-h-svh" aria-busy="true" />;
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
  const wkDiscount = blackBoxDiscount(bbWeeks(rec, target, walks, collarDays, now), log, now);
  const bb = rec.blackBox ? wkDiscount : null;
  // One reading of the savings, shared by the Overview card and the Walks tab.
  const view = savingsView(rec, log, Boolean(rec.blackBox) && (walks.length > 0 || collarDays.length > 0), wkDiscount, now);
  const mobility = mobilitySummary(scans, log, pet.name);
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
    <div className="space-y-8 py-4 sm:space-y-10 sm:py-8">
      {/* Top band */}
      <header className="grid items-end gap-6 lg:grid-cols-12">
        <div className="flex items-center gap-5 lg:col-span-7">
          <PetAvatar traits={rec.profile} size={104} title={`${pet.name}'s avatar`} />
          <div className="min-w-0">
            <p className="eyebrow">Dashboard</p>
            <h1 className="display mt-1 text-[clamp(2.75rem,7vw,5rem)]">{pet.name}</h1>
            <p className="mt-2 text-muted">
              {[pet.breed || "Mixed or not sure", `${pet.ageYears} ${pet.ageYears === 1 ? "year" : "years"}`, pet.weightKg !== undefined ? `${pet.weightKg} kg` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <dl className="flex flex-wrap items-end gap-x-10 gap-y-4 lg:col-span-5 lg:justify-end" data-testid="pet-stats">
          <div>
            <dt className="eyebrow">Health score</dt>
            <dd className="flex items-end gap-3">
              {latest ? (
                <span className="tnum text-5xl font-semibold tracking-[-0.05em]" data-testid="health-score">
                  {latest.healthScore}
                </span>
              ) : (
                <span className="pt-2 text-lg font-medium text-muted" data-testid="health-score">
                  After your first check-in
                </span>
              )}
              <ScoreSparkline log={log} />
            </dd>
          </div>
          {weeks > 0 && (
            <div>
              <dt className="eyebrow">Streak</dt>
              <dd className="tnum text-5xl font-semibold tracking-[-0.05em]">
                <span data-testid="streak">{weeks}</span>
                <span className="text-lg font-medium tracking-normal text-muted"> {weeks === 1 ? "week" : "weeks"} in a row</span>
              </dd>
            </div>
          )}
        </dl>
      </header>

      <div role="tablist" aria-label="Dashboard" className="flex rounded-full bg-ink/[0.06] p-1 sm:inline-flex">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => pick(id)}
            className={`relative min-h-11 flex-1 whitespace-nowrap rounded-full px-2 text-sm font-semibold transition-colors duration-300 sm:flex-none sm:px-6 ${tab === id ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {tab === id && <motion.span layoutId="dashboard-tab" className="absolute inset-0 rounded-full bg-surface shadow-soft" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} aria-hidden />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="space-y-14">
          <SavingsCard rec={rec} view={view} onStartWalk={() => pick("walks")} />
          <PremiumStatus rec={rec} />
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
          <Section title="This week">
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
          <Section title="Next check-in">
              <p className="text-2xl font-semibold tracking-[-0.03em]">
                {due ? "Due now" : `In ${daysToNext} ${daysToNext === 1 ? "day" : "days"}`}
                <span className="block text-base font-medium text-muted">{next.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
              </p>
              <button type="button" onClick={() => downloadIcs(pet.name, next)} className="link inline-flex min-h-11 items-center gap-2 text-sm">
                <CalendarPlus size={16} aria-hidden /> Add a weekly reminder
              </button>
            </Section>
          <Section title="Ask Petra">
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
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-8">
          <Section title="Who sees what">
              <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-2">
                {(
                  [
                    ["vet", "Your vet", "Check-in briefs, trends and any video you choose to send.", "Never your premium or payments."],
                    ["insurer", "Your insurer", "How often you check in, for your discount. Engagement only.", "Never health answers, photos, video or notes."],
                  ] as const
                ).map(([k, who, sees, never]) => (
                  <li key={k} className="bg-surface p-5">
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
          <Section title="Photo">
              <PhotoTile rec={rec} />
            </Section>
            </div>
          </div>
        </div>
      )}

      {tab === "walks" && (
        <div role="tabpanel" id="panel-walks" aria-labelledby="tab-walks" className="space-y-14">
          <Section title="Walk tracker" id="walks">
            <WalkMode rec={rec} target={target} todayBefore={todayMinutes(walks, collarDays, now)} collar={rec.blackBox?.device === "collar"} liveHr={hr?.bpm ?? null} discountPct={bb?.total ?? 0} onFinished={() => undefined} />
          </Section>
          <section id="pet-scanner" className="scroll-mt-28 border-t border-line pt-12">
            <div id="movement" className="space-y-10">
              <PetScanner rec={rec} log={log} />
              <div className="min-w-0 space-y-4 lg:max-w-[60%]">
                <p className="eyebrow">Earlier scans</p>
                {scans.length === 0 ? (
                  <p className="text-sm text-muted">No scans yet. A scan adds mobility to {pet.name}&apos;s trends.</p>
                ) : (
                  <>
                    {mobility && <p className="text-lg font-semibold" data-testid="dashboard-mobility">{mobility.text}.</p>}
                    {(() => {
                      const mob = scans.filter((s) => s.metrics.mobilityScore !== null);
                      const pts = mob.slice(-12).map((s) => ({ week: new Date(s.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: Math.round(s.metrics.mobilityScore!), date: s.timestamp }));
                      if (pts.length < 2) return null;
                      const series: Series = { key: "mobility", points: pts, baseline: null, band: null, latest: pts.at(-1)!.value, delta: null, unit: "", domain: [0, 100] };
                      return (
                        <figure>
                          <figcaption className="text-sm font-medium">Mobility from Pet Scanner</figcaption>
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
                              {isDemoScan(s) ? " (demo walk)" : ""}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </section>
          <Section title="Today">
            <Today rec={rec} target={target} today={todayMinutes(walks, collarDays, now)} weeksMet={wkDiscount.weeksMet} weeksCounted={wkDiscount.weeksCounted} />
              {activitySeries && (
                <figure className="min-w-0 mt-8">
                  <figcaption>
                    <p className="eyebrow">Activity, last 14 days</p>
                    <p className="mt-1 text-sm font-medium">Shaded band: at or above {pet.name}&apos;s daily target of {target} minutes.</p>
                  </figcaption>
                  <TrendChart s={activitySeries} reduce={reduce} />
                </figure>
              )}
          </Section>
          <PriceCard rec={rec} discount={wkDiscount} />
          <Section title="History">
            {walks.length === 0 ? (
              <p className="text-muted">No walks yet. Start one above.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line" data-testid="walk-history">
                {[...walks]
                  .reverse()
                  .slice(0, 8)
                  .map((w) => (
                    <li key={w.id} className="flex items-center gap-4 py-3">
                      <RouteThumb points={w.route} size={56} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {w.minutes} min · {w.distanceKm.toFixed(2)} km
                        </span>
                        <span className="block text-sm text-muted">
                          {new Date(w.startedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          {w.source === "simulated" ? ", example walk" : w.source === "collar" ? ", Walk Companion" : ", phone"}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Section>
          <Section title="Your Walk Companion">
            <Connect rec={rec} target={target} now={now} hr={hr} onHr={setHr} />
            <Diagnostics rec={rec} days={collarDays} result={diagnostics(collarDays)} now={now} />
            {mobility && (
              <p className="text-sm" data-testid="savings-health">
                Latest scan ({new Date(mobility.scan.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {isDemoScan(mobility.scan) ? ", demo walk" : ""}): {mobility.text}
                {mobility.scan.flags.length ? `. ${mobility.scan.flags.map((f) => f.label).join("; ")}` : ""}.{" "}
                <button type="button" onClick={() => pick("walks", true)} className="link">
                  Pet Scanner
                </button>
              </p>
            )}
          </Section>
        </div>
      )}

      {tab === "health" && (
        <div role="tabpanel" id="panel-health" aria-labelledby="tab-health" className="space-y-14">
          <Section title="Healthspan" id="health">
            <HealthspanStop rec={rec} reduce={reduce} />
          </Section>
      <Section title="Care plan">
        {plan.paused && <p className="text-sm font-semibold">{plan.pausedReason}</p>}
        <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {plan.recs.map((r, i) => (
            <CareItem key={r.id} r={r} i={i} onVet={() => setSheet("Booking with your vet from here")} />
          ))}
        </ol>
      </Section>
      <Section title="Trends">
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
        </div>
      )}

      {tab === "savings" && (
        <div role="tabpanel" id="panel-savings" aria-labelledby="tab-savings">
          <section id="savings" className="scroll-mt-24">
            <MemberArea rec={rec} />
          </section>
        </div>
      )}

      <PilotSheet open={sheet !== null} onClose={() => setSheet(null)} what={sheet ?? ""} />
    </div>
  );
}
