"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ShieldCheck } from "@phosphor-icons/react";
import { EmptyPetState } from "@/components/EmptyPetState";
import { PilotSheet, Sheet } from "@/components/Sheet";
import { CompanionTag } from "@/components/blackbox/CompanionTag";
import { WalkMode } from "@/components/blackbox/WalkMode";
import { Connect, DataRules, Diagnostics, PriceCard, Today } from "@/components/blackbox/sections";
import { CoverStop } from "@/components/walk/CoverStop";
import { AVG_MEMBER_PCT, BB_CAP, UK_AVG_PREMIUM, blackBoxDiscount, dailyTarget, diagnostics, estimateDiscount, todayMinutes, useCollarDays, useWalks, weeks } from "@/lib/blackbox";
import { basePremium } from "@/lib/discount";
import { useScans } from "@/lib/video/scans";
import { isDemoScan, mobilitySummary } from "@/components/gait/scan";
import type { PetRecord } from "@/lib/store";
import { useActivePet, useCheckins, useNow } from "@/lib/usePets";

const YELLOW = "#FFD43B";
const gbp2 = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

function Section({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-6" aria-labelledby={id ? `${id}-title` : undefined}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id ? `${id}-title` : undefined} className="display mt-2 text-[clamp(2rem,4.5vw,3.25rem)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** Your price today against the most Petra can take off: two big numbers and the monthly saving. Illustrative. */
function Compare({ yearly }: { yearly: number }) {
  const monthly = yearly / 12;
  const best = monthly * (1 - BB_CAP / 100);
  const avgSaving = Math.round((UK_AVG_PREMIUM * AVG_MEMBER_PCT) / 100);
  return (
    <div className="space-y-5">
      <dl className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2">
        <div className="bg-paper p-6">
          <dt className="eyebrow">Your price today</dt>
          <dd className="tnum mt-2 text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.05em]">
            {gbp2(monthly)}
            <span className="text-base font-medium tracking-normal text-muted"> a month</span>
          </dd>
        </div>
        <div className="bg-accent-soft p-6">
          <dt className="eyebrow">With Petra</dt>
          <dd className="tnum mt-2 text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.05em]">
            <span className="text-[0.4em] font-semibold tracking-normal">up to </span>
            {gbp2(best)}
            <span className="text-base font-medium tracking-normal text-muted"> a month</span>
          </dd>
        </div>
      </dl>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="tnum rounded-full bg-ink px-4 py-2 text-lg font-semibold text-paper" data-testid="monthly-saving">
          Save up to {gbp2(monthly - best)} a month
        </span>
        <span className="text-sm text-muted">
          Members save about {AVG_MEMBER_PCT}% on average (around £{avgSaving} a year on a £{UK_AVG_PREMIUM} premium). Up to {BB_CAP}% at the top tier. Illustrative.
        </span>
      </p>
    </div>
  );
}

/** "If you walked like this more often": walks a week and minutes a walk to an estimated tier and annual saving. */
function Estimator({ rec, target, yearly }: { rec: PetRecord; target: number; yearly: number }) {
  const [walks, setWalks] = useState(7);
  const [minutes, setMinutes] = useState(Math.min(90, Math.max(10, Math.round((target || 30) / 5) * 5)));
  const est = estimateDiscount(walks, minutes, target);
  const who = rec.pet.breed ? `${rec.pet.ageYears}-year-old ${rec.pet.breed}` : `${rec.pet.ageYears}-year-old ${rec.pet.species}`;
  const slider = (label: string, value: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-semibold">{label}</span>
        <span className="tnum text-2xl font-semibold tracking-[-0.02em]">
          {value}
          <span className="text-sm font-medium text-muted"> {unit}</span>
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} aria-valuetext={`${value} ${unit}`} className="mt-2 w-full accent-[var(--ink)]" />
    </label>
  );
  return (
    <div className="grid gap-8 rounded-brand border border-line bg-white/60 p-6 sm:p-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {slider("Walks a week", walks, setWalks, 0, 14, 1, walks === 1 ? "walk" : "walks")}
        {slider("Minutes a walk", minutes, setMinutes, 5, 120, 5, "min")}
        <p className="text-sm text-muted">
          Target for a {who}: {target ? `${target} minutes a day` : "paused for rest"}. A week counts at five days of it.
        </p>
      </div>
      <div className="lg:col-span-5" aria-live="polite">
        <p className="eyebrow">Estimated saving, illustrative</p>
        <p className="tnum mt-2 text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.05em]" data-testid="estimate-saving">
          {gbp((yearly * est.total) / 100)}
          <span className="text-base font-medium tracking-normal text-muted"> a year</span>
        </p>
        <p className="mt-3 text-lg">
          <strong className="rounded-[4px] bg-accent px-1.5">{est.total}% tier</strong>{" "}
          <span className="text-muted">
            ({est.walking}% walking + {est.extra}% weekly check-ins)
          </span>
        </p>
      </div>
    </div>
  );
}

const PARTNERS: [string, string, string][] = [
  ["Pet retailer", "Pawsmith & Co.", "10% off every order"],
  ["Food", "Barkley Kitchen", "First bag half price"],
  ["Vets", "Greenpaw Vets", "Free nurse health check"],
  ["Insurer", "Harbourline", "An extra month free at renewal"],
  ["Accessories", "Tagalong Supply", "15% off leads and harnesses"],
  ["Grooming", "Suds & Tails", "£10 off your first groom"],
];

/** Petra Savings: the Walk Companion product page. Telematics for pet insurance, sharing minutes, never location. */
export default function SavingsPage() {
  const { pet: rec, ready } = useActivePet();
  const log = useCheckins(rec?.id, rec?.pet.name);
  const walks = useWalks(rec?.id);
  const collar = useCollarDays(rec?.id);
  const scans = useScans(rec?.id);
  const mobility = rec ? mobilitySummary(scans, log, rec.pet.name) : null;
  const now = useNow();
  const [hr, setHr] = useState<{ name: string; bpm: number | null } | null>(null);
  const [rules, setRules] = useState(false);
  const [pilot, setPilot] = useState(false);

  if (!ready) return <div className="min-h-[70svh]" aria-busy="true" />;
  if (!rec)
    return (
      <EmptyPetState
        where="Savings"
        title={
          <>
            Save on your pet&apos;s insurance <span className="accent-word">with every walk.</span>
          </>
        }
        line="Meet your pet first: their targets are personal to their breed, age and health."
      />
    );
  if (rec.setupStep !== null)
    return (
      <section className="space-y-6 py-16">
        <p className="eyebrow">Petra / Savings</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)]">
          Save on {rec.pet.name}&apos;s insurance <span className="accent-word">with every walk.</span>
        </h1>
        <p className="max-w-[48ch] text-lg text-muted">First, a minute to meet {rec.pet.name}. Targets are personal to breed, age and health.</p>
        <Link href="/" className="btn btn-primary text-lg">
          Carry on <ArrowUpRight size={18} weight="bold" aria-hidden />
        </Link>
      </section>
    );

  const name = rec.pet.name;
  const target = dailyTarget(rec, log, now);
  const today = todayMinutes(walks, collar, now);
  const wk = weeks(rec, target, walks, collar, now);
  const discount = blackBoxDiscount(wk, log, now);
  const diag = diagnostics(collar);
  const premium = basePremium(rec.pet);
  const isCollar = rec.blackBox?.device === "collar";

  return (
    <div className="space-y-20 pb-28 sm:space-y-24 lg:pb-10">
      <header className="relative -mx-4 overflow-hidden bg-[#161616] px-6 py-12 text-white sm:mx-0 sm:rounded-brand sm:px-10 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: YELLOW }}>
              Petra Walk Companion
            </p>
            <h1 className="display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
              Save on {name}&apos;s insurance <span style={{ color: YELLOW }}>with every walk.</span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg text-white/75 sm:text-xl">
              The Petra Walk Companion shares walking minutes, never your location. Hit {name}&apos;s target, pay less.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" onClick={() => setPilot(true)} className="btn min-h-14 px-7 text-lg font-semibold text-[#141414]" style={{ background: YELLOW }}>
                Get the Walk Companion <ArrowUpRight size={20} weight="bold" aria-hidden />
              </button>
              <a href="#walk-mode" className="min-h-11 content-center text-sm font-semibold text-white/80 underline-offset-4 hover:underline">
                Try an example walk
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:col-span-5">
            <CompanionTag className="h-auto w-64 sm:w-80" />
          </div>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="min-w-0 space-y-20 sm:space-y-24 lg:col-span-8">
          <Section id="compare" eyebrow="Your price" title={<>Your price today, and with Petra.</>}>
            <Compare yearly={premium} />
          </Section>

          <Section id="walk-mode" eyebrow="Example walk" title={<>Take {name} for a walk.</>}>
            <WalkMode rec={rec} target={target} todayBefore={today} collar={isCollar} liveHr={hr?.bpm ?? null} discountPct={discount.total} onFinished={() => undefined} />
            <Today rec={rec} target={target} today={today} weeksMet={discount.weeksMet} weeksCounted={discount.weeksCounted} />
            <PriceCard rec={rec} discount={discount} />
          </Section>

          <Section id="estimate" eyebrow="Illustrative" title="If you walked like this more often">
            <Estimator rec={rec} target={target} yearly={premium} />
          </Section>

          <Section id="partners" eyebrow="Member offers" title="Members save more with partners">
            <ul className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {PARTNERS.map(([kind, brand, offer]) => (
                <li key={brand} className="bg-paper p-5">
                  <p className="eyebrow">{kind}</p>
                  <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">{offer}</p>
                  <p className="mt-1 text-sm text-muted">{brand}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Example partners. Not real offers.</p>
          </Section>

          <Section id="plans" eyebrow="Cover" title="Pick your cover">
            <CoverStop rec={rec} log={log} />
          </Section>

          <section aria-labelledby="first-time-title" className="rounded-brand border-2 border-ink bg-accent-soft p-6">
            <p className="eyebrow">Illustrative offer</p>
            <h2 id="first-time-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              First-time owner? Start lower.
            </h2>
            <p className="mt-2 max-w-[52ch] text-muted">For example, 10% off your first year and a free Walk Companion with a 2-year policy.</p>
          </section>

          <Section id="companion" eyebrow="Your Walk Companion" title={<>Pair it, and {name}&apos;s health rides along.</>}>
            <Connect rec={rec} target={target} now={now} hr={hr} onHr={setHr} />
            <Diagnostics rec={rec} days={collar} result={diag} now={now} />
            {mobility && (
              <p className="text-sm" data-testid="savings-health">
                Latest movement check ({new Date(mobility.scan.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {isDemoScan(mobility.scan) ? ", demo walk" : ""}): {mobility.text}
                {mobility.scan.flags.length ? `. ${mobility.scan.flags.map((f) => f.label).join("; ")}` : ""}.{" "}
                <Link href="/dashboard#movement" className="link">
                  Movement check
                </Link>
              </p>
            )}
          </Section>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/dashboard" className="btn btn-ghost">
              {name}&apos;s dashboard <ArrowUpRight size={16} aria-hidden />
            </Link>
            <Link href="/walk" className="link min-h-11 content-center">
              Back to the walk
            </Link>
          </div>
        </div>

        <div className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-24">
            <DataRules />
          </div>
        </div>
      </div>

      {/* Phones: the rules stay one tap away at all times. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-2 backdrop-blur-sm lg:hidden">
        <button type="button" onClick={() => setRules(true)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden /> Your data, your rules
          </span>
          <span className="text-muted">Only lowers your premium</span>
        </button>
      </div>
      <Sheet open={rules} onClose={() => setRules(false)} title="Your data, your rules">
        <DataRules compact />
      </Sheet>
      <PilotSheet open={pilot} onClose={() => setPilot(false)} what="The Petra Walk Companion" />
    </div>
  );
}
