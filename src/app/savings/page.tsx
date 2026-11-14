"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react";
import { EmptyPetState } from "@/components/EmptyPetState";
import { CompanionTag } from "@/components/blackbox/CompanionTag";
import { WalkMode } from "@/components/blackbox/WalkMode";
import { AVG_MEMBER_PCT, TOP_TIER_PCT, annualPremium, avgSaving } from "@/data/premiums";
import { blackBoxDiscount, dailyTarget, todayMinutes, useCollarDays, useWalks, weeks } from "@/lib/blackbox";
import { joinPremium, usePremium } from "@/lib/premium";
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

/** Your price today against the most Petra can take off: two big numbers, the monthly saving, the average small. */
function Compare({ rec }: { rec: PetRecord }) {
  const monthly = annualPremium(rec.pet) / 12;
  const best = monthly * (1 - TOP_TIER_PCT / 100);
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
          Members save about {AVG_MEMBER_PCT}% on average, around {gbp(avgSaving(rec.pet))} a year for {rec.pet.name}. Illustrative.
        </span>
      </p>
    </div>
  );
}

const STEPS: [string, string][] = [
  ["Clip it on", "The Walk Companion clips to any collar."],
  ["Walk as usual", "It counts walking minutes. Never your location."],
  ["Pay less", "Hit the target most weeks and your premium drops."],
];

/** Petra Savings: the Walk Companion, and nothing else. Hero, how it works, price, an example walk, one CTA. */
export default function SavingsPage() {
  const { pet: rec, ready } = useActivePet();
  const log = useCheckins(rec?.id, rec?.pet.name);
  const walks = useWalks(rec?.id);
  const collar = useCollarDays(rec?.id);
  const member = usePremium();
  const now = useNow();
  const reduce = Boolean(useReducedMotion());

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
  const discount = blackBoxDiscount(weeks(rec, target, walks, collar, now), log, now);
  const joined = member?.petId === rec.id;
  // Arriving from the walk, the hero slides up as the page comes in.
  const enter = reduce ? {} : { initial: { opacity: 0, y: 48 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="space-y-20 pb-16 sm:space-y-24">
      <motion.header {...enter} className="relative -mx-4 overflow-hidden bg-[#161616] px-6 py-12 text-white sm:mx-0 sm:rounded-brand sm:px-10 sm:py-16">
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
          </div>
          <div className="flex justify-center lg:col-span-5">
            <CompanionTag className="h-auto w-64 sm:w-80" />
          </div>
        </div>
      </motion.header>

      <Section id="how" eyebrow="How it works" title="Three steps.">
        <ol className="grid gap-px overflow-hidden rounded-brand border border-line bg-line sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="bg-paper p-6">
              <span className="tnum grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold">{i + 1}</span>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{t}</p>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="compare" eyebrow="Your price" title="Your price today, and with Petra.">
        <Compare rec={rec} />
      </Section>

      <Section id="walk-mode" eyebrow="Example walk" title={<>Take {name} for a walk.</>}>
        <WalkMode rec={rec} target={target} todayBefore={today} collar={rec.blackBox?.device === "collar"} liveHr={null} discountPct={discount.total} finishCta={{ href: "#join", label: "Continue" }} onFinished={() => undefined} />
      </Section>

      <section id="join" className="scroll-mt-32 rounded-brand bg-[#161616] px-6 py-12 text-center text-white sm:px-10 sm:py-16" aria-live="polite">
        {joined ? (
          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl space-y-6" role="status">
            <CheckCircle size={56} weight="fill" className="mx-auto" style={{ color: YELLOW }} aria-hidden />
            <p className="display text-[clamp(2rem,5vw,3.5rem)]">
              Welcome to Petra Premium. <span style={{ color: YELLOW }}>{name} is covered for every walk.</span>
            </p>
            <Link href="/dashboard" className="btn min-h-14 px-8 text-lg font-semibold text-[#141414]" style={{ background: YELLOW }}>
              Go to your dashboard <ArrowUpRight size={20} weight="bold" aria-hidden />
            </Link>
          </motion.div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            <p className="display text-[clamp(2rem,5vw,3.5rem)]">Ready when {name} is.</p>
            <button
              type="button"
              onClick={() => joinPremium({ petId: rec.id, petName: name })}
              className="btn min-h-16 rounded-full px-10 text-xl font-semibold text-[#141414] shadow-[0_10px_40px_-10px_rgba(255,212,59,0.6)]"
              style={{ background: YELLOW }}
            >
              Try it today <ArrowUpRight size={22} weight="bold" aria-hidden />
            </button>
          </div>
        )}
        <p className="mx-auto mt-8 max-w-[52ch] text-sm text-white/70" data-testid="data-promise">
          Your data can only lower your premium. Never raise it, never add exclusions. Routes and locations stay on your device.
        </p>
      </section>
    </div>
  );
}
